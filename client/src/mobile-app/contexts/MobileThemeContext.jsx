import React, { createContext, useContext, useState, useEffect } from 'react';
import { MobileColors } from '../constants/MobileColors.js';
import { Sun, Moon } from 'lucide-react';

const MobileThemeContext = createContext();

export function MobileThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mobile_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark';
    }
    return 'dark';
  });

  const isDark = theme === 'dark';
  const colors = isDark ? MobileColors.dark : MobileColors.light;

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('mobile_theme', next);
  };

  useEffect(() => {
    // Sync class on body if needed for tailwind or mobile styling
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <MobileThemeContext.Provider value={{ theme, isDark, toggleTheme, colors }}>
      {children}
    </MobileThemeContext.Provider>
  );
}

export function useMobileTheme() {
  const context = useContext(MobileThemeContext);
  if (!context) {
    throw new Error('useMobileTheme must be used within a MobileThemeProvider');
  }
  return context;
}

export function MobileThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useMobileTheme();

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-amber-400 dark:text-sky-300 border border-slate-700/60 shadow-sm transition-all"
        title="Toggle Light/Dark Theme"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} className="text-slate-700" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 shadow-sm transition-all"
    >
      {isDark ? (
        <>
          <Sun size={13} className="text-amber-400" />
          <span className="text-[11px]">Light</span>
        </>
      ) : (
        <>
          <Moon size={13} className="text-sky-400" />
          <span className="text-[11px] text-slate-800">Dark</span>
        </>
      )}
    </button>
  );
}
