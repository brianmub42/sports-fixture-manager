import React, { useState, useEffect } from 'react';
import { X, Save, Building, ShieldAlert } from 'lucide-react';

export default function EditTenantModal({ tenant, isOpen, onClose, onSave, isSaving }) {
  if (!isOpen || !tenant) return null;

  const [form, setForm] = useState({
    name: tenant?.name || '',
    event_title: tenant?.event_title || '',
    slug: tenant?.slug || '',
    creator_email: tenant?.creator_email || '',
    max_teams: tenant?.max_teams || 20,
    max_sports: tenant?.max_sports || 10,
    storage_quota_mb: tenant?.storage_quota_mb || 500,
    custom_domain: tenant?.custom_domain || '',
    billing_school_name: tenant?.billing_school_name || '',
    billing_contact_person: tenant?.billing_contact_person || '',
    billing_contact_number: tenant?.billing_contact_number || '',
    billing_address: tenant?.billing_address || '',
    maintenance_mode: Boolean(tenant?.maintenance_mode)
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || '',
        event_title: tenant.event_title || '',
        slug: tenant.slug || '',
        creator_email: tenant.creator_email || '',
        max_teams: tenant.max_teams || 20,
        max_sports: tenant.max_sports || 10,
        storage_quota_mb: tenant.storage_quota_mb || 500,
        custom_domain: tenant.custom_domain || '',
        billing_school_name: tenant.billing_school_name || '',
        billing_contact_person: tenant.billing_contact_person || '',
        billing_contact_number: tenant.billing_contact_number || '',
        billing_address: tenant.billing_address || '',
        maintenance_mode: Boolean(tenant.maintenance_mode)
      });
    }
  }, [tenant]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(tenant.id, form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Workspace Metadata & Quotas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Managing #{tenant.id} — {tenant.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Workspace / School Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={form.event_title}
                onChange={(e) => setForm({ ...form, event_title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Workspace Slug *
              </label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs font-semibold focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Organizer / Creator Email
              </label>
              <input
                type="email"
                value={form.creator_email}
                onChange={(e) => setForm({ ...form, creator_email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-150 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Resource Quotas & Limits</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Max Teams
                </label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={form.max_teams}
                  onChange={(e) => setForm({ ...form, max_teams: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Max Sports
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={form.max_sports}
                  onChange={(e) => setForm({ ...form, max_sports: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Storage Quota (MB)
                </label>
                <input
                  type="number"
                  min="50"
                  max="10000"
                  value={form.storage_quota_mb}
                  onChange={(e) => setForm({ ...form, storage_quota_mb: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-150 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Billing & Contact Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={form.billing_contact_person}
                  onChange={(e) => setForm({ ...form, billing_contact_person: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={form.billing_contact_number}
                  onChange={(e) => setForm({ ...form, billing_contact_number: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Billing Address
                </label>
                <input
                  type="text"
                  value={form.billing_address}
                  onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.maintenance_mode}
                onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <span>Enable Workspace Maintenance Lock</span>
            </label>

            <div className="flex gap-2">
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
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
