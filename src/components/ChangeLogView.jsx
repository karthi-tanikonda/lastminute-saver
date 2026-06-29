import React, { useState } from 'react';
import { Calendar, Trash2, Clock, Info, ShieldAlert, CheckCircle2, ChevronRight, Ban } from 'lucide-react';

export default function ChangeLogView({ tasks = [], completedTasks = [], notifications = [] }) {
  const [filter, setFilter] = useState('all'); // 'all', 'rescheduled', 'cancelled'

  // Extract rescheduled tasks (active or completed)
  const rescheduledTasks = [
    ...tasks.filter(t => t.modificationReason),
    ...completedTasks.filter(t => t.modificationReason)
  ].map(t => ({
    id: t.id,
    title: t.title,
    type: 'rescheduled',
    priority: t.priority,
    category: t.category,
    time: t.createdAt,
    reason: t.modificationReason,
    durationSeconds: t.durationSeconds,
    completed: t.completed
  }));

  // Extract cancelled tasks from notifications
  // Notification text matches: "🗑️ Cancelled task: \"[title]\". Reason: [reason]"
  const cancelledEvents = notifications
    .filter(n => n.text && n.text.includes('🗑️ Cancelled task:'))
    .map(n => {
      // Parse details
      const match = n.text.match(/🗑️ Cancelled task:\s*"(.*?)"\.\s*Reason:\s*(.*)/);
      return {
        id: n.id,
        title: match ? match[1] : 'Unspecified Task',
        type: 'cancelled',
        priority: 'Medium',
        category: 'System',
        time: n.time,
        reason: match ? match[2] : n.text
      };
    });

  // Combine and sort by newest first
  const allEvents = [...rescheduledTasks, ...cancelledEvents].sort((a, b) => b.time - a.time);

  const filteredEvents = allEvents.filter(e => {
    if (filter === 'rescheduled') return e.type === 'rescheduled';
    if (filter === 'cancelled') return e.type === 'cancelled';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-200 dark:border-white/5 pb-5 gap-4">
        <div>
          <h2 className="text-xl font-bold font-headings text-neutral-950 dark:text-white flex items-center gap-2">
            <Clock className="w-5.5 h-5.5 text-[#FF6A00]" />
            Smart Change & Cancellation Log
          </h2>
          <p className="text-xs text-neutral-500 dark:text-gray-400 mt-1">
            Review all tasks that have been postponed, preponed, or cancelled, along with your voiced justifications.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'rescheduled', label: 'Rescheduled' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filter === opt.id 
                  ? 'bg-white dark:bg-[#1A1A1A] text-neutral-950 dark:text-white shadow-sm border border-neutral-200/50 dark:border-white/5' 
                  : 'text-neutral-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-white dark:bg-[#1A1A1A]/30 border border-neutral-200 dark:border-white/5 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-[#00CFCF]/10 flex items-center justify-center border border-[#00CFCF]/20 text-[#00CFCF]">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <p className="text-neutral-900 dark:text-white font-medium text-sm">No log entries found</p>
            <p className="text-neutral-500 dark:text-gray-500 text-xs mt-1">
              {filter === 'all' 
                ? "No tasks have been preponed, postponed, or cancelled yet." 
                : filter === 'rescheduled' 
                  ? "No tasks have been rescheduled yet." 
                  : "No tasks have been cancelled yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative border-l border-neutral-200 dark:border-white/10 pl-6 ml-3 space-y-6">
          {filteredEvents.map((evt, idx) => {
            const isCancelled = evt.type === 'cancelled';
            const formattedTime = new Date(evt.time).toLocaleDateString() + ' at ' + new Date(evt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div key={idx} className="relative group">
                {/* Bullet */}
                <div className={`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all bg-[#121212] ${
                  isCancelled 
                    ? 'border-red-500 text-red-500 group-hover:bg-red-500/10' 
                    : 'border-[#00CFCF] text-[#00CFCF] group-hover:bg-[#00CFCF]/10'
                }`}>
                  {isCancelled ? <Ban className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                </div>

                {/* Card Container */}
                <div className={`border rounded-2xl p-4 transition-all duration-300 ${
                  isCancelled 
                    ? 'bg-gradient-to-br from-red-500/5 to-transparent border-red-500/15 hover:border-red-500/30' 
                    : 'bg-gradient-to-br from-[#00CFCF]/5 to-transparent border-[#00CFCF]/15 hover:border-[#00CFCF]/30'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isCancelled
                          ? 'bg-red-500/10 text-red-500 border-red-500/25'
                          : 'bg-[#00CFCF]/10 text-[#00CFCF] border-[#00CFCF]/25'
                      }`}>
                        {evt.type}
                      </span>
                      {evt.priority && (
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          {evt.priority} Priority
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 dark:text-gray-500 font-medium">
                      {formattedTime}
                    </span>
                  </div>

                  <h3 className="text-neutral-900 dark:text-white font-semibold text-sm mb-3">
                    {evt.title}
                  </h3>

                  {/* Justification Box */}
                  <div className="bg-neutral-50 dark:bg-black/30 border border-neutral-200 dark:border-white/5 rounded-xl p-3 text-xs leading-relaxed">
                    <p className="text-[10px] font-bold text-neutral-400 dark:text-gray-500 uppercase tracking-wider mb-1 font-headings">
                      Justification
                    </p>
                    <p className="text-neutral-700 dark:text-gray-300 font-medium italic">
                      "{evt.reason || 'No explanation recorded.'}"
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
