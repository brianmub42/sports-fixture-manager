import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.jsx';

/**
 * Modern pill toggle button to switch between light mode and dark mode.
 * Features a sliding capsule indicator, animated icons, and responsive styling.
 */
export default function ThemePillToggle({ className = '', showText = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center p-0.5 rounded-full bg-slate-200/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700/80 transition-colors duration-300 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-inner group ${className}`}
    >
      {/* Sliding indicator capsule */}
      <span
        className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200/50 dark:border-slate-700/60 transform transition-all duration-300 ease-out ${
          isDark ? 'left-[calc(50%+1px)]' : 'left-0.5'
        }`}
      />

      {/* Light Option (Sun) */}
      <span
        className={`relative z-10 flex items-center justify-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-colors duration-200 ${
          !isDark
            ? 'text-amber-600 font-extrabold'
            : 'text-slate-400 group-hover:text-slate-200'
        }`}
      >
        <Sun className="w-3.5 h-3.5 text-amber-500 transition-transform duration-300 group-hover:rotate-45" />
        {showText && <span className="text-[10px] tracking-wide">Light</span>}
      </span>

      {/* Dark Option (Moon) */}
      <span
        className={`relative z-10 flex items-center justify-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-colors duration-200 ${
          isDark
            ? 'text-indigo-400 font-extrabold'
            : 'text-slate-500 group-hover:text-slate-700'
        }`}
      >
        <Moon className="w-3.5 h-3.5 text-indigo-400 transition-transform duration-300 group-hover:-rotate-12" />
        {showText && <span className="text-[10px] tracking-wide">Dark</span>}
      </span>
    </button>
  );
}
