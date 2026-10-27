import React, { useState } from 'react';
import { X, Plus, Building } from 'lucide-react';

export default function CreateTenantModal({ isOpen, onClose, onCreate, isCreating }) {
  if (!isOpen) return null;

  const [form, setForm] = useState({
    name: '',
    event_title: 'Annual Sports Day 2026',
    creator_email: '',
    custom_slug: '',
    days: 120,
    max_teams: 20,
    max_sports: 10,
    storage_quota_mb: 500
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-150 dark:border-slate-800">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Building size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Tournament Workspace</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Directly provision a new client workspace with active license</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              School / Organization Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. St Georges College"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Invitational Track & Field"
                value={form.event_title}
                onChange={(e) => setForm({ ...form, event_title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Custom Slug (Optional)
              </label>
              <input
                type="text"
                placeholder="Auto-generated if blank"
                value={form.custom_slug}
                onChange={(e) => setForm({ ...form, custom_slug: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Organizer / Creator Email *
              </label>
              <input
                type="email"
                required
                placeholder="organizer@school.com"
                value={form.creator_email}
                onChange={(e) => setForm({ ...form, creator_email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                License Duration (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-150 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Resource Limits</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Max Teams</label>
                <input
                  type="number"
                  value={form.max_teams}
                  onChange={(e) => setForm({ ...form, max_teams: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Max Sports</label>
                <input
                  type="number"
                  value={form.max_sports}
                  onChange={(e) => setForm({ ...form, max_sports: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quota (MB)</label>
                <input
                  type="number"
                  value={form.storage_quota_mb}
                  onChange={(e) => setForm({ ...form, storage_quota_mb: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>{isCreating ? 'Provisioning...' : 'Provision Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
