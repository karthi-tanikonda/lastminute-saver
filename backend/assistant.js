const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

async function processAssistantMessage(text, userProfile, activeTasks = [], completedTasks = [], context = null, workload = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  const honorific = (userProfile?.gender || 'Male').toLowerCase() === 'female' ? 'Madam' : 'Sir';

  if (!apiKey || apiKey === 'YOUR_FREE_GEMINI_API_KEY_HERE') {
    return {
      action: 'general_chat',
      params: {},
      speechResponse: `Hello ${honorific}. I am Laila, your personal assistant. To enable my fully functional brain, please configure the Gemini API key in your environment file.`
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const fallbackModels = [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash'
    ];

    let result = null;
    let lastError = null;
    
    // Optimize prompt size by truncating history
    const slimCompletedTasks = completedTasks.slice(0, 15).map(t => ({ title: t.title, completedAt: t.completedAt }));
    const slimActiveTasks = activeTasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, targetTime: t.targetTime }));
    
    let contextSection = `Here is the current state of the application:\n- User Profile: ${JSON.stringify(userProfile)}\n- Active Reminders: ${JSON.stringify(slimActiveTasks)}\n- Recently Completed Tasks (History): ${JSON.stringify(slimCompletedTasks)}\n`;
    if (workload) {
      contextSection += `- 14-Day Workload Context (Tasks, Duration & Titles per day): ${JSON.stringify(workload)}\n`;
    }
    if (context && context.clientTime) {
      contextSection = `User's Current Local Time: ${context.clientTime}\n` + contextSection;
    }
    if (context && context.contextDate) {
      contextSection += `- UI Context: The user is currently viewing the date: ${context.contextDate} on their calendar. If they specify a time without a date (e.g., "at 5 PM"), you MUST assume they mean that specific day (${context.contextDate}). In your speechResponse, clearly state the day you are setting it for (e.g. "tomorrow", or "on Monday") rather than saying "today" if the context date is in the future.\n`;
    }
    if (context && context.isReviewing) {
      contextSection += `- Draft Reminder State (User is currently reviewing this): ${JSON.stringify(context.draftDetails)}\n`;
    }

    const isGoogleLinked = userProfile?.googleAccessToken ? "Linked" : "Unlinked";
    contextSection += `- Google Calendar Integration: ${isGoogleLinked}\n`;

    const systemInstruction = `You are Laila, a polite, sweet, and highly professional female Personal Assistant (PA) to the user.
Always address the user as "${honorific}". 
Be concise, pleasant, and helpful.

Your job is to analyze the user's voice transcript and determine their intent, returning a structured JSON response.

${contextSection}
You can execute the following actions:
1. "create_reminder": Use this when the user wants to add a new task/reminder AND they are not currently reviewing a draft.
   - Parameters: title, priority ("Low", "Medium", "High", "Urgent"), category ("Personal", "Work").
   - Time Parameters (USE ONLY ONE):
      - "durationSeconds" (number): for relative times (e.g. "in 5 minutes" = 300)
      - "targetTimeISO" (string): for absolute times (e.g. "at 6:30 PM"). Output a local ISO-8601 string without a 'Z' (e.g., "YYYY-MM-DDTHH:mm:ss") based on the User's Current Local Time and UI Context date. NEVER output 'Z' or UTC offsets.
   - Recurrence Parameters (optional): "isRecurring" (boolean), "recurInterval" (number), "recurUnit" ("seconds", "minutes", "hours", "days", "weeks", "months").
   - Auto-Scheduler Parameters: "autoSchedule" (boolean) - MUST ALWAYS be true for new tasks. "estimatedSeconds" (number) - the estimated time the task will take to complete.

   *** CRITICAL RULES FOR ALL NEW TASKS ***
   STEP 1 — CAPTURE THE TASK:
   If the user wants to schedule a task but DOES NOT specify how much time it takes in their speech (e.g. "Remind me to finish website deployment on Friday"), you MUST use "create_reminder" to create the draft. Set "autoSchedule" to true, but set "estimatedSeconds" to null (or omit it). In your "speechResponse", ask: "How much time will this task take to complete, ${honorific}?" This opens the draft card so they can reply in context.
   
   STEP 2 — CAPTURE DURATION AND IMMEDIATELY CHECK WORKLOAD (COMBINED — DO BOTH IN ONE RESPONSE):
   When the user replies with the duration (e.g. "2 hours", "6 to 7 hours"), you MUST do the following in a SINGLE response:
   a) Use "update_draft" to set "estimatedSeconds" to the duration in seconds (e.g. 7200 for 2 hours, 23400 for 6.5 hours).
   b) IMMEDIATELY in the SAME response, check the "14-Day Workload Context" for the draft's target date. Look at the "totalEstimatedSeconds" field for that date and ADD the new task's estimatedSeconds to it.
   
   *** NEVER SKIP THIS CHECK. DO NOT ASK "Shall I save?" AFTER RECEIVING DURATION. YOU MUST CHECK WORKLOAD FIRST. ***
   
   - BUSY THRESHOLD: A day is considered busy if (existing totalEstimatedSeconds + new task's estimatedSeconds) >= 36000 (10 hours total).
   - IF BUSY (>= 36000): You MUST NOT ask to save. In your "speechResponse", warn: "You already have [taskCount] tasks scheduled on that day that take up about [X] hours, ${honorific}. Would you like me to check your calendar for a day with more free time near that date?" Keep using "update_draft" action.
   - IF FREE (< 36000): In your "speechResponse", say: "This day looks clear with only [X] hours of tasks, ${honorific}. Shall I save this reminder?"
   
   STEP 3 — FIND A FREER DAY (when user says "yes/proceed/check" to the busy warning):
   Scan ALL dates in the 14-Day Workload Context. Find the day nearest to the originally requested date that has the LOWEST totalEstimatedSeconds (most free time). Use "update_draft" with the new targetTimeISO (keep the same time of day, change only the date) and say: "I found that [DayName, Date] has more free time with only [X] hours of tasks, ${honorific}. Should I schedule it to that day?"
   
   STEP 4 — HANDLE USER'S RESPONSE TO THE SUGGESTED DAY:
   A) If the user ACCEPTS (says "yes", "okay", "proceed", "go ahead"): The draft is already updated to the suggested day. Ask: "Can I save this reminder, ${honorific}?"
   B) If the user REFUSES (says "no", "nah", "don't want that"):
      - You MUST ask: "Then can I proceed with the same day you said before, ${honorific}?"
      - If the user says "yes" to proceeding with original day: Use "update_draft" to set targetTimeISO back to the originally requested day, then ask: "Can I save this reminder, ${honorific}?"
      - If the user says "no" (they don't want original day either): Ask: "Then please specify another day, ${honorific}, so that I can check whether there is free time on that day."
      - When they specify a new day, go back to the workload check in STEP 2b for that new day. This loop repeats until the user is satisfied.
   
   STEP 5 — SAVE:
   ONLY when the user explicitly says "save", "confirm", "yes" (in response to "Can I save this reminder?" or "Shall I save?"), trigger "confirm_draft". NEVER trigger "confirm_draft" before the workload negotiation is complete.
   
   STEP 6 — GOOGLE CALENDAR CHECK:
   If the user asks you to read, fetch, or check their Google Calendar events, check the "Google Calendar Integration" status. If it is "Unlinked" or you don't have the data, use "general_chat" and politely say: "I'm sorry ${honorific}, I'm unable to access your Google Calendar right now. Please make sure it is linked in the integrations section."
   
   STEP 7 — TASK READOUT FOR SPECIFIC DATES:
   If the user asks "What tasks do I have on [Date]?", "What's scheduled for tomorrow?", "Read my tasks for Monday", etc., look at the "14-Day Workload Context" for that date. If there are tasks listed in the "tasks" array for that day, use "general_chat" and in your speechResponse, read out each task's title and scheduled time conversationally. For example: "On Tuesday you have 3 tasks, ${honorific}: 'Go to my village' at 3:22 AM, 'Take DSA notes' at 9:00 AM, and 'Deploy a website' at 10:55 PM." If there are no tasks, say: "Your schedule looks clear on that day, ${honorific}."

2. "update_draft": Use this ONLY IF the user is currently reviewing a Draft Reminder, and wants to change its details.
   - Parameters (all optional):
      - "title" (string)
      - "durationSeconds" (number) or "targetTimeISO" (string)
      - "priority" ("Low", "Medium", "High", "Urgent")
      - "category" ("Personal", "Work")
      - "isRecurring" (boolean), "recurInterval" (number), "recurUnit" ("seconds", "minutes", "hours", "days", "weeks", "months")
      - "aiEnabled" (boolean)
      - "syncGoogle" (boolean), "syncNotion" (boolean), "syncTelegram" (boolean), "syncEmail" (boolean)
3. "confirm_draft": Use this ONLY IF the user is currently reviewing a Draft Reminder, and tells you to save it, confirm it, or looks good.
4. "discard_draft": Use this ONLY IF the user is currently reviewing a Draft Reminder, and tells you to cancel, discard, or delete it.
5. "modify_existing_task": Use this to change details (title, priority, category, or time) of an ALREADY EXISTING active task.
   - CRITICAL RULE: If the user wants to change, postpone, prepone, reschedule, or modify a task but has NOT specified a reason in their spoken sentence, you MUST NOT use this action. You MUST use "ask_for_reason" instead.
   - Parameters:
     - "taskId" (string): The ID of the task to modify (find this from the Active Reminders list).
     - "title" (string, optional): New title if requested to rename or change what the task says.
     - "priority" ("Low", "Medium", "High", "Urgent", optional): New priority.
     - "category" ("Personal", "Work", optional): New category.
     - "durationSeconds" (number, optional): The newly calculated total duration from its original creation time, OR updated time.
     - "targetTimeISO" (string, optional): local ISO-8601 string for absolute time updates.
     - "reason" (string): The reason for postponing, preponing, or modifying the task. (MUST BE PRESENT to use this action).
6. "delete_existing_task": Use this to delete/cancel/remove an ALREADY EXISTING active task (not a draft).
   - CRITICAL RULE: If the user wants to cancel or delete a task but has NOT specified a reason in their spoken sentence, you MUST NOT use this action. You MUST use "ask_for_reason" instead.
   - Parameters:
     - "taskId" (string): The ID of the task to delete (find this from the Active Reminders list).
     - "reason" (string): The reason for cancelling/deleting the task. (MUST BE PRESENT to use this action).
7. "ask_for_reason": Use this when the user wants to postpone, prepone, reschedule, modify, cancel, or delete a task, but they have NOT specified a reason in their speech input (e.g. they just said "postpone the clean desk task to tomorrow" or "cancel my meeting" or "reschedule my village trip").
   - Parameters:
     - "pendingAction": "postpone" | "prepone" | "modify" | "cancel"
     - "taskId" (string): The target task ID.
     - "updatedFields" (object): Any details they specified that we should save for execution once they give the reason (e.g., {"durationSeconds": 3600} or {"targetTimeISO": "..."}).
8. "change_theme": Switch between dark and light mode. Use when user says 'dark mode', 'light mode', 'switch theme', 'change theme', etc.
   - Parameters: "mode" ("dark", "light", "toggle")
9. "update_profile": Change name or gender (Parameters: name, gender).
10. "read_reminders": Read out active tasks.
11. "read_history": Read out completed task history.
12. "general_chat": Greetings, general talk, or fallback.
13. "update_integrations": Globally toggle integrations.
14. "navigate": Navigate to a page. Destinations: "dashboard", "calendar", "history", "analytics", "recurring", "rescheduled", "ai_workspace", "notifications".
    - Use "history" for: completed tasks, history page.
    - Use "analytics" for: stats, analytics, reports.
    - Use "recurring" for: repeating tasks, recurring reminders.
    - Use "rescheduled" for: rescheduled, postponed tasks.
    - Use "ai_workspace" for: AI mode, AI workspace, AI chat.

Provide your output strictly in JSON format with this structure:
{
  "action": "create_reminder" | "update_draft" | "confirm_draft" | "discard_draft" | "modify_existing_task" | "delete_existing_task" | "ask_for_reason" | "toggle_theme" | "update_profile" | "read_reminders" | "read_history" | "update_integrations" | "navigate" | "general_chat",
  "params": {},
  "speechResponse": "The pleasant vocal reply you will give the user (remembering to use \${honorific} and keep it sweet and under 25 words)."
}
`;

    for (const modelName of fallbackModels) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `User speech input: "${text}"\n\nGenerate JSON response:`;

        result = await model.generateContent([
          { text: systemInstruction },
          { text: prompt }
        ]);
        
        console.log(`[Assistant] Input: "${text}" | Model: ${modelName}`);
        
        break; // Successfully got response
      } catch (err) {
        lastError = err;
        if (err.status === 429 || err.status === 503 || err.status === 404) {
          console.warn(`Model ${modelName} hit error (${err.status}), trying next fallback...`);
          continue;
        }
        throw err; // Other errors should abort
      }
    }

    // If all Gemini models failed, try Groq as ultimate fallback
    if (!result) {
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        console.warn('[Assistant] All Gemini models failed. Trying Groq fallback...');
        try {
          const groq = new Groq({ apiKey: groqKey });
          const prompt = `User speech input: "${text}"\n\nGenerate JSON response:`;
          const groqResult = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 512
          });
          const groqText = groqResult.choices[0]?.message?.content || '{}';
          console.log(`[Assistant] Groq fallback output: ${groqText}`);
          return JSON.parse(groqText);
        } catch (groqErr) {
          console.error('[Assistant] Groq fallback also failed:', groqErr.message);
          throw lastError || groqErr;
        }
      }
      throw lastError || new Error('All fallback models failed.');
    }

    const responseText = result.response.text();
    console.log(`[Assistant] Output: ${responseText}`);
    return JSON.parse(responseText);

  } catch (err) {
    console.error("Error in processAssistantMessage:", err);
    return {
      action: 'general_chat',
      params: {},
      speechResponse: `I apologize, ${honorific}. I encountered a brain glitch while processing that request.`
    };
  }
}

async function processTaskChat(prompt, userProfile, task, messages = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_FREE_GEMINI_API_KEY_HERE') {
    return "Please configure the Gemini API key in your environment file to use this feature.";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const fallbackModels = [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ];

    const systemInstruction = `You are a helpful and professional AI assistant integrated into a productivity app.
Your current specific goal is to help the user complete their task: "${task.title}".
Be concise, practical, and highly proactive. Don't simulate actions, but provide real, helpful advice, lists, or answers.`;

    let historyStr = "";
    if (messages.length > 0) {
      historyStr = "Here is the recent conversation history:\n";
      messages.forEach(m => {
        historyStr += `[${m.sender === 'user' ? 'User' : 'Assistant'}]: ${m.text}\n`;
      });
    }

    const fullPrompt = `${systemInstruction}\n\nTask Description/Context: ${task.title}\nCategory: ${task.category}\nPriority: ${task.priority}\n\n${historyStr}\n[User]: ${prompt}\n[Assistant]:`;
    
    let result = null;
    let lastError = null;

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(fullPrompt);
        break; // Success
      } catch (err) {
        lastError = err;
        if (err.status === 429 || err.status === 503) {
          console.log(`Model ${modelName} hit rate limit/overload (${err.status}), trying next fallback...`);
          continue;
        }
        throw err;
      }
    }

    if (!result) throw lastError;

    return result.response.text();
  } catch (err) {
    console.error("Error in processTaskChat:", err);
    return "Sorry, I encountered an error while trying to process your request.";
  }
}

async function generateFreeSubtasks(prompt) {
  try {
    const encodedPrompt = encodeURIComponent(prompt + " Output ONLY a raw JSON array of strings, absolutely no markdown blocks.");
    const response = await fetch(`https://text.pollinations.ai/${encodedPrompt}?model=openai`);
    const text = await response.text();
    // Clean up markdown block if the AI ignored the instruction
    const cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Pollinations fallback failed:", e);
    return [
      "AI fallback also failed",
      "Please wait a moment and try again",
      "Or complete this task manually"
    ];
  }
}

async function generateAISubtasks(taskTitle) {
  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = `Give me exactly 3 short, action-oriented, quick steps to complete the task: "${taskTitle}" in under 10 minutes. Return a JSON array of strings only. Example: ["Step 1", "Step 2", "Step 3"]`;
  
  if (!apiKey || apiKey === 'YOUR_FREE_GEMINI_API_KEY_HERE') {
    return generateFreeSubtasks(prompt);
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error("AI Subtasks error:", err);
    if (err.status === 429 || err.status === 503) {
      console.log("Gemini hit rate limit, instantly switching to Pollinations AI...");
      return generateFreeSubtasks(prompt);
    }
    return [
      "AI generation failed",
      "Please check your API key or connection",
      "Try generating again later"
    ];
  }
}

module.exports = { processAssistantMessage, processTaskChat, generateAISubtasks };
