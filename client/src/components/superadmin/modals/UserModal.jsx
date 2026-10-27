import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, Lock, Save } from 'lucide-react';

export default function UserModal({ user, isOpen, onClose, onSave, isSaving }) {
  if (!isOpen) return null;

  const isEditing = Boolean(user);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer',
    is_locked: false
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'viewer',
        is_locked: Boolean(user.is_locked)
      });
    } else {
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        is_locked: false
      });
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-150 dark:border-slate-800">
          <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
            <UserCheck size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Edit User Account' : 'Create Global User'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEditing ? `Managing ${user.email}` : 'Provision a new user across all workspaces'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Global Role *
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold focus:bg-white dark:focus:bg-slate-800"
            >
              <option value="viewer">Viewer (Read-only)</option>
              <option value="scorekeeper">Scorekeeper (Record scores & heats)</option>
              <option value="media_manager">Media Manager (TV adverts & FanZone)</option>
              <option value="admin">Workspace Admin (Full workspace controls)</option>
              <option value="superadmin">Superadmin (Global platform administrator)</option>
            </select>
          </div>

          {isEditing && (
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-300 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_locked}
                  onChange={(e) => setForm({ ...form, is_locked: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300"
                />
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <Lock size={13} />
                  Suspend / Lock this user account
                </span>
              </label>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-150 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save size={13} />
              <span>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
