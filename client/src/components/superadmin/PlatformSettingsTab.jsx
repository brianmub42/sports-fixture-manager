import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminApi } from '../../api.js';
import { Settings, Save, RefreshCw, CreditCard, Shield, Globe, AlertTriangle, Check } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext.jsx';

export default function PlatformSettingsTab() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [form, setForm] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin_platform_settings'],
    queryFn: () => superadminApi.getSettings().then(r => r.data)
  });

  useEffect(() => {
    if (data?.settings) {
      const map = {};
      data.settings.forEach(s => {
        map[s.key] = s.value;
      });
      setForm(map);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (settings) => superadminApi.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_platform_settings'] });
      showToast('Platform settings saved successfully!', 'success');
    },
    onError: (err) => alert('Failed to save settings: ' + (err.response?.data?.error || err.message))
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* 1. Subscription & Billing Rules */}
      <div className="k-card p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-150 dark:border-slate-800">
          <div className="p-2 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl">
            <CreditCard size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Subscription &amp; License Terms</h3>
            <p className="text-xs text-slate-400">Controls default durations for newly registered or approved tournament workspaces</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Default Trial Term (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={form.default_trial_days || '14'}
              onChange={(e) => setForm({ ...form, default_trial_days: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold"
            />
            <p className="text-[11px] text-slate-400 mt-1">Given to workspaces upon self-registration</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Approved Term Extension (Days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={form.default_license_days || '120'}
              onChange={(e) => setForm({ ...form, default_license_days: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold"
            />
            <p className="text-[11px] text-slate-400 mt-1">Granted when superadmin approves POP</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Grace Period Duration (Days)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={form.grace_period_days || '3'}
              onChange={(e) => setForm({ ...form, grace_period_days: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold"
            />
            <p className="text-[11px] text-slate-400 mt-1">Days before an expired tenant gets suspended</p>
          </div>
        </div>
      </div>

      {/* 2. Platform Branding & Contact */}
      <div className="k-card p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-150 dark:border-slate-800">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Globe size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Platform Identity &amp; Support</h3>
            <p className="text-xs text-slate-400">Global brand configuration and official superadmin contact details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Platform Brand Name
            </label>
            <input
              type="text"
              value={form.platform_name || 'FixtureGrid'}
              onChange={(e) => setForm({ ...form, platform_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Support / Billing Inquiries Email
            </label>
            <input
              type="email"
              value={form.support_email || 'support@fixturegrid.co.zw'}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* 3. Security, Access & Maintenance Mode */}
      <div className="k-card p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-150 dark:border-slate-800">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Access Control &amp; Platform Maintenance</h3>
            <p className="text-xs text-slate-400">Emergency lockdown and registration safeguards</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">Global Maintenance Mode</span>
              <span className="text-xs text-slate-400">When enabled, only Superadmins can log in. All other users see a maintenance screen.</span>
            </div>
            <input
              type="checkbox"
              checked={form.maintenance_mode === 'true'}
              onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked ? 'true' : 'false' })}
              className="w-5 h-5 text-amber-600 rounded border-slate-300"
            />
          </label>

          {form.maintenance_mode === 'true' && (
            <div>
              <label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                <AlertTriangle size={13} />
                Maintenance Notice Message
              </label>
              <textarea
                rows={2}
                value={form.maintenance_message || ''}
                onChange={(e) => setForm({ ...form, maintenance_message: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-amber-300 dark:border-amber-700/60 rounded-xl bg-amber-50/50 dark:bg-amber-950/20"
              />
            </div>
          )}

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">Allow Self-Registration for New Workspaces</span>
              <span className="text-xs text-slate-400">When disabled, new workspaces can only be created by Superadmins.</span>
            </div>
            <input
              type="checkbox"
              checked={form.allow_public_registration !== 'false'}
              onChange={(e) => setForm({ ...form, allow_public_registration: e.target.checked ? 'true' : 'false' })}
              className="w-5 h-5 text-blue-600 rounded border-slate-300"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <Save size={14} />
          <span>{updateMutation.isPending ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </div>
    </form>
  );
}
