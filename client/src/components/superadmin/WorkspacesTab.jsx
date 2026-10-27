import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminApi } from '../../api.js';
import { 
  Building, Search, Check, Ban, ExternalLink, Trash2, 
  EyeOff, RotateCcw, Plus, Edit3, BarChart3, LogIn 
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext.jsx';
import EditTenantModal from './modals/EditTenantModal.jsx';
import CreateTenantModal from './modals/CreateTenantModal.jsx';
import TenantStatsModal from './modals/TenantStatsModal.jsx';

export default function WorkspacesTab({ tenants, isLoading }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customDays, setCustomDays] = useState({});
  const [customDates, setCustomDates] = useState({});

  // Modals state
  const [editingTenant, setEditingTenant] = useState(null);
  const [statsTenantId, setStatsTenantId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, days }) => superadminApi.approveTenant(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      showToast('Tenant subscription approved successfully!', 'success');
    },
    onError: (err) => alert('Failed to approve subscription: ' + (err.response?.data?.error || err.message))
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => superadminApi.suspendTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      showToast('Tenant subscription suspended!', 'success');
    },
    onError: (err) => alert('Failed to suspend subscription: ' + (err.response?.data?.error || err.message))
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, expiresAt }) => superadminApi.extendTenant(id, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      showToast('Tenant license extended successfully!', 'success');
    },
    onError: (err) => alert('Failed to extend license: ' + (err.response?.data?.error || err.message))
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => superadminApi.deactivateTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      showToast('Workspace deactivated and hidden from list!', 'success');
    },
    onError: (err) => alert('Failed to deactivate workspace: ' + (err.response?.data?.error || err.message))
  });

  const activateMutation = useMutation({
    mutationFn: (id) => superadminApi.activateTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      showToast('Workspace reactivated successfully!', 'success');
    },
    onError: (err) => alert('Failed to reactivate workspace: ' + (err.response?.data?.error || err.message))
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => superadminApi.deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      showToast('Workspace permanently deleted!', 'success');
    },
    onError: (err) => alert('Failed to delete workspace: ' + (err.response?.data?.error || err.message))
  });

  const createMutation = useMutation({
    mutationFn: (data) => superadminApi.createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      showToast('New tournament workspace provisioned!', 'success');
      setShowCreateModal(false);
    },
    onError: (err) => alert('Failed to provision workspace: ' + (err.response?.data?.error || err.message))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => superadminApi.updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      showToast('Workspace updated successfully!', 'success');
      setEditingTenant(null);
    },
    onError: (err) => alert('Failed to update workspace: ' + (err.response?.data?.error || err.message))
  });

  // Impersonate handler
  const handleImpersonate = async (tenant) => {
    try {
      const res = await superadminApi.impersonateTenant(tenant.id);
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('organization_slug', tenant.slug);
        showToast(`Logged in as administrator of "${tenant.name}"`, 'success');
        // Open workspace dashboard
        window.location.href = `/?workspace=${tenant.slug}`;
      }
    } catch (err) {
      alert('Impersonation failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredTenants = (tenants || []).filter(tenant => {
    const matchesSearch = 
      tenant.name.toLowerCase().includes(search.toLowerCase()) || 
      tenant.slug.toLowerCase().includes(search.toLowerCase()) || 
      (tenant.creator_email && tenant.creator_email.toLowerCase().includes(search.toLowerCase())) ||
      (tenant.billing_school_name && tenant.billing_school_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'pending' && tenant.subscription_status === 'pending_verification') ||
      (statusFilter === 'active' && (tenant.subscription_status === 'active' || tenant.subscription_status === 'grace_period')) ||
      (statusFilter === 'suspended' && tenant.subscription_status === 'suspended') ||
      (statusFilter === 'deactivated' && tenant.subscription_status === 'deactivated');

    return matchesSearch && matchesStatus;
  });

  const totalCount = tenants?.length || 0;
  const pendingCount = tenants?.filter(t => t.subscription_status === 'pending_verification').length || 0;
  const activeCount = tenants?.filter(t => t.subscription_status === 'active' || t.subscription_status === 'grace_period').length || 0;
  const suspendedCount = tenants?.filter(t => t.subscription_status === 'suspended').length || 0;
  const deactivatedCount = tenants?.filter(t => t.subscription_status === 'deactivated').length || 0;

  const formatRemainingTime = (minutes) => {
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days} days`;
  };

  return (
    <div className="space-y-5">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="k-card p-3.5">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Workspaces</p>
          <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-200">{totalCount}</p>
        </div>
        <div className="k-card p-3.5 border-l-4 border-l-blue-500">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Pending Review</p>
          <p className="text-2xl font-bold mt-1 text-blue-500">{pendingCount}</p>
        </div>
        <div className="k-card p-3.5 border-l-4 border-l-green-500">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-500">{activeCount}</p>
        </div>
        <div className="k-card p-3.5 border-l-4 border-l-rose-500">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Suspended</p>
          <p className="text-2xl font-bold mt-1 text-rose-500">{suspendedCount}</p>
        </div>
        <div className="k-card p-3.5 border-l-4 border-l-gray-400 dark:border-l-gray-600">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Deactivated</p>
          <p className="text-2xl font-bold mt-1 text-gray-500">{deactivatedCount}</p>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-gray-50 dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search school name, slug, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-xs font-semibold"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={14} />
            <span>New Workspace</span>
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'all', label: 'All', count: totalCount },
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'active', label: 'Active', count: activeCount },
            { key: 'suspended', label: 'Suspended', count: suspendedCount },
            { key: 'deactivated', label: 'Hidden', count: deactivatedCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1 rounded text-[10px] font-bold ${statusFilter === tab.key ? 'bg-blue-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <div className="k-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Workspace / Event</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Resources &amp; Quotas</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">License Expiry</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">POP</th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500" style={{ width: '230px' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs text-gray-500">
                    No workspaces found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => {
                  const hasPop = !!tenant.pop_file_url;
                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{tenant.name}</div>
                        <div className="text-xs text-gray-400 font-mono">slug: {tenant.slug}</div>
                        {tenant.event_title && (
                          <div className="text-[11px] text-blue-500 font-medium mt-0.5">Event: {tenant.event_title}</div>
                        )}
                        <div className="text-[10px] text-gray-400 mt-0.5">Creator: {tenant.creator_email || 'N/A'}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-600 dark:text-slate-300">
                            {tenant.teams_count || 0}/{tenant.max_teams || 20} Teams
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-600 dark:text-slate-300">
                            {tenant.sports_count || 0}/{tenant.max_sports || 10} Sports
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-600 dark:text-slate-300">
                            {tenant.fixtures_count || 0} Fixtures
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setStatsTenantId(tenant.id)}
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          >
                            <BarChart3 size={11} />
                            <span>View Stats Breakdown</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {tenant.subscription_status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                            Active
                          </span>
                        ) : tenant.subscription_status === 'grace_period' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                            Grace Period
                          </span>
                        ) : tenant.subscription_status === 'pending_verification' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 animate-pulse">
                            Pending POP
                          </span>
                        ) : tenant.subscription_status === 'deactivated' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            Deactivated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs font-semibold">
                        {formatRemainingTime(tenant.minutes_remaining)}
                        <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                          {tenant.expires_at ? new Date(tenant.expires_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {hasPop ? (
                          <div className="space-y-0.5">
                            <a
                              href={tenant.pop_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline font-semibold"
                            >
                              <ExternalLink size={12} />
                              Receipt
                            </a>
                            <div className="text-[10px] text-gray-400">
                              {new Date(tenant.pop_uploaded_at).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1.5 max-w-[210px] mx-auto text-[11px]">
                          {/* Quick Enter / Impersonate & Edit Row */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleImpersonate(tenant)}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                              title="Enter workspace as admin"
                            >
                              <LogIn size={12} />
                              <span>Enter Hub</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingTenant(tenant)}
                              className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit metadata & quotas"
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>

                          {/* Approve Section */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="Days"
                              value={customDays[tenant.id] || ''}
                              onChange={(e) => setCustomDays({ ...customDays, [tenant.id]: e.target.value })}
                              className="w-14 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const days = customDays[tenant.id] ? parseInt(customDays[tenant.id], 10) : 120;
                                approveMutation.mutate({ id: tenant.id, days });
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-1.5 rounded flex items-center justify-center gap-1 cursor-pointer"
                              title="Approve subscription payment"
                            >
                              <Check size={11} />
                              <span>Approve</span>
                            </button>
                          </div>

                          {/* Expiry Custom Extension Section */}
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={customDates[tenant.id] || ''}
                              onChange={(e) => setCustomDates({ ...customDates, [tenant.id]: e.target.value })}
                              className="flex-1 px-1 py-0.5 text-[10px] border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const dateVal = customDates[tenant.id];
                                if (!dateVal) return alert('Select expiration date');
                                extendMutation.mutate({ id: tenant.id, expiresAt: dateVal });
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer"
                            >
                              Extend
                            </button>
                          </div>

                          {/* Suspend / Deactivate / Delete row */}
                          <div className="flex items-center gap-1 pt-0.5">
                            <button
                              type="button"
                              disabled={tenant.subscription_status === 'suspended'}
                              onClick={() => {
                                if (confirm(`Suspend access for ${tenant.name}?`)) {
                                  suspendMutation.mutate(tenant.id);
                                }
                              }}
                              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-0.5 px-1 rounded flex items-center justify-center gap-0.5 disabled:opacity-40 cursor-pointer"
                              title="Suspend"
                            >
                              <Ban size={10} />
                              <span>Suspend</span>
                            </button>

                            {tenant.subscription_status === 'deactivated' ? (
                              <button
                                type="button"
                                onClick={() => activateMutation.mutate(tenant.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-0.5 px-1.5 rounded flex items-center justify-center"
                                title="Reactivate"
                              >
                                <RotateCcw size={11} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={tenant.id === 1}
                                onClick={() => {
                                  if (confirm(`Deactivate and hide "${tenant.name}"?`)) {
                                    deactivateMutation.mutate(tenant.id);
                                  }
                                }}
                                className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-0.5 px-1.5 rounded flex items-center justify-center disabled:opacity-30"
                                title="Deactivate / Hide"
                              >
                                <EyeOff size={11} />
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={tenant.id === 1}
                              onClick={() => {
                                if (confirm(`⚠️ PERMANENT DELETE WARNING\n\nDelete workspace "${tenant.name}" and all matches, teams, fixtures, and data?\n\nCannot be undone.`)) {
                                  deleteMutation.mutate(tenant.id);
                                }
                              }}
                              className="bg-red-700 hover:bg-red-800 text-white font-bold py-0.5 px-1.5 rounded flex items-center justify-center disabled:opacity-30"
                              title="Delete permanently"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Tenant Modal */}
      <EditTenantModal
        tenant={editingTenant}
        isOpen={Boolean(editingTenant)}
        onClose={() => setEditingTenant(null)}
        onSave={(id, data) => updateMutation.mutate({ id, data })}
        isSaving={updateMutation.isPending}
      />

      {/* Create Tenant Modal */}
      <CreateTenantModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(data) => createMutation.mutate(data)}
        isCreating={createMutation.isPending}
      />

      {/* Stats Breakdown Modal */}
      <TenantStatsModal
        tenantId={statsTenantId}
        isOpen={Boolean(statsTenantId)}
        onClose={() => setStatsTenantId(null)}
      />
    </div>
  );
}
