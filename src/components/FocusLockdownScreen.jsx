import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Mic, Play, Pause, AlertTriangle, Sparkles } from 'lucide-react';

export default function FocusLockdownScreen({ task, onDismiss, onStartRescueMode, onOpenAIWorkspace }) {
  const [timeLeft, setTimeLeft] = useState(120);
  const [recognizedText, setRecognizedText] = useState("");
  const [interactionState, setInteractionState] = useState("idle"); // idle, asking_reason, processing
  const [freeDateInfo, setFreeDateInfo] = useState(null);
  
  const synthRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // 120-second countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      if (synthRef.current) synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = window.speechSynthesis.getVoices().find(v => v.name.includes('Google UK English Female')) || null;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
      synthRef.current = window.speechSynthesis;
    }
  };

  useEffect(() => {
    speak(`Excuse me, Karthi. We have reached the buffer limit for your task: ${task.title}. To guarantee you do not miss this deadline, I highly recommend starting now. Say 'start task', 'AI assistant', or 'reschedule'.`);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = async (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('').toLowerCase();
        
        setRecognizedText(transcript);
        const finalEvent = Array.from(event.results).find(r => r.isFinal);
        
        if (finalEvent) {
          const finalTranscript = finalEvent[0].transcript.toLowerCase();
          
          if (interactionState === 'idle') {
            if (finalTranscript.includes('start task') || finalTranscript.includes('initiate')) {
              handleAction('started');
            } else if (finalTranscript.includes('ai assistant') || finalTranscript.includes('ai workspace')) {
              handleAction('ai_assistant');
            } else if (finalTranscript.includes('reschedule') || finalTranscript.includes('delay')) {
              // Initiate reschedule flow
              setInteractionState('processing');
              try {
                const res = await fetch('/api/calendar/free-day');
                const data = await res.json();
                const d = new Date(data.freeDate);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                setFreeDateInfo(data);
                
                speak(`I checked your schedule and found a free spot on ${dayName}. Please tell me the reason for rescheduling so I can save it.`);
                setInteractionState('asking_reason');
              } catch (e) {
                console.error(e);
                speak("I couldn't check your calendar. Please try clicking the button.");
                setInteractionState('idle');
              }
            }
          } else if (interactionState === 'asking_reason') {
            // User provided the reason
            setInteractionState('processing');
            speak("Got it. I have rescheduled your task.");
            handleAction('rescheduled_with_reason', { reason: finalTranscript, targetDate: freeDateInfo.freeDate });
          }
        }
      };

      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech recognition already started or blocked.", e);
      }
    }

    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, [task, interactionState, freeDateInfo]);

  const handleAction = async (action, payload = {}) => {
    if (synthRef.current) synthRef.current.cancel();
    if (recognitionRef.current) recognitionRef.current.stop();
    
    if (action === 'rescheduled_with_reason') {
      await fetch(`/api/tasks/${task.taskId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: payload.reason, targetDate: payload.targetDate })
      });
      onDismiss();
    } else if (action === 'started') {
      // Don't just dismiss, trigger rescue view
      await fetch(`/api/tasks/${task.taskId}/start`, { method: 'POST' });
      onStartRescueMode();
    } else if (action === 'ai_assistant') {
      onOpenAIWorkspace();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center">
      <div className="max-w-2xl w-full p-8 bg-red-900/20 border border-red-500/30 rounded-3xl text-center space-y-8 animate-fade-in">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-headings font-bold text-white mb-2">Focus Lockdown</h1>
          <p className="text-red-300 text-lg">The safety buffer for <span className="font-bold text-white">"{task.title}"</span> has been breached.</p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
          <p className="text-gray-300 italic mb-6">
            "You are running out of time. Don't think about the entire project. Just commit to doing 2 minutes of work on it right now."
          </p>
          
          <div className="text-7xl font-mono font-bold text-[#FF6A00] animate-pulse">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="flex justify-center items-center gap-2 text-sm text-gray-400">
          <Mic className="w-4 h-4 text-[#00CFCF] animate-pulse" />
          <span>
            Ambient Listening Active: Say <span className="text-white font-bold">"Start task"</span>, <span className="text-white font-bold">"AI Assistant"</span>, or <span className="text-white font-bold">"Reschedule"</span>
          </span>
        </div>
        
        {interactionState === 'asking_reason' && (
          <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-300 animate-pulse">
            Waiting for your reason for rescheduling...
          </div>
        )}

        {recognizedText && (
          <p className="text-xs text-gray-500">Heard: "{recognizedText}"</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <button 
            onClick={() => handleAction('started')}
            className="py-4 bg-[#00CFCF] hover:bg-[#00B5B5] text-black font-bold rounded-xl text-lg transition-colors"
          >
            I'm Starting Now
          </button>
          <button 
            onClick={() => handleAction('ai_assistant')}
            className="py-4 bg-[#FF6A00] hover:bg-[#FF8C00] text-white font-bold rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            AI Assistant
          </button>
          <button 
            onClick={() => {
              // Manual bypass if voice isn't working
              handleAction('rescheduled_with_reason', { reason: 'Manual click', targetDate: new Date(Date.now() + 86400000).toISOString() });
            }}
            className="py-4 bg-transparent hover:bg-white/5 border border-white/10 text-white font-bold rounded-xl text-lg transition-colors"
          >
            Emergency Exit (Delay)
          </button>
        </div>
      </div>
    </div>
  );
}
