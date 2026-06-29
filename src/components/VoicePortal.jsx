import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, Activity, AlertCircle, Sparkles, Check, X, Edit3, ChevronDown, Calendar } from 'lucide-react';
import { parseReminderInput } from '../utils/nlpParser';
import { playClick } from '../utils/soundSynth';
import { speakTaskCaptured, speakText } from '../utils/speechSynth';
import lailaLogo from '../assets/laila_logo.png';
import CustomSelect from './CustomSelect';

export default function VoicePortal({ isVoiceActive, setIsVoiceActive, onAddTask, userProfile, onRefreshTasks, toggleTheme, mode = 'dashboard', contextDate }) {
  const [status, setStatus] = useState('Voice system idle');
  const [transcript, setTranscript] = useState('');
  const [micPermission, setMicPermission] = useState(null);
  
  // Review/Edit states
  const [isReviewing, setIsReviewing] = useState(false);
  const isReviewingRef = useRef(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState(60);
  const [editPriority, setEditPriority] = useState('Medium');
  const [editCategory, setEditCategory] = useState('Personal');
  const [editDateTime, setEditDateTime] = useState('');
  
  // New States for Recurring & AI Mode
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editRecurInterval, setEditRecurInterval] = useState(1);
  const [editRecurUnit, setEditRecurUnit] = useState('days');
  const [editAiEnabled, setEditAiEnabled] = useState(false);
  
  // Pending action for postpone/prepone/cancel tasks reason collection
  const [pendingAction, setPendingAction] = useState(null);
  const pendingActionRef = useRef(null);
  useEffect(() => {
    pendingActionRef.current = pendingAction;
  }, [pendingAction]);
  
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const silenceTimerRef = useRef(null);
  
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const languages = [
    { code: 'en-IN', name: 'English (India)', native: 'English' },
    { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
    { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te-IN', name: 'Telugu', native: 'తెలుగు' },
    { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'mr-IN', name: 'Marathi', native: 'मराठी' },
    { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'bn-IN', name: 'Bengali', native: 'বাংলা' }
  ];

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calHour, setCalHour] = useState('09');
  const [calMinute, setCalMinute] = useState('00');
  const [calMeridian, setCalMeridian] = useState('AM');

  const [isHourOpen, setIsHourOpen] = useState(false);
  const [isMinuteOpen, setIsMinuteOpen] = useState(false);
  const [isMeridianOpen, setIsMeridianOpen] = useState(false);

  // Workspace Sync State
  const [syncGoogle, setSyncGoogle] = useState(false);
  const [syncNotion, setSyncNotion] = useState(false);
  const [syncTelegram, setSyncTelegram] = useState(false);
  const [syncEmail, setSyncEmail] = useState(false);

  const draftStateRef = useRef({ 
    title: '', durationSeconds: 60, syncGoogle: false, syncNotion: false, syncTelegram: false, syncEmail: false, 
    priority: 'Medium', category: 'Personal', isRecurring: false, recurInterval: 1, recurUnit: 'days', aiEnabled: false 
  });

  useEffect(() => {
    isReviewingRef.current = isReviewing;
    draftStateRef.current = { 
      title: editTitle, durationSeconds: editDuration, syncGoogle, syncNotion, syncTelegram, syncEmail, 
      priority: editPriority, category: editCategory,
      isRecurring: editIsRecurring, recurInterval: editRecurInterval, recurUnit: editRecurUnit, aiEnabled: editAiEnabled
    };
  }, [isReviewing, editTitle, editDuration, syncGoogle, syncNotion, syncTelegram, syncEmail, editPriority, editCategory, editIsRecurring, editRecurInterval, editRecurUnit, editAiEnabled]);

  const formatLocalISO = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  const handleDateSelect = (day) => {
    const newDate = new Date(calYear, calMonth, day);
    let h = parseInt(calHour, 10);
    if (calMeridian === 'PM' && h < 12) h += 12;
    if (calMeridian === 'AM' && h === 12) h = 0;
    newDate.setHours(h, parseInt(calMinute, 10), 0, 0);

    const isoStr = formatLocalISO(newDate);
    setEditDateTime(isoStr);
    
    const diffSec = Math.max(1, Math.round((newDate.getTime() - Date.now()) / 1000));
    setEditDuration(diffSec);
  };

  const updateTime = (hStr, mStr, meridian) => {
    const current = editDateTime ? new Date(editDateTime) : new Date();
    let h = parseInt(hStr, 10);
    if (meridian === 'PM' && h < 12) h += 12;
    if (meridian === 'AM' && h === 12) h = 0;
    current.setHours(h, parseInt(mStr, 10), 0, 0);

    const isoStr = formatLocalISO(current);
    setEditDateTime(isoStr);

    const diffSec = Math.max(1, Math.round((current.getTime() - Date.now()) / 1000));
    setEditDuration(diffSec);
  };

  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const micButtonRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const canvasAnimationFrameRef = useRef(null);
  const transcriptRef = useRef('');
  const abortControllerRef = useRef(null);

  const audioLevelsRef = useRef({ volume: 0, bass: 0, mid: 0, treble: 0 });

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const resetPortal = useCallback(() => {
    window.isLailaListening = false;
    window.dispatchEvent(new Event('laila_mic_state'));
    if (recognitionRef.current) {
      recognitionRef.current.onstart = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (err) {}
    }
    setTranscript('');
    setIsReviewing(false);
    setIsVoiceActive(false);
    setStatus('Voice system idle');
  }, [setIsVoiceActive]);

  useEffect(() => {
    if (!isVoiceActive) return;

    setIsReviewing(false);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Speech Recognition not supported.');
      setMicPermission(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false; // Discrete command mode: auto-detects end of sentence
    rec.interimResults = true;
    rec.lang = selectedLang;

    rec.onstart = () => {
      window.isLailaListening = true;
      window.dispatchEvent(new Event('laila_mic_state'));
      setStatus('Listening... Speak now.');
      setTranscript('');
      transcriptRef.current = '';
      
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (!transcriptRef.current.trim()) {
          try { rec.stop(); } catch (err) {}
        }
      }, 7000);
    };

    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      
      const result = (final || interim).trim();
      if (result) {
        setTranscript(result);
        transcriptRef.current = result;
      }
    };

    rec.onerror = (e) => {
      console.error('Speech recognition error:', e.error);
      if (e.error === 'not-allowed') {
        setStatus('Microphone access denied.');
        setMicPermission(false);
      } else if (e.error === 'no-speech') {
        setStatus('No speech detected.');
      } else if (e.error === 'aborted') {
        // Ignored
      } else {
        setStatus(`Error: ${e.error}`);
      }
    };

    rec.onend = async () => {
      window.isLailaListening = false;
      window.dispatchEvent(new Event('laila_mic_state'));
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      
      const finalCommandText = transcriptRef.current.trim();

      if (finalCommandText) {
        const lowerText = finalCommandText.toLowerCase();
        const exitPhrases = ['thank you', 'thanks laila', 'thankyou', 'thank you laila', 'bye', 'goodbye', 'stop listening', 'exit', 'close'];
        if (exitPhrases.some(p => lowerText.includes(p))) {
           speakText(`You're welcome, ${userProfile.gender === 'Female' ? 'Madam' : 'Sir'}! Have a great day.`, userProfile, () => {
             resetPortal();
           });
           return;
        }

        setStatus('Processing...');
        playClick();

        // Check if we are waiting for a reason for a pending action (e.g. postpone, prepone, cancel)
        if (pendingActionRef.current) {
          const { actionType, taskId, updatedFields } = pendingActionRef.current;
          setPendingAction(null); // Clear state
          
          try {
            if (actionType === 'cancel' || actionType === 'delete') {
              const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: finalCommandText })
              });
              if (res.ok) {
                const msg = `Task cancelled successfully, ${userProfile.gender === 'Female' ? 'Madam' : 'Sir'}. I have logged your reason: "${finalCommandText}".`;
                speakText(msg, userProfile, () => {
                  if (onRefreshTasks) onRefreshTasks();
                  try { rec.start(); } catch (err) {}
                });
              } else {
                throw new Error("Failed to delete task");
              }
            } else {
              // postpone / prepone / modify
              const res = await fetch(`/api/tasks/${taskId}/modify`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...updatedFields, reason: finalCommandText })
              });
              if (res.ok) {
                const msg = `Task updated successfully, ${userProfile.gender === 'Female' ? 'Madam' : 'Sir'}. I have logged your reason: "${finalCommandText}".`;
                speakText(msg, userProfile, () => {
                  if (onRefreshTasks) onRefreshTasks();
                  try { rec.start(); } catch (err) {}
                });
              } else {
                throw new Error("Failed to update task");
              }
            }
          } catch (err) {
            console.error(err);
            speakText(`Sorry ${userProfile.gender === 'Female' ? 'Madam' : 'Sir'}, I couldn't complete that request.`, userProfile, () => {
              try { rec.start(); } catch (e) {}
            });
          }
          return;
        }

        try {
          const context = {
            isReviewing: isReviewingRef.current,
            draftDetails: isReviewingRef.current ? draftStateRef.current : null,
            clientTime: new Date().toString(),
            contextDate: contextDate ? contextDate.toString() : null
          };
          const res = await fetch('/api/assistant', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: finalCommandText, context })
          });
          if (!res.ok) {
            const errBody = await res.text().catch(() => res.status);
            console.error('[Laila] /api/assistant error:', res.status, errBody);
            setStatus(`Error ${res.status}: ${res.status === 401 ? 'Session expired. Please re-login.' : 'Server error'}`);
            setTimeout(() => { resetPortal(); }, 3000);
            return;
          }
          if (res.ok) {
            const data = await res.json();
            const { action, params, speechResponse } = data;
            
            if (action === 'create_reminder') {
              setEditTitle(params.title);
              let finalDuration = params.durationSeconds || 60;
              if (params.targetTimeISO) {
                const targetTime = new Date(params.targetTimeISO).getTime();
                const now = Date.now();
                if (targetTime > now) finalDuration = Math.floor((targetTime - now) / 1000);
              }
              setEditDuration(finalDuration);
              if (params.priority) setEditPriority(params.priority);
              if (params.category) setEditCategory(params.category);
              if (params.isRecurring !== undefined) setEditIsRecurring(Boolean(params.isRecurring));
              if (params.recurInterval !== undefined) setEditRecurInterval(params.recurInterval);
              if (params.recurUnit !== undefined) setEditRecurUnit(params.recurUnit);
              if (params.aiEnabled !== undefined) setEditAiEnabled(Boolean(params.aiEnabled));
              
              setSyncGoogle(Boolean(userProfile.googleConnected));
              setSyncNotion(Boolean(userProfile.notionConnected));
              setSyncTelegram(Boolean(userProfile.telegramEnabled));
              setSyncEmail(Boolean(userProfile.emailEnabled && userProfile.isEmailVerified));

              setIsReviewing(true);
              speakTaskCaptured(params.title, userProfile, false, () => {
                // Restart mic after speaking so user can modify the draft via voice
                setTimeout(() => {
                  if (recognitionRef.current) {
                    try { recognitionRef.current.start(); } catch(e) {}
                  }
                }, 600);
              });
            } else if (action === 'update_draft') {
              if (params.title) setEditTitle(params.title);
              if (params.targetTimeISO) {
                const targetTime = new Date(params.targetTimeISO).getTime();
                const now = Date.now();
                if (targetTime > now) {
                  const finalDur = Math.floor((targetTime - now) / 1000);
                  setEditDuration(finalDur);
                }
              } else if (params.durationSeconds) {
                setEditDuration(params.durationSeconds);
              }
              if (params.priority) setEditPriority(params.priority);
              if (params.category) setEditCategory(params.category);
              if (params.isRecurring !== undefined) setEditIsRecurring(params.isRecurring);
              if (params.recurInterval !== undefined) setEditRecurInterval(params.recurInterval);
              if (params.recurUnit !== undefined) setEditRecurUnit(params.recurUnit);
              if (params.aiEnabled !== undefined) setEditAiEnabled(params.aiEnabled);
              if (params.syncGoogle !== undefined) setSyncGoogle(params.syncGoogle);
              if (params.syncNotion !== undefined) setSyncNotion(params.syncNotion);
              if (params.syncTelegram !== undefined) setSyncTelegram(params.syncTelegram);
              if (params.syncEmail !== undefined) setSyncEmail(params.syncEmail);
              
              speakText(speechResponse, userProfile, () => { try { rec.start(); } catch (err) {} });
            } else if (action === 'confirm_draft') {
              speakText(speechResponse, userProfile, () => {
                const finalDraft = draftStateRef.current;
                onAddTask({
                  title: finalDraft.title, durationSeconds: finalDraft.durationSeconds, priority: finalDraft.priority,
                  category: finalDraft.category, syncGoogle: finalDraft.syncGoogle, syncNotion: finalDraft.syncNotion,
                  syncTelegram: finalDraft.syncTelegram, syncEmail: finalDraft.syncEmail, isRecurring: finalDraft.isRecurring,
                  recurInterval: finalDraft.recurInterval, recurUnit: finalDraft.recurUnit, aiEnabled: finalDraft.aiEnabled
                });
                speakTaskCaptured(finalDraft.title, userProfile, false);
                setIsReviewing(false);
                try { rec.start(); } catch (err) {}
              });
            } else if (action === 'discard_draft') {
              speakText(speechResponse, userProfile, () => { setIsReviewing(false); try { rec.start(); } catch (err) {} });
            } else if (action === 'navigate') {
              speakText(speechResponse, userProfile, () => { try { rec.start(); } catch (err) {} });
              window.dispatchEvent(new CustomEvent('laila_navigate', { detail: params.destination }));
            } else if (action === 'toggle_theme') {
              if (toggleTheme) toggleTheme();
              speakText(speechResponse, userProfile, () => { try { rec.start(); } catch (err) {} });
            } else if (action === 'modify_existing_task') {
              try {
                let finalDuration = params.durationSeconds;
                if (params.targetTimeISO) {
                  const targetTime = new Date(params.targetTimeISO).getTime();
                  const now = Date.now();
                  if (targetTime > now) finalDuration = Math.floor((targetTime - now) / 1000);
                }
                const modifyRes = await fetch(`/api/tasks/${params.taskId}/modify`, {
                  method: 'PUT',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: params.title,
                    durationSeconds: finalDuration,
                    priority: params.priority,
                    category: params.category,
                    aiEnabled: params.aiEnabled,
                    reason: params.reason || 'Requested via voice'
                  })
                });
                if (modifyRes.ok) {
                  speakText(speechResponse, userProfile, () => {
                    if (onRefreshTasks) onRefreshTasks();
                    try { rec.start(); } catch (err) {}
                  });
                } else {
                  throw new Error("Failed to modify");
                }
              } catch (e) {
                console.error(e);
                speakText(`I was unable to update that task, ${userProfile.gender === 'Female' ? 'Madam' : 'Sir'}.`, userProfile, () => {
                  try { rec.start(); } catch (err) {}
                });
              }
            } else if (action === 'delete_existing_task') {
              try {
                const deleteRes = await fetch(`/api/tasks/${params.taskId}`, {
                  method: 'DELETE',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reason: params.reason || 'Requested via voice' })
                });
                if (deleteRes.ok) {
                  speakText(speechResponse, userProfile, () => {
                    if (onRefreshTasks) onRefreshTasks();
                    try { rec.start(); } catch (err) {}
                  });
                } else {
                  throw new Error("Failed to delete");
                }
              } catch (e) {
                console.error(e);
                speakText(`I was unable to cancel that task, ${userProfile.gender === 'Female' ? 'Madam' : 'Sir'}.`, userProfile, () => {
                  try { rec.start(); } catch (err) {}
                });
              }
            } else if (action === 'ask_for_reason') {
              let finalDuration = params.updatedFields?.durationSeconds;
              if (params.updatedFields?.targetTimeISO) {
                const targetTime = new Date(params.updatedFields.targetTimeISO).getTime();
                const now = Date.now();
                if (targetTime > now) finalDuration = Math.floor((targetTime - now) / 1000);
              }
              const cleanFields = { ...params.updatedFields };
              if (finalDuration !== undefined) {
                cleanFields.durationSeconds = finalDuration;
                delete cleanFields.targetTimeISO;
              }
              setPendingAction({
                actionType: params.pendingAction,
                taskId: params.taskId,
                updatedFields: cleanFields
              });
              speakText(speechResponse, userProfile, () => {
                try { rec.start(); } catch (err) {}
              });
            } else {
              speakText(speechResponse, userProfile, () => { try { rec.start(); } catch (err) {} });
            }
          } else {
            setStatus('System offline');
            setTimeout(() => { resetPortal(); }, 2000);
          }
        } catch (err) {
          console.error(err);
          setStatus('Network error');
          setTimeout(() => { resetPortal(); }, 2000);
        }
      } else {
        setStatus('Listening... Speak now.');
        setTimeout(() => {
          if (window.isLailaListening === false && recognitionRef.current) {
            try { rec.start(); } catch (err) {}
          }
        }, 400);
      }
    };
    recognitionRef.current = rec;
    try { rec.start(); setMicPermission(true); } catch (err) { console.error(err); }
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch (err) {}
      }
    };
  }, [isVoiceActive, selectedLang]);

  useEffect(() => {
    if (!isVoiceActive) return;
    let cancelled = false;
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const updateFrequencyData = () => {
          if (cancelled || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let total = 0, bassSum = 0, midSum = 0, trebleSum = 0;
          for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i];
            total += val;
            if (i < 8) bassSum += val; else if (i < 45) midSum += val; else trebleSum += val;
          }
          audioLevelsRef.current = {
            volume: Math.min(1, (total / bufferLength) / 65),
            bass: Math.min(1, (bassSum / 8) / 80),
            mid: Math.min(1, (midSum / 37) / 60),
            treble: Math.min(1, (trebleSum / (bufferLength - 45)) / 40)
          };
          animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
        };
        updateFrequencyData();
      } catch (err) { setMicPermission(false); }
    };
    initAudio();
    return () => {
      cancelled = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) try { audioContextRef.current.close(); } catch (err) {}
    };
  }, [isVoiceActive]);

  useEffect(() => {
    if (!isVoiceActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0, width, height;
    const resize = () => { width = canvas.width = canvas.offsetWidth; height = canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const render = () => {
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
      }
      ctx.clearRect(0, 0, width, height);
      const centerY = height / 2;
      ctx.save();
      const cardRadius = 16;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, cardRadius);
      ctx.clip();
      let { volume, bass, mid, treble } = audioLevelsRef.current;
      const isSilent = volume < 0.02;
      if (micPermission === false || isSilent) {
        const time = Date.now() * 0.001;
        volume = 0.12 + Math.sin(time * 2.5) * 0.05;
        bass = 0.14 + Math.sin(time * 4) * 0.07;
        mid = 0.12 + Math.cos(time * 2) * 0.04;
        treble = 0.08 + Math.sin(time * 5) * 0.03;
      }
      phase += 0.008 + mid * 0.02;
      if (!isReviewing) {
        const waveGradient = ctx.createLinearGradient(0, centerY, width, centerY);
        waveGradient.addColorStop(0, '#FF7A18');
        waveGradient.addColorStop(0.33, '#7C3AED');
        waveGradient.addColorStop(0.66, '#FFC857');
        waveGradient.addColorStop(1, '#10B981');
        const waves = [
          { amplitude: 12 + volume * 25, speed: 1.6, freq: 0.015, opacity: 0.6, thickness: 1.5 },
          { amplitude: 6 + volume * 15, speed: 2.3, freq: 0.025, opacity: 0.35, thickness: 1.0 }
        ];
        waves.forEach((w) => {
          ctx.beginPath();
          ctx.strokeStyle = waveGradient;
          ctx.globalAlpha = w.opacity;
          ctx.lineWidth = w.thickness;
          for (let x = 0; x < width; x += 4) {
            const envelope = Math.sin((x / width) * Math.PI);
            const yOffset = Math.sin(x * w.freq + phase * w.speed) * w.amplitude * envelope;
            if (x === 0) ctx.moveTo(x, centerY + yOffset); else ctx.lineTo(x, centerY + yOffset);
          }
          ctx.stroke();
        });
        ctx.globalAlpha = 1.0;
      }

      // 2. Draw deforming border light exactly along card edges
      const borderPoints = [];
      const padding = 0;
      const radius = 16;
      
      // Top-Left Corner
      for (let a = Math.PI; a <= 1.5 * Math.PI; a += 0.12) borderPoints.push({ x: padding + radius + Math.cos(a) * radius, y: padding + radius + Math.sin(a) * radius });
      // Top Edge (Deformed)
      for (let x = padding + radius; x <= width - padding - radius; x += 15) {
        const envelope = Math.sin(((x - radius) / (width - radius * 2)) * Math.PI);
        const offset = Math.sin(x * 0.015 + phase * 2.2) * Math.cos(x * 0.007 - phase) * (4 + volume * 15) * envelope;
        borderPoints.push({ x, y: padding + offset });
      }
      // Top-Right Corner
      for (let a = 1.5 * Math.PI; a <= 2 * Math.PI; a += 0.12) borderPoints.push({ x: width - padding - radius + Math.cos(a) * radius, y: padding + radius + Math.sin(a) * radius });
      // Right Edge (Deformed)
      for (let y = padding + radius; y <= height - padding - radius; y += 15) {
        const envelope = Math.sin(((y - radius) / (height - radius * 2)) * Math.PI);
        const offset = Math.sin(y * 0.015 - phase * 1.8) * Math.cos(y * 0.007 + phase * 0.5) * (4 + volume * 15) * envelope;
        borderPoints.push({ x: width - padding - offset, y });
      }
      // Bottom-Right Corner
      for (let a = 0; a <= 0.5 * Math.PI; a += 0.12) borderPoints.push({ x: width - padding - radius + Math.cos(a) * radius, y: height - padding - radius + Math.sin(a) * radius });
      // Bottom Edge (Deformed)
      for (let x = width - padding - radius; x >= padding + radius; x -= 15) {
        const envelope = Math.sin(((x - radius) / (width - radius * 2)) * Math.PI);
        const offset = Math.sin(x * 0.015 + phase * 2.2) * Math.cos(x * 0.007 - phase) * (4 + volume * 15) * envelope;
        borderPoints.push({ x, y: height - padding - offset });
      }
      // Bottom-Left Corner
      for (let a = 0.5 * Math.PI; a <= Math.PI; a += 0.12) borderPoints.push({ x: padding + radius + Math.cos(a) * radius, y: height - padding - radius + Math.sin(a) * radius });
      // Left Edge (Deformed)
      for (let y = height - padding - radius; y >= padding + radius; y -= 15) {
        const envelope = Math.sin(((y - radius) / (height - radius * 2)) * Math.PI);
        const offset = Math.sin(y * 0.015 - phase * 1.8) * Math.cos(y * 0.007 + phase * 0.5) * (4 + volume * 15) * envelope;
        borderPoints.push({ x: padding + offset, y });
      }

      if (borderPoints.length > 0) {
        const borderGlow = ctx.createLinearGradient(0, 0, width, height);
        borderGlow.addColorStop(0, '#10B981');    // Emerald
        borderGlow.addColorStop(0.33, '#FFC857'); // Amber
        borderGlow.addColorStop(0.66, '#7C3AED'); // Violet
        borderGlow.addColorStop(1, '#FF7A18');    // Orange

        ctx.beginPath();
        ctx.moveTo(borderPoints[0].x, borderPoints[0].y);
        for (let i = 1; i < borderPoints.length; i++) ctx.lineTo(borderPoints[i].x, borderPoints[i].y);
        ctx.closePath();
        
        ctx.strokeStyle = borderGlow;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const layers = [
          { width: 90, blur: 24, opacity: 0.12 },
          { width: 45, blur: 12, opacity: 0.25 },
          { width: 18, blur: 5,  opacity: 0.55 },
          { width: 3,  blur: 0.5,opacity: 0.95 }
        ];

        layers.forEach(layer => {
          ctx.filter = `blur(${layer.blur}px)`;
          ctx.lineWidth = layer.width + volume * (layer.width * 0.5);
          ctx.globalAlpha = (layer.opacity + volume * (layer.opacity * 0.3)) * (0.85 + volume * 0.15);
          ctx.stroke();
        });
        
        ctx.filter = 'none';
        ctx.globalAlpha = 1.0;
      }

      ctx.restore();
      if (micButtonRef.current) {
        const scaleVal = 1 + volume * 0.12;
        micButtonRef.current.style.transform = `scale(${scaleVal})`;
        micButtonRef.current.style.boxShadow = `0 0 ${15 + volume * 25}px rgba(0, 207, 207, ${0.4 + volume * 0.5})`;
      }
      canvasAnimationFrameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(canvasAnimationFrameRef.current); };
  }, [isVoiceActive, isReviewing, micPermission]);

  const handleSave = () => {
    playClick();
    onAddTask({
      title: editTitle,
      durationSeconds: parseInt(editDuration, 10) || 60,
      priority: editPriority,
      category: editCategory,
      syncGoogle, syncNotion, syncTelegram, syncEmail,
      isRecurring: editIsRecurring, recurInterval: editRecurInterval, recurUnit: editRecurUnit, aiEnabled: editAiEnabled
    });
    speakTaskCaptured(editTitle, userProfile, false);
    resetPortal();
  };

  const content = (
    <div 
      ref={cardRef}
      className={`bg-white dark:bg-[#1A1A1A]/45 border transition-all duration-500 ease-in-out rounded-2xl relative shadow-md flex flex-col justify-between ${
        (isLangDropdownOpen || isCalendarOpen) ? 'overflow-visible' : 'overflow-hidden'
      } ${
        isReviewing 
          ? `h-[560px] ${isVoiceActive ? 'border-transparent shadow-[0_0_30px_rgba(0,207,207,0.15)]' : 'border-[#00CFCF]/40 dark:border-[#00CFCF]/30'}` 
          : isVoiceActive
            ? 'border-transparent h-[380px] shadow-[0_0_30px_rgba(0,207,207,0.15)]' 
            : 'border-neutral-250 dark:border-[#00CFCF]/20 h-[240px] hover:border-neutral-350 dark:hover:border-[#00CFCF]/40'
      }`}
    >
      
      {isVoiceActive && (
        <div className="absolute inset-0 z-30 w-full h-full pointer-events-none">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
      )}

      {isVoiceActive && !isReviewing && (
        <div className="absolute inset-0 bg-transparent z-20 flex flex-col justify-between p-5 text-neutral-800 dark:text-white animate-fade-in h-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#00CFCF] font-bold font-headings">Listening</span>
            </div>
            
            <button 
              onClick={resetPortal}
              className="p-1 rounded-full bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-500 dark:text-gray-400 border border-neutral-200 dark:border-white/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-2">
            <button
              ref={micButtonRef}
              className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-white border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.35)] transition-transform duration-75"
            >
              <Mic className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="text-center space-y-2 pb-2">
            <div className="text-[10px] text-[#00CFCF] font-bold tracking-wide animate-pulse">{status}</div>
            <div className="min-h-[50px] flex items-center justify-center px-4">
              {transcript ? (
                <p className="text-neutral-900 dark:text-white text-xs font-bold leading-relaxed line-clamp-3">
                  "{transcript}"
                </p>
              ) : (
                <p className="text-neutral-500 dark:text-gray-400 text-[10px] italic max-w-xs mx-auto">
                  Say reminder title, day, date or absolute time.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isReviewing && (
        <div className="absolute inset-0 bg-white dark:bg-[#151515] z-20 flex flex-col justify-between p-5 animate-fade-in h-full">
          <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/5 pb-2">
            <div className="flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-[#00CFCF]" />
              <span className="text-xs font-bold text-neutral-900 dark:text-white font-headings uppercase tracking-wider">
                Review Extracted Reminder
              </span>
            </div>
            <button 
              onClick={resetPortal}
              className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-400 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 py-3 text-xs overflow-y-auto flex-grow pr-1.5 custom-scrollbar">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase mb-1">Reminder Title:</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase mb-1">Priority:</label>
                <CustomSelect
                  value={editPriority}
                  onChange={setEditPriority}
                  options={[
                    { label: 'Low', value: 'Low' },
                    { label: 'Medium', value: 'Medium' },
                    { label: 'High', value: 'High' },
                    { label: 'Urgent', value: 'Urgent' }
                  ]}
                  buttonClassName="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-neutral-900 dark:text-white text-[10px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase mb-1">Category:</label>
                <CustomSelect
                  value={editCategory}
                  onChange={setEditCategory}
                  options={[
                    { label: 'Personal', value: 'Personal' },
                    { label: 'Work', value: 'Work' }
                  ]}
                  buttonClassName="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-neutral-900 dark:text-white text-[10px]"
                />
              </div>
            </div>
            
            <div className="mt-3">
              <label className="block text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase mb-1">Target Date & Time:</label>
              <input
                type="datetime-local"
                value={new Date(Date.now() + (editDuration || 60) * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => {
                  const targetMs = new Date(e.target.value).getTime();
                  const diffSec = Math.floor((targetMs - Date.now()) / 1000);
                  setEditDuration(diffSec > 0 ? diffSec : 60);
                }}
                className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-2 text-neutral-900 dark:text-white text-[10px] focus:outline-none"
              />
            </div>

            <div className="mt-3 border border-neutral-200 dark:border-white/10 rounded-lg p-2.5 bg-neutral-100 dark:bg-black/20 transition-colors">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={editAiEnabled}
                  onChange={(e) => setEditAiEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-white/20 text-[#00CFCF] focus:ring-[#00CFCF]"
                />
                <span className="text-[10px] font-bold text-neutral-600 dark:text-gray-300 uppercase tracking-wider group-hover:text-[#00CFCF] transition-colors">
                  Enable AI Assistant for this Task
                </span>
              </label>
            </div>

            <div className="mt-3">
              <label className="block text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase mb-2">Workspace Integrations:</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={syncGoogle} onChange={e => setSyncGoogle(e.target.checked)} className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-white/20 text-[#FF6A00]" />
                  <span className="text-[10px] font-medium text-neutral-600 dark:text-gray-300">Sync Google</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={syncNotion} onChange={e => setSyncNotion(e.target.checked)} className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-white/20 text-[#007BFF]" />
                  <span className="text-[10px] font-medium text-neutral-600 dark:text-gray-300">Sync Notion</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={syncTelegram} onChange={e => setSyncTelegram(e.target.checked)} className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-white/20 text-[#0088cc]" />
                  <span className="text-[10px] font-medium text-neutral-600 dark:text-gray-300">Sync Telegram</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={syncEmail} onChange={e => setSyncEmail(e.target.checked)} className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-white/20 text-[#D44638]" />
                  <span className="text-[10px] font-medium text-neutral-600 dark:text-gray-300">Sync Email</span>
                </label>
              </div>
            </div>

          </div>

          <div className="flex gap-3 border-t border-neutral-200 dark:border-white/5 pt-3">
            <button
              onClick={resetPortal}
              className="w-1/3 py-2.5 rounded-xl border border-neutral-300 dark:border-white/10 text-neutral-600 dark:text-gray-300 font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 text-xs cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 text-white" />
              Save Reminder
            </button>
          </div>
        </div>
      )}

      {!isVoiceActive && !isReviewing && mode === 'dashboard' && (
        <div className="p-5 flex flex-col justify-between h-full w-full">
          <div className="flex justify-between items-start mb-4">
            <img src={lailaLogo} alt="Laila Voice Portal" className="h-20 object-contain -ml-4" />
            <div className="w-8 h-8 rounded-full bg-[#00CFCF]/10 border border-[#00CFCF]/30 flex items-center justify-center text-[#00CFCF] shrink-0 animate-breathe-blink">
              <Activity className="w-4.5 h-4.5" />
            </div>
          </div>
          
          <div className="space-y-2 mb-4 ml-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-[10px] text-neutral-600 dark:text-gray-300">
                To activate voice mode, tell <span className="font-bold text-[#00CFCF]">"Hey, Laila"</span> / Click the button below
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <p className="text-[10px] text-neutral-600 dark:text-gray-300">
                For deactivating voice mode, tell <span className="font-bold text-[#00CFCF]">"ThankYou, Laila"</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => { playClick(); setIsVoiceActive(true); }}
            className="w-full mt-auto flex items-center justify-center gap-2 bg-[#007BFF] hover:bg-[#007BFF]/95 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-sm"
          >
            <Mic className="w-3.5 h-3.5 text-white" />
            Launch Voice Assistant
          </button>
        </div>
      )}
    </div>
  );

  // If in fullscreen mode and not active, hide completely
  if (mode === 'fullscreen' && !isVoiceActive && !isReviewing) {
    return null;
  }

  // If in fullscreen mode, wrap the portal in a fixed overlay
  if (mode === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-lg">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
