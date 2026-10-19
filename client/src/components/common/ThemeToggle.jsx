import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

export function ThemeToggle({ className = '' }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const options = [
    {
      id: 'light',
      label: 'Light',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: Moon,
    },
    {
      id: 'system',
      label: `System (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`,
      icon: Laptop,
    },
  ];

  const CurrentIcon = theme === 'system' ? Laptop : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-festival-500 flex items-center justify-center gap-1.5"
        aria-label="Select color theme (light, dark, system)"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <CurrentIcon className="w-4 h-4 transition-transform duration-200" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Color Scheme
          </div>
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTheme(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'text-festival-600 dark:text-festival-400 bg-festival-50/70 dark:bg-festival-950/40'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/80'
                }`}
                role="menuitem"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 opacity-80" />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-festival-600 dark:text-festival-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
