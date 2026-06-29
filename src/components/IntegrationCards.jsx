import React, { useState, useEffect } from 'react';
import { Calendar, Database, MessageSquare, Send, Mail, X } from 'lucide-react';
import { playClick } from '../utils/soundSynth';

export default function IntegrationCards({ userProfile, setUserProfile, logNotification }) {
  const [integrations, setIntegrations] = useState([
    {
      id: 'gcal',
      name: 'Google Calendar',
      desc: 'Sync reminders as events',
      icon: Calendar,
      connected: false,
      color: '#FF7A18',
    },
    {
      id: 'notion',
      name: 'Notion Workspace',
      desc: 'Save expired reminders to database',
      icon: Database,
      connected: false,
      color: '#7C3AED',
    },
    {
      id: 'telegram',
      name: 'Telegram Alerts',
      desc: 'Get free alarms on Telegram bot',
      icon: Send,
      connected: false,
      color: '#0088cc',
    },
    {
      id: 'email',
      name: 'Email Alerts',
      desc: 'Send task alerts to your inbox',
      icon: Mail,
      connected: false,
      color: '#10B981',
    },
  ]);

  const [modalTarget, setModalTarget] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Custom Integration configurations
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [emailAlertAddress, setEmailAlertAddress] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [notionToken, setNotionToken] = useState('');
  const [notionDatabaseId, setNotionDatabaseId] = useState('');
  const [notionStep, setNotionStep] = useState('ask_account'); // Wizard: 'ask_account', 'create_account', 'setup'

  // Sync connections with profile props
  useEffect(() => {
    setIntegrations(prev =>
      prev.map(item => {
        if (item.id === 'telegram') {
          return {
            ...item,
            connected: !!userProfile.telegramChatId && userProfile.telegramEnabled
          };
        }
        if (item.id === 'email') {
          return {
            ...item,
            connected: userProfile.emailEnabled
          };
        }
        if (item.id === 'gcal') {
          return { ...item, connected: !!userProfile.googleConnected };
        }
        if (item.id === 'notion') {
          return { ...item, connected: !!userProfile.notionConnected };
        }
        return item;
      })
    );
  }, [userProfile]);

  const toggleConnection = async (id) => {
    playClick();
    const item = integrations.find(it => it.id === id);
    
    if (id === 'telegram') {
      setTelegramChatId(userProfile.telegramChatId || '');
      setTelegramEnabled(userProfile.telegramEnabled || false);
      setModalTarget(item);
      return;
    }

    if (id === 'email') {
      setEmailAlertAddress(userProfile.emailAlert || '');
      setEmailEnabled(userProfile.emailEnabled || false);
      setModalTarget(item);
      return;
    }

    if (id === 'gcal') {
      if (!item.connected) {
        // Redirect to real Google Auth callback
        window.location.href = 'http://localhost:5000/api/auth/google';
      } else {
        disconnectOAuth(id);
      }
      return;
    }

    if (id === 'notion') {
      if (!item.connected) {
        setNotionToken(userProfile.notionToken || '');
        setNotionDatabaseId(userProfile.notionDatabaseId || '');
        setNotionStep('ask_account');
        setModalTarget(item);
      } else {
        disconnectOAuth(id);
      }
      return;
    }
  };

  const disconnectOAuth = async (id) => {
    try {
      const field = id === 'gcal' ? 'googleConnected' : 'notionConnected';
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: 0 })
      });
      if (res.ok) {
        const updated = await res.json();
        setUserProfile(prev => ({
          ...prev,
          googleConnected: Boolean(updated.googleConnected),
          notionConnected: Boolean(updated.notionConnected)
        }));
        logNotification(`Disconnected ${id === 'gcal' ? 'Google Calendar' : 'Notion'} workspace`, 'system');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotionSubmit = async (e) => {
    e.preventDefault();
    if (!notionToken.trim() || !notionDatabaseId.trim()) return;

    playClick();
    setLoading(true);

    // Automatically extract 32-character hexadecimal database ID from full page/database URLs
    let dbId = notionDatabaseId.trim();
    const match = dbId.match(/([a-f0-9]{32})/i);
    if (match) {
      dbId = match[1];
    }

    try {
      const res = await fetch('/api/integrations/notion/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionToken: notionToken,
          notionDatabaseId: dbId
        })
      });
      if (res.ok) {
        const userData = await res.json();
        setUserProfile(prev => ({
          ...prev,
          notionConnected: Boolean(userData.notionConnected),
          notionToken: userData.notionToken || '',
          notionDatabaseId: userData.notionDatabaseId || ''
        }));
        logNotification(`Connected Notion workspace database successfully!`, 'system');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setModalTarget(null);
    }
  };

  const handleTelegramSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramChatId: telegramChatId,
          telegramEnabled: telegramEnabled ? 1 : 0
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setUserProfile(prev => ({
          ...prev,
          telegramChatId: updated.telegramChatId,
          telegramEnabled: Boolean(updated.telegramEnabled)
        }));
        
        logNotification(
          `Updated Telegram settings. Status: ${telegramEnabled ? 'ON' : 'OFF'}. Chat ID: ${updated.telegramChatId || 'Not Configured'}`, 
          'system'
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setModalTarget(null);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAlert: emailAlertAddress,
          emailEnabled: emailEnabled ? 1 : 0
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setUserProfile(prev => ({
          ...prev,
          emailAlert: updated.emailAlert,
          emailEnabled: Boolean(updated.emailEnabled)
        }));
        
        logNotification(
          `Updated Email settings. Status: ${emailEnabled ? 'ON' : 'OFF'}. Alert Inbox: ${updated.emailAlert || 'Account Default'}`, 
          'system'
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setModalTarget(null);
    }
  };

  return (
    <div className="bg-white/40 dark:bg-[#1A1A1A]/20 border border-neutral-200 dark:border-white/5 rounded-2xl p-6 transition-colors duration-300">
      <div className="flex flex-col mb-4">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white font-headings">
          Connected Workspace Integrations
        </h3>
        <p className="text-[11px] text-neutral-500 dark:text-gray-400 mt-1">
          Synchronize your LastMinuteSaver tasks with external workspaces and alert channels
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {integrations.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => toggleConnection(item.id)}
              className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 cursor-pointer select-none ${
                item.connected
                  ? 'bg-white dark:bg-black/60 border-neutral-300 dark:border-white/10 shadow-[0_0_15px_rgba(0,207,207,0.05)]'
                  : 'bg-neutral-50/50 dark:bg-black/20 border-neutral-200/60 dark:border-white/5 hover:border-neutral-300 dark:hover:border-white/10 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    item.connected
                      ? 'bg-neutral-100 dark:bg-white/5'
                      : 'bg-neutral-200/50 dark:bg-white/5'
                  }`}
                  style={{
                    color: item.connected ? item.color : '#6B7280',
                  }}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-800 dark:text-gray-200 flex items-center gap-1.5 truncate max-w-[105px]">
                    {item.name}
                    {item.connected && (
                      <span className="flex h-1.5 w-1.5 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-neutral-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {item.connected ? 'Alert service active' : item.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <div
                  className={`w-8 h-5 rounded-full p-0.5 transition-colors duration-300 ease-in-out ${
                    item.connected ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-300 ease-in-out ${
                      item.connected ? 'translate-x-3' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notion Integration Configuration Modal */}
      {modalTarget && modalTarget.id === 'notion' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border border-neutral-250 dark:border-white/10 rounded-2xl p-6 w-[420px] shadow-2xl animate-panel-in relative">
            <button 
              type="button"
              onClick={() => { playClick(); setModalTarget(null); }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold font-headings text-neutral-900 dark:text-white mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#7C3AED]" />
              Connect Notion Workspace
            </h3>

            {notionStep === 'ask_account' && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-neutral-600 dark:text-gray-300 font-medium">
                  Do you already have a Notion account?
                </p>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => { playClick(); setNotionStep('setup'); }}
                    className="w-full bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer text-center shadow-lg shadow-[#7C3AED]/10"
                  >
                    Yes, let's connect it!
                  </button>
                  <button
                    type="button"
                    onClick={() => { playClick(); setNotionStep('create_account'); }}
                    className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 text-neutral-700 dark:text-gray-200 hover:bg-neutral-200/50 dark:hover:bg-white/5 font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer text-center"
                  >
                    No, I don't have a Notion account
                  </button>
                </div>
              </div>
            )}

            {notionStep === 'create_account' && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-neutral-500 dark:text-gray-400 leading-relaxed">
                  Notion is a beautiful, completely free workspace to write, manage notes, build tables, and organize tasks. 
                  You can sign up in 30 seconds to sync your LastMinuteSaver alarms!
                </p>
                <div className="flex flex-col gap-3">
                  <a
                    href="https://www.notion.so/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer text-center block shadow-lg shadow-[#7C3AED]/10"
                  >
                    🚀 Sign Up to Notion (Free)
                  </a>
                  
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-neutral-200 dark:border-white/5"></div>
                    <span className="flex-shrink mx-3 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Signed up?</span>
                    <div className="flex-grow border-t border-neutral-200 dark:border-white/5"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { playClick(); setNotionStep('setup'); }}
                    className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 text-neutral-700 dark:text-gray-200 hover:bg-neutral-200/50 dark:hover:bg-white/5 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer text-center"
                  >
                    I created my account. Connect now!
                  </button>
                </div>
              </div>
            )}

            {notionStep === 'setup' && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-neutral-500 dark:text-gray-400 leading-relaxed">
                  Click the button below to authorize LastMinuteSaver. You will choose which database pages to share, and we will sync them automatically!
                </p>
                <div className="flex flex-col gap-3">
                  <a
                    href="http://localhost:5000/api/auth/notion"
                    onClick={() => setModalTarget(null)}
                    className="w-full bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-all cursor-pointer text-center block shadow-lg shadow-[#7C3AED]/15 hover:scale-[1.02] animate-pulse-slow"
                  >
                    🔗 Link Notion Workspace Instantly
                  </a>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-neutral-200 dark:border-white/5"></div>
                    <span className="flex-shrink mx-3 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Or Setup Manually</span>
                    <div className="flex-grow border-t border-neutral-200 dark:border-white/5"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { playClick(); setNotionStep('manual_setup'); }}
                    className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 text-neutral-700 dark:text-gray-200 hover:bg-neutral-200/50 dark:hover:bg-white/5 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer text-center"
                  >
                    ⚙️ Advanced: Enter Token & Database ID
                  </button>
                </div>
              </div>
            )}

            {notionStep === 'manual_setup' && (
              <form onSubmit={handleNotionSubmit} className="space-y-4">
                <p className="text-xs text-neutral-500 dark:text-gray-400">
                  Manually link your workspace using your Integration Token and Database URL.
                </p>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-headings mb-1.5 flex justify-between items-center">
                    <span>Notion Integration Token</span>
                    <a
                      href="https://www.notion.so/my-integrations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7C3AED] hover:underline font-bold text-[8px]"
                    >
                      Create Token ↗
                    </a>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="e.g. ntn_145494973..."
                    value={notionToken}
                    onChange={(e) => setNotionToken(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-[#7C3AED] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-headings mb-1">
                    Notion Database URL (or ID)
                  </label>
                  <span className="block text-[8px] text-neutral-500 dark:text-gray-400 mb-1.5 leading-snug">
                    Paste the entire link of your Notion Database page from your browser's address bar. We will extract the ID automatically.
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. https://app.notion.com/p/To-Do-List-38c36337b5d5..."
                    value={notionDatabaseId}
                    onChange={(e) => setNotionDatabaseId(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-[#7C3AED] transition-all"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-neutral-250 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => { playClick(); setNotionStep('setup'); }}
                    className="px-4 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {loading ? 'Connecting...' : 'Connect Workspace'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Telegram Configuration Modal */}
      {modalTarget && modalTarget.id === 'telegram' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border border-neutral-250 dark:border-white/10 rounded-2xl p-6 w-96 shadow-2xl animate-panel-in relative">
            <button 
              type="button"
              onClick={() => { playClick(); setModalTarget(null); }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold font-headings text-neutral-900 dark:text-white mb-2 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-[#0088cc]" />
              Configure Telegram Alerts
            </h3>
            <p className="text-xs text-neutral-500 dark:text-gray-400 mb-4">
              Receive task expiry alarms in your personal Telegram chat for free.
            </p>

            <form onSubmit={handleTelegramSubmit} className="space-y-4">
              <div className="p-4 bg-[#0088cc]/10 border border-[#0088cc]/20 rounded-2xl text-center space-y-3">
                <p className="text-xs text-neutral-600 dark:text-gray-300 font-medium">
                  Click the button below to open our Telegram bot and click <strong>Start</strong>. It will link your account automatically!
                </p>
                <a
                  href={`https://t.me/LastMinuteSaver_alerts_bot?start=${userProfile.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setModalTarget(null)}
                  className="inline-flex items-center justify-center gap-2 bg-[#0088cc] hover:bg-[#0088cc]/90 text-white font-bold px-5 py-3 rounded-xl text-xs w-full text-center transition-all cursor-pointer shadow-lg shadow-[#0088cc]/20 hover:scale-[1.02]"
                >
                  <Send className="w-4 h-4 animate-bounce-horizontal" />
                  Link Telegram Bot Instantly
                </a>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-neutral-200 dark:border-white/5"></div>
                <span className="flex-shrink mx-4 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Or Setup Manually</span>
                <div className="flex-grow border-t border-neutral-200 dark:border-white/5"></div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-headings mb-1.5">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-[#0088cc] transition-all"
                />
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50/50 dark:bg-black/20 text-xs font-semibold cursor-pointer select-none">
                <span>Enable Telegram Alerts</span>
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#0088cc] cursor-pointer"
                />
              </label>

              <div className="flex gap-2 justify-end pt-4 border-t border-neutral-250 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => { playClick(); setModalTarget(null); }}
                  className="px-4 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Configuration Modal */}
      {modalTarget && modalTarget.id === 'email' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border border-neutral-250 dark:border-white/10 rounded-2xl p-6 w-96 shadow-2xl animate-panel-in relative">
            <button 
              type="button"
              onClick={() => { playClick(); setModalTarget(null); }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold font-headings text-neutral-900 dark:text-white mb-2 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-[#10B981]" />
              Configure Email Alerts
            </h3>
            <p className="text-xs text-neutral-500 dark:text-gray-400 mb-4">
              Receive alarms as automated HTML email notifications in your inbox.
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-headings mb-1.5">
                  Alert Destination Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={emailAlertAddress}
                  onChange={(e) => setEmailAlertAddress(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-[#10B981] transition-all"
                />
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50/50 dark:bg-black/20 text-xs font-semibold cursor-pointer select-none">
                <span>Enable Email Alerts</span>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#10B981] cursor-pointer"
                />
              </label>

              <div className="flex gap-2 justify-end pt-4 border-t border-neutral-250 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => { playClick(); setModalTarget(null); }}
                  className="px-4 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
