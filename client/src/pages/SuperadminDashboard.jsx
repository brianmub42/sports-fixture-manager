import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminApi } from '../api.js';
import { ShieldCheck, Search, Check, RefreshCw, Ban, ExternalLink } from 'lucide-react';

export default function SuperadminDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, active, suspended
  const [customDays, setCustomDays] = useState({});
  const [customDates, setCustomDates] = useState({});

  // Query all tenants
  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['superadmin_tenants'],
    queryFn: async () => {
      const res = await superadminApi.getTenants();
      return res.data;
    }
  });

  // Mutation to approve POP
  const approveMutation = useMutation({
    mutationFn: ({ id, days }) => superadminApi.approveTenant(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      alert('Tenant subscription approved successfully!');
    },
    onError: (err) => alert('Failed to approve subscription: ' + err.message)
  });

  // Mutation to suspend tenant
  const suspendMutation = useMutation({
    mutationFn: (id) => superadminApi.suspendTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      alert('Tenant subscription suspended!');
    },
    onError: (err) => alert('Failed to suspend subscription: ' + err.message)
  });

  // Mutation to extend tenant by custom date
  const extendMutation = useMutation({
    mutationFn: ({ id, expiresAt }) => superadminApi.extendTenant(id, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_tenants'] });
      alert('Tenant license extended successfully!');
    },
    onError: (err) => alert('Failed to extend license: ' + err.message)
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
        Failed to load tenant directory: {error.message}
      </div>
    );
  }

  // Filter tenants
  const filteredTenants = (tenants || []).filter(tenant => {
    const matchesSearch = 
      tenant.name.toLowerCase().includes(search.toLowerCase()) || 
      tenant.slug.toLowerCase().includes(search.toLowerCase()) || 
      (tenant.creator_email && tenant.creator_email.toLowerCase().includes(search.toLowerCase())) ||
      (tenant.billing_school_name && tenant.billing_school_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'pending' && tenant.subscription_status === 'pending_verification') ||
      (statusFilter === 'active' && tenant.subscription_status === 'active') ||
      (statusFilter === 'suspended' && tenant.subscription_status === 'suspended');

    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalCount = tenants?.length || 0;
  const pendingCount = tenants?.filter(t => t.subscription_status === 'pending_verification').length || 0;
  const activeCount = tenants?.filter(t => t.subscription_status === 'active').length || 0;
  const suspendedCount = tenants?.filter(t => t.subscription_status === 'suspended').length || 0;

  const formatRemainingTime = (minutes) => {
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days} days`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Superadmin Console</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Administer multi-tenant workspace licenses, verify payment receipts, and manage customer subscriptions.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="k-card p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Workspaces</p>
          <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-200">{totalCount}</p>
        </div>
        <div className="k-card p-4 border-l-4 border-l-blue-500">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Pending POP Review</p>
          <p className="text-2xl font-bold mt-1 text-blue-500">{pendingCount}</p>
        </div>
        <div className="k-card p-4 border-l-4 border-l-green-500">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Active Subscriptions</p>
          <p className="text-2xl font-bold mt-1 text-green-500">{activeCount}</p>
        </div>
        <div className="k-card p-4 border-l-4 border-l-rose-500">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Suspended Accounts</p>
          <p className="text-2xl font-bold mt-1 text-rose-500">{suspendedCount}</p>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search school name, slug, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-semibold"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'all', label: 'All Workspaces', count: totalCount },
            { key: 'pending', label: 'Pending Review', count: pendingCount },
            { key: 'active', label: 'Active', count: activeCount },
            { key: 'suspended', label: 'Suspended', count: suspendedCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusFilter === tab.key ? 'bg-blue-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Directory Table */}
      <div className="k-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-555">Workspace / Customer</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-555">Contact Details</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-555">Status</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-555">Time Remaining</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-555">Proof of Payment</th>
                <th className="text-center py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-555" style={{ width: '220px' }}>License Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-gray-500">
                    No workspaces found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => {
                  const hasPop = !!tenant.pop_file_url;
                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{tenant.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">slug: <span className="font-mono">{tenant.slug}</span></div>
                        {tenant.event_title && (
                          <div className="text-[11px] text-blue-500 font-medium mt-1">Event: {tenant.event_title}</div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-400">
                        <div><span className="font-semibold text-gray-500">Creator:</span> {tenant.creator_email || 'N/A'}</div>
                        {tenant.billing_contact_person && (
                          <div className="mt-1"><span className="font-semibold text-gray-500">Contact:</span> {tenant.billing_contact_person} ({tenant.billing_contact_number})</div>
                        )}
                        {tenant.billing_address && (
                          <div className="mt-1 truncate max-w-xs text-[10px]" title={tenant.billing_address}>
                            <span className="font-semibold text-gray-500">Addr:</span> {tenant.billing_address}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {tenant.subscription_status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                            Active
                          </span>
                        ) : tenant.subscription_status === 'pending_verification' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 animate-pulse">
                            Pending POP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold">
                        {formatRemainingTime(tenant.minutes_remaining)}
                        <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                          {tenant.expires_at ? new Date(tenant.expires_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {hasPop ? (
                          <div className="space-y-1">
                            <a
                              href={tenant.pop_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline font-semibold"
                            >
                              <ExternalLink size={12} />
                              View POP Receipt
                            </a>
                            <div className="text-[10px] text-gray-400">
                              Uploaded: {new Date(tenant.pop_uploaded_at).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No receipt</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
                          {/* Approve Section */}
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              placeholder="Days"
                              value={customDays[tenant.id] || ''}
                              onChange={(e) => setCustomDays({ ...customDays, [tenant.id]: e.target.value })}
                              className="w-16 px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const days = customDays[tenant.id] ? parseInt(customDays[tenant.id]) : 120;
                                approveMutation.mutate({ id: tenant.id, days });
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold py-1 px-2 rounded flex items-center justify-center gap-1 cursor-pointer border-none"
                              title="Approve subscription payment"
                            >
                              <Check size={12} />
                              Approve
                            </button>
                          </div>

                          {/* Expiry Custom Extension Section */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-gray-150 dark:border-gray-800 border-x-none border-b-none border-solid">
                            <input
                              type="date"
                              value={customDates[tenant.id] || ''}
                              onChange={(e) => setCustomDates({ ...customDates, [tenant.id]: e.target.value })}
                              className="w-24 px-1 py-1 text-[10px] border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const dateVal = customDates[tenant.id];
                                if (!dateVal) {
                                  alert('Please select an expiration date');
                                  return;
                                }
                                extendMutation.mutate({ id: tenant.id, expiresAt: dateVal });
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer border-none"
                            >
                              Extend
                            </button>
                          </div>

                          {/* Suspend Button */}
                          <button
                            type="button"
                            disabled={tenant.subscription_status === 'suspended'}
                            onClick={() => {
                              if (confirm(`Are you sure you want to suspend access for ${tenant.name}?`)) {
                                suspendMutation.mutate(tenant.id);
                              }
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold py-1 px-2 rounded flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer border-none"
                          >
                            <Ban size={12} />
                            Suspend Access
                          </button>
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
    </div>
  );
}
