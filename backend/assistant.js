const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

async function processAssistantMessage(text, userProfile, activeTasks = [], completedTasks = [], context = null) {
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
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest'
    ];

    let result = null;
    let lastError = null;
    
    // Optimize prompt size by truncating history
    const slimCompletedTasks = completedTasks.slice(0, 15).map(t => ({ title: t.title, completedAt: t.completedAt }));
    const slimActiveTasks = activeTasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, targetTime: t.targetTime }));
    
    let contextSection = `Here is the current state of the application:\n- User Profile: ${JSON.stringify(userProfile)}\n- Active Reminders: ${JSON.stringify(slimActiveTasks)}\n- Recently Completed Tasks (History): ${JSON.stringify(slimCompletedTasks)}\n`;
    if (context && context.clientTime) {
      contextSection = `User's Current Local Time: ${context.clientTime}\n` + contextSection;
    }
    if (context && context.contextDate) {
      contextSection += `- UI Context: The user is currently viewing the date: ${context.contextDate} on their calendar. If they specify a time without a date (e.g., "at 5 PM"), you MUST assume they mean that specific day (${context.contextDate}). In your speechResponse, clearly state the day you are setting it for (e.g. "tomorrow", or "on Monday") rather than saying "today" if the context date is in the future.\n`;
    }
    if (context && context.isReviewing) {
      contextSection += `- Draft Reminder State (User is currently reviewing this): ${JSON.stringify(context.draftDetails)}\n`;
    }

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
   - Recurrence Parameters (optional): "isRecurring" (boolean), "recurInterval" (number), "recurUnit" ("days", "weeks", "months").
   - AI Mode (optional): "aiEnabled" (boolean) - only if user asks to enable AI mode for the task.
2. "update_draft": Use this ONLY IF the user is currently reviewing a Draft Reminder, and wants to change its details.
   - Parameters (all optional):
      - "title" (string)
      - "durationSeconds" (number) or "targetTimeISO" (string)
      - "priority" ("Low", "Medium", "High", "Urgent")
      - "category" ("Personal", "Work")
      - "isRecurring" (boolean), "recurInterval" (number), "recurUnit" ("days", "weeks", "months")
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
8. "toggle_theme": Switch between dark and light mode. Use when user says 'dark mode', 'light mode', 'switch theme', 'change theme', etc.
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
            model: 'llama3-8b-8192',
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

async function generateAISubtasks(taskTitle) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_FREE_GEMINI_API_KEY_HERE') {
    return [
      "Gather required materials",
      "Draft first quick outline",
      "Perform a final check"
    ];
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });
    const prompt = `Give me exactly 3 short, action-oriented, quick steps to complete the task: "${taskTitle}" in under 10 minutes. Return a JSON array of strings only. Example: ["Step 1", "Step 2", "Step 3"]`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error("AI Subtasks error:", err);
    return [
      "Quick step 1: Focus on core task",
      "Quick step 2: Minimize distractions",
      "Quick step 3: Wrap up and save"
    ];
  }
}

module.exports = { processAssistantMessage, processTaskChat, generateAISubtasks };
