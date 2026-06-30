import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { playClick } from '../utils/soundSynth';
import googleLogo from '../assets/google logo.png';
import { X, ChevronLeft, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Google/Email, 2 = Password/Details
  const [isLogin, setIsLogin] = useState(true); // Default to login when entering step 2

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('Male');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleLogin = () => {
    playClick();
    window.location.href = '/api/auth/google';
  };

  const handleContinueEmail = (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter an email address.');
      return;
    }
    playClick();
    setErrorMsg('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setLoading(true);
    setErrorMsg('');

    const url = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLogin 
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

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#212121] text-white flex items-center justify-center font-sans">
      <div className="w-full max-w-[420px] p-8 relative flex flex-col items-center">
        {/* Close Button top right */}
        <button onClick={handleClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors p-2">
          <X className="w-5 h-5" />
        </button>

        {step === 1 && (
          <div className="w-full flex flex-col items-center mt-6">
            <h1 className="text-3xl font-bold mb-4 text-center tracking-tight">Log in or sign up</h1>
            <p className="text-neutral-300 text-center text-[15px] mb-8">
              You'll get smarter responses and can upload files, images, and more.
            </p>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-full border border-neutral-600 hover:bg-neutral-700/30 transition-colors mb-4 text-[15px] font-medium"
            >
              <img src={googleLogo} alt="Google" className="w-5 h-5 object-contain" />
              Continue with Google
            </button>

            <div className="flex items-center w-full my-6">
              <div className="flex-1 h-px bg-neutral-700"></div>
              <span className="px-4 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">OR</span>
              <div className="flex-1 h-px bg-neutral-700"></div>
            </div>

            {errorMsg && (
              <p className="text-red-400 text-sm mb-4 w-full text-center">{errorMsg}</p>
            )}

            <form onSubmit={handleContinueEmail} className="w-full">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-transparent border border-neutral-600 rounded-full px-5 py-4 mb-4 text-white placeholder-neutral-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-[15px]"
              />
              <button 
                type="submit"
                className="w-full py-4 rounded-full bg-white hover:bg-neutral-200 text-black font-bold transition-colors text-[15px]"
              >
                Continue
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="w-full flex flex-col mt-4">
            <button 
              onClick={() => { setStep(1); setErrorMsg(''); }}
              className="self-start text-neutral-400 hover:text-white mb-6 flex items-center gap-1 text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            
            <h1 className="text-2xl font-bold mb-6 text-center tracking-tight">
              {isLogin ? 'Enter your password' : 'Create your account'}
            </h1>
            
            <p className="text-center text-neutral-400 text-[15px] mb-8 font-medium">{email}</p>

            {errorMsg && (
              <div className="mb-4 text-red-400 text-sm text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              {!isLogin && (
                <>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-transparent border border-neutral-600 rounded-full px-5 py-4 text-white placeholder-neutral-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-[15px]"
                  />
                  
                  <div className="flex gap-4 px-2 pb-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full border ${gender === 'Male' ? 'border-white bg-white/10' : 'border-neutral-600 hover:bg-neutral-700/30'} text-[15px] font-medium cursor-pointer transition-colors select-none`}>
                      <input
                        type="radio"
                        name="gender"
                        value="Male"
                        checked={gender === 'Male'}
                        onChange={() => setGender('Male')}
                        className="hidden"
                      />
                      Male
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full border ${gender === 'Female' ? 'border-white bg-white/10' : 'border-neutral-600 hover:bg-neutral-700/30'} text-[15px] font-medium cursor-pointer transition-colors select-none`}>
                      <input
                        type="radio"
                        name="gender"
                        value="Female"
                        checked={gender === 'Female'}
                        onChange={() => setGender('Female')}
                        className="hidden"
                      />
                      Female
                    </label>
                  </div>
                </>
              )}

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-transparent border border-neutral-600 rounded-full px-5 py-4 text-white placeholder-neutral-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-[15px] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-neutral-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-4 rounded-full bg-[#10A37F] hover:bg-[#0E906F] text-white font-bold transition-colors flex justify-center items-center text-[15px]"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  'Continue'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[15px] text-[#10A37F] hover:underline font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
