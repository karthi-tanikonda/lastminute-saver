import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  Sparkles, Mic, BellRing, Volume2, ShieldAlert, Award, Clock, 
  Sun, Moon, Search, Calendar, Folder, User, Bell, ChevronLeft, 
  ChevronRight, HelpCircle, AlignLeft, ShieldCheck, HeartHandshake,
  Activity, CheckCircle2, History, X, Settings, Plus, Trash, CalendarDays, CalendarRange, LogOut, Bot, Home, BarChart2, Rows3, LayoutGrid, Repeat, Pipette
} from 'lucide-react';
import { HexColorPicker } from "react-colorful";
import logoLight from './assets/logo-light.png';
import logoDark from './assets/logo-dark.png';
import TaskForm from './components/TaskForm';
import TaskBoard from './components/TaskBoard';
import VoicePortal from './components/VoicePortal';
import CalendarView from './components/CalendarView';
import IntegrationCards from './components/IntegrationCards';
import Footer from './components/Footer';
import StreakWidget from './components/StreakWidget';
import AIModeView from './components/AIModeView';
import HistoryView from './components/HistoryView';
import AnalyticsView from './components/AnalyticsView';
import ChangeLogView from './components/ChangeLogView';
import RecurringTasksView from './components/RecurringTasksView';
import FocusLockdownScreen from './components/FocusLockdownScreen';
import BreachedTasksRescueView from './components/BreachedTasksRescueView';
import { playChime, playClick } from './utils/soundSynth';
import { speakReminder } from './utils/speechSynth';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';

function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceContextDate, setVoiceContextDate] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [theme, setTheme] = useState('dark');
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [lastHeard, setLastHeard] = useState('');
  const [notifications, setNotifications] = useState([
    { id: 'init-1', text: 'Welcome to LastMinuteSaver! Multi-user security active.', type: 'system', time: new Date() },
    { id: 'init-2', text: 'Voice Assistant initialized. Indian language translation engine loaded.', type: 'system', time: new Date() }
  ]);
  
  // Navigation & Filtering state
  const boardContainerRef = React.useRef(null);
  const sidebarCollapseTimer = React.useRef(null);
  const calFlyoutTimer = React.useRef(null);
  const [showCalFlyout, setShowCalFlyout] = useState(false);
  const [highlightTrigger, setHighlightTrigger] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [activeFilter, setActiveFilter] = useState(() => {
    return localStorage.getItem('lms_active_tab') || 'all';
  });
  const [calendarViewMode, setCalendarViewMode] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Dynamic Categories, Profiles, and Sorting States
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#00CFCF');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [sortBy, setSortBy] = useState('time'); 
  const [userProfile, setUserProfile] = useState({ username: 'User', gender: 'Male' });
  
  // Lockdown State
  const [showLockdown, setShowLockdown] = useState(false);
  const [breachedTask, setBreachedTask] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // OTP state variables
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [otpError, setOtpError] = useState('');

  const quotes = [
    "Time is of the essence! Do not let critical tasks expire.",
    "Procrastination is the thief of time. Let LMS save your day.",
    "Speak naturally: 'remind me to check the oven in 15 seconds urgent'.",
    "NLP Parser automatically maps priorities: Urgent, High, Med, Low.",
    "A stitch in time saves nine. Keep your dashboard organized!"
  ];

  // Rotate quotes every 8 seconds
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex(prev => (prev + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(quoteInterval);
  }, []);

  // Persist active tab across reloads
  useEffect(() => {
    localStorage.setItem('lms_active_tab', activeFilter);
  }, [activeFilter]);

  // Connect to SSE for Buffer Wall breaches
  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'BUFFER_BREACH') {
          // Verify task is still in our state before locking down
          setTasks(prev => {
            const exists = prev.find(t => t.id === data.taskId);
            if (exists) {
              setBreachedTask({ taskId: data.taskId, title: data.title });
              setShowLockdown(true);
            }
            return prev;
          });
        }
      } catch (e) {
        console.error("Error parsing SSE data", e);
      }
    };
    
    eventSource.onerror = (e) => {
      // Browser auto-reconnects on error
    };

    return () => eventSource.close();
  }, []);

  // Update Clock every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const fetchTasksData = useCallback(async () => {
    try {
      const taskRes = await fetch('/api/tasks');
      if (taskRes.ok) {
        const allTasks = await taskRes.json();
        const now = Date.now();
        const validActive = [];
        const validCompleted = [];
        
        allTasks.forEach(task => {
          if (task.completed) {
            const completedTime = task.completedAt || task.createdAt;
            if (now - completedTime > 30 * 24 * 60 * 60 * 1000) {
              // Automatically remove tasks older than 30 days
              fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).catch(console.error);
            } else {
              validCompleted.push(task);
            }
          } else {
            const elapsed = Math.floor((now - task.createdAt) / 1000);
            if (elapsed < task.durationSeconds) {
              validActive.push(task);
            } else {
              fetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: 1, completedAt: now })
              }).catch(console.error);
              validCompleted.push({ ...task, completed: true, completedAt: now });
            }
          }
        });
        setTasks(validActive);
        setCompletedTasks(validCompleted);
      }
    } catch(e) { console.error(e); }
  }, []);

  // Verify Auth session and load user data on mount
  useEffect(() => {
    const verifyUserAndLoad = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          navigate('/auth');
          return;
        }
        const userData = await meRes.json();
        setUserProfile({
          id: userData.id,
          username: userData.name || 'User',
          gender: userData.gender || 'Male',
          telegramEnabled: Boolean(userData.telegramEnabled),
          telegramChatId: userData.telegramChatId || '',
          emailEnabled: Boolean(userData.emailEnabled),
          emailAlert: userData.emailAlert || userData.email || '',
          isEmailVerified: Boolean(userData.isEmailVerified),
          phone: userData.phone || '',
          smsEnabled: Boolean(userData.smsEnabled),
          googleConnected: Boolean(userData.googleConnected),
          notionConnected: Boolean(userData.notionConnected),
          notionToken: userData.notionToken || '',
          notionDatabaseId: userData.notionDatabaseId || '',
        });
        setTheme(userData.theme || 'dark');
        document.documentElement.classList.toggle('dark', (userData.theme || 'dark') === 'dark');

        const catRes = await fetch('/api/categories');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData);
        }

        await fetchTasksData();

        // Notifications
        const notifRes = await fetch('/api/notifications');
        if (notifRes.ok) {
          const loadedNotifs = await notifRes.json();
          if (loadedNotifs.length > 0) setNotifications(loadedNotifs);
        }

      } catch (err) {
        console.error("Failed to authenticate user session.", err);
        navigate('/auth');
      }
    };
    verifyUserAndLoad();

    // Re-verify session automatically when user returns to this browser tab
    window.addEventListener('focus', fetchTasksData);
    return () => {
      window.removeEventListener('focus', fetchTasksData);
    };
  }, [navigate, fetchTasksData]);

  // Track initial user interaction to allow mic usage
  useEffect(() => {
    const handleInteract = () => {
      setHasInteracted(true);
      window.removeEventListener('click', handleInteract);
      window.removeEventListener('keydown', handleInteract);
    };
    window.addEventListener('click', handleInteract);
    window.addEventListener('keydown', handleInteract);
    
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('click', handleInteract);
      window.removeEventListener('keydown', handleInteract);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const handleLailaNavigate = (e) => {
      const dest = e.detail;
      if (dest === 'notifications') setIsNotificationOpen(true);
      else if (dest === 'history') setActiveFilter('history');
      else if (dest === 'calendar') setActiveFilter('calendar');
      else if (dest === 'ai_workspace' || dest === 'ai_chat' || dest === 'ai_mode') setActiveFilter('ai-mode');
      else if (dest === 'dashboard' || dest === 'all') setActiveFilter('all');
      else if (dest === 'analytics') setActiveFilter('analytics');
      else if (dest === 'recurring') setActiveFilter('recurring');
      else if (dest === 'rescheduled') setActiveFilter('rescheduled');
    };
    window.addEventListener('laila_navigate', handleLailaNavigate);
    return () => window.removeEventListener('laila_navigate', handleLailaNavigate);
  }, []);

  // Phase 5: "Hey Laila" Background Hotword Listener
  useEffect(() => {
    if (!hasInteracted) return; // Wait for user to click anywhere before starting mic
    if (isVoiceActive) return; // VoicePortal is active, let it handle the mic
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setLastHeard('Browser not supported');
      return;
    }

    let recognition = null;
    let restartTimer = null;
    let isUnmounted = false;

    const startRecognition = () => {
      if (isUnmounted || isVoiceActive) return;
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Optimized for regional accent detection

        recognition.onresult = (event) => {
          let text = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            text += event.results[i][0].transcript;
          }
          const lowerText = text.toLowerCase();
          setLastHeard(lowerText);
          
          const wakeWords = [
            'hey laila', 'hey, laila', 'hay laila', 'hey layla', 'hey lila', 'hey leila', 
            'a laila', 'he laila', 'hello laila', 'ok laila', 'hi laila', 'laila', 'layla', 
            'lila', 'leela', 'hello layla', 'hello lila', 'hello leela', 'ok layla', 'ok lila', 
            'ok leela', 'hey leela', 'hey assistant', 'open laila', 'activate laila', 'laila wake up'
          ];
          if (wakeWords.some(w => lowerText.includes(w))) {
            playClick();
            setIsVoiceActive(true);
            try { recognition.abort(); } catch (e) {}
          }
        };

        recognition.onerror = (e) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            setLastHeard(`Error: ${e.error}`);
          }
        };

        recognition.onend = () => {
          if (!isUnmounted && !isVoiceActive) {
            restartTimer = setTimeout(startRecognition, 600);
          }
        };

        recognition.start();
      } catch (err) {
        setLastHeard(`Mic Retry: ${err.message}`);
        if (!isUnmounted && !isVoiceActive) {
          restartTimer = setTimeout(startRecognition, 1500);
        }
      }
    };

    restartTimer = setTimeout(startRecognition, 400);

    return () => {
      isUnmounted = true;
      if (restartTimer) clearTimeout(restartTimer);
      if (recognition) {
        try { recognition.onend = null; recognition.abort(); } catch (e) {}
      }
    };
  }, [isVoiceActive, hasInteracted]);

  const toggleTheme = (forceTheme) => {
    setTheme(prevTheme => {
      let nextTheme;
      if (typeof forceTheme === 'string' && (forceTheme === 'dark' || forceTheme === 'light')) {
        nextTheme = forceTheme;
      } else {
        nextTheme = prevTheme === 'dark' ? 'light' : 'dark';
      }
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: nextTheme })
      }).catch(console.error);
      return nextTheme;
    });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, color: newCategoryColor })
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories(prev => [...prev, newCat]);
        setNewCategoryName('');
        setShowCatForm(false);
        logNotification(`Created custom category: "${newCat.name}"`, 'create');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    try {
      await fetch(`/api/categories/${catId}`, { method: 'DELETE' });
      setCategories(prev => prev.filter(c => c.id !== catId));
      logNotification(`Deleted category: "${catName}"`, 'delete');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: userProfile.username, 
          gender: userProfile.gender,
          phone: userProfile.phone,
          smsEnabled: userProfile.smsEnabled
        })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUserProfile(prev => ({
          ...prev,
          username: updatedUser.name,
          gender: updatedUser.gender,
          phone: updatedUser.phone,
          smsEnabled: Boolean(updatedUser.smsEnabled),
          isEmailVerified: Boolean(updatedUser.isEmailVerified)
        }));
        setShowProfileModal(false);
        logNotification(`Profile updated successfully!`, 'system');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendOTP = async () => {
    if (!userProfile.emailAlert) {
      setOtpError("Email address is required to send OTP.");
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    setOtpMessage('');
    try {
      const res = await fetch('/api/auth/profile/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userProfile.emailAlert })
      });
      if (res.status === 401) {
        setOtpError('Session expired. Redirecting to login...');
        setTimeout(() => navigate('/auth'), 2000);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setOtpSent(true);
        setOtpMessage(data.message || 'OTP sent successfully!');
      } else {
        const data = await res.json().catch(() => ({}));
        setOtpError(data.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setOtpError('Network error. Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setOtpError("Please enter the verification code.");
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    setOtpMessage('');
    try {
      const res = await fetch('/api/auth/profile/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode })
      });
      if (res.status === 401) {
        setOtpError('Session expired. Redirecting to login...');
        setTimeout(() => navigate('/auth'), 2000);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUserProfile(prev => ({ ...prev, isEmailVerified: true }));
          setOtpSent(false);
          setOtpCode('');
          setOtpMessage('Email verified successfully!');
        } else {
          setOtpError(data.message || 'Invalid code.');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setOtpError(data.error || 'Verification failed. Try again.');
      }
    } catch (err) {
      setOtpError('Network error. Verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogout = async () => {
    playClick();
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        navigate('/auth');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const logNotification = (text, type) => {
    const newNotif = { id: Date.now().toString(), text, type, time: new Date() };
    setNotifications(prev => [newNotif, ...prev]);
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNotif)
    }).catch(console.error);
  };

  // Handlers
  const handleAddTask = async (parsedInput) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedInput)
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [...prev, newTask]);
        logNotification(`Created reminder: "${newTask.title}" (${newTask.durationSeconds}s)`, 'create');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== id));
      logNotification(`Deleted reminder: "${task.title}"`, 'delete');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, completedAt: Date.now() })
      });
      setTasks(prev => prev.filter(t => t.id !== id));
      setCompletedTasks(prev => [...prev, { ...task, completed: true, completedAt: Date.now() }]);
      logNotification(`Completed reminder: "${task.title}"`, 'complete');
      if (task.isRecurring) {
        fetchTasksData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExpireTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, completedAt: Date.now() })
      });
      setTasks(prev => prev.filter(t => t.id !== id));
      const expiredTask = { ...task, completed: true, completedAt: Date.now() };
      setCompletedTasks(prev => [...prev, expiredTask]);
      logNotification(`⚠️ Alarm Triggered: "${task.title}"`, 'expire');
      playChime();
      speakReminder(task.title, userProfile);
      setActiveAlert(expiredTask);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissAlert = () => {
    playClick();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveAlert(null);
  };

  const completedTodayCount = completedTasks.filter(t => {
    const today = new Date().toDateString();
    const completedDate = new Date(t.completedAt).toDateString();
    return today === completedDate;
  }).length;

  // Heuristic filter computations
  const getSecondsRemaining = (task) => {
    const elapsed = Math.floor((Date.now() - task.createdAt) / 1000);
    const remaining = task.durationSeconds - elapsed;
    return remaining > 0 ? remaining : 0;
  };

  const getGreeting = () => {
    const hr = currentTime.getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const filteredTasks = tasks.filter(task => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(q);
    }

    if (activeFilter === 'all' || activeFilter === 'all-tasks' || activeFilter === 'calendar' || activeFilter === 'ai-mode') return true;
    
    const remaining = getSecondsRemaining(task);
    if (activeFilter === 'today') return remaining <= 86400;
    if (activeFilter === 'week') return remaining <= 7 * 86400;
    if (activeFilter === 'month') return remaining <= 30 * 86400;

    return task.category.toLowerCase() === activeFilter.toLowerCase();
  });

  const sortedFilteredTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'time') {
      return getSecondsRemaining(a) - getSecondsRemaining(b);
    }
    if (sortBy === 'priority') {
      const pMap = { Urgent: 3, High: 2, Medium: 1, Low: 0 };
      return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
    }
    if (sortBy === 'alpha') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const aiAdvice = () => {
    const activeTasks = tasks.filter(t => !t.completed);
    const honorific = userProfile.gender?.toLowerCase() === 'female' ? 'Madam' : 'Sir';

    if (activeTasks.length === 0) {
      return {
        text: "Your schedule is safe. No reminders pending. Speak or type to add a task.",
        speakable: `Your schedule is safe, ${honorific}. No reminders pending.`
      };
    }
    const urgentTasks = activeTasks.filter(t => t.priority === 'Urgent');
    const highTasks = activeTasks.filter(t => t.priority === 'High');
 
    if (urgentTasks.length > 0) {
      const topTask = urgentTasks[0];
      const remaining = getSecondsRemaining(topTask);
      return {
        text: `⚠️ Urgent task pending: '${topTask.title}' (${Math.ceil(remaining)}s left). Complete immediately.`,
        speakable: `Attention ${honorific}. You have urgent tasks pending. I recommend completing ${topTask.title} immediately.`
      };
    }
    if (highTasks.length > 0) {
      return {
        text: `🔔 High priority task: '${highTasks[0].title}'. Finish it before the alarm triggers.`,
        speakable: `Tip ${honorific}. Your task ${highTasks[0].title} is high priority. Keep an eye on it.`
      };
    }
    return {
      text: `💡 Dashboard stable. ${activeTasks.length} active tasks queued. You're doing great!`,
      speakable: `Your dashboard is stable with ${activeTasks.length} active tasks, ${honorific}.`
    };
  };

  const handleSpeakAdvice = () => {
    playClick();
    speakReminder(aiAdvice().speakable, userProfile);
  };

  return (
    <div className="h-screen bg-neutral-50 dark:bg-[#000000] text-neutral-800 dark:text-white flex overflow-hidden selection:bg-[#00CFCF] selection:text-black transition-colors duration-300">
      


      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside 
        onMouseEnter={() => {
          if (sidebarCollapseTimer.current) clearTimeout(sidebarCollapseTimer.current);
          setIsSidebarCollapsed(false);
        }}
        onMouseLeave={() => {
          sidebarCollapseTimer.current = setTimeout(() => setIsSidebarCollapsed(true), 200);
        }}
        className={`bg-white dark:bg-[#121212]/90 border-r border-neutral-200 dark:border-white/5 flex flex-col justify-between transition-all duration-300 ease-in-out z-30 shrink-0 h-screen ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex flex-col">
          {/* Top Panel: Collapse/Expand Button */}
          <div className="p-4 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-transparent font-headings">
                
              </span>
            )}
            <button
              onClick={() => { playClick(); setIsSidebarCollapsed(!isSidebarCollapsed); }}
              className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200/50 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white transition-all border border-neutral-200 dark:border-white/5 cursor-pointer ml-auto btn-premium"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Notification Bell */}
          <div className="p-3 border-b border-neutral-200 dark:border-white/5">
            <button 
              onClick={() => { playClick(); setIsNotificationOpen(true); }}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2'} rounded-lg bg-neutral-100 hover:bg-neutral-200/50 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-gray-300 cursor-pointer btn-sidebar-animate`}
            >
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
                <Bell className="w-5 h-5 text-[#FF6A00]" />
                {!isSidebarCollapsed && <span className="text-xs font-medium">Notifications</span>}
              </div>
              {!isSidebarCollapsed && notifications.length > 0 && (
                <span className="text-[9px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
            {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {!isSidebarCollapsed && <span className="text-[9px] font-bold text-neutral-400 dark:text-gray-500 uppercase tracking-widest block px-3 mb-1">Timeframes</span>}
            {/* Dashboard */}
            <button
              onClick={() => { playClick(); setActiveFilter('all'); setHighlightTrigger(true); setTimeout(() => setHighlightTrigger(false), 1000); }}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-xl text-xs font-semibold cursor-pointer btn-sidebar-animate transition-all ${activeFilter === 'all' ? 'bg-[#FF6A00] text-white shadow-md shadow-[#FF6A00]/25' : 'text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'}`}
              title="Dashboard"
            >
              <Home className={`w-5 h-5 shrink-0 transition-transform duration-300 ${activeFilter === 'all' ? 'text-white' : 'text-[#00CFCF]'}`} />
              {!isSidebarCollapsed && <span className="truncate">Dashboard</span>}
            </button>
            {/* Calendar View with Right-Side Flyout (state-based) */}
            <div className="relative w-full">
              <button
                onMouseEnter={() => {
                  if (calFlyoutTimer.current) clearTimeout(calFlyoutTimer.current);
                  if (!isSidebarCollapsed) setShowCalFlyout(true);
                }}
                onMouseLeave={() => {
                  calFlyoutTimer.current = setTimeout(() => setShowCalFlyout(false), 150);
                }}
                onClick={() => { playClick(); setActiveFilter('calendar'); setHighlightTrigger(true); setTimeout(() => setHighlightTrigger(false), 1000); }}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-xl text-xs font-semibold cursor-pointer btn-sidebar-animate transition-all ${activeFilter === 'calendar' ? 'bg-[#FF6A00] text-white shadow-md shadow-[#FF6A00]/25' : 'text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'}`}
                title="Calendar View"
              >
                <Calendar className={`w-5 h-5 shrink-0 transition-transform duration-300 ${activeFilter === 'calendar' ? 'text-white' : 'text-[#00CFCF]'}`} />
                {!isSidebarCollapsed && <span className="truncate">Calendar View</span>}
              </button>

              {/* Premium Glassmorphism Flyout */}
              {showCalFlyout && !isSidebarCollapsed && (
                <div
                  onMouseEnter={() => { if (calFlyoutTimer.current) clearTimeout(calFlyoutTimer.current); }}
                  onMouseLeave={() => { calFlyoutTimer.current = setTimeout(() => setShowCalFlyout(false), 150); }}
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-4 z-[200]"
                >
                  {/* Arrow connector */}
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-b-[7px] border-r-[8px] border-t-transparent border-b-transparent border-r-white/10" />
                  
                  {/* Card */}
                  <div className="bg-[#141414]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden min-w-[180px]">
                    {/* Top accent gradient bar */}
                    <div className="h-0.5 w-full bg-gradient-to-r from-[#00CFCF] via-[#FF6A00] to-[#007BFF]" />
                    
                    {/* Label */}
                    <div className="px-4 pt-3 pb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">View Mode</span>
                    </div>

                    {/* Options */}
                    {[
                      { label: 'This Week',    mode: 'week',   Icon: Rows3,      color: 'from-[#00CFCF]/20 to-[#00CFCF]/5',  iconColor: 'text-[#00CFCF]',  bg: 'bg-[#00CFCF]/10' },
                      { label: 'Next 10 Days', mode: '10days', Icon: CalendarDays, color: 'from-[#FF6A00]/20 to-[#FF6A00]/5', iconColor: 'text-[#FF6A00]',  bg: 'bg-[#FF6A00]/10' },
                      { label: 'This Month',   mode: 'month',  Icon: LayoutGrid,  color: 'from-[#007BFF]/20 to-[#007BFF]/5',  iconColor: 'text-[#007BFF]',  bg: 'bg-[#007BFF]/10' },
                    ].map(({ label, mode, Icon, color, iconColor, bg }, i) => (
                      <button
                        key={mode}
                        onClick={() => { playClick(); setActiveFilter('calendar'); setCalendarViewMode(mode); setShowCalFlyout(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left group/item transition-all duration-200 relative overflow-hidden ${calendarViewMode === mode ? `bg-gradient-to-r ${color}` : 'hover:bg-white/5'} ${i < 2 ? 'border-b border-white/5' : 'pb-3'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                        </div>
                        <span className={`text-xs font-semibold whitespace-nowrap transition-colors ${calendarViewMode === mode ? 'text-white' : 'text-white/60 group-hover/item:text-white'}`}>
                          {label}
                        </span>
                        {calendarViewMode === mode && (
                          <div className={`ml-auto w-1.5 h-1.5 rounded-full ${iconColor.replace('text-', 'bg-')}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-white/5 mt-2">
              {!isSidebarCollapsed && <span className="text-[9px] font-bold text-neutral-400 dark:text-gray-500 uppercase tracking-widest block px-3 mb-1.5">Insights</span>}
              {[
                { id: 'recurring', label: 'Recurring Tasks', icon: Repeat },
                { id: 'history', label: 'History', icon: History },
                { id: 'analytics', label: 'Analytics', icon: BarChart2 },
                { id: 'rescheduled', label: 'Change Log', icon: Activity },
                { id: 'rescue', label: 'Rescue Mode', icon: ShieldAlert },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeFilter === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      playClick();
                      setActiveFilter(item.id);
                      setHighlightTrigger(true);
                      setTimeout(() => setHighlightTrigger(false), 1000);
                    }}
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-xl text-xs font-semibold cursor-pointer btn-sidebar-animate transition-all ${
                      isActive 
                        ? 'bg-[#FF6A00] text-white shadow-md shadow-[#FF6A00]/25' 
                        : 'text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                    title={item.label}
                  >
                    <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? 'text-white' : 'text-[#00CFCF]'}`} />
                    {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-white/5 mt-2">
              {!isSidebarCollapsed && <span className="text-[9px] font-bold text-neutral-400 dark:text-gray-500 uppercase tracking-widest block px-3 mb-1.5">AI Task Manager</span>}
              {[
                { id: 'ai-mode', label: 'AI assistant', icon: Sparkles },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeFilter === item.id;
                const isAI = true;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      playClick();
                      setActiveFilter(item.id);
                      setHighlightTrigger(true);
                      setTimeout(() => setHighlightTrigger(false), 1000);
                    }}
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-xl text-xs font-semibold cursor-pointer btn-sidebar-animate transition-all ${
                      isAI
                        ? `bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-[length:200%_200%] animate-gradient-shift text-white shadow-lg ${isActive ? 'shadow-indigo-500/50 scale-[1.02] border-white/40' : 'shadow-indigo-500/20 border-white/10'} border`
                        : ''
                    }`}
                    title={item.label}
                  >
                    <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive || isAI ? 'text-white' : 'text-[#00CFCF]'}`} />
                    {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-white/5 mt-2">
              {!isSidebarCollapsed && (
                <span className="text-[9px] font-bold text-neutral-400 dark:text-gray-500 uppercase tracking-widest block px-3 mb-1.5 flex justify-between items-center">
                  <span>Categories</span>
                  <button 
                    onClick={() => { playClick(); setShowCatForm(!showCatForm); }}
                    className="p-0.5 hover:bg-neutral-100 dark:hover:bg-white/5 rounded text-[#00CFCF]"
                    title="Add Category"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {!isSidebarCollapsed && showCatForm && (
                <form onSubmit={handleAddCategory} className="px-3 py-2 bg-neutral-100 dark:bg-white/5 rounded-xl mb-2 space-y-2 animate-panel-in">
                  <input
                    type="text"
                    required
                    placeholder="New category..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full bg-white dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded px-2 py-1.5 text-[10px] text-neutral-900 dark:text-white outline-none focus:ring-1 focus:ring-[#00CFCF]"
                  />
                  <div className="flex justify-between items-center relative">
                    <div className="relative">
                      <div 
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-700 shadow-inner group flex items-center justify-center cursor-pointer transition-transform hover:scale-110" 
                        style={{ backgroundColor: newCategoryColor }}
                        title="Pick category color"
                      >
                        <Pipette className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" style={{ mixBlendMode: 'difference' }} />
                      </div>
                      
                      {showColorPicker && (
                        <div className="absolute z-50 bottom-full left-0 mb-2 p-3 bg-white dark:bg-[#1A1A1A] border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in origin-bottom-left">
                          <div className="fixed inset-0 z-[-1]" onClick={() => setShowColorPicker(false)}></div>
                          <HexColorPicker color={newCategoryColor} onChange={setNewCategoryColor} />
                          <div className="mt-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full shadow-inner border border-white/10" style={{ backgroundColor: newCategoryColor }}></div>
                            <input 
                              type="text" 
                              value={newCategoryColor} 
                              onChange={(e) => setNewCategoryColor(e.target.value)}
                              className="w-full text-xs font-mono bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none text-neutral-900 dark:text-white uppercase"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <button type="submit" onClick={() => setShowColorPicker(false)} className="bg-[#00CFCF] hover:bg-[#00B5B5] text-black font-bold text-[10px] px-3 py-1.5 rounded transition-colors shadow-sm">
                      Create
                    </button>
                  </div>
                </form>
              )}

              {categories.map(cat => {
                const isActive = activeFilter.toLowerCase() === cat.name.toLowerCase();
                return (
                  <div
                    key={cat.id}
                    className={`group/cat flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'} w-full py-1.5 rounded-xl text-xs font-semibold`}
                  >
                    <button
                      onClick={() => {
                        playClick();
                        setActiveFilter(cat.name);
                        setHighlightTrigger(true);
                        setTimeout(() => setHighlightTrigger(false), 1000);
                        if (boardContainerRef.current) {
                          boardContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} flex-grow text-left cursor-pointer ${
                        isActive ? 'text-[#FF6A00]' : 'text-neutral-600 dark:text-gray-400 hover:text-neutral-950 dark:hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/10 shadow-sm" style={{ backgroundColor: cat.color }}></span>
                      {!isSidebarCollapsed && <span className="truncate">{cat.name}</span>}
                    </button>
                    {!isSidebarCollapsed && cat.id !== 'cat-work' && cat.id !== 'cat-personal' && (
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="opacity-0 group-hover/cat:opacity-100 p-0.5 hover:bg-red-500/10 text-neutral-400 hover:text-red-500 rounded transition-all"
                        title="Delete Category"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Bottom Panel: User Profile Header */}
        <div 
          onClick={() => { playClick(); setShowProfileModal(true); }}
          className="p-3 border-t border-neutral-200 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-white/5 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 p-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF6A00] to-[#007BFF] flex items-center justify-center text-white font-bold shadow-md shrink-0">
              <User className="w-4 h-4" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-grow">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate flex items-center justify-between">
                  <span>{userProfile.username}</span>
                  <Settings className="w-3 h-3 text-neutral-400" />
                </p>
                <p className="text-[9px] text-green-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                  {!isVoiceActive && hasInteracted ? 'Listening for "Hey Laila"...' : 'Active Mode'}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER AREA */}
      <div className="flex-grow flex flex-col overflow-y-auto relative h-screen custom-scrollbar">
        
        {/* Sliding Notification Center Drawer */}
        {isNotificationOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-sm animate-fade-in">
            <div className="w-80 h-full bg-white dark:bg-[#151515] border-l border-neutral-200 dark:border-white/10 p-5 flex flex-col justify-between shadow-2xl animate-slide-in text-neutral-900 dark:text-white">
              
              <div className="flex flex-col flex-grow">
                <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4.5 h-4.5 text-[#FF6A00]" />
                    <span className="text-sm font-bold uppercase tracking-wider font-headings">
                      Notification Logs
                    </span>
                  </div>
                  <button
                    onClick={() => { playClick(); setIsNotificationOpen(false); }}
                    className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer hover-rotate-icon"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 flex-grow overflow-y-auto pr-1 custom-scrollbar space-y-3 max-h-[calc(100vh-140px)]">
                  {notifications.length === 0 ? (
                    <div className="text-center py-10 text-neutral-400 dark:text-gray-500 italic text-xs">
                      No notifications or alerts logged.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id}
                        className="bg-neutral-50 dark:bg-black/30 border border-neutral-200 dark:border-white/5 rounded-xl p-3 text-[11px] leading-relaxed transition-all hover:border-[#00CFCF]/20"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-semibold uppercase text-[8px] px-1 py-0.5 rounded ${
                            notif.type === 'expire' ? 'bg-red-500/10 text-red-500 border border-red-500/15' :
                            notif.type === 'complete' ? 'bg-green-500/10 text-green-500' : 
                            notif.type === 'create' ? 'bg-blue-500/10 text-blue-500' : 'bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-gray-400'
                          }`}>
                            {notif.type}
                          </span>
                          <span className="text-[9px] text-neutral-400 dark:text-gray-500 font-medium">
                            {new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-neutral-700 dark:text-gray-300 font-medium">{notif.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-200 dark:border-white/5 pt-3">
                <button
                  onClick={() => { playClick(); setNotifications([]); }}
                  className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/50 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-gray-400 font-semibold border border-neutral-200 dark:border-white/5 text-xs cursor-pointer text-center"
                >
                  Clear Logs History
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Expiry Alarm Modal */}
        {activeAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-gradient-to-b from-[#1A1A1A] to-black border border-[#FF6A00]/50 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-[0_20px_60px_-15px_rgba(255,106,0,0.4)] relative overflow-hidden">
              {/* Background accent */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#FF6A00]/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#00CFCF]/20 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6A00] to-[#FF8C00] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,106,0,0.6)] animate-pulse">
                <ShieldAlert className="w-12 h-12 text-white" />
              </div>
              
              <div className="space-y-3 relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/30 text-[10px] uppercase tracking-[0.2em] text-[#FF6A00] font-bold">Laila Triggered</span>
                <h2 className="text-3xl font-extrabold font-headings text-white leading-tight drop-shadow-md">
                  {activeAlert.title}
                </h2>
                <div className="flex justify-center items-center gap-2">
                  <span className="text-xs text-gray-400">Priority:</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#00CFCF]/20 text-[#00CFCF]">{activeAlert.priority}</span>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative z-10">
                <p className="text-sm text-gray-300 italic font-light">
                  "I am Laila, your reminder for this task. It's time to take action!"
                </p>
              </div>
              
              <button
                onClick={handleDismissAlert}
                className="relative z-10 w-full bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFA000] text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(255,106,0,0.4)] hover:shadow-[0_0_40px_rgba(255,106,0,0.6)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-base uppercase tracking-wide"
              >
                I Got It!
              </button>
            </div>
          </div>
        )}

        {/* TOP HEADER */}
        {activeFilter !== 'ai-mode' && (
          <header className="sticky top-0 z-30 w-full px-8 py-5 flex justify-between items-center border-b border-neutral-200 dark:border-white/5 bg-white/80 dark:bg-black/70 backdrop-blur-md transition-colors duration-300 shadow-sm">
          <div className="w-1/3 flex justify-start">
            <div className="flex items-center gap-2">
              {/* Light Mode Logo */}
              <img src={logoLight} alt="LastMinuteSaver" className="h-12 md:h-16 w-auto dark:hidden object-contain" />
              
              {/* Dark Mode Logo */}
              <img src={logoDark} alt="LastMinuteSaver" className="h-12 md:h-16 w-auto hidden dark:block object-contain" />
            </div>
          </div>

          <div className="w-1/3 flex justify-center">
            {/* Search bar removed as per user request */}
          </div>

          <div className="w-1/3 flex justify-end">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-600 dark:text-gray-400 hover:text-neutral-950 dark:hover:text-white border border-neutral-200/50 dark:border-white/5 cursor-pointer hover-rotate-icon"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </header>
        )}

        {/* MAIN CONTENT AREA */}
        {activeFilter === 'ai-mode' ? (
          <main className="p-0 flex-grow flex flex-col relative animate-fade-in min-h-0">
            <AIModeView tasks={tasks} userProfile={userProfile} theme={theme} toggleTheme={toggleTheme} />
            <button
              onClick={() => { playClick(); setShowSupportModal(true); }}
              className="absolute bottom-6 right-8 z-50 flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:text-gray-400 dark:hover:text-white transition-all bg-white/50 hover:bg-neutral-200 dark:bg-[#121212]/80 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg border border-neutral-200/50 dark:border-white/5 cursor-pointer shadow-sm backdrop-blur-sm"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#00CFCF]" />
              Support
            </button>
          </main>
        ) : activeFilter === 'rescue' ? (
          <main className="p-0 flex-grow flex flex-col relative animate-fade-in min-h-0">
            <BreachedTasksRescueView 
              tasks={tasks} 
              userProfile={userProfile} 
              onCloseRescue={() => setActiveFilter('all')} 
            />
          </main>
        ) : activeFilter === 'calendar' ? (
          <main className="px-4 py-3 flex-grow flex flex-col relative animate-fade-in min-h-0 overflow-hidden">
            <CalendarView
              tasks={sortedFilteredTasks}
              requestedViewMode={calendarViewMode}
              onCompleteTask={handleCompleteTask}
              onDeleteTask={handleDeleteTask}
              onRefreshTasks={fetchTasksData}
              categories={categories}
              setIsVoiceActive={setIsVoiceActive}
              setVoiceContextDate={setVoiceContextDate}
            />
          </main>
        ) : activeFilter === 'recurring' ? (
          <main className="px-2 py-2 md:px-8 md:py-6 flex-grow flex flex-col relative animate-fade-in min-h-0 overflow-y-auto custom-scrollbar">
            <RecurringTasksView 
              tasks={tasks} 
              categories={categories} 
              onCompleteTask={handleCompleteTask} 
              onDeleteTask={handleDeleteTask} 
            />
          </main>
        ) : activeFilter === 'history' ? (
          <main className="px-2 py-2 md:px-8 md:py-6 flex-grow flex flex-col relative animate-fade-in min-h-0 overflow-y-auto custom-scrollbar">
            <HistoryView completedTasks={completedTasks} categories={categories} />
          </main>
        ) : activeFilter === 'analytics' ? (
          <main className="px-2 py-2 md:px-8 md:py-6 flex-grow flex flex-col relative animate-fade-in min-h-0 overflow-y-auto custom-scrollbar">
            <AnalyticsView completedTasks={completedTasks} categories={categories} />
          </main>
        ) : activeFilter === 'rescheduled' ? (
          <main className="px-2 py-2 md:px-8 md:py-6 flex-grow flex flex-col relative animate-fade-in min-h-0 overflow-y-auto custom-scrollbar">
            <ChangeLogView tasks={tasks} completedTasks={completedTasks} notifications={notifications} />
          </main>
        ) : (
          <main className="px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
          <div className="lg:col-span-8 flex flex-col space-y-6">
            
            {/* User Greeting Banner */}
            <div className="flex flex-col space-y-1 relative pr-32">
              <div className="absolute top-0 right-8 text-right hidden sm:block">
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                  {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div className="text-lg font-extrabold text-[#00CFCF] tracking-wide font-headings">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-headings pr-4">
                Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF6A00] to-[#00CFCF]">{userProfile.username}</span>!
              </h2>
              <p className="text-xs text-neutral-500 dark:text-gray-400 font-medium max-w-lg">
                Let's plan smarter, manage deadlines, and rescue your schedule today.
              </p>
            </div>

            {/* Inline Task Creator Panel */}
            <div className="bg-white dark:bg-[#1A1A1A]/45 border border-neutral-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
              <TaskForm onAddTask={handleAddTask} categories={categories} />
            </div>

            {/* Voice Portal on small devices only (swapped with active queue list on mobile) */}
            <div className="block lg:hidden">
              {!isDesktop && (
                <VoicePortal
                  isVoiceActive={isVoiceActive}
                  setIsVoiceActive={setIsVoiceActive}
                  onAddTask={handleAddTask}
                  userProfile={userProfile}
                  onRefreshTasks={fetchTasksData}
                  toggleTheme={toggleTheme}
                  mode="dashboard"
                  contextDate={voiceContextDate}
                />
              )}
            </div>

            {/* Active Board Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 dark:bg-[#1A1A1A]/20 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider font-headings">
                Active Queue List
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/api/tasks/export/ics"
                  download
                  className="flex items-center gap-1.5 bg-[#007BFF]/10 text-[#007BFF] hover:bg-[#007BFF]/20 border border-[#007BFF]/20 px-3 py-1.5 rounded-xl text-xs font-bold font-headings cursor-pointer transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#00CFCF]" />
                  Export Calendar (.ics)
                </a>
              </div>
            </div>

            {/* Active Reminders Board */}
            <div 
              ref={boardContainerRef}
              className={`flex-grow rounded-2xl transition-all duration-300 border border-transparent ${
                highlightTrigger ? 'animate-highlight-pulse' : ''
              }`}
            >
                <TaskBoard
                  tasks={sortedFilteredTasks}
                  completedTasks={completedTasks}
                  activeFilter={activeFilter}
                  onDeleteTask={handleDeleteTask}
                  onCompleteTask={handleCompleteTask}
                  onExpireTask={handleExpireTask}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  userProfile={userProfile}
                />
            </div>
          </div>

          {/* RIGHT PANE */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            
            {/* Dashboard Voice Portal - visible on desktop only */}
            <div className="hidden lg:block">
              {isDesktop && (
                <VoicePortal
                  isVoiceActive={isVoiceActive}
                  setIsVoiceActive={setIsVoiceActive}
                  onAddTask={handleAddTask}
                  userProfile={userProfile}
                  onRefreshTasks={fetchTasksData}
                  toggleTheme={toggleTheme}
                  mode="dashboard"
                  contextDate={voiceContextDate}
                />
              )}
            </div>
            
            <IntegrationCards 
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              logNotification={logNotification}
            />

            <StreakWidget completedToday={completedTodayCount} dailyGoal={5} completedTasks={completedTasks} />
          </div>
        </main>
        )}



        {/* SUPPORT MODAL */}
        {showSupportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1A1A1A] border border-neutral-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-fade-in">
              <button onClick={() => { playClick(); setShowSupportModal(false); }} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              <h3 className="text-base font-bold font-headings text-neutral-950 dark:text-white flex items-center gap-1.5 mb-3 border-b border-neutral-200 dark:border-white/5 pb-2">
                <HelpCircle className="w-4 h-4 text-[#FF6A00]" />
                LastMinuteSaver Guide
              </h3>
              <div className="space-y-3.5 text-xs text-neutral-600 dark:text-gray-300">
                <p>LMS combines natural language parsing with responsive urgency control to ensure you never miss critical actions.</p>
                <div>
                  <h4 className="font-semibold text-neutral-800 dark:text-white mb-1">📅 Natural Time Formats:</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><code className="text-[#00CFCF]">in 15 seconds</code> (Seconds testing)</li>
                    <li><code className="text-[#00CFCF]">in 5 minutes</code></li>
                    <li><code className="text-[#00CFCF]">tomorrow</code></li>
                  </ul>
                </div>
              </div>
              <button onClick={() => { playClick(); setShowSupportModal(false); }} className="w-full bg-[#007BFF] hover:bg-[#007BFF]/90 text-white font-semibold py-2.5 rounded-xl mt-5 transition-all text-xs cursor-pointer">Close Guide</button>
            </div>
          </div>
        )}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-3xl w-full shadow-2xl relative animate-panel-in text-white">
              <button 
                onClick={() => { playClick(); setShowProfileModal(false); }}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer hover:scale-105 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-lg font-bold font-headings text-white flex items-center gap-2 mb-6 border-b border-white/10 pb-3">
                <Settings className="w-5 h-5 text-[#FF6A00]" />
                Account & Alert Settings
              </h3>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* LEFT COLUMN: Profile Info */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-[#00CFCF] uppercase tracking-wider font-headings pb-1 border-b border-white/5">
                      Personal Profile
                    </h4>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-headings mb-1.5">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        value={userProfile.username}
                        onChange={(e) => setUserProfile({ ...userProfile, username: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00CFCF] transition-all"
                        placeholder="Karthi Tanikonda"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-headings mb-1.5">
                        Voice Assistant Mode
                      </label>
                      <select
                        value={userProfile.gender}
                        onChange={(e) => setUserProfile({ ...userProfile, gender: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00CFCF] transition-all"
                      >
                        <option value="Male" className="bg-neutral-950">Smooth Female Voice (Matches Male Profile)</option>
                        <option value="Female" className="bg-neutral-950">Smooth Male Voice (Matches Female Profile)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-headings mb-1.5">
                        Phone Number (SMS Alerts)
                      </label>
                      <input
                        type="text"
                        value={userProfile.phone}
                        onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00CFCF] transition-all"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Verification & Notification Channels */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-[#FF6A00] uppercase tracking-wider font-headings pb-1 border-b border-white/5">
                      Security & Notification Channels
                    </h4>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-headings mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        readOnly
                        value={userProfile.emailAlert}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-neutral-400 cursor-not-allowed focus:outline-none"
                        title="Email address is managed by the authentication system and cannot be changed."
                      />
                    </div>

                    {/* SMS Alert Preference Toggle */}
                    <div className="pt-2">
                      <label className="flex items-center gap-3 cursor-pointer group bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all">
                        <input
                          type="checkbox"
                          checked={userProfile.smsEnabled}
                          onChange={(e) => setUserProfile({ ...userProfile, smsEnabled: e.target.checked })}
                          className="w-4 h-4 rounded border-white/10 text-[#00CFCF] focus:ring-[#00CFCF] bg-black/40"
                        />
                        <div>
                          <p className="text-[11px] font-bold text-white tracking-wide">Enable SMS Alerts</p>
                          <p className="text-[9px] text-neutral-400 mt-0.5">Receive instant deadline chime messages on your phone.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Actions Row */}
                <div className="flex gap-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-1/3 border border-red-500/30 hover:bg-red-500/10 text-red-400 font-semibold py-3 rounded-xl transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-grow bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FF9E00] text-white font-bold py-3 rounded-xl transition-all text-xs cursor-pointer shadow-md shadow-[#FF6A00]/20 hover:shadow-[0_4px_15px_rgba(255,106,0,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
          {activeFilter === 'calendar' && (
            <VoicePortal 
              isVoiceActive={isVoiceActive} 
              setIsVoiceActive={setIsVoiceActive} 
              onAddTask={handleAddTask} 
              userProfile={userProfile} 
              onRefreshTasks={fetchTasksData} 
              mode="calendar"
              contextDate={voiceContextDate}
            />
          )}
          
        {showLockdown && breachedTask && (
          <FocusLockdownScreen 
            task={breachedTask} 
            onDismiss={() => {
              setShowLockdown(false);
              setBreachedTask(null);
              fetchTasksData(); // Refresh tasks to clear breached status if started
            }}
            onStartRescueMode={() => {
              setShowLockdown(false);
              setBreachedTask(null);
              setActiveFilter('rescue');
              fetchTasksData();
            }}
            onOpenAIWorkspace={() => {
              setShowLockdown(false);
              setBreachedTask(null);
              setActiveFilter('ai-mode');
              fetchTasksData();
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
