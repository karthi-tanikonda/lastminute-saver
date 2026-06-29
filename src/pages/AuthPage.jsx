import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Mail, Lock, User, UserCheck, HeartHandshake, Eye, EyeOff 
} from 'lucide-react';
import { playClick } from '../utils/soundSynth';
import googleLogo from '../assets/google logo.png';

export default function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('Male');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTabChange = (tab) => {
    playClick();
    setActiveTab(tab);
    setErrorMsg('');
  };

  const handleGoogleLogin = () => {
    playClick();
    // Redirect browser to backend Google OAuth start route
    window.location.href = '/api/auth/google';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setLoading(true);
    setErrorMsg('');

    const url = activeTab === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const payload = activeTab === 'login' 
      ? { email, password }
      : { email, password, username, gender };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        // Success: Redirect to dashboard
        navigate('/dashboard');
      } else {
        setErrorMsg(data.error || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error. Make sure your backend server is active.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#00CFCF] selection:text-black font-sans relative flex items-center justify-center overflow-hidden px-4">
      {/* GLOW OVERLAYS */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-[#FF6A00]/15 to-transparent blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-[#00CFCF]/10 to-transparent blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative z-10 hover:border-white/15 transition-all">
        
        {/* LOGO */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="relative w-16 h-16 mb-2 text-[#00CFCF]">
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_15px_rgba(0,207,207,0.25)]">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="opacity-80" />
              <path d="M36 50 L46 60 L68 36" fill="none" stroke="#FF6A00" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="50" cy="22" r="3" fill="#FF6A00" />
              <circle cx="50" cy="14" r="3.5" fill="#FF6A00" />
              <circle cx="50" cy="6" r="4" fill="#FF6A00" />
            </svg>
          </div>
          <h2 className="text-xl font-bold font-headings tracking-wide text-white">
            LastMinute<span className="text-[#00CFCF]">Saver</span>
          </h2>
          <p className="text-[9px] font-bold text-neutral-400 tracking-[0.2em] uppercase mt-1">
            Plan Smarter. Get Reminded. Never Miss.
          </p>
        </div>

        {/* TABS */}
        <div className="flex border-b border-white/5 mb-6">
          <button
            type="button"
            onClick={() => handleTabChange('login')}
            className={`flex-1 pb-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              activeTab === 'login' ? 'border-b-2 border-[#00CFCF] text-[#00CFCF]' : 'text-neutral-500 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('signup')}
            className={`flex-1 pb-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              activeTab === 'signup' ? 'border-b-2 border-[#00CFCF] text-[#00CFCF]' : 'text-neutral-500 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] p-3 rounded-xl flex items-center gap-2 animate-pulse">
            <span>⚠️</span>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* AUTH FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {activeTab === 'signup' && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00CFCF] focus:ring-1 focus:ring-[#00CFCF]/30 transition-all"
                  />
                </div>
              </div>

              {/* Gender Radio Selector */}
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
                  Gender (Used to match voice profile)
                </label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-black/20 text-xs font-semibold cursor-pointer hover:border-[#00CFCF]/30 transition-all select-none">
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      checked={gender === 'Male'}
                      onChange={() => setGender('Male')}
                      className="accent-[#00CFCF] cursor-pointer"
                    />
                    <span>Male (Female Voice)</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-black/20 text-xs font-semibold cursor-pointer hover:border-[#00CFCF]/30 transition-all select-none">
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      checked={gender === 'Female'}
                      onChange={() => setGender('Female')}
                      className="accent-[#00CFCF] cursor-pointer"
                    />
                    <span>Female (Male Voice)</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00CFCF] focus:ring-1 focus:ring-[#00CFCF]/30 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-neutral-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00CFCF] focus:ring-1 focus:ring-[#00CFCF]/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-neutral-500 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white font-extrabold text-xs uppercase tracking-widest shadow-md shadow-[#FF6A00]/10 hover:shadow-[#FF8C00]/30 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : activeTab === 'login' ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <HeartHandshake className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>

        </form>

        {/* OAUTH SECTION */}
        <div className="flex flex-col items-center justify-center mt-6 pt-5 border-t border-white/5 space-y-3">
          <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-widest">or continue with</span>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm p-2"
              title="Continue with Google"
            >
              <img src={googleLogo} alt="Google" className="w-full h-full object-contain" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
