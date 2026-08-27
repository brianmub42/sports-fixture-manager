import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none font-sans">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3.5 rounded-xl border shadow-lg flex items-start gap-3 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4 backdrop-blur-md ${
              t.type === 'error'
                ? 'bg-red-500/10 border-red-200/50 dark:border-red-900/35 text-red-650 dark:text-red-400'
                : t.type === 'info'
                ? 'bg-blue-500/10 border-blue-200/50 dark:border-blue-900/35 text-blue-650 dark:text-blue-400'
                : 'bg-green-500/10 border-green-200/50 dark:border-green-900/35 text-green-650 dark:text-green-400'
            }`}
          >
            <div className="shrink-0 pt-0.5">
              {t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : t.type === 'info' ? (
                <Info className="w-4 h-4 text-blue-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-205 shrink-0 p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
              title="Close Notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
