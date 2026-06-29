import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Check, Trash2, Clock, X, Plus, Mic, LayoutGrid, Rows3 } from 'lucide-react';
import { playClick } from '../utils/soundSynth';

export default function CalendarView({ tasks, requestedViewMode, onCompleteTask, onDeleteTask, onRefreshTasks, categories, setIsVoiceActive, setVoiceContextDate }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(requestedViewMode || 'month'); // 'month' or 'week' or '10days'

  useEffect(() => {
    if (requestedViewMode) {
      setViewMode(requestedViewMode);
    }
  }, [requestedViewMode]);
  const [selectedDayTasks, setSelectedDayTasks] = useState(null);
  const [selectedDayNum, setSelectedDayNum] = useState(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Handle ESC to close right panel
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSelectedDayTasks(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handlePrev = () => {
    playClick();
    if (viewMode === 'month') {
      setViewDate(new Date(year, month - 1, 1));
    } else {
      setViewDate(new Date(year, month, viewDate.getDate() - 7));
    }
    setSelectedDayTasks(null);
  };

  const handleNext = () => {
    playClick();
    if (viewMode === 'month') {
      setViewDate(new Date(year, month + 1, 1));
    } else {
      setViewDate(new Date(year, month, viewDate.getDate() + 7));
    }
    setSelectedDayTasks(null);
  };

  // Monthly Calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Weekly Calculations
  const currentDayOfWeek = viewDate.getDay();
  const startOfWeek = new Date(viewDate);
  startOfWeek.setDate(viewDate.getDate() - currentDayOfWeek);
  
  const weekDaysArray = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const tenDaysArray = Array.from({ length: 10 }).map((_, i) => {
    const d = new Date(viewDate);
    d.setDate(viewDate.getDate() + i);
    return d;
  });

  const getTasksForDate = (dateObj) => {
    return tasks.filter(task => {
      const targetTime = task.createdAt + task.durationSeconds * 1000;
      const targetDate = new Date(targetTime);
      return targetDate.getDate() === dateObj.getDate() &&
             targetDate.getMonth() === dateObj.getMonth() &&
             targetDate.getFullYear() === dateObj.getFullYear();
    });
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Quick Add Task
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddText.trim() || !selectedDayNum) return;
    setIsAdding(true);
    
    // Create target date based on selected day inside the current viewDate month/year
    // Note: If in week view, the selectedDayNum might belong to a different month. 
    // We kept selectedDayNum as the Date object's getDate(), but we need the exact Date.
    // For simplicity, we stored the selected day as a number. Let's fix that to store the exact Date.
    
    // Wait, let's fix setSelectedDayNum to actually be setSelectedDate(Date object)
    // To avoid breaking existing code quickly, I'll calculate it:
    let targetDateObj;
    if (viewMode === 'week') {
      targetDateObj = weekDaysArray.find(d => d.getDate() === selectedDayNum);
    } else {
      targetDateObj = new Date(year, month, selectedDayNum);
    }

    if (!targetDateObj) targetDateObj = new Date(year, month, selectedDayNum);

    // Set time to noon to avoid timezone shift issues
    targetDateObj.setHours(12, 0, 0, 0);
    
    const durationSeconds = Math.floor((targetDateObj.getTime() - Date.now()) / 1000);

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickAddText,
          priority: 'Medium',
          category: categories?.[0]?.id || 'Personal',
          durationSeconds: durationSeconds > 0 ? durationSeconds : 3600 // fallback if past
        })
      });
      playClick();
      setQuickAddText('');
      if (onRefreshTasks) await onRefreshTasks();
      
      // Update local side panel state quickly
      const newTasks = getTasksForDate(targetDateObj);
      setSelectedDayTasks(newTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-[#00CFCF]', 'bg-[#00CFCF]/5');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('border-[#00CFCF]', 'bg-[#00CFCF]/5');
  };

  const handleDrop = async (e, targetDateObj) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-[#00CFCF]', 'bg-[#00CFCF]/5');
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const newTargetDate = new Date(targetDateObj);
    newTargetDate.setHours(12, 0, 0, 0);
    const durationSeconds = Math.floor((newTargetDate.getTime() - Date.now()) / 1000);

    try {
      await fetch(`/api/tasks/${taskId}/modify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSeconds })
      });
      playClick();
      if (onRefreshTasks) onRefreshTasks();
      
      // If dropping into the currently open side panel day
      if (selectedDayNum === newTargetDate.getDate()) {
        const newTasks = getTasksForDate(newTargetDate);
        setSelectedDayTasks(newTasks);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderDayCell = (day, dateObj, isPadding = false) => {
    if (isPadding) {
      return <div key={`pad-${Math.random()}`} className="bg-neutral-50/20 dark:bg-neutral-900/10 border border-transparent rounded-2xl" />;
    }

    const isToday = new Date().toDateString() === dateObj.toDateString();
    const dayTasks = getTasksForDate(dateObj);

    return (
      <div
        key={dateObj.toISOString()}
        onClick={() => {
          setSelectedDayTasks(dayTasks);
          setSelectedDayNum(day);
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, dateObj)}
        className={`p-2 border rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-300 relative group overflow-hidden ${
          isToday 
            ? 'border-[#00CFCF] bg-[#00CFCF]/5 shadow-[0_0_15px_rgba(0,207,207,0.15)] ring-1 ring-[#00CFCF]/50' 
            : 'border-neutral-200 dark:border-white/5 bg-white dark:bg-[#1A1A1A]/40 hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/5 hover:shadow-lg hover:z-10'
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-bold ${
            isToday ? 'text-[#00CFCF]' : 'text-neutral-700 dark:text-gray-300'
          }`}>
            {day}
          </span>
          {dayTasks.length > 0 && (
            <span className="text-[9px] bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full font-bold">
              {dayTasks.length} tasks
            </span>
          )}
        </div>

        <div className="flex-grow flex flex-col gap-1 overflow-hidden">
          {dayTasks.slice(0, 3).map(task => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, task); }}
              className={`text-[9px] font-bold px-2 py-1 rounded-full truncate border transition-all cursor-grab active:cursor-grabbing hover:opacity-80 flex items-center gap-1.5 ${
                task.priority === 'Urgent'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25'
                  : task.priority === 'High'
                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25'
                    : task.priority === 'Medium'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                task.priority === 'Urgent' ? 'bg-red-500' : task.priority === 'High' ? 'bg-orange-500' : task.priority === 'Medium' ? 'bg-blue-500' : 'bg-emerald-500'
              }`} />
              {task.title}
            </div>
          ))}
          {dayTasks.length > 3 && (
            <div className="text-[10px] text-neutral-400 dark:text-gray-500 font-medium text-center mt-1">
              +{dayTasks.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex-grow flex overflow-hidden h-full">
      
      {/* Main Calendar Area */}
      <div className={`flex-grow bg-white dark:bg-[#121212]/80 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl p-4 shadow-sm flex flex-col h-full transition-all duration-500 ${selectedDayTasks ? 'mr-[380px]' : ''}`}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00CFCF] to-[#009999] shadow-lg shadow-[#00CFCF]/20 flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-neutral-950 dark:text-white font-headings uppercase tracking-tight">
                {viewMode === 'month' 
                  ? viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
                  : viewMode === 'week' 
                    ? `Week of ${startOfWeek.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                    : `10 Days from ${viewDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-gray-400 font-medium mt-0.5">
                Drag and drop tasks to reschedule them
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-neutral-100 dark:bg-[#1A1A1A] rounded-xl p-1 border border-neutral-200 dark:border-white/5">
              <button
                onClick={() => { playClick(); setViewMode('month'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white dark:bg-[#2A2A2A] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-gray-400 hover:text-neutral-700 dark:hover:text-white'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Month
              </button>
              <button
                onClick={() => { playClick(); setViewMode('week'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-white dark:bg-[#2A2A2A] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-gray-400 hover:text-neutral-700 dark:hover:text-white'}`}
              >
                <Rows3 className="w-3.5 h-3.5" /> Week
              </button>
              <button
                onClick={() => { playClick(); setViewMode('10days'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === '10days' ? 'bg-white dark:bg-[#2A2A2A] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-gray-400 hover:text-neutral-700 dark:hover:text-white'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> 10 Days
              </button>
            </div>

            {/* Nav Controls */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#1A1A1A] p-1 rounded-xl border border-neutral-200 dark:border-white/5">
              <button onClick={handlePrev} className="p-2 rounded-lg hover:bg-white dark:hover:bg-[#2A2A2A] text-neutral-600 dark:text-gray-400 dark:hover:text-white transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => { playClick(); setViewDate(new Date()); }} className="px-3 py-1 text-xs font-bold text-neutral-600 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-white">
                Today
              </button>
              <button onClick={handleNext} className="p-2 rounded-lg hover:bg-white dark:hover:bg-[#2A2A2A] text-neutral-600 dark:text-gray-400 dark:hover:text-white transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Weekdays row */}
        {viewMode !== '10days' && (
          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
            {weekdays.map(day => (
              <div key={day} className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 dark:text-gray-500 py-0.5">
                {day}
              </div>
            ))}
          </div>
        )}

        <div className={`grid gap-1 flex-grow overflow-hidden ${
          viewMode === '10days' ? 'grid-cols-5 grid-rows-2' : 'grid-cols-7'
        } ${viewMode !== '10days' ? 'auto-rows-fr' : ''}`}>
          {viewMode === 'month' ? (
            <>
              {Array.from({ length: firstDayIndex }).map((_, idx) => renderDayCell(null, null, true))}
              {Array.from({ length: totalDays }).map((_, idx) => {
                const day = idx + 1;
                const dateObj = new Date(year, month, day);
                return renderDayCell(day, dateObj, false);
              })}
            </>
          ) : viewMode === 'week' ? (
            <>
              {weekDaysArray.map((dateObj) => renderDayCell(dateObj.getDate(), dateObj, false))}
            </>
          ) : (
            <>
              {tenDaysArray.map((dateObj) => renderDayCell(`${dateObj.getDate()} ${dateObj.toLocaleDateString([], { month: 'short' })}`, dateObj, false))}
            </>
          )}
        </div>
      </div>

      {/* Right Side Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-[380px] bg-white dark:bg-[#121212] border-l border-neutral-200 dark:border-white/5 shadow-2xl transition-transform duration-500 ease-out z-40 flex flex-col ${
          selectedDayTasks ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-neutral-200 dark:border-white/5 flex justify-between items-center bg-neutral-50 dark:bg-black/20">
          <div>
            <h3 className="text-lg font-bold font-headings text-neutral-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00CFCF]" />
              {selectedDayNum && new Date(year, month, selectedDayNum).toLocaleDateString([], { weekday: 'long' })}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-gray-400 mt-1 font-medium">
              {selectedDayNum} {viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button 
            onClick={() => setSelectedDayTasks(null)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-gray-300 hover:bg-neutral-300 dark:hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task List */}
        <div className="flex-grow overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {selectedDayTasks && selectedDayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center opacity-50">
              <Check className="w-8 h-8 mb-3 text-neutral-400" />
              <p className="text-sm font-bold text-neutral-500 dark:text-gray-400">No tasks for this day</p>
              <p className="text-xs text-neutral-400 mt-1">Enjoy your free time!</p>
            </div>
          ) : (
            selectedDayTasks?.map(task => {
              const targetTime = task.createdAt + task.durationSeconds * 1000;
              const hoursMinutes = new Date(targetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={task.id} className="group flex flex-col bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-white/5 rounded-2xl p-4 transition-all hover:border-[#00CFCF]/30 hover:shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm text-neutral-900 dark:text-white leading-snug">{task.title}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                        task.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' :
                        task.priority === 'High' ? 'bg-orange-500/10 text-orange-500' :
                        task.priority === 'Medium' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-gray-400 font-semibold bg-white dark:bg-black/20 px-2 py-1 rounded-md border border-neutral-200 dark:border-white/5">
                        <Clock className="w-3 h-3" /> {hoursMinutes}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { playClick(); onCompleteTask(task.id); setSelectedDayTasks(prev => prev.filter(t => t.id !== task.id)); }}
                        className="p-2 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { playClick(); onDeleteTask(task.id); setSelectedDayTasks(prev => prev.filter(t => t.id !== task.id)); }}
                        className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Add Form */}
        <div className="p-6 bg-neutral-50 dark:bg-black/20 border-t border-neutral-200 dark:border-white/5">
          <form onSubmit={handleQuickAdd} className="relative">
            <input
              type="text"
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              placeholder="Quick add a task..."
              className="w-full bg-white dark:bg-[#1A1A1A] border border-neutral-300 dark:border-white/10 rounded-xl pl-4 pr-24 py-3.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-[#00CFCF] focus:ring-2 focus:ring-[#00CFCF]/20 transition-all shadow-sm"
              disabled={isAdding}
            />
            <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() => { 
                  playClick(); 
                  let targetDateObj;
                  if (viewMode === 'week') {
                    targetDateObj = weekDaysArray.find(d => d.getDate() === selectedDayNum);
                  } else {
                    targetDateObj = new Date(year, month, selectedDayNum);
                  }
                  if (targetDateObj && setVoiceContextDate) setVoiceContextDate(targetDateObj);
                  setIsVoiceActive(true); 
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-[#00CFCF] transition-colors"
                title="Use Laila to add a task"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!quickAddText.trim() || isAdding}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#00CFCF] hover:bg-[#009999] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#00CFCF]/20 transition-all"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
