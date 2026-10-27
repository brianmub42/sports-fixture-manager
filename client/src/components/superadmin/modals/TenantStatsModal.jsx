import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { superadminApi } from '../../../api.js';
import { X, BarChart3, RefreshCw, Trophy, Calendar, Users, MapPin, Tv, Camera } from 'lucide-react';

export default function TenantStatsModal({ tenantId, isOpen, onClose }) {
  if (!isOpen || !tenantId) return null;

  const { data, isLoading, error } = useQuery({
    queryKey: ['superadmin_tenant_stats', tenantId],
    queryFn: () => superadminApi.getTenantStats(tenantId).then(r => r.data),
    enabled: !!tenantId && isOpen
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-150 dark:border-slate-800">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Workspace Resource Breakdown</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{data?.organization?.name || `Workspace #${tenantId}`}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl">
            Failed to load stats: {error.message}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Trophy size={12} className="text-blue-500" /> Teams
                </span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{data.stats.teams}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Trophy size={12} className="text-indigo-500" /> Sports
                </span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{data.stats.sports}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-500" /> Venues
                </span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{data.stats.venues}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Calendar size={12} className="text-amber-500" /> Fixtures
                </span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                  {data.stats.fixtures_total}
                  <span className="text-[10px] font-normal text-slate-400 block mt-0.5">
                    {data.stats.fixtures_completed} done · {data.stats.fixtures_live} live
                  </span>
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Users size={12} className="text-purple-500" /> Players
                </span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{data.stats.players}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Users size={12} className="text-teal-500" /> Officials
                </span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{data.stats.assigned_officials}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Camera size={12} className="text-rose-500" /> Fan Posts
                </span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{data.stats.feed_posts}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Tv size={12} className="text-orange-500" /> TV Adverts
                </span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{data.stats.tv_adverts}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Storage Quota:</span> {data.organization.storage_quota_mb || 500} MB allocated for media highlights, logos &amp; documents.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
