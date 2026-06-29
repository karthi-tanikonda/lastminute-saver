import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Search, ChevronLeft, ChevronRight, User, Filter, ArrowUpDown, AlertCircle, Check, Sun, Moon } from 'lucide-react';
import TaskAIChat from './TaskAIChat';
import { playClick } from '../utils/soundSynth';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';
import mainLogoSmall from '../assets/main_logo_small.png';

export default function AIModeView({ tasks, userProfile, theme, toggleTheme }) {
  const aiTasks = tasks.filter(t => t.aiEnabled && !t.completed);
  const [selectedTask, setSelectedTask] = useState(aiTasks.length > 0 ? aiTasks[0] : null);
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null); // 'filter', 'sort', 'priority'
  const [filterType, setFilterType] = useState('All'); // 'All', 'Personal', 'Work'
  const [sortType, setSortType] = useState('Time'); // 'Alphabetical', 'Time', 'Priority'
  const [priorityFilter, setPriorityFilter] = useState('All'); // 'All', 'Urgent', 'High', 'Medium', 'Low'
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getSecondsRemaining = (task) => {
    const elapsed = (Date.now() - new Date(task.createdAt).getTime()) / 1000;
    const remaining = task.durationSeconds - elapsed;
    return remaining > 0 ? remaining : 0;
  };

  const priorityWeights = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };

  // Apply Filters & Search
  let processedTasks = aiTasks.filter(t => {
    // Search
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    // Category Filter
    if (filterType !== 'All' && t.category !== filterType) return false;
    // Priority Filter
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    return true;
  });

  // Apply Sort
  processedTasks.sort((a, b) => {
    if (sortType === 'Alphabetical') {
      return a.title.localeCompare(b.title);
    } else if (sortType === 'Priority') {
      return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
    } else {
      // Time remaining
      return getSecondsRemaining(a) - getSecondsRemaining(b);
    }
  });

  const toggleDropdown = (dropdown) => {
    playClick();
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const selectOption = (type, value) => {
    playClick();
    if (type === 'filter') setFilterType(value);
    if (type === 'sort') setSortType(value);
    if (type === 'priority') setPriorityFilter(value);
    setActiveDropdown(null);
  };

  const renderDropdownMenu = (type, options, currentValue) => {
    if (activeDropdown !== type) return null;
    return (
      <div className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => selectOption(type, opt)}
            className="w-full text-left px-4 py-2.5 text-[11px] font-bold hover:bg-neutral-100 dark:hover:bg-white/10 flex items-center justify-between text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            {opt}
            {currentValue === opt && <Check className="w-3.5 h-3.5 text-[#00CFCF]" />}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex-1 flex bg-transparent text-neutral-900 dark:text-white overflow-hidden relative">
      
      {/* LEFT SIDEBAR */}
      <div 
        className={`flex flex-col bg-white dark:bg-[#121212] border-r border-neutral-200 dark:border-transparent transition-all duration-500 ease-in-out relative shrink-0 ${
          isSidebarOpen ? 'w-[300px] md:w-[350px] opacity-100' : 'w-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-4 whitespace-nowrap min-w-[300px]">
          {/* Profile & Title */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={logoLight} alt="LastMinuteSaver" className="h-12 w-auto dark:hidden object-contain" />
              <img src={logoDark} alt="LastMinuteSaver" className="h-12 w-auto hidden dark:block object-contain" />
            </div>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-neutral-100 dark:bg-[#1A1A1A] hover:bg-neutral-200 dark:hover:bg-[#2A2A2A] text-neutral-600 dark:text-gray-400 hover:text-neutral-950 dark:hover:text-white transition-all cursor-pointer border border-neutral-200 dark:border-white/10"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 mb-4 relative z-40">
            <div className="relative">
              <button 
                onClick={() => toggleDropdown('filter')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wide transition-all shadow-sm cursor-pointer ${
                  filterType !== 'All' 
                    ? 'bg-[#00CFCF]/10 border-[#00CFCF] text-[#00CFCF]' 
                    : 'bg-neutral-50 dark:bg-[#000000] border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-gray-300 hover:border-[#00CFCF]/50 hover:text-[#00CFCF]'
                }`}
              >
                <Filter className="w-3 h-3" /> Filter
              </button>
              {renderDropdownMenu('filter', ['All', 'Personal', 'Work'], filterType)}
            </div>

            <div className="relative">
              <button 
                onClick={() => toggleDropdown('sort')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wide transition-all shadow-sm cursor-pointer ${
                  sortType !== 'Time' 
                    ? 'bg-[#00CFCF]/10 border-[#00CFCF] text-[#00CFCF]' 
                    : 'bg-neutral-50 dark:bg-[#000000] border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-gray-300 hover:border-[#00CFCF]/50 hover:text-[#00CFCF]'
                }`}
              >
                <ArrowUpDown className="w-3 h-3" /> Sort
              </button>
              {renderDropdownMenu('sort', ['Alphabetical', 'Time', 'Priority'], sortType)}
            </div>

            <div className="relative">
              <button 
                onClick={() => toggleDropdown('priority')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wide transition-all shadow-sm cursor-pointer ${
                  priorityFilter !== 'All' 
                    ? 'bg-[#00CFCF]/10 border-[#00CFCF] text-[#00CFCF]' 
                    : 'bg-neutral-50 dark:bg-[#000000] border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-gray-300 hover:border-[#00CFCF]/50 hover:text-[#00CFCF]'
                }`}
              >
                <AlertCircle className="w-3 h-3" /> Priority
              </button>
              {renderDropdownMenu('priority', ['All', 'Urgent', 'High', 'Medium', 'Low'], priorityFilter)}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#00CFCF]" />
            <input 
              type="text"
              placeholder="Search AI tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-black/40 border-2 border-neutral-200 dark:border-[#00CFCF]/40 focus:border-[#00CFCF] rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none transition-all shadow-sm dark:shadow-[0_0_12px_rgba(0,207,207,0.15)]"
            />
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 min-w-[300px]">
          {processedTasks.length === 0 ? (
            <div className="text-center p-6 text-xs text-neutral-500 dark:text-gray-400 font-medium">
              No tasks match your current filters.
            </div>
          ) : (
            processedTasks.map(task => (
              <button
                key={task.id}
                onClick={() => { playClick(); setSelectedTask(task); }}
                className={`w-full text-left p-3.5 rounded-xl transition-all border cursor-pointer flex flex-col gap-2 ${
                  selectedTask?.id === task.id 
                    ? 'bg-gradient-to-r from-[#00CFCF]/15 to-transparent border-[#00CFCF]/50 shadow-md transform scale-[1.02]' 
                    : 'bg-white dark:bg-white/5 border-neutral-200/50 dark:border-white/5 hover:border-[#00CFCF]/30 hover:bg-neutral-50 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-xs font-bold truncate ${selectedTask?.id === task.id ? 'text-[#00CFCF]' : 'text-neutral-800 dark:text-gray-200'}`}>
                    {task.title}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider shrink-0 ${
                    task.priority === 'Urgent' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    task.priority === 'High' ? 'bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/20' :
                    task.priority === 'Medium' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                    'bg-neutral-500/10 text-neutral-500 border border-neutral-500/20'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500 dark:text-gray-500 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3 h-3 text-[#FF6A00]" /> AI Ready
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* HIGH VISIBILITY TOGGLE BUTTON */}
      <button
        onClick={() => { playClick(); setIsSidebarOpen(!isSidebarOpen); }}
        className={`absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center h-20 w-5 hover:w-7 bg-gradient-to-b from-[#FF6A00] to-[#00CFCF] shadow-lg cursor-pointer transition-all duration-500 ease-in-out group overflow-hidden rounded-r-2xl rounded-l-none border-y border-r border-white/20 ${
          isSidebarOpen 
            ? 'left-[300px] md:left-[350px]' 
            : 'left-0'
        }`}
        title="Toggle Sidebar"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Custom animated chevron lines */}
        <div className="flex flex-col items-center justify-center pointer-events-none relative z-10 transition-transform duration-300 group-hover:scale-110">
          <div className={`w-[2.5px] h-2.5 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.5)] group-hover:shadow-[0_0_8px_white] transition-all duration-300 origin-bottom ${isSidebarOpen ? '-rotate-[30deg]' : 'rotate-[30deg]'}`}></div>
          <div className={`w-[2.5px] h-2.5 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.5)] group-hover:shadow-[0_0_8px_white] transition-all duration-300 origin-top mt-[1.5px] ${isSidebarOpen ? 'rotate-[30deg]' : '-rotate-[30deg]'}`}></div>
        </div>
      </button>

      {/* RIGHT MAIN AREA */}
      <div className="flex-1 flex flex-col h-full bg-transparent relative transition-all duration-500 min-w-0">
        
        {/* Collapsed Sidebar Logo */}
        {!isSidebarOpen && (
          <div className="absolute top-4 left-6 z-50 flex items-center animate-fade-in">
            <img src={mainLogoSmall} alt="LastMinuteSaver" className="h-12 md:h-14 w-auto object-contain drop-shadow-sm" />
          </div>
        )}

        {/* Collapsed Sidebar Theme Toggle (Moved to Top Right) */}
        {!isSidebarOpen && (
          <div className="absolute top-5 right-20 z-50 flex items-center animate-fade-in">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm hover:bg-neutral-200 dark:hover:bg-[#2A2A2A] text-neutral-600 dark:text-gray-400 hover:text-neutral-950 dark:hover:text-white transition-all cursor-pointer border border-neutral-200 dark:border-white/10 shadow-sm"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        )}

        {/* Dynamic Clock (Top Right) */}
        {!selectedTask && (
          <div className="absolute top-6 right-8 text-right animate-fade-in z-10">
            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
              {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div className="text-xl font-extrabold text-[#00CFCF] tracking-wide font-headings">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {selectedTask ? (
          <TaskAIChat task={selectedTask} onClose={() => setSelectedTask(null)} isInline={true} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 pb-[15vh] animate-fade-in relative w-full h-full">
            {/* Subtle center glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[40vw] h-[40vw] bg-[#00CFCF]/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="flex flex-col items-center w-full max-w-3xl z-10">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium text-neutral-900 dark:text-white mb-10 tracking-tight text-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF6A00] via-[#FF8C00] to-[#00CFCF]">
                  Hi {userProfile?.username || 'User'},
                </span>
                <br />
                <span className="text-neutral-400 mt-2 block text-2xl md:text-3xl">Select your task from the sidebar.</span>
              </h1>

              {/* Gemini-style Input Bar */}
              <div className="w-full flex items-center bg-white dark:bg-[#1e1f22] rounded-full h-[60px] px-2 shadow-md dark:shadow-lg border border-neutral-200 dark:border-white/5">
                <div className="p-2.5 rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 shrink-0 w-12 h-12 flex items-center justify-center cursor-pointer transition-colors">
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <div className="absolute w-full h-[2px] bg-current rounded-full"></div>
                    <div className="absolute h-full w-[2px] bg-current rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex-1 px-3">
                  <span className="text-neutral-500 dark:text-neutral-400 text-base font-medium opacity-80 cursor-text">
                    Ask about your selected task....
                  </span>
                </div>

                <div className="p-2.5 rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 shrink-0 w-12 h-12 flex items-center justify-center cursor-pointer transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
