import React, { useState, useMemo } from 'react';
import { 
  Repeat, Calendar, ArrowUpDown, ChevronDown, CheckCircle2, 
  Trash, Sparkles, Filter, Award, Clock, Flame
} from 'lucide-react';

export default function RecurringTasksView({ 
  tasks, 
  categories, 
  onCompleteTask, 
  onDeleteTask 
}) {
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('priority-desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract recurring tasks
  const recurringTasks = useMemo(() => {
    return tasks.filter(t => t.isRecurring);
  }, [tasks]);

  // Handle Filtering
  const filteredTasks = useMemo(() => {
    return recurringTasks.filter(task => {
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'All' || task.category === categoryFilter;
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPriority && matchesCategory && matchesSearch;
    });
  }, [recurringTasks, priorityFilter, categoryFilter, searchQuery]);

  // Handle Sorting
  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    list.sort((a, b) => {
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'title-desc') {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === 'interval-asc') {
        const aInterval = a.recurInterval || 0;
        const bInterval = b.recurInterval || 0;
        return aInterval - bInterval;
      }
      if (sortBy === 'interval-desc') {
        const aInterval = a.recurInterval || 0;
        const bInterval = b.recurInterval || 0;
        return bInterval - aInterval;
      }
      // Priority sorting helpers
      const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
      const weightA = priorityWeight[a.priority] || 0;
      const weightB = priorityWeight[b.priority] || 0;

      if (sortBy === 'priority-desc') {
        return weightB - weightA;
      }
      if (sortBy === 'priority-asc') {
        return weightA - weightB;
      }
      return 0;
    });
    return list;
  }, [filteredTasks, sortBy]);

  // Format Recurrence Text
  const formatRecurrence = (interval, unit) => {
    if (!interval || !unit) return 'Recurring';
    const cleanUnit = unit.toLowerCase();
    if (interval === 1) {
      if (cleanUnit === 'hour') return 'hourly';
      if (cleanUnit === 'day') return 'daily';
      if (cleanUnit === 'week') return 'weekly';
      if (cleanUnit === 'month') return 'monthly';
      return `every ${cleanUnit}`;
    }
    return `every ${interval} ${cleanUnit}s`;
  };

  return (
    <div className="flex-grow flex flex-col space-y-6 p-1 animate-fade-in text-neutral-900 dark:text-white">
      
      {/* Header Panel */}
      <div className="relative overflow-hidden bg-gradient-to-r from-neutral-950 to-neutral-900 border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00CFCF]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF6A00]/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6A00]/10 border border-[#FF6A00]/20 flex items-center justify-center text-[#FF6A00] shadow-inner">
              <Repeat className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight font-headings">
                Recurring Routine Board
              </h1>
              <p className="text-xs text-neutral-400 font-medium">
                Keep track of all repeated tasks and reminder cycles
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex gap-4 relative z-10">
          <div className="bg-white/5 border border-white/5 px-5 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00CFCF]/10 flex items-center justify-center text-[#00CFCF]">
              <Flame className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Active Rules</p>
              <h3 className="text-lg font-extrabold font-headings text-white">{recurringTasks.length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Sorting Bar */}
      <div className="bg-white dark:bg-[#1A1A1A]/45 border border-neutral-200 dark:border-white/5 p-4 rounded-2xl shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <input
            type="text"
            placeholder="Search recurring routine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00CFCF] transition-all"
          />
          <Filter className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3.5" />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Priority Filters */}
          <div className="flex bg-neutral-100 dark:bg-black/40 rounded-xl p-1 border border-neutral-200 dark:border-white/5">
            {['All', 'High', 'Medium', 'Low'].map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  priorityFilter === p 
                    ? 'bg-[#FF6A00] text-white shadow-sm' 
                    : 'text-neutral-500 dark:text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 text-xs text-neutral-700 dark:text-gray-300 px-4 py-1.5 pr-8 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 text-xs text-neutral-700 dark:text-gray-300 px-4 py-1.5 pr-8 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="priority-desc">Priority: High to Low</option>
              <option value="priority-asc">Priority: Low to High</option>
              <option value="title-asc">Alphabetical: A to Z</option>
              <option value="title-desc">Alphabetical: Z to A</option>
              <option value="interval-asc">Interval: Short to Long</option>
              <option value="interval-desc">Interval: Long to Short</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Routine Cards Grid */}
      {sortedTasks.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1A1A]/20 border border-dashed border-neutral-300 dark:border-white/10 rounded-3xl py-16 text-center">
          <Repeat className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-sm font-bold text-neutral-700 dark:text-gray-400 font-headings mb-1">
            No Recurring Routines Found
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 max-w-xs mx-auto leading-relaxed">
            Create recurring tasks from the main dashboard or ask voice assistant Laila (e.g. "Remind me to do exercise every day").
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedTasks.map(task => {
            // Find Category Color
            const catObj = categories.find(c => c.name === task.category);
            const dotColor = catObj ? catObj.color : '#A3A3A3';

            return (
              <div 
                key={task.id}
                className="group relative bg-white dark:bg-[#1A1A1A]/40 border border-neutral-200 dark:border-white/5 rounded-2xl p-5 hover:border-[#FF6A00]/25 dark:hover:border-[#FF6A00]/20 transition-all duration-300 flex items-center justify-between gap-4 shadow-sm hover:shadow-md"
              >
                {/* Visual Highlight indicator by priority */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-2xl ${
                  task.priority === 'High' ? 'bg-[#FF6A00]' :
                  task.priority === 'Medium' ? 'bg-[#00CFCF]' : 'bg-neutral-500'
                }`}></div>

                {/* Left side info */}
                <div className="space-y-2 flex-grow pl-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/10" 
                      style={{ backgroundColor: dotColor }}
                      title={`Category: ${task.category || 'None'}`}
                    ></span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      task.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                      task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {task.priority} Priority
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold bg-[#00CFCF]/10 text-[#00CFCF] px-2 py-0.5 rounded-full">
                      <Repeat className="w-2.5 h-2.5" />
                      {formatRecurrence(task.recurInterval, task.recurUnit)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-800 dark:text-white line-clamp-2 leading-snug">
                    {task.title}
                  </h3>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onCompleteTask(task.id)}
                    className="p-2 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-xl transition-all cursor-pointer"
                    title="Complete this occurrence"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all cursor-pointer"
                    title="Delete routine"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
