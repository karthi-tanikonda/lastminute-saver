import React, { useState, useMemo } from 'react';
import { Search, Calendar, AlertCircle, ArrowUpDown, Clock } from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function HistoryView({ completedTasks = [], categories = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  const filteredTasks = useMemo(() => {
    let result = [...completedTasks];

    if (searchTerm) {
      result = result.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filterCategory !== 'All') {
      result = result.filter(t => t.category === filterCategory);
    }

    if (filterPriority !== 'All') {
      result = result.filter(t => t.priority === filterPriority);
    }

    result.sort((a, b) => {
      const timeA = a.completedAt || 0;
      const timeB = b.completedAt || 0;
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [completedTasks, searchTerm, filterCategory, filterPriority, sortBy]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-[#1A1A1A]/45 border border-neutral-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white font-headings flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-[#00CFCF]" />
          Completed Tasks History
        </h2>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search completed tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#00CFCF] focus:ring-1 focus:ring-[#00CFCF] transition-all text-neutral-900 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <CustomSelect
              value={filterCategory}
              onChange={setFilterCategory}
              options={[
                { label: 'All Categories', value: 'All' },
                ...categories.map(c => ({ label: c.name, value: c.name }))
              ]}
              className="w-44"
            />

            <CustomSelect
              value={filterPriority}
              onChange={setFilterPriority}
              options={[
                { label: 'All Priorities', value: 'All' },
                { label: 'Urgent', value: 'Urgent' },
                { label: 'High', value: 'High' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Low', value: 'Low' }
              ]}
              className="w-44"
            />

            <button
              onClick={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-2 bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm hover:bg-neutral-200 dark:hover:bg-white/5 transition-all text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              <ArrowUpDown className="w-4 h-4 text-[#00CFCF]" />
              {sortBy === 'newest' ? 'Newest First' : 'Oldest First'}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-[#1A1A1A]/45 border border-neutral-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 dark:text-gray-500 italic">
            No completed tasks found matching your filters.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-white/5">
            {filteredTasks.map(task => {
              const catObj = categories.find(c => c.name === task.category);
              return (
                <div key={task.id} className="p-5 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-medium">
                      <span className="flex items-center gap-1 text-neutral-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.completedAt).toLocaleString()}
                      </span>
                      <span 
                        className="px-2 py-0.5 rounded-full border shadow-sm"
                        style={{
                          backgroundColor: `${catObj?.color || '#888'}20`,
                          borderColor: `${catObj?.color || '#888'}40`,
                          color: catObj?.color || '#888'
                        }}
                      >
                        {task.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border ${
                      task.priority === 'Urgent' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      task.priority === 'High' ? 'bg-[#FF6A00]/10 text-[#FF6A00] border-[#FF6A00]/20' :
                      task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
