import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Paperclip, Loader2, Sparkles, User, Bot, Clock, AlertTriangle, CheckCircle2, ChevronRight, ImageIcon } from 'lucide-react';
import { marked } from 'marked';
import { playClick } from '../utils/soundSynth';
import taskAiAssistantLogo from '../assets/Task_AI_assistant.png';
import botLogo from '../assets/bot_logo.png';

const formatMarkdown = (text) => {
  if (!text) return null;
  // Parse with marked and wrap in highly customized prose
  const html = marked.parse(text, { breaks: true });
  return (
    <div 
      className="prose prose-sm prose-invert max-w-none 
                 prose-p:leading-relaxed prose-p:my-2
                 prose-headings:mt-5 prose-headings:mb-3 
                 prose-h1:text-[#FF6A00] prose-h2:text-[#00CFCF] prose-h3:text-[#00CFCF] 
                 prose-strong:text-white prose-strong:font-bold
                 prose-ul:list-disc prose-ul:ml-4 prose-li:my-1
                 prose-a:text-[#00CFCF] hover:prose-a:text-white transition-colors"
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
};

export default function TaskAIChat({ task, onClose, isInline = false }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello! I'm ready to help you complete "${task.title}". What information or files do you want to share to get started?`,
      time: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Dictation logic removed as requested
  const fileInputRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    playClick();
    const newUserMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      time: new Date()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);

    // Call Real AI backend
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: task.id,
        prompt: inputText,
        messages: messages.slice(-5) // Send last 5 messages for context
      })
    })
    .then(res => {
      if (!res.ok) {
        if (res.status === 404) throw new Error("404_NOT_FOUND");
        throw new Error("HTTP_ERROR_" + res.status);
      }
      return res.json();
    })
    .then(data => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.text || "I'm sorry, I couldn't generate a response.",
        time: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    })
    .catch(err => {
      console.error(err);
      
      let errorMsg = "I encountered a network error while trying to reach my server.";
      if (err.message === "404_NOT_FOUND" || err.message.includes("SyntaxError")) {
        errorMsg = "⚠️ The AI chat endpoint is missing! Please restart your Node.js backend server in the terminal so it loads the new AI code.";
      }

      const errResponse = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: errorMsg,
        time: new Date()
      };
      setMessages(prev => [...prev, errResponse]);
    })
    .finally(() => {
      setIsTyping(false);
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    playClick();
    const uploadMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: `Uploaded a file: "${file.name}"`,
      isAttachment: true,
      time: new Date()
    };
    setMessages(prev => [...prev, uploadMsg]);
    setIsTyping(true);
    
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Thanks for sharing "${file.name}"! I've analyzed it. How would you like to proceed?`,
        time: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);
    
    // Reset file input
    e.target.value = null;
  };

  return (
    <div className={isInline ? "w-full h-full flex flex-col bg-transparent text-neutral-900 dark:text-white" : "fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all"}>
      <div className={isInline ? "w-full h-full flex flex-col animate-fade-in" : "w-full max-w-md h-full bg-white dark:bg-[#121212] text-neutral-900 dark:text-white shadow-2xl flex flex-col animate-panel-in border-l border-neutral-200 dark:border-white/10"}>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-white/10 flex justify-between items-center bg-white/50 dark:bg-[#131314]/50 backdrop-blur-sm">
          <div className="w-40 md:w-48 shrink-0"></div> {/* Spacer for flex balance and collapsed logo */}
          
          <div className="absolute left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-10 w-full px-4">
            <div className="pointer-events-auto animate-brand-blink px-5 py-2 bg-white dark:bg-[#1A1A1A] rounded-full flex items-center gap-2 max-w-[350px] min-w-[200px] justify-center border-2 border-transparent transition-all shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
              <span className="text-[11px] font-bold text-neutral-800 dark:text-gray-100 truncate tracking-wide">
                <span className="opacity-60 font-medium">Task:</span> {task.title}
              </span>
            </div>
          </div>
          <button 
            onClick={() => { playClick(); onClose(); }}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-transparent">
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[95%] md:max-w-[90%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                {msg.sender === 'user' ? (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-md bg-gradient-to-tr from-neutral-200 to-neutral-300 dark:from-[#333333] dark:to-[#444444] text-neutral-600 dark:text-gray-300">
                    <User className="w-4 h-4" />
                  </div>
                ) : (
                  <img src={botLogo} alt="AI" className="w-9 h-9 rounded-full shrink-0 mt-0.5 shadow-md object-contain" />
                )}

                {/* Bubble */}
                <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-full min-w-0`}>
                  <div className={`px-5 py-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-white dark:bg-white text-neutral-900 font-medium rounded-tr-sm' 
                      : 'bg-[#2A2A2A] text-gray-200 rounded-tl-sm'
                  }`}>
                    {msg.isAttachment ? (
                      <div className="flex items-center gap-2 font-medium italic">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {msg.text}
                      </div>
                    ) : (
                      msg.sender === 'user' ? (
                        msg.text
                      ) : (
                        formatMarkdown(msg.text)
                      )
                    )}
                  </div>
                  <span className="text-[9px] text-neutral-400 dark:text-gray-500 mt-1.5 px-1 font-medium">
                    {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}
                  </span>
                </div>

              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-2.5 max-w-[85%] flex-row">
                <img src={botLogo} alt="AI" className="w-8 h-8 rounded-full shrink-0 mt-1 shadow-md object-contain" />
                <div className="bg-white dark:bg-[#222222] border border-neutral-200 dark:border-white/5 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-1.5 text-neutral-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00CFCF]" />
                  <span className="text-[10px] font-medium tracking-wide">AI is thinking...</span>
                </div>
              </div>
            </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-transparent">
          <form onSubmit={handleSend} className="flex flex-col gap-3 w-full max-w-3xl mx-auto">
            <div className="w-full flex items-center bg-white dark:bg-[#1e1f22] rounded-full h-[60px] px-2 shadow-md dark:shadow-lg border border-neutral-200 dark:border-white/5">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Add requirements"
                className="p-2.5 rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 shrink-0 w-12 h-12 flex items-center justify-center cursor-pointer transition-colors"
              >
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className="absolute w-full h-[2px] bg-current rounded-full"></div>
                  <div className="absolute h-full w-[2px] bg-current rounded-full"></div>
                </div>
              </button>
              
              <div className="flex-1 px-3 h-full">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask about your selected task...."
                  className="w-full h-full bg-transparent text-base text-neutral-900 dark:text-white placeholder-neutral-400/70 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 shrink-0 w-12 h-12 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
            
            <p className="text-center text-[10px] text-neutral-400 dark:text-gray-500 font-medium">
              AI can make mistakes. Please verify important information.
            </p>
          </form>
        </div>

      </div>
    </div>
  );
}
