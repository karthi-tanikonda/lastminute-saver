import React, { useEffect, useState } from 'react';
import { Flame, CheckCircle2, Target } from 'lucide-react';
import { playChime } from '../utils/soundSynth';

export default function StreakWidget({ completedToday, dailyGoal = 5, completedTasks = [] }) {
  const [justCompleted, setJustCompleted] = useState(false);
  const isGoalMet = completedToday >= dailyGoal;
  
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const now = new Date();
  const currentDayIdx = (now.getDay() + 6) % 7; // Map Sun-Sat (0-6) to Mon-Sun (0-6)
  
  // Helper to format date as YYYY-MM-DD in local time
  const getLocalDateString = (date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  // Get date strings for Monday through Sunday of the current week
  const currentWeekDateStrings = days.map((_, idx) => {
    const d = new Date(now);
    const distanceToMonday = currentDayIdx === 0 ? 0 : -currentDayIdx;
    d.setDate(now.getDate() + distanceToMonday + idx);
    return getLocalDateString(d);
  });

  // Calculate completed count for each day of the current week
  const weekCompletionCounts = currentWeekDateStrings.map(dateStr => {
    return completedTasks.filter(task => {
      if (!task.completedAt) return false;
      const taskDateStr = getLocalDateString(new Date(task.completedAt));
      return taskDateStr === dateStr;
    }).length;
  });

  // Check if a day of the week is "active" (at least 1 task completed)
  const historicalHistory = days.map((_, idx) => {
    if (idx === currentDayIdx) {
      return completedToday > 0;
    }
    return weekCompletionCounts[idx] > 0;
  });

  // Calculate the overall consecutive day streak
  const calculateStreak = () => {
    // Collect all unique local date strings of task completion
    const completionDatesSet = new Set(
      completedTasks
        .filter(t => t.completedAt)
        .map(t => getLocalDateString(new Date(t.completedAt)))
    );

    // If today is active, make sure today's date is in the set
    const todayStr = getLocalDateString(now);
    if (completedToday > 0) {
      completionDatesSet.add(todayStr);
    }

    if (completionDatesSet.size === 0) return 0;

    let streak = 0;
    const checkDate = new Date(now);

    // Check today first
    const todayActive = completionDatesSet.has(getLocalDateString(checkDate));
    
    // Check yesterday
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayActive = completionDatesSet.has(getLocalDateString(checkDate));

    // If neither today nor yesterday is active, streak is 0
    if (!todayActive && !yesterdayActive) return 0;

    // Reset to start tracing back from today or yesterday
    const traceDate = new Date(now);
    if (!todayActive && yesterdayActive) {
      traceDate.setDate(traceDate.getDate() - 1);
    }

    while (completionDatesSet.has(getLocalDateString(traceDate))) {
      streak++;
      traceDate.setDate(traceDate.getDate() - 1);
    }

    return streak;
  };

  const streakCount = calculateStreak();

  useEffect(() => {
    if (isGoalMet && completedToday === dailyGoal) {
      setJustCompleted(true);
      playChime(); // Play reward sound on exact hit
      setTimeout(() => setJustCompleted(false), 3000);
    }
  }, [completedToday, dailyGoal, isGoalMet]);

  // Calculate Progress Ring Dash Array
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = Math.min((completedToday / dailyGoal) * 100, 100);
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="bg-white/40 dark:bg-[#1A1A1A]/20 border border-neutral-200 dark:border-white/5 rounded-2xl p-5 transition-colors duration-300 relative overflow-hidden group">
      
      {/* Background glow if goal met */}
      <div className={`absolute inset-0 bg-gradient-to-tr from-[#FF7A18]/5 to-[#10B981]/5 opacity-0 transition-opacity duration-1000 ${isGoalMet ? 'opacity-100' : ''}`}></div>

      <div className="relative z-10 flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white font-headings flex items-center gap-2">
            <Target className="w-4 h-4 text-[#10B981]" />
            Daily Habit Streak
          </h3>
          <p className="text-[10px] text-neutral-500 dark:text-gray-400 font-medium mt-0.5">
            {isGoalMet ? "Goal crushed! Keep going!" : `${dailyGoal - completedToday} more tasks to hit your goal.`}
          </p>
        </div>
        
        {/* Flame Icon with dynamic animation */}
        <div className={`p-2 rounded-full border transition-all duration-500 ${isGoalMet ? 'bg-[#FF7A18]/20 border-[#FF7A18]/50 shadow-[0_0_15px_rgba(255,122,24,0.4)]' : 'bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10'}`}>
          <Flame 
            className={`w-5 h-5 transition-all duration-500 ${isGoalMet ? 'text-[#FF7A18] animate-pulse drop-shadow-[0_0_8px_rgba(255,122,24,0.8)]' : 'text-neutral-400'}`} 
            style={justCompleted ? { transform: 'scale(1.3)' } : {}}
          />
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-6">
        
        {/* Progress Ring (SVG) */}
        <div className="relative w-[80px] h-[80px] shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Track */}
            <circle 
              cx="40" cy="40" r={radius} 
              className="stroke-neutral-200 dark:stroke-white/5" 
              strokeWidth="6" fill="transparent" 
            />
            {/* Progress Stroke */}
            <circle 
              cx="40" cy="40" r={radius} 
              className={`transition-all duration-1000 ease-out ${isGoalMet ? 'stroke-[#FF7A18]' : 'stroke-[#10B981]'}`}
              strokeWidth="6" fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold font-headings text-neutral-900 dark:text-white tabular-nums">
              {completedToday}
            </span>
            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider -mt-1">
              / {dailyGoal}
            </span>
          </div>
        </div>

        {/* 7-Day Micro Calendar */}
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-neutral-600 dark:text-gray-300 uppercase tracking-wide">This Week</span>
            <span className="text-[10px] font-bold text-[#FF7A18] bg-[#FF7A18]/10 px-2 py-0.5 rounded-full">
              {streakCount} Day Streak!
            </span>
          </div>
          <div className="flex justify-between items-center">
            {days.map((day, idx) => {
              const isActive = historicalHistory[idx];
              const isToday = idx === currentDayIdx;
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[9px] font-bold ${isToday ? 'text-[#10B981]' : 'text-neutral-400 dark:text-gray-500'}`}>
                    {day}
                  </span>
                  <div 
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isActive 
                        ? 'bg-gradient-to-tr from-[#FF7A18] to-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.4)] scale-110' 
                        : 'bg-neutral-200 dark:bg-white/10'
                    } ${isToday && !isActive ? 'animate-pulse' : ''}`}
                  >
                    {isActive && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
