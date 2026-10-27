import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminApi } from '../../../api.js';
import { X, Building2, Plus, Trash2, RefreshCw, Check } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext.jsx';

export default function UserWorkspacesModal({ user, allTenants, isOpen, onClose }) {
  if (!isOpen || !user) return null;

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');

  // Query this user's assigned workspaces
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['superadmin_user_workspaces', user.id],
    queryFn: () => superadminApi.getUserWorkspaces(user.id).then(r => r.data),
    enabled: !!user.id && isOpen
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: ({ organization_id, role }) => superadminApi.setUserWorkspaces(user.id, { organization_id, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_user_workspaces', user.id] });
      queryClient.invalidateQueries({ queryKey: ['superadmin_users'] });
      showToast('Workspace access granted', 'success');
      setSelectedOrgId('');
    },
    onError: (err) => alert(err.response?.data?.error || err.message)
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: (organization_id) => superadminApi.setUserWorkspaces(user.id, { organization_id, remove: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_user_workspaces', user.id] });
      queryClient.invalidateQueries({ queryKey: ['superadmin_users'] });
      showToast('Workspace access revoked', 'info');
    },
    onError: (err) => alert(err.response?.data?.error || err.message)
  });

  const assignedOrgIds = new Set((workspaces || []).map(w => w.organization_id));
  const availableTenants = (allTenants || []).filter(t => !assignedOrgIds.has(t.id));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-150 dark:border-slate-800">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Workspace Access &amp; Memberships</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Managing tournaments for {user.name} ({user.email})</p>
          </div>
        </div>

        {/* Add Workspace Access Form */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">Grant Access to Tournament</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-semibold"
            >
              <option value="">Select a workspace...</option>
              {availableTenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full sm:w-28 px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-semibold"
            >
              <option value="admin">Admin</option>
              <option value="scorekeeper">Scorekeeper</option>
              <option value="media_manager">Media</option>
              <option value="viewer">Viewer</option>
            </select>

            <button
              type="button"
              disabled={!selectedOrgId || assignMutation.isPending}
              onClick={() => assignMutation.mutate({ organization_id: selectedOrgId, role: selectedRole })}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Assigned List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Assigned Workspaces ({workspaces?.length || 0})</h4>
          {isLoading ? (
            <div className="py-8 text-center"><RefreshCw className="w-5 h-5 text-blue-500 animate-spin mx-auto" /></div>
          ) : workspaces?.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No workspace memberships assigned yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {workspaces.map(w => (
                <div key={w.organization_id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{w.organization_name}</span>
                    <span className="text-xs text-slate-400 block font-mono">{w.organization_slug}</span>
                    {w.is_creator && (
                      <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-1.5 py-0.2 rounded">
                        Workspace Creator
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                      {w.assigned_role}
                    </span>

                    <button
                      type="button"
                      disabled={removeMutation.isPending}
                      onClick={() => {
                        if (confirm(`Remove access to "${w.organization_name}"?`)) {
                          removeMutation.mutate(w.organization_id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Revoke access"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
