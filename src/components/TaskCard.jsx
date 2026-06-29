import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle2, Clock, Zap, CheckSquare, Square, MessageCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { playClick } from '../utils/soundSynth';
import { speakText } from '../utils/speechSynth';
import TaskAIChat from './TaskAIChat';

const generateSubtasks = (title, category) => {
  const cat = category?.toLowerCase() || '';
  const t = title.toLowerCase();
  
  if (cat === 'work' || t.includes('meeting') || t.includes('project')) {
    return [
      { id: 's1', text: 'Gather required documents/notes', done: false },
      { id: 's2', text: 'Review key objectives', done: false },
      { id: 's3', text: 'Draft initial summary', done: false }
    ];
  } else if (cat === 'personal' || t.includes('grocery') || t.includes('buy')) {
    return [
      { id: 's1', text: 'Check inventory at home', done: false },
      { id: 's2', text: 'List essential items', done: false },
      { id: 's3', text: 'Set a quick budget', done: false }
    ];
  }
  
  return [
    { id: 's1', text: 'Review context and details', done: false },
    { id: 's2', text: 'Complete first milestone', done: false },
    { id: 's3', text: 'Finalize and double-check', done: false }
  ];
};

export default function TaskCard({ task, onDelete, onComplete, onExpire, userProfile }) {
  const { id, title, durationSeconds, priority, createdAt, aiEnabled } = task;
  
  // Calculate remaining time based on current time vs expiration time
  const getSecondsRemaining = () => {
    const elapsed = Math.floor((Date.now() - createdAt) / 1000);
    const remaining = durationSeconds - elapsed;
    return remaining > 0 ? remaining : 0;
  };

  const [timeLeft, setTimeLeft] = useState(getSecondsRemaining());
  const [isActionPlanExpanded, setIsActionPlanExpanded] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  
  // Snooze & AI Help warnings states
  const [warned10m, setWarned10m] = useState(false);
  const [warned5m, setWarned5m] = useState(false);
  const [showEmergencyOverlay, setShowEmergencyOverlay] = useState(false);
  const [aiGeneratingHelp, setAiGeneratingHelp] = useState(false);

  // Fetch or seed subtasks from database on expansion
  useEffect(() => {
    if (isActionPlanExpanded && subtasks.length === 0) {
      fetch(`/api/tasks/${id}/subtasks`)
        .then(res => res.json())
        .then(async (data) => {
          if (data.length === 0) {
            // Seed DB with generated action plan
            const generated = generateSubtasks(title, task.category);
            const saved = [];
            for (const sub of generated) {
              const res = await fetch(`/api/tasks/${id}/subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: sub.text })
              });
              if (res.ok) {
                const newSub = await res.json();
                saved.push(newSub);
              }
            }
            setSubtasks(saved);
          } else {
            setSubtasks(data);
          }
        })
        .catch(console.error);
    }
  }, [isActionPlanExpanded, id, title, task.category]);

  const handleToggleSubtask = async (subId) => {
    playClick();
    const st = subtasks.find(s => s.id === subId);
    if (!st) return;
    const nextState = !st.completed;

    // Update locally immediately
    const updated = subtasks.map(s => s.id === subId ? { ...s, completed: nextState } : s);
    setSubtasks(updated);
    
    try {
      await fetch(`/api/subtasks/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: nextState })
      });

      // Check if all are done now
      if (updated.every(s => s.completed)) {
        setTimeout(() => {
          onComplete(id);
        }, 500); 
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Snooze function (add 5 minutes = 300 seconds)
  const handleSnooze = async () => {
    playClick();
    const currentElapsed = Math.floor((Date.now() - createdAt) / 1000);
    const newTotalDuration = currentElapsed + timeLeft + 300;
    
    try {
      const res = await fetch(`/api/tasks/${id}/modify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationSeconds: newTotalDuration,
          reason: 'Laila AI Snooze'
        })
      });
      if (res.ok) {
        setShowEmergencyOverlay(false);
        setWarned10m(false);
        setWarned5m(false);
        const data = await res.json();
        // Update local time left
        setTimeLeft(getSecondsRemaining() + 300);
        speakText(`Rescheduled task for 5 minutes later, ${userProfile?.gender === 'Female' ? 'Madam' : 'Sir'}.`, userProfile);
      }
    } catch (err) {
      console.error("Snooze failed:", err);
    }
  };

  // AI Help (fetch customized steps from backend Gemini API)
  const handleAIHelp = async () => {
    playClick();
    setAiGeneratingHelp(true);
    speakText(`Let's make this simple, ${userProfile?.gender === 'Female' ? 'Madam' : 'Sir'}. I am breaking down the task now.`, userProfile);
    
    try {
      const res = await fetch(`/api/tasks/${id}/subtasks/generate-ai`, { method: 'POST' });
      if (res.ok) {
        const generatedSteps = await res.json();
        setSubtasks(generatedSteps);
        setIsActionPlanExpanded(true);
        setShowEmergencyOverlay(false);
        speakText(`Here is a quick step-by-step checklist to help you finish: ${title}.`, userProfile);
      }
    } catch (err) {
      console.error("AI help failed:", err);
    } finally {
      setAiGeneratingHelp(false);
    }
  };

  useEffect(() => {
    // If it's already 0 or less, expire it immediately
    if (timeLeft <= 0) {
      onExpire(id);
      return;
    }

    const interval = setInterval(() => {
      const remaining = getSecondsRemaining();
      setTimeLeft(remaining);

      // 1. 10-Minute Snooze & AI Help warning for Urgent/High & AI-Enabled reminders
      if ((priority === 'Urgent' || priority === 'High') && aiEnabled) {
        if (remaining <= 600 && remaining > 590 && !warned10m) {
          setWarned10m(true);
          setShowEmergencyOverlay(true);
          speakText(`Excuse me ${userProfile?.gender === 'Female' ? 'Madam' : 'Sir'}. Your high-priority task, ${title}, is due in ten minutes. Would you like to snooze this, or use my AI brain to help you complete it?`, userProfile);
        }
      }

      // 2. 5-Minute Warning Alerts
      if (remaining <= 300 && remaining > 290 && !warned5m) {
        setWarned5m(true);
        if (priority === 'Urgent' || priority === 'High') {
          speakText(`Warning: your task, ${title}, is due in five minutes. Focus on completion, ${userProfile?.gender === 'Female' ? 'Madam' : 'Sir'}.`, userProfile);
        } else {
          // Other priorities: single quick reminder
          speakText(`Reminder: your task, ${title}, is due in five minutes.`, userProfile);
        }
      }

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire(id);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [id, durationSeconds, createdAt, warned10m, warned5m, userProfile]);

  const handleComplete = () => {
    playClick();
    onComplete(id);
  };

  const handleDelete = () => {
    playClick();
    onDelete(id);
  };

  // Helper to format remaining time
  const formatTime = (secs) => {
    if (secs <= 0) return 'LIFESAVER TRIGGERED';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Styling maps based on priority supporting both Dark and Light modes
  const styleConfig = {
    Urgent: {
      border: 'border-[#FF6A00]/80 dark:border-[#FF6A00]/80 shadow-[0_0_15px_rgba(255,106,0,0.12)] dark:shadow-[0_0_15px_rgba(255,106,0,0.25)]',
      bg: 'bg-gradient-to-br from-[#FFF5F0] to-[#FFEBE0] dark:from-[#1E120C] dark:to-black',
      badge: 'bg-[#FF6A00]/10 dark:bg-[#FF6A00]/20 text-[#FF6A00] dark:text-[#FF6A00] border-[#FF6A00]/35 dark:border-[#FF6A00]/40',
      progress: 'bg-[#FF6A00]',
      timerText: 'text-[#FF6A00] font-bold animate-pulse',
    },
    High: {
      border: 'border-[#FF8C00]/40 dark:border-[#FF8C00]/50 shadow-[0_0_10px_rgba(255,140,0,0.08)] dark:shadow-[0_0_10px_rgba(255,140,0,0.15)]',
      bg: 'bg-gradient-to-br from-[#FFF9F3] to-[#FFF3E6] dark:from-[#1E1A16] dark:to-black',
      badge: 'bg-[#FF8C00]/10 dark:bg-[#FF8C00]/15 text-[#FF8C00] dark:text-[#FF8C00] border-[#FF8C00]/25 dark:border-[#FF8C00]/30',
      progress: 'bg-[#FF8C00]',
      timerText: 'text-[#FF8C00]',
    },
    Medium: {
      border: 'border-[#00CFCF]/30 dark:border-[#00CFCF]/40 shadow-[0_0_10px_rgba(0,207,207,0.06)] dark:shadow-[0_0_10px_rgba(0,207,207,0.1)]',
      bg: 'bg-gradient-to-br from-[#F0FDFD] to-[#E6FBFB] dark:from-[#0F1E1E] dark:to-black',
      badge: 'bg-[#00CFCF]/10 dark:bg-[#00CFCF]/15 text-[#00CFCF] dark:text-[#00CFCF] border-[#00CFCF]/25 dark:border-[#00CFCF]/30',
      progress: 'bg-[#00CFCF]',
      timerText: 'text-[#00CFCF]',
    },
    Low: {
      border: 'border-[#007BFF]/20 dark:border-[#007BFF]/30',
      bg: 'bg-gradient-to-br from-[#F0F7FF] to-[#E6F0FA] dark:from-[#0F151F] dark:to-black',
      badge: 'bg-[#007BFF]/10 dark:bg-[#007BFF]/15 text-[#007BFF] dark:text-[#007BFF] border-[#007BFF]/25 dark:border-[#007BFF]/30',
      progress: 'bg-[#007BFF]',
      timerText: 'text-[#007BFF]',
    },
  };

  const currentStyle = styleConfig[priority] || styleConfig.Medium;
  const progressPercent = Math.min(100, Math.max(0, (timeLeft / durationSeconds) * 100));

  return (
    <div className={`relative rounded-xl border ${currentStyle.border} ${currentStyle.bg} p-4 transition-colors duration-300 flex flex-col justify-between overflow-hidden group`}>
      {/* Background soft pulse for urgent timers */}
      {priority === 'Urgent' && timeLeft > 0 && (
        <div className="absolute inset-0 bg-[#FF6A00]/5 dark:bg-[#FF6A00]/5 animate-pulse pointer-events-none"></div>
      )}

      {/* Progress Bar background */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-200/20 dark:bg-white/5">
        <div 
          className={`h-full ${currentStyle.progress} transition-all duration-1000 ease-linear`}
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex gap-1 items-center flex-wrap">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentStyle.badge}`}>
            {priority}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-200/50 text-neutral-600 dark:bg-white/5 dark:text-gray-400 border border-neutral-300 dark:border-white/5">
            {task.category || 'Personal'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span className={`${currentStyle.timerText}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <h3 className="text-neutral-800 dark:text-white font-medium text-sm mb-4 line-clamp-2 pr-2">
        {title}
      </h3>

      {/* Expandable AI Action Plan Section */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isActionPlanExpanded ? 'max-h-64 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-2 mt-2 bg-white/50 dark:bg-black/20 rounded-lg p-3 border border-neutral-200 dark:border-white/5">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#00CFCF]">
            <Zap className="w-3.5 h-3.5" />
            <span>Autonomous Action Plan</span>
          </div>
          {subtasks.map((st) => (
            <button
              key={st.id}
              onClick={() => handleToggleSubtask(st.id)}
              className="flex items-start gap-2.5 w-full text-left group"
            >
              <div className={`mt-0.5 transition-colors ${st.completed ? 'text-[#00CFCF]' : 'text-neutral-400 dark:text-gray-500 group-hover:text-[#00CFCF]/70'}`}>
                {st.completed ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </div>
              <span className={`text-xs transition-all ${st.completed ? 'line-through text-neutral-400 dark:text-gray-500' : 'text-neutral-700 dark:text-gray-300'}`}>
                {st.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mt-auto pt-2 border-t border-neutral-200 dark:border-white/5">
        <button
          onClick={() => { playClick(); setIsActionPlanExpanded(!isActionPlanExpanded); }}
          className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 ${
            isActionPlanExpanded 
              ? 'bg-[#00CFCF]/15 text-[#00CFCF] border border-[#00CFCF]/30 shadow-[0_0_12px_rgba(0,207,207,0.25)]' 
              : 'bg-gradient-to-r from-[#00CFCF]/10 to-[#007BFF]/10 hover:from-[#00CFCF] hover:to-[#007BFF] text-[#007BFF] dark:text-[#00CFCF] hover:text-white border border-[#00CFCF]/30 hover:border-transparent hover:shadow-[0_4px_15px_rgba(0,207,207,0.4)] hover:-translate-y-0.5'
          }`}
          title="AI Action Plan"
        >
          <Zap className={`w-3.5 h-3.5 transition-transform duration-300 ${isActionPlanExpanded ? 'rotate-12 scale-110' : 'group-hover:scale-110 group-hover:rotate-12'}`} />
          AI Plan
        </button>

        <div className="flex gap-2 items-center">
          {task.aiEnabled && (
            <button
              onClick={() => { playClick(); setIsAIChatOpen(true); }}
              title="Chat with AI Assistant"
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide bg-[#FF6A00]/10 hover:bg-[#FF6A00] text-[#FF6A00] hover:text-white border border-[#FF6A00]/30 hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-[0_4px_15px_rgba(255,106,0,0.4)] cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
              AI Chat
            </button>
          )}
          <button
            onClick={handleDelete}
            title="Delete Reminder"
            className="p-1.5 rounded-lg bg-neutral-100 dark:bg-white/5 hover:bg-red-500/10 text-neutral-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 border border-neutral-200 dark:border-white/5 hover:border-red-500/20 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleComplete}
            title="Mark Done"
            className="p-1.5 rounded-lg bg-neutral-100 dark:bg-white/5 hover:bg-green-500/10 text-neutral-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 border border-neutral-200 dark:border-white/5 hover:border-green-500/20 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {showEmergencyOverlay && (
        <div className="absolute inset-0 bg-neutral-900/90 dark:bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 z-20 text-center animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-[#FF6A00]/10 border border-[#FF6A00]/30 flex items-center justify-center text-[#FF6A00] animate-bounce mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-1">
            Deadline Warning!
          </h4>
          <p className="text-white/70 text-[10px] leading-relaxed mb-4 max-w-[200px]">
            Your important task is due in 10 minutes.
          </p>
          <div className="flex gap-2 w-full max-w-[200px]">
            <button
              onClick={handleSnooze}
              className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold border border-white/10 transition-all cursor-pointer"
            >
              Snooze 5m
            </button>
            <button
              onClick={handleAIHelp}
              disabled={aiGeneratingHelp}
              className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-[#00CFCF] to-[#007BFF] text-white text-[10px] font-bold shadow-md shadow-[#00CFCF]/25 hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {aiGeneratingHelp ? 'Loading...' : 'AI Help'}
            </button>
          </div>
        </div>
      )}

      {isAIChatOpen && (
        <TaskAIChat task={task} onClose={() => setIsAIChatOpen(false)} />
      )}
    </div>
  );
}
