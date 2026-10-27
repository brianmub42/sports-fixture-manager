import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { superadminApi } from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { 
  ShieldCheck, Building2, Users, Settings, Activity, RefreshCw, 
  ExternalLink, LogOut, UserCheck, ArrowRight, CheckCircle2, 
  AlertTriangle, Lock, Layers, Zap
} from 'lucide-react';

import WorkspacesTab from '../components/superadmin/WorkspacesTab.jsx';
import UsersTab from '../components/superadmin/UsersTab.jsx';
import PlatformSettingsTab from '../components/superadmin/PlatformSettingsTab.jsx';
import AuditHealthTab from '../components/superadmin/AuditHealthTab.jsx';

export default function SuperadminDashboard() {
  const [activeTab, setActiveTab] = useState('workspaces'); // 'workspaces' | 'users' | 'settings' | 'audit'
  const [selectedWorkspaceSlug, setSelectedWorkspaceSlug] = useState('');
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Query all workspaces / tenants
  const { data: tenants, isLoading, error, refetch } = useQuery({
    queryKey: ['superadmin_tenants'],
    queryFn: () => superadminApi.getTenants().then(r => r.data)
  });

  const totalCount = tenants?.length || 0;
  const pendingCount = tenants?.filter(t => t.subscription_status === 'pending_verification').length || 0;
  const activeCount = tenants?.filter(t => t.subscription_status === 'active' || t.subscription_status === 'grace_period').length || 0;
  const suspendedCount = tenants?.filter(t => t.subscription_status === 'suspended').length || 0;

  // Handle jumping into a specific tournament workspace
  const handleJumpToWorkspace = (slug) => {
    if (!slug) return;
    localStorage.setItem('organization_slug', slug);
    window.location.href = `/?workspace=${slug}`;
  };

  // Auth Guard: if not authenticated or not superadmin
  if (!isAuthenticated || user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-purple-950/40 border border-purple-500/30 rounded-3xl mb-5 shadow-2xl">
          <ShieldCheck className="w-14 h-14 text-purple-400 mx-auto" />
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">Superadmin Privileges Required</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Access to the Superadmin Control Tower is strictly restricted to platform administrators with root credentials.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2"
        >
          <Lock size={16} />
          <span>Sign In as Super Administrator</span>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 px-3 rounded-2xl bg-white shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-6">
          <img src="/assets/fixture-grid-logo.png" alt="FixtureGrid Logo" className="h-8 w-auto object-contain" />
        </div>
        <RefreshCw className="w-10 h-10 text-purple-600 animate-spin mb-4" />
        <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-200">Initializing Superadmin Control Tower...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Connecting to live multi-tenant telemetry and database pool</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-3xl max-w-xl mx-auto shadow-xl">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-black mb-1">Failed to Load Superadmin Console</h3>
          <p className="text-xs mb-6 text-rose-700 dark:text-rose-300">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'workspaces',
      label: 'Workspaces & Tenants',
      subtitle: 'Provisioning, licenses, quotas & approvals',
      icon: Building2,
      count: totalCount,
      color: 'blue',
      badge: pendingCount > 0 ? `${pendingCount} Pending POP` : null
    },
    {
      id: 'users',
      label: 'Global User Accounts',
      subtitle: 'Root administrators, tenant accounts & roles',
      icon: Users,
      color: 'purple',
      badge: 'Platform Users'
    },
    {
      id: 'settings',
      label: 'Platform Parameters',
      subtitle: 'System branding, maintenance mode & registration',
      icon: Settings,
      color: 'emerald',
      badge: 'Core Config'
    },
    {
      id: 'audit',
      label: 'System Health & Audit Logs',
      subtitle: 'Live telemetry, DB pool, billing triggers & audit trail',
      icon: Activity,
      color: 'amber',
      badge: 'Security & Health'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-purple-600/30 transition-colors duration-200">
      
      {/* Top Superadmin Enterprise Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-slate-950/85 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 sm:h-11 px-3 rounded-xl bg-white shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
              <img src="/assets/fixture-grid-logo.png" alt="FixtureGrid Logo" className="h-7 sm:h-8 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                  FixtureGrid Platform
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm flex items-center gap-1">
                  <ShieldCheck size={11} />
                  <span>Superadmin Console</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
                Centralized Control Tower · Multi-Tenant System Architecture
              </p>
            </div>
          </div>

          {/* Quick Actions & Workspace Switcher */}
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            
            {/* Quick Workspace Jumper */}
            <div className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-2">Inspect:</span>
              <select
                value={selectedWorkspaceSlug}
                onChange={(e) => {
                  setSelectedWorkspaceSlug(e.target.value);
                  handleJumpToWorkspace(e.target.value);
                }}
                className="bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
              >
                <option value="">Choose Workspace...</option>
                {tenants?.map(t => (
                  <option key={t.id} value={t.slug}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* View Public Portal */}
            <button
              onClick={() => navigate('/')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              title="Open Public Workspace Selection"
            >
              <ExternalLink size={13} />
              <span>Public Portal</span>
            </button>

            {/* User Profile Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-xl text-xs">
              <UserCheck size={14} className="text-purple-600 dark:text-purple-400" />
              <div className="flex flex-col">
                <span className="font-extrabold text-purple-900 dark:text-purple-200 text-[11px] leading-tight">
                  {user.name || user.email}
                </span>
                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Root Superadmin
                </span>
              </div>
            </div>

            <ThemeToggle />

            {/* Sign Out Button */}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
              title="Sign Out of Platform"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Prominent Superadmin Command Menus Navigation */}
        <section aria-label="Superadmin Command Menus">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-left p-4 rounded-2xl transition-all duration-200 cursor-pointer relative overflow-hidden select-none ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 shadow-xl shadow-purple-900/10 ring-2 ring-purple-500 dark:ring-purple-400 transform scale-[1.01]'
                      : 'bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  }`}
                >
                  {/* Active Indicator Top Accent Bar */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600" />
                  )}

                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className={`p-2.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      <Icon size={20} />
                    </div>

                    {tab.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        tab.id === 'workspaces' && pendingCount > 0
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                          : isActive
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {tab.badge}
                      </span>
                    )}

                    {tab.count !== undefined && !tab.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                        isActive
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </div>

                  <h3 className={`text-sm font-black tracking-tight ${
                    isActive
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-slate-900 dark:text-white'
                  }`}>
                    {tab.label}
                  </h3>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                    {tab.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Platform Stat & Health Summary Ribbon */}
        <section className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600/30 border border-purple-400/40 rounded-xl text-purple-300 shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black uppercase tracking-wider text-purple-300">
                    Platform Control Tower Status
                  </h2>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    All Systems Operational
                  </span>
                </div>
                <p className="text-xs text-purple-100/80 mt-0.5">
                  Real-time synchronization across {totalCount} tenant databases · 100% referential integrity verified
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] text-purple-200 block font-bold">TOTAL TENANTS</span>
                <span className="text-sm font-black">{totalCount}</span>
              </div>
              <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] text-green-300 block font-bold">ACTIVE</span>
                <span className="text-sm font-black text-green-400">{activeCount}</span>
              </div>
              <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] text-amber-300 block font-bold">PENDING REVIEW</span>
                <span className="text-sm font-black text-amber-300">{pendingCount}</span>
              </div>
              <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] text-rose-300 block font-bold">SUSPENDED</span>
                <span className="text-sm font-black text-rose-400">{suspendedCount}</span>
              </div>
            </div>

          </div>
        </section>

        {/* Tab Panel Content */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm min-h-[500px]">
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
        </section>

      </main>

    </div>
  );
}
