import React from 'react';
import TaskCard from './TaskCard';
import CustomSelect from './CustomSelect';
import { ShieldCheck, ListTodo, History, Check } from 'lucide-react';

export default function TaskBoard({ tasks, completedTasks, activeFilter, onDeleteTask, onCompleteTask, onExpireTask, sortBy, setSortBy, userProfile }) {
  
  // Sort priority logic
  const priorityWeight = {
    Urgent: 3,
    High: 2,
    Medium: 1,
    Low: 0,
  };

  const getSecondsRemaining = (task) => {
    const elapsed = Math.floor((Date.now() - task.createdAt) / 1000);
    const remaining = task.durationSeconds - elapsed;
    return remaining > 0 ? remaining : 0;
  };

  const activeTasks = tasks;

  // Calculate urgent count
  const urgentCount = activeTasks.filter(t => t.priority === 'Urgent').length;

  const getEmptyStateContent = () => {
    switch (activeFilter) {
      case 'work':
        return {
          title: "No pending work reminders",
          desc: "Excellent job separating your concerns! Everything is completed."
        };
      case 'personal':
        return {
          title: "No pending personal reminders",
          desc: "Take some time for yourself! No chores or quick checks remain."
        };
      case 'today':
        return {
          title: "No deadlines remaining today",
          desc: "You're all caught up for the day. Sit back and relax!"
        };
      case 'week':
        return {
          title: "No deadlines in the next 7 days",
          desc: "Enjoy the clear runway ahead. No last-minute surprises scheduled!"
        };
      case 'month':
        return {
          title: "No deadlines this month",
          desc: "A completely clean slate looks great on you."
        };
      default:
        return {
          title: "Your schedule is safe",
          desc: "No pending last-minute deadlines. Feel free to relax!"
        };
    }
  };

  const emptyState = getEmptyStateContent();

  return (
    <div className="space-y-8">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1A1A1A]/40 border border-neutral-200 dark:border-white/5 p-4 rounded-xl flex items-center justify-between shadow-sm transition-colors duration-300">
          <div>
            <span className="text-xs text-neutral-500 dark:text-gray-400 block font-medium">Active Deadlines</span>
            <span className="text-2xl font-bold font-headings text-neutral-900 dark:text-white">{activeTasks.length}</span>
          </div>
          <ListTodo className="w-8 h-8 text-[#00CFCF] opacity-70" />
        </div>
        
        <div className="bg-white dark:bg-[#1A1A1A]/40 border border-neutral-200 dark:border-white/5 p-4 rounded-xl flex items-center justify-between shadow-sm transition-colors duration-300">
          <div>
            <span className="text-xs text-neutral-500 dark:text-gray-400 block font-medium">Urgent Reminders</span>
            <span className="text-2xl font-bold font-headings text-[#FF6A00]">{urgentCount}</span>
          </div>
          <span className="relative flex h-3 w-3">
            {urgentCount > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6A00] opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${urgentCount > 0 ? 'bg-[#FF6A00]' : 'bg-neutral-300 dark:bg-gray-700'}`}></span>
          </span>
        </div>

        <div className="hidden md:flex bg-white dark:bg-[#1A1A1A]/40 border border-neutral-200 dark:border-white/5 p-4 rounded-xl items-center justify-between shadow-sm transition-colors duration-300">
          <div>
            <span className="text-xs text-neutral-500 dark:text-gray-400 block font-medium">Total Saved</span>
            <span className="text-2xl font-bold font-headings text-[#007BFF]">{completedTasks.length}</span>
          </div>
          <ShieldCheck className="w-8 h-8 text-[#007BFF] opacity-70" />
        </div>
      </div>

      {/* Task Grid */}
      <div className="bg-white/40 dark:bg-[#1A1A1A]/20 border border-neutral-200 dark:border-white/5 rounded-2xl p-6 min-h-[300px] relative transition-colors duration-300">
        <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/5 pb-3 mb-5">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white font-headings flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-[#00CFCF]" />
            Reminders Queue
          </h2>
          {setSortBy && (
            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              options={[
                { label: 'Sort by: Time Remaining', value: 'time' },
                { label: 'Sort by: Priority', value: 'priority' },
                { label: 'Sort by: Alphabetical', value: 'alpha' }
              ]}
              buttonClassName="bg-neutral-100 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs hover:border-[#00CFCF]/50 min-w-[200px]"
            />
          )}
        </div>

        {activeTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#00CFCF]/10 flex items-center justify-center border border-[#00CFCF]/20 text-[#00CFCF] animate-pulse">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-neutral-900 dark:text-white font-medium text-sm">{emptyState.title}</p>
              <p className="text-neutral-500 dark:text-gray-500 text-xs mt-1">{emptyState.desc}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={onDeleteTask}
                onComplete={onCompleteTask}
                onExpire={onExpireTask}
                userProfile={userProfile}
              />
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}
