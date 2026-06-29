import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { BarChart2, PieChart as PieChartIcon, Activity, CheckCircle2, Bot, LineChart, CalendarDays, Clock } from 'lucide-react';

export default function AnalyticsView({ completedTasks = [], categories = [] }) {

  // 1. Category Data
  const categoryData = useMemo(() => {
    const counts = {};
    completedTasks.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.keys(counts).map(catName => {
      const catObj = categories.find(c => c.name === catName);
      return {
        name: catName,
        value: counts[catName],
        color: catObj ? catObj.color : '#8884d8'
      };
    }).sort((a, b) => b.value - a.value);
  }, [completedTasks, categories]);

  // 2. Priority Data
  const priorityData = useMemo(() => {
    const counts = { 'Urgent': 0, 'High': 0, 'Medium': 0, 'Low': 0 };
    completedTasks.forEach(t => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });
    return [
      { name: 'Urgent', value: counts['Urgent'], fill: '#ef4444' },
      { name: 'High', value: counts['High'], fill: '#f97316' },
      { name: 'Medium', value: counts['Medium'], fill: '#f59e0b' },
      { name: 'Low', value: counts['Low'], fill: '#3b82f6' },
    ];
  }, [completedTasks]);

  // 3. AI vs Normal
  const creationData = useMemo(() => {
    let ai = 0;
    let manual = 0;
    completedTasks.forEach(t => {
      if (t.aiEnabled || t.isAI || t.source === 'voice' || t.title.toLowerCase().includes('ai ')) {
        ai++;
      } else {
        manual++;
      }
    });
    return [
      { name: 'AI Enabled', value: ai, color: '#00CFCF' },
      { name: 'Normal', value: manual, color: '#FF6A00' }
    ];
  }, [completedTasks]);

  // 4. Completion Trends (Last 7 Days)
  const trendsData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      data.push({ name: dateStr, value: 0, dateObj: d });
    }
    completedTasks.forEach(t => {
      const taskDate = new Date(t.completedAt || t.createdAt);
      const diffTime = Math.abs(now - taskDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 6) {
        const match = data.find(d => 
          d.dateObj.getDate() === taskDate.getDate() && 
          d.dateObj.getMonth() === taskDate.getMonth()
        );
        if (match) match.value++;
      }
    });
    return data;
  }, [completedTasks]);

  // 5. Productivity by Day
  const dayData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    completedTasks.forEach(t => {
      const taskDate = new Date(t.completedAt || t.createdAt);
      counts[taskDate.getDay()]++;
    });
    return days.map((day, i) => ({ name: day, value: counts[i], fill: '#8b5cf6' }));
  }, [completedTasks]);

  // 6. Time Investment
  const timeData = useMemo(() => {
    const counts = {};
    completedTasks.forEach(t => {
      const mins = Math.ceil((t.durationSeconds || 0) / 60);
      counts[t.category] = (counts[t.category] || 0) + mins;
    });
    return Object.keys(counts).map(catName => {
      const catObj = categories.find(c => c.name === catName);
      return {
        name: catName,
        value: counts[catName],
        color: catObj ? catObj.color : '#8884d8'
      };
    }).sort((a, b) => b.value - a.value).slice(0, 5); // top 5
  }, [completedTasks, categories]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#222] border border-neutral-200 dark:border-white/10 p-3 rounded-lg shadow-xl text-xs font-medium">
          <p className="text-neutral-900 dark:text-white mb-1 font-bold">{payload[0].name || payload[0].payload.name}</p>
          <p style={{ color: payload[0].payload.color || payload[0].payload.fill || payload[0].color || '#00CFCF' }}>
            {payload[0].value} {payload[0].dataKey === 'value' && payload[0].payload.color ? (payload[0].payload.color === '#8b5cf6' ? 'Tasks' : '') : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  if (completedTasks.length === 0) {
    return (
      <div className="w-full flex items-center justify-center p-12 text-neutral-400 dark:text-gray-500 italic">
        Complete some tasks to unlock your analytics dashboard!
      </div>
    );
  }

  const totalTasks = completedTasks.length;
  const aiTasks = creationData.find(d => d.name === 'AI Enabled')?.value || 0;
  const topPriority = [...priorityData].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pb-4">
      
      {/* 1. HEADER KPI BAR */}
      <div className="bg-gradient-to-br from-white to-neutral-50 dark:from-[#1A1A1A]/90 dark:to-[#121212]/95 border border-neutral-200 dark:border-white/5 rounded-lg shadow-sm flex-none flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-white/5 relative overflow-hidden group">
        
        {/* Ambient background spanning the whole bar */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00CFCF]/5 rounded-full blur-3xl group-hover:bg-[#00CFCF]/10 transition-all duration-700 pointer-events-none"></div>

        {/* KPI: Total Tasks */}
        <div className="flex-1 p-5 flex items-center gap-4 relative z-10 hover:bg-neutral-500/5 transition-colors">
          <div className="p-3 bg-[#FF6A00]/10 dark:bg-[#FF6A00]/20 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-[#FF6A00]" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-headings uppercase tracking-widest mb-0.5">Total Completed</p>
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white font-headings tracking-tight">{totalTasks}</h3>
          </div>
        </div>

        {/* KPI: AI Assisted */}
        <div className="flex-1 p-5 flex items-center gap-4 relative z-10 hover:bg-neutral-500/5 transition-colors">
          <div className="p-3 bg-[#00CFCF]/10 dark:bg-[#00CFCF]/20 rounded-lg">
            <Bot className="w-6 h-6 text-[#00CFCF]" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-headings uppercase tracking-widest mb-0.5">AI Accelerated</p>
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white font-headings tracking-tight">{aiTasks}</h3>
          </div>
        </div>

        {/* KPI: Top Priority */}
        <div className="flex-1 p-5 flex items-center gap-4 relative z-10 hover:bg-neutral-500/5 transition-colors">
          <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg">
            <Activity className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-headings uppercase tracking-widest mb-0.5">Most Frequent Priority</p>
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white font-headings tracking-tight">{topPriority?.value > 0 ? topPriority.name : 'None'}</h3>
          </div>
        </div>
      </div>

      {/* 2. CHARTS MAIN AREA (6 CHARTS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch flex-1 min-h-0">
        
        {/* ROW 1: Trends */}
        <div className="bg-white/80 dark:bg-[#1A1A1A]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-lg p-5 shadow-sm flex flex-col hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
          <h3 className="text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase tracking-[0.2em] font-headings mb-3 flex items-center gap-2">
            <LineChart className="w-3.5 h-3.5 text-[#00CFCF]" />
            Completion Trends (7 Days)
          </h3>
          <div className="flex-grow min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrends" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00CFCF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00CFCF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000008" dark:stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} dy={5} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#00CFCF" strokeWidth={3} fillOpacity={1} fill="url(#colorTrends)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 1: Category */}
        <div className="bg-white/80 dark:bg-[#1A1A1A]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-lg p-5 shadow-sm flex flex-col hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
          <h3 className="text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase tracking-[0.2em] font-headings mb-3 flex items-center gap-2">
            <PieChartIcon className="w-3.5 h-3.5 text-pink-500" />
            Categories
          </h3>
          <div className="flex-grow min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={4} dataKey="value" stroke="none" cornerRadius={6}>
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 1: Productivity By Day */}
        <div className="bg-white/80 dark:bg-[#1A1A1A]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-lg p-5 shadow-sm flex flex-col hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
          <h3 className="text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase tracking-[0.2em] font-headings mb-3 flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
            Active Days
          </h3>
          <div className="flex-grow min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000008" dark:stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} dy={5} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#88888810' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {dayData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 2: Time Investment (Horizontal Bar) */}
        <div className="bg-white/80 dark:bg-[#1A1A1A]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-lg p-5 shadow-sm flex flex-col hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
          <h3 className="text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase tracking-[0.2em] font-headings mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Time Spent (Minutes)
          </h3>
          <div className="flex-grow min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000008" dark:stroke="#ffffff08" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#88888810' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {timeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 2: Priority */}
        <div className="bg-white/80 dark:bg-[#1A1A1A]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-lg p-5 shadow-sm flex flex-col hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
          <h3 className="text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase tracking-[0.2em] font-headings mb-3 flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-amber-500" />
            Priority Spread
          </h3>
          <div className="flex-grow min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000008" dark:stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} dy={5} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#88888810' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {priorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 2: AI vs Manual */}
        <div className="bg-white/80 dark:bg-[#1A1A1A]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-lg p-5 shadow-sm flex flex-col hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
          <h3 className="text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase tracking-[0.2em] font-headings mb-3 flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-[#FF6A00]" />
            AI Enabled vs. Normal
          </h3>
          <div className="flex-grow min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={creationData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={4} dataKey="value" stroke="none" cornerRadius={6}>
                  {creationData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
