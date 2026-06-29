import React, { useState } from 'react';
import { parseReminderInput } from '../utils/nlpParser';
import { Sparkles, Clock, AlertCircle, Plus, Flame, Phone, Droplets, Dumbbell, FileSpreadsheet, Users, ShoppingCart } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { playClick } from '../utils/soundSynth';

export default function TaskForm({ onAddTask, categories = [] }) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurInterval, setRecurInterval] = useState(1);
  const [recurUnit, setRecurUnit] = useState('day');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const parsed = parseReminderInput(inputValue);
    if (parsed) {
      playClick();
      // Apply manual recurrence if selected and not already parsed from text
      if (isRecurring && !parsed.isRecurring) {
        parsed.isRecurring = true;
        parsed.recurInterval = recurInterval;
        parsed.recurUnit = recurUnit;
      }
      if (selectedCategory) {
        parsed.category = selectedCategory;
      }
      parsed.aiEnabled = aiEnabled;
      onAddTask(parsed);
      setInputValue('');
      setError('');
      setIsRecurring(false);
      setSelectedCategory('');
      setAiEnabled(false);
    } else {
      setError('Could not parse task. Please write a task name and a time.');
    }
  };

  const applyTemplate = (text) => {
    playClick();
    setInputValue(text);
    setError('');
  };

  const templates = [
    { icon: ShoppingCart, color: 'text-red-500 bg-red-500/10 border-red-500/20', title: 'Groceries', meta: '5:30 PM', priority: 'Medium', text: 'Buy groceries at 5:30PM medium priority' },
    { icon: Phone, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', title: 'Client Call', meta: '1h', priority: 'High', text: 'Call the client back in 1 hour high priority' },
    { icon: FileSpreadsheet, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', title: 'Daily DSA', meta: 'every 24h', priority: 'High', text: 'Do DSA every day at 9pm high priority' },
    { icon: Droplets, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', title: 'Drink Water', meta: 'every 2h', priority: 'Low', text: 'Drink water every 2 hours low priority' },
    { icon: Dumbbell, color: 'text-green-500 bg-green-500/10 border-green-500/20', title: 'Work Stretch', meta: 'everyday 6:30PM', priority: 'Medium', text: 'Take a work stretch break everyday at 6:30PM medium priority' },
    { icon: Users, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', title: 'Team Sync', meta: '3d', priority: 'Medium', text: 'Join team sync in 3 days' }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold font-headings text-neutral-950 dark:text-white flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#FF6A00]" />
        Create Smart Reminder
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="reminder-input" className="block text-[10px] font-bold text-neutral-400 dark:text-gray-500 mb-1.5 uppercase tracking-widest font-headings">
            Natural Language Command
          </label>
          <div className="relative">
            <input
              id="reminder-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g., meeting call in 5 minutes high priority"
              className="w-full bg-neutral-50 dark:bg-black/40 border-2 border-[#00CFCF]/40 dark:border-[#00CFCF]/40 rounded-xl px-4 py-3 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#00CFCF] focus:ring-2 focus:ring-[#00CFCF]/50 focus:shadow-[0_0_15px_rgba(0,207,207,0.3)] transition-all pr-10"
            />
            <Clock className="absolute right-3.5 top-3 w-4 h-4 text-neutral-400 dark:text-gray-500 pointer-events-none" />
          </div>
          {error && (
            <p className="text-red-500 text-[10px] mt-1.5 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-gray-500 uppercase tracking-widest font-headings">Category</span>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { name: 'Auto (NLP)', value: '', color: 'border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-gray-400', activeColor: 'bg-neutral-200 dark:bg-white/15 text-neutral-900 dark:text-white border-neutral-400 dark:border-white/30' },
                  ...categories.map(cat => ({
                    name: cat.name,
                    value: cat.name,
                    color: cat.color === '#FF6A00' ? 'border-[#FF6A00]/30 text-[#FF6A00]' : 'border-[#00CFCF]/30 text-[#00CFCF]',
                    activeColor: cat.color === '#FF6A00' 
                      ? 'bg-[#FF6A00]/15 text-[#FF6A00] border-[#FF6A00]' 
                      : 'bg-[#00CFCF]/15 text-[#00CFCF] border-[#00CFCF]'
                  }))
                ].map(opt => {
                  const isSelected = selectedCategory === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { playClick(); setSelectedCategory(opt.value); }}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all duration-205 cursor-pointer ${isSelected ? opt.activeColor : `${opt.color} hover:bg-neutral-100 dark:hover:bg-white/5`}`}
                    >
                      {opt.name}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer group bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded px-2.5 py-1.5 transition-all hover:bg-neutral-200 dark:hover:bg-white/10 self-end">
              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${aiEnabled ? 'bg-[#00CFCF] border-[#00CFCF]' : 'bg-white dark:bg-black/30 border-neutral-300 dark:border-gray-600 group-hover:border-[#00CFCF]/50'}`}>
                {aiEnabled && <Sparkles className="w-2.5 h-2.5 text-white" />}
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
              />
              <span className="text-[10px] font-bold text-neutral-600 dark:text-gray-400">ENABLE AI MODE</span>
            </label>
            
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-600 dark:text-gray-400 cursor-pointer self-end py-1.5">
              <input 
                type="checkbox" 
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-neutral-300 text-[#00CFCF] focus:ring-[#00CFCF]"
              />
              REPEAT TASK
            </label>
            {isRecurring && (
              <div className="flex items-center gap-2 animate-fade-in self-end py-1.5">
                <span className="text-[10px] text-neutral-500 font-bold">Every</span>
                <input 
                  type="number" 
                  min="1" 
                  value={recurInterval}
                  onChange={(e) => setRecurInterval(parseInt(e.target.value) || 1)}
                  className="w-12 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded px-1.5 py-1 text-[10px] text-neutral-900 dark:text-white text-center"
                />
                <CustomSelect
                  value={recurUnit}
                  onChange={setRecurUnit}
                  options={[
                    { label: 'Hours', value: 'hour' },
                    { label: 'Days', value: 'day' },
                    { label: 'Weeks', value: 'week' },
                    { label: 'Months', value: 'month' }
                  ]}
                  buttonClassName="bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded px-2 py-1.5 text-[10px]"
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="w-full bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FF9E00] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_4px_15px_rgba(255,106,0,0.25)] hover:shadow-[0_4px_20px_rgba(255,106,0,0.45)] disabled:opacity-35 disabled:pointer-events-none text-xs cursor-pointer btn-premium flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Reminder
        </button>
        <p className="text-center text-[10px] font-semibold text-neutral-400 dark:text-gray-500 mt-2">
          You can also create using voice assistant. For activating it, say <span className="text-[#00CFCF]">"Hey, Laila"</span>.
        </p>
      </form>

      <div className="pt-3 border-t border-neutral-200 dark:border-white/5 mt-4">
        <span className="text-[10px] font-bold text-neutral-400 dark:text-gray-500 block mb-2.5 uppercase tracking-widest font-headings">
          Quick Templates
        </span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {templates.map((tpl, i) => {
            const IconComponent = tpl.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => applyTemplate(tpl.text)}
                className="text-left bg-neutral-50 hover:bg-neutral-100 dark:bg-white/5 dark:hover:bg-[#00CFCF]/5 border border-neutral-200 dark:border-white/5 hover:border-[#00CFCF]/25 dark:hover:border-[#00CFCF]/20 rounded-xl p-2.5 text-xs transition-all flex flex-col justify-between h-20 cursor-pointer shadow-sm hover:shadow hover:-translate-y-0.5 group"
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-1 rounded-lg border flex items-center justify-center ${tpl.color}`}>
                    <IconComponent className="w-3.5 h-3.5 group-hover:scale-115 transition-transform duration-300" />
                  </div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    tpl.priority === 'Urgent' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    tpl.priority === 'High' ? 'bg-orange-500/10 text-[#FF6A00] border border-[#FF6A00]/20' :
                    tpl.priority === 'Medium' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-500' : 'bg-green-500/10 text-green-500'
                  }`}>
                    {tpl.priority}
                  </span>
                </div>
                <div className="mt-1 min-w-0">
                  <p className="font-bold text-neutral-800 dark:text-gray-200 text-[10px] truncate group-hover:text-[#00CFCF] transition-colors">{tpl.title}</p>
                  <p className="text-[9px] text-neutral-400 dark:text-gray-500 font-medium">In {tpl.meta}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
