import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, BellRing, Volume2, Calendar, ShieldAlert, Zap, ArrowRight, Play, MessageSquare, Clock, ShieldCheck
} from 'lucide-react';
import { playClick } from '../utils/soundSynth';
import mainBigLogo from '../assets/logo-dark.png';
import imgLaila from '../assets/laila_demo.png';
import imgAnalytics from '../assets/analytics_page.png';
import imgChangelog from '../assets/changelog_page.png';
import imgHistory from '../assets/history_page.png';
import imgSidebar from '../assets/side_bar.png';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStart = () => {
    playClick();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-[#00CFCF] selection:text-black font-sans relative overflow-hidden flex flex-col justify-between">
      {/* Sleek, premium ambient background glow circles (no grid/framing lines) */}
      <div className="absolute top-[-25%] left-[-15%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tr from-[#FF6A00]/15 to-transparent blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-15%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tr from-[#00CFCF]/10 to-transparent blur-[150px] pointer-events-none"></div>

      {/* HEADER NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full max-w-full px-4 py-4 flex justify-between items-center bg-[#070709]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          {/* Using the large logo image requested by the user */}
          <img src={mainBigLogo} alt="LastMinuteSaver Logo" className="h-16 md:h-20 w-auto object-contain" />
        </div>
        <button
          onClick={handleStart}
          className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full bg-white/5 hover:bg-[#00CFCF] hover:text-black border border-white/10 hover:border-transparent cursor-pointer transition-all duration-300 shadow-sm"
        >
          Login / Join
        </button>
      </header>

      {/* NEW ASYMMETRICAL SPLIT-LAYOUT HERO */}
      <main className="max-w-7xl mx-auto w-full px-6 pt-28 md:pt-36 pb-12 lg:pb-20 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center my-auto">
        
        {/* Left Column: Bold Copy & Call-To-Actions */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Announcement tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] uppercase font-bold tracking-widest text-[#00CFCF] shadow-[0_0_15px_rgba(0,207,207,0.08)]">
            <Sparkles className="w-3 h-3 text-[#FF6A00]" />
            <span>AI Voice & System Safety Nets</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] font-headings max-w-2xl">
            Never Miss a Deadline.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF6A00] via-[#FF8C00] to-[#00CFCF]">
              Rescued by Voice & Alarms.
            </span>
          </h1>

          <p className="text-neutral-400 text-sm sm:text-base font-medium leading-relaxed max-w-xl">
            LastMinuteSaver uses instant natural language processing, our advanced opposite-gender voice assistant, Laila, persistent alarms, and closed-browser mobile push notifications to rescue your schedule before the clock hits zero.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap gap-4 pt-4">
            <button
              onClick={handleStart}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#FF6A00]/20 hover:shadow-[#FF8C00]/40 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleStart}
              className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex items-center gap-2"
            >
              <Play className="w-3 h-3 text-[#00CFCF] fill-[#00CFCF]/20" />
              <span>Interactive Demo</span>
            </button>
          </div>
        </div>

        {/* Right Column: Sleek Simulated Dashboard & Floating Alerts */}
        <div className="lg:col-span-5 relative">
          {/* Card background frame */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 relative hover:border-[#00CFCF]/20 transition-all duration-500">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-[10px] font-bold text-[#FF6A00] tracking-widest uppercase">Live Safety Monitor</span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
            </div>

            {/* Simulated Alarm Item */}
            <div className="bg-black/60 border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-4 h-4 animate-bounce" />
                </div>
                <div className="text-left">
                  <h4 className="text-[11px] font-bold text-white tracking-wide uppercase">Submit DSA Project</h4>
                  <p className="text-[9px] text-neutral-400">Urgent Deadline • Action Needed</p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded bg-neutral-900 border border-white/5 font-mono text-[#00CFCF] text-xs font-bold tracking-widest">
                00:15
              </div>
            </div>

            {/* Feature Highlights within mock dashboard */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <Volume2 className="w-4 h-4 text-[#00CFCF]" />
                <div className="text-left">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-white">Opposite-Gender Synthesizer</h5>
                  <p className="text-[9px] text-neutral-400">Dynamic pitch adjusts to secure your immediate attention.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <MessageSquare className="w-4 h-4 text-[#FF6A00]" />
                <div className="text-left">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-white">Voice Rescheduling (Laila)</h5>
                  <p className="text-[9px] text-neutral-400">Modify deadlines hands-free with complete justification logs.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* NEW SHOWCASE SECTION (Mimicking "Projects" from screenshot) */}
      <section className="max-w-7xl mx-auto w-full px-6 py-16 relative z-10">
        <div className="mb-10">
          <h2 className="text-3xl md:text-5xl font-headings font-extrabold text-white mb-4 tracking-tight">Platform Features</h2>
          <p className="text-neutral-400 text-sm md:text-base max-w-2xl leading-relaxed">
            Discover how LastMinuteSaver leverages modern web technologies and AI to build an exceptional productivity experience. These core features showcase our approach to rescuing your schedule.
          </p>
          <div className="mt-4 text-sm text-neutral-400">
            Quick feature user guide. If you want to know all the features and how to use them, then <a href="https://docs.google.com/document/d/e/2PACX-1vTdaFDQsRpmedmYJsTLw-D8qVinznXrvLEjmzdO4CvlatqMKe2XRtVtRis3TVvzn5pEyX207kSfn0Jg/pub" target="_blank" rel="noopener noreferrer" className="text-[#00CFCF] hover:underline font-medium">click here</a>.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {/* Card 1: Sidebar */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] group bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all duration-300">
            <img src={imgSidebar} alt="Smart Navigation" className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <h3 className="text-xl font-headings font-bold text-white mb-2">Smart Navigation</h3>
              <p className="text-xs text-neutral-300 mb-4 line-clamp-3">Quickly jump between your tasks, recurring routines, history, and AI workspace directly from the dashboard sidebar.</p>
              <a href="https://docs.google.com/document/d/e/2PACX-1vTdaFDQsRpmedmYJsTLw-D8qVinznXrvLEjmzdO4CvlatqMKe2XRtVtRis3TVvzn5pEyX207kSfn0Jg/pub" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-wider text-white group-hover:text-blue-400 flex items-center gap-2 transition-colors">
                Read more <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 2: Laila */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] group bg-white/5 border border-white/10 hover:border-[#FF6A00]/50 transition-all duration-300">
            <img src={imgLaila} alt="Laila AI Assistant" className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <h3 className="text-xl font-headings font-bold text-white mb-2">Laila AI Assistant</h3>
              <p className="text-xs text-neutral-300 mb-4 line-clamp-3">Talk to our advanced AI voice assistant to break down complex tasks and rescue breached deadlines.</p>
              <a href="https://docs.google.com/document/d/e/2PACX-1vTdaFDQsRpmedmYJsTLw-D8qVinznXrvLEjmzdO4CvlatqMKe2XRtVtRis3TVvzn5pEyX207kSfn0Jg/pub" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-wider text-white group-hover:text-[#FF6A00] flex items-center gap-2 transition-colors">
                Read more <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 2: Analytics */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] group bg-white/5 border border-white/10 hover:border-[#00CFCF]/50 transition-all duration-300">
            <img src={imgAnalytics} alt="Deep Analytics" className="absolute inset-0 w-full h-full object-cover object-left-top group-hover:scale-105 transition-transform duration-700 opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <h3 className="text-xl font-headings font-bold text-white mb-2">Deep Analytics</h3>
              <p className="text-xs text-neutral-300 mb-4 line-clamp-3">Track your productivity trends, completion rates, and focus times with gorgeous data visualizations.</p>
              <a href="https://docs.google.com/document/d/e/2PACX-1vTdaFDQsRpmedmYJsTLw-D8qVinznXrvLEjmzdO4CvlatqMKe2XRtVtRis3TVvzn5pEyX207kSfn0Jg/pub" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-wider text-white group-hover:text-[#00CFCF] flex items-center gap-2 transition-colors">
                Read more <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 3: Changelog */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] group bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all duration-300">
            <img src={imgChangelog} alt="Action Changelog" className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <h3 className="text-xl font-headings font-bold text-white mb-2">Action Changelog</h3>
              <p className="text-xs text-neutral-300 mb-4 line-clamp-3">Maintain a comprehensive audit trail of every modification, snooze, and cancellation in your schedule.</p>
              <a href="https://docs.google.com/document/d/e/2PACX-1vTdaFDQsRpmedmYJsTLw-D8qVinznXrvLEjmzdO4CvlatqMKe2XRtVtRis3TVvzn5pEyX207kSfn0Jg/pub" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-wider text-white group-hover:text-purple-400 flex items-center gap-2 transition-colors">
                Read more <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 4: History */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] group bg-white/5 border border-white/10 hover:border-green-500/50 transition-all duration-300">
            <img src={imgHistory} alt="Completion History" className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <h3 className="text-xl font-headings font-bold text-white mb-2">Completion History</h3>
              <p className="text-xs text-neutral-300 mb-4 line-clamp-3">Look back at all your successfully completed tasks and celebrate your productivity wins.</p>
              <a href="https://docs.google.com/document/d/e/2PACX-1vTdaFDQsRpmedmYJsTLw-D8qVinznXrvLEjmzdO4CvlatqMKe2XRtVtRis3TVvzn5pEyX207kSfn0Jg/pub" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-wider text-white group-hover:text-green-400 flex items-center gap-2 transition-colors">
                Read more <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES SHOWCASE MATRIX */}
      <section className="max-w-7xl mx-auto w-full px-6 py-12 relative z-10 border-t border-white/5">
        <h3 className="text-center font-headings font-extrabold text-xs uppercase tracking-widest text-[#00CFCF] mb-10">
          Core Safety-Net Matrix
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-[#FF6A00]/30 transition-all duration-300 group">
            <div className="w-9 h-9 rounded-lg bg-[#FF6A00]/10 border border-[#FF6A00]/20 flex items-center justify-center text-[#FF6A00] mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-headings font-bold text-xs uppercase tracking-wider text-white">Snooze & AI checklists</h4>
            <p className="mt-2 text-[11px] text-neutral-400 leading-relaxed font-medium">
              Get Gemini-generated subtask checklists and emergency snooze operations on critical deadlines.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-[#00CFCF]/30 transition-all duration-300 group">
            <div className="w-9 h-9 rounded-lg bg-[#00CFCF]/10 border border-[#00CFCF]/20 flex items-center justify-center text-[#00CFCF] mb-4">
              <BellRing className="w-5 h-5" />
            </div>
            <h4 className="font-headings font-bold text-xs uppercase tracking-wider text-white">Closed-Browser Alerts</h4>
            <p className="mt-2 text-[11px] text-neutral-400 leading-relaxed font-medium">
              Registered Service Worker triggers immediate system-level chime alarms even if the app or browser is fully closed.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-[#007BFF]/30 transition-all duration-300 group">
            <div className="w-9 h-9 rounded-lg bg-[#007BFF]/10 border border-[#007BFF]/20 flex items-center justify-center text-[#007BFF] mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-headings font-bold text-xs uppercase tracking-wider text-white">Ecosystem Syncing</h4>
            <p className="mt-2 text-[11px] text-neutral-400 leading-relaxed font-medium">
              Direct API bindings with Google Calendar, Notion databases, verified Email OTP services, and Telegram alerting bots.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 border-t border-white/5 flex justify-between items-center text-neutral-500 text-[9px] relative z-10">
        <span>© {new Date().getFullYear()} LastMinuteSaver. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
