import React, { useState } from 'react';
import { X, Key, Save, Check } from 'lucide-react';

export default function ResetPasswordModal({ user, isOpen, onClose, onReset, isResetting }) {
  if (!isOpen || !user) return null;

  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onReset(user.id, password, () => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPassword('');
        onClose();
      }, 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-150 dark:border-slate-800">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Key size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Reset Password</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{user.email}</p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center text-emerald-600 dark:text-emerald-400 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <Check size={20} />
            </div>
            <p className="text-sm font-bold">Password Reset Successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                New Temporary Password *
              </label>
              <input
                type="text"
                required
                minLength={6}
                placeholder="Enter at least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs font-semibold focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              This will update the password immediately and revoke any active JWT sessions for this account.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isResetting || !password}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Save size={13} />
                <span>{isResetting ? 'Updating...' : 'Set Password'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
