import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.jsx';

export default function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm cursor-pointer select-none group focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-indigo-400 transition-transform duration-300 transform group-hover:-rotate-12" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 transform group-hover:rotate-45" />
        )}
      </div>

      {showLabel ? (
        <span className="text-xs font-semibold capitalize">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      ) : (
        <span className="text-[11px] font-medium hidden md:inline-block">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}
