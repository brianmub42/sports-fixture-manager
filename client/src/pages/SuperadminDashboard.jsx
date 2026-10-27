import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { superadminApi } from '../api.js';
import { 
  ShieldCheck, Building, Users, Settings, Activity, RefreshCw 
} from 'lucide-react';

import WorkspacesTab from '../components/superadmin/WorkspacesTab.jsx';
import UsersTab from '../components/superadmin/UsersTab.jsx';
import PlatformSettingsTab from '../components/superadmin/PlatformSettingsTab.jsx';
import AuditHealthTab from '../components/superadmin/AuditHealthTab.jsx';

export default function SuperadminDashboard() {
  const [activeTab, setActiveTab] = useState('workspaces'); // 'workspaces' | 'users' | 'settings' | 'audit'

  // Query all workspaces / tenants
  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['superadmin_tenants'],
    queryFn: () => superadminApi.getTenants().then(r => r.data)
  });

  const tabs = [
    { id: 'workspaces', label: 'Workspaces & Tenants', icon: Building, count: tenants?.length },
    { id: 'users', label: 'Global User Accounts', icon: Users },
    { id: 'settings', label: 'Platform Parameters', icon: Settings },
    { id: 'audit', label: 'System Health & Audit Logs', icon: Activity },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <RefreshCw className="w-9 h-9 text-blue-500 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading Superadmin Command Center...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl max-w-xl mx-auto my-8">
        <h3 className="text-base font-bold mb-1">Failed to load Superadmin Console</h3>
        <p className="text-xs">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Superadmin Control Tower</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Root Access
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Comprehensive platform administration: workspaces, global users, licensing, and system parameters.
            </p>
          </div>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-850 rounded-2xl overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'workspaces' && (
          <WorkspacesTab tenants={tenants} isLoading={isLoading} />
        )}

        {activeTab === 'users' && (
          <UsersTab allTenants={tenants} />
        )}

        {activeTab === 'settings' && (
          <PlatformSettingsTab />
        )}

        {activeTab === 'audit' && (
          <AuditHealthTab />
        )}
      </div>
    </div>
  );
}
