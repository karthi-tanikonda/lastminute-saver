import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-neutral-100 dark:bg-[#080808] border-t border-neutral-200 dark:border-white/5 py-8 mt-16 text-xs text-neutral-500 dark:text-gray-500 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="font-headings font-bold text-neutral-900 dark:text-white tracking-wide">LAST MINUTE LIFE SAVER</span>
          <p className="mt-1 text-[10px] text-neutral-400 dark:text-gray-600">Your intelligent emergency reminder assistant.</p>
        </div>
        <div className="flex gap-6">
          <a href="#about" className="hover:text-[#00CFCF] transition-colors">About</a>
          <a href="#privacy" className="hover:text-[#00CFCF] transition-colors">Privacy</a>
          <a href="#contact" className="hover:text-[#00CFCF] transition-colors">Contact</a>
        </div>
        <div className="text-[10px] text-neutral-400 dark:text-gray-600">
          © {new Date().getFullYear()} LMS Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
