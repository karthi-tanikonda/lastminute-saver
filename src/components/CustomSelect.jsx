import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...", 
  className = "",
  buttonClassName = "bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm hover:border-[#00CFCF]/50" 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || { label: placeholder, value: '' };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 w-full outline-none transition-all text-neutral-900 dark:text-white cursor-pointer shadow-sm font-semibold ${buttonClassName}`}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-max rounded-xl bg-white dark:bg-[#151515] border border-neutral-200 dark:border-white/10 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in origin-top">
          <ul className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {options.map((option, idx) => (
              <li
                key={option.value || idx}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 text-xs md:text-sm cursor-pointer rounded-lg transition-colors ${
                  value === option.value 
                    ? 'bg-[#00CFCF]/10 text-[#00CFCF] font-bold' 
                    : 'text-neutral-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-white/5'
                }`}
              >
                <span className="truncate pr-4">{option.label}</span>
                {value === option.value && <Check className="w-3.5 h-3.5 text-[#00CFCF]" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
