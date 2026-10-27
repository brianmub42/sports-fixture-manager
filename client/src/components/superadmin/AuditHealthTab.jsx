import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminApi } from '../../api.js';
import { 
  Activity, Database, Server, Clock, RefreshCw, 
  ShieldCheck, AlertCircle, Play, Cpu, Check, Users 
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext.jsx';

export default function AuditHealthTab() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Query health metrics
  const { data: health, isLoading: loadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['superadmin_health'],
    queryFn: () => superadminApi.getSystemHealth().then(r => r.data),
    refetchInterval: 30000 // every 30s
  });

  // Query audit logs
  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['superadmin_audit_logs'],
    queryFn: () => superadminApi.getAuditLogs({ limit: 50 }).then(r => r.data)
  });

  const logs = auditData?.logs || [];

  // Mutation to trigger billing reminder check
  const reminderMutation = useMutation({
    mutationFn: () => superadminApi.runBillingCheck(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_audit_logs'] });
      showToast(`Reminder check complete: ${res.data?.triggeredReminders?.length || 0} notifications evaluated`, 'success');
    },
    onError: (err) => alert('Reminder check failed: ' + (err.response?.data?.error || err.message))
  });

  const getActionBadge = (action) => {
    if (action.includes('APPROVE') || action.includes('ACTIVATE')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">{action}</span>;
    }
    if (action.includes('SUSPEND') || action.includes('DELETE') || action.includes('DEACTIVATE') || action.includes('LOCK')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{action}</span>;
    }
    if (action.includes('CREATE')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{action}</span>;
    }
    if (action.includes('PASSWORD') || action.includes('IMPERSONATE')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{action}</span>;
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Telemetry Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="k-card p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Database Size</span>
            <Database size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {health?.database?.size || '...'}
          </p>
          <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
          </span>
        </div>

        <div className="k-card p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Server Uptime</span>
            <Clock size={14} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {formatUptime(health?.uptime_seconds)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Node {health?.node_version || process.version}
          </span>
        </div>

        <div className="k-card p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Memory Usage</span>
            <Cpu size={14} className="text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {health?.memory_mb?.heap_used || 0} MB
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            RSS: {health?.memory_mb?.rss || 0} MB
          </span>
        </div>

        <div className="k-card p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Total Counts</span>
            <Users size={14} className="text-teal-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {health?.counts?.users_total || 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {health?.counts?.organizations_total || 0} workspaces · {health?.counts?.fixtures_total || 0} matches
          </span>
        </div>
      </div>

      {/* 2. Operations Trigger Bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            System Operations &amp; Scheduler
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Trigger automated license expiry reminder checks or view live telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetchHealth()}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} className={loadingHealth ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            disabled={reminderMutation.isPending}
            onClick={() => reminderMutation.mutate()}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Play size={12} />
            <span>{reminderMutation.isPending ? 'Running...' : 'Run Billing Reminder Check'}</span>
          </button>
        </div>
      </div>

      {/* 3. Audit Activity Trail Table */}
      <div className="k-card overflow-hidden">
        <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Superadmin Action Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">Latest 50 actions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Timestamp</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Admin Actor</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Target</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs">
              {loadingAudit ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 italic">
                    No administrative audit actions recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">{log.actor_name || 'System'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.actor_email}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {log.target_type} {log.target_id ? `#${log.target_id}` : ''}
                    </td>
                    <td className="py-2.5 px-4 max-w-xs truncate text-[11px] text-slate-500" title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
