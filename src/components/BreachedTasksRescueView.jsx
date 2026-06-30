import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ChevronRight, Sparkles, CheckCircle2, Maximize2, Minimize2, ShieldAlert } from 'lucide-react';
import TaskAIChat from './TaskAIChat';
import { playClick } from '../utils/soundSynth';

export default function BreachedTasksRescueView({ tasks, onCloseRescue, userProfile }) {
  // Only show tasks that have breached their buffer
  const breachedTasks = tasks.filter(t => t.breached === 1 || t.breached === true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isAIFullScreen, setIsAIFullScreen] = useState(false);

  useEffect(() => {
    // Auto-select first task if none selected
    if (breachedTasks.length > 0 && !selectedTask) {
      setSelectedTask(breachedTasks[0]);
    }
  }, [breachedTasks, selectedTask]);

  const handleSelectTask = (task) => {
    playClick();
    setSelectedTask(task);
    setShowAIAssistant(false); // Reset AI view when switching tasks
    setIsAIFullScreen(false);
  };

  const handleOpenAI = () => {
    playClick();
    setShowAIAssistant(true);
  };

  const toggleFullScreen = () => {
    playClick();
    setIsAIFullScreen(!isAIFullScreen);
  };

  const handleMarkComplete = async (taskId) => {
    playClick();
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: 1, completedAt: Date.now() })
    });
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
      setShowAIAssistant(false);
      setIsAIFullScreen(false);
    }
  };

  if (breachedTasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <div className="relative">
          <div className="absolute inset-0 bg-[#00CFCF]/20 blur-2xl rounded-full" />
          <div className="relative w-24 h-24 bg-[#00CFCF]/10 border border-[#00CFCF]/30 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-[#00CFCF]" />
          </div>
        </div>
        <h2 className="text-3xl font-headings font-bold mb-2 bg-gradient-to-r from-[#00CFCF] to-white bg-clip-text text-transparent">You're All Caught Up!</h2>
        <p className="text-gray-400 mb-8">No tasks have breached their safety buffers.</p>
        <button 
          onClick={onCloseRescue}
          className="px-8 py-3.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFA500] text-white font-bold rounded-xl shadow-lg shadow-[#FF6A00]/25 transition-all hover:scale-105 active:scale-95"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-[#0a0a0a] text-white overflow-hidden h-full relative">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-red-900/10 blur-[120px] pointer-events-none" />
      
      {/* Left Area: List of Breached Tasks */}
      <div className={`flex-1 flex flex-col p-8 transition-all duration-500 ease-in-out ${isAIFullScreen ? 'hidden' : (showAIAssistant ? 'md:pr-4 md:w-1/2' : 'w-full')}`}>
        <div className="flex items-center gap-5 mb-10 border-b border-white/5 pb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/30 blur-xl rounded-full" />
            <div className="relative w-14 h-14 bg-gradient-to-br from-red-500/20 to-red-900/40 border border-red-500/50 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/50">
              <ShieldAlert className="w-7 h-7 text-red-500" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-headings font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 tracking-tight">Rescue Mode</h1>
            <p className="text-gray-400 mt-1 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Critical tasks that have breached safety buffers.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {breachedTasks.map(task => (
            <div 
              key={task.id}
              onClick={() => handleSelectTask(task)}
              className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                selectedTask?.id === task.id 
                  ? 'bg-gradient-to-br from-red-900/40 to-black/80 border-red-500/50 scale-[1.02] shadow-2xl shadow-red-900/20' 
                  : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-red-500/30'
              }`}
            >
              {/* Highlight accent for selected task */}
              {selectedTask?.id === task.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-[#FF6A00]" />
              )}

              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h3 className={`text-xl font-bold mb-3 transition-colors ${selectedTask?.id === task.id ? 'text-white' : 'group-hover:text-red-400'}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
                      <Clock className="w-3.5 h-3.5 text-[#00CFCF]"/> 
                      <span className="font-medium">{Math.round(task.durationSeconds / 60)} mins</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#FF6A00]/10 border border-[#FF6A00]/20 text-[10px] font-extrabold text-[#FF6A00] uppercase tracking-widest">
                      {task.priority}
                    </span>
                  </div>
                </div>

                {selectedTask?.id === task.id && !showAIAssistant && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenAI(); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFA500] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#FF6A00]/25 hover:scale-105 active:scale-95 animate-fade-in shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    Rescue with AI
                  </button>
                )}
              </div>
              
              <div className="mt-5 pt-4 border-t border-white/5 flex justify-between items-center">
                <p className="text-xs text-red-400/80 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Action Required
                </p>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleMarkComplete(task.id); }}
                  className="px-5 py-1.5 bg-transparent border border-[#00CFCF]/30 hover:bg-[#00CFCF]/10 hover:border-[#00CFCF] text-[#00CFCF] rounded-lg text-sm font-semibold transition-all hover:shadow-[0_0_15px_rgba(0,207,207,0.2)]"
                >
                  Mark Done
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar: AI Assistant */}
      {showAIAssistant && selectedTask && (
        <div className={`border-l border-white/10 bg-[#141414]/95 backdrop-blur-3xl shadow-2xl transition-all duration-500 ease-in-out flex flex-col h-full ${
          isAIFullScreen ? 'w-full animate-fade-in' : 'w-full md:w-1/2 lg:w-[600px] animate-slide-in-right'
        }`}>
          {/* Top border accent */}
          <div className="h-1 w-full bg-gradient-to-r from-[#00CFCF] via-[#FF6A00] to-red-500" />
          
          <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2.5">
                <div className="p-1.5 bg-[#FF6A00]/20 rounded-lg">
                  <Sparkles className="w-5 h-5 text-[#FF6A00]" />
                </div>
                Laila Rescue Assistant
              </h2>
              <p className="text-xs text-gray-400 mt-1 truncate max-w-[400px]">Focusing on: <span className="text-gray-200 font-medium">{selectedTask.title}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleFullScreen}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                title={isAIFullScreen ? "Exit Full Screen" : "Full Screen"}
              >
                {isAIFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <div className="w-px h-6 bg-white/10" />
              <button 
                onClick={() => { setShowAIAssistant(false); setIsAIFullScreen(false); }}
                className="p-2.5 hover:bg-red-500/20 hover:text-red-500 rounded-xl transition-colors text-gray-400"
                title="Close AI"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative">
             <TaskAIChat task={selectedTask} onClose={() => { setShowAIAssistant(false); setIsAIFullScreen(false); }} isInline={true} />
          </div>
        </div>
      )}
    </div>
  );
}
