import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  useSettings, useFixtures, useSports, useTeams 
} from '../hooks/useFixtures.js';
import { useLogStandings } from '../hooks/useStandings.js';
import { athleticsApi, analyticsApi, scoresApi, standingsApi } from '../api.js';
import { 
  FileText, Download, Trophy, Award, Calendar, Users, 
  ShieldCheck, Sparkles, Filter, CheckCircle2, ChevronRight, 
  Printer, ArrowDownToLine, Table, BookOpen, Clock
} from 'lucide-react';
import {
  exportOverallShieldPDF,
  exportOverallShieldCSV,
  exportMatchResultsPDF,
  exportMatchResultsCSV,
  exportSportStandingsPDF,
  exportSportStandingsCSV,
  exportAthleticsMeetPDF,
  exportAthleticsMeetCSV,
  exportTopScorersPDF,
  exportTopScorersCSV,
  exportAuditTrailCSV,
  exportTeamDelegationPDF,
  exportMasterTournamentPack
} from '../utils/tournamentReports.js';

export default function ReportsPage() {
  const { data: settings } = useSettings();
  const { data: fixtures, isLoading: loadingFixtures } = useFixtures();
  const { data: sports, isLoading: loadingSports } = useSports();
  const { data: teams, isLoading: loadingTeams } = useTeams();
  const { data: logData, isLoading: loadingLog } = useLogStandings();

  const [selectedSport, setSelectedSport] = useState('All');
  const [selectedTeamCode, setSelectedTeamCode] = useState('');

  // Fetch Athletics & Aquatics events
  const { data: athleticsEvents } = useQuery({
    queryKey: ['athletics-events-reports'],
    queryFn: async () => {
      try {
        const res = await athleticsApi.getEvents();
        return res.data || [];
      } catch (err) {
        return [];
      }
    }
  });

  // Fetch Top Scorers / Analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics-reports', selectedSport],
    queryFn: async () => {
      try {
        const res = await analyticsApi.getStats({ sport: selectedSport });
        return res.data || {};
      } catch (err) {
        return {};
      }
    }
  });

  // Fetch Audit Logs
  const { data: auditLogs } = useQuery({
    queryKey: ['score-audit-logs'],
    queryFn: async () => {
      try {
        const res = await scoresApi.getLogs();
        return res.data || [];
      } catch (err) {
        return [];
      }
    }
  });

  // Fetch all sports standings
  const { data: allSportsStandings } = useQuery({
    queryKey: ['all-sports-standings', sports],
    queryFn: async () => {
      if (!sports || sports.length === 0) return [];
      const list = [];
      for (const sp of sports) {
        try {
          const res = await standingsApi.getBySport(sp.name);
          list.push({ sportName: sp.name, standings: res.data || [] });
        } catch {}
      }
      return list;
    },
    enabled: !!sports && sports.length > 0
  });

  const orgName = settings?.org_name || 'FixtureGrid Workspace';
  const eventTitle = settings?.event_title || 'Tournament Championship';
  const completedFixturesCount = fixtures?.filter(f => f.status === 'completed' || f.status === 'draw').length || 0;
  const totalFixturesCount = fixtures?.length || 0;
  // useLogStandings returns a plain array; normalise to support both shapes
  const logLeaderboard = Array.isArray(logData) ? logData : (logData?.leaderboard || []);
  const champion = logLeaderboard[0];

  const handleDownloadMaster = () => {
    exportMasterTournamentPack({
      settings,
      logData,
      fixtures: fixtures || [],
      sportsWithStandings: allSportsStandings || [],
      athleticsEvents: athleticsEvents || [],
      topScorers: analyticsData?.topScorers || []
    });
  };

  const handleDownloadDelegation = () => {
    if (!selectedTeamCode) return;
    const team = teams?.find(t => t.code === selectedTeamCode || String(t.id) === String(selectedTeamCode));
    if (!team) return;
    exportTeamDelegationPDF({
      team,
      fixtures: fixtures || [],
      athleticsEvents: athleticsEvents || [],
      logData,
      settings
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Header Banner */}
      <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-blue-200">
              <Trophy className="w-3.5 h-3.5 text-yellow-300" />
              <span>Official Tournament Records Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{eventTitle}</h1>
            <p className="text-sm text-blue-100 max-w-xl">
              Post-tournament dossier and export center for <strong>{orgName}</strong>. Download print-ready official PDFs and spreadsheet records for media, headmasters, coaches, and archives.
            </p>
            {champion && (
              <div className="flex items-center gap-2 text-xs font-medium text-amber-200 pt-1">
                <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
                <span>Current Tournament Leader: <strong>{champion.name || champion.code}</strong> with {champion.total_points} total points</span>
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleDownloadMaster}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-blue-50 font-bold text-xs shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Download Master Post-Tournament Dossier (PDF)</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
          <div>
            <span className="text-blue-200 block text-[11px]">Completed Fixtures</span>
            <span className="text-lg font-bold">{completedFixturesCount} / {totalFixturesCount}</span>
          </div>
          <div>
            <span className="text-blue-200 block text-[11px]">Participating Teams</span>
            <span className="text-lg font-bold">{teams?.length || 0} Houses</span>
          </div>
          <div>
            <span className="text-blue-200 block text-[11px]">Sporting Codes</span>
            <span className="text-lg font-bold">{sports?.length || 0} Disciplines</span>
          </div>
          <div>
            <span className="text-blue-200 block text-[11px]">Athletics / Aquatics</span>
            <span className="text-lg font-bold">{athleticsEvents?.length || 0} Events</span>
          </div>
        </div>
      </div>

      {/* Main Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. Overall Championship Shield Standings */}
        <div className="k-card p-5 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Championship
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Overall Championship Aggregate Shield
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              The grand aggregate leaderboard combining points across all sporting disciplines. Includes official podium finishes, medal counts, and signature blocks.
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => exportOverallShieldPDF({ logData, settings })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Printable PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportOverallShieldCSV({ logData, settings })}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Download CSV / Excel"
            >
              <Table className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 2. Match Fixtures & Official Schedule Dossier */}
        <div className="k-card p-5 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Match Center
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Match Fixtures &amp; Official Results Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Chronological log of every fixture, round, scheduled time, court/venue, recorded final score, and match status across all sporting codes.
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => exportMatchResultsPDF({ fixtures: fixtures || [], settings, filterSport: selectedSport })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Printable PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportMatchResultsCSV({ fixtures: fixtures || [] })}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Download CSV / Excel"
            >
              <Table className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 3. Sport-by-Sport League Tables */}
        <div className="k-card p-5 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Table className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                League Tables
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Official Sport Standings &amp; Logs
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Complete league tables by sport (Matches Played, Won, Drawn, Lost, Points For/Against, Goal/Point Differentials, and Total Standings Points).
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => exportSportStandingsPDF({ sportsWithStandings: allSportsStandings || [], settings })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Printable PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportSportStandingsCSV({ sportsWithStandings: allSportsStandings || [] })}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Download CSV / Excel"
            >
              <Table className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 4. Athletics & Aquatics Meet Results Bulletin */}
        <div className="k-card p-5 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Track &amp; Field
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Athletics &amp; Aquatics Meet Results Bulletin
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Official meet bulletin detailing every track, field, and swimming heat/final, athlete names, placements, times, distances, and points allocated.
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => exportAthleticsMeetPDF({ events: athleticsEvents || [], settings })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Printable PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportAthleticsMeetCSV({ events: athleticsEvents || [] })}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Download CSV / Excel"
            >
              <Table className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 5. Top Scorers & Individual Honors */}
        <div className="k-card p-5 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Player Honors
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Golden Boot &amp; Top Scorers Honors
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Leaderboard of top individual goal and point scorers, jersey numbers, and team contributions across competitive match fixtures.
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => exportTopScorersPDF({ scorers: analyticsData?.topScorers || [], settings })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Printable PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportTopScorersCSV({ scorers: analyticsData?.topScorers || [] })}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Download CSV / Excel"
            >
              <Table className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 6. Scorekeeper Audit Trail */}
        <div className="k-card p-5 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Compliance
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Scorekeeper &amp; Adjudication Audit Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Full transparency audit log recording exact timestamps, referee/scorekeeper identities, and score corrections made during the tournament.
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => exportAuditTrailCSV({ logs: auditLogs || [] })}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Download Audit Trail (CSV / Excel)</span>
            </button>
          </div>
        </div>

      </div>

      {/* 7. Personalized School Delegation Report Card */}
      <div className="k-card p-6 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 border-blue-200/60 dark:border-blue-900/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Individual School Delegation Performance Pack
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Generate a personalized "Report Card" PDF for a visiting school or house delegation, covering all their contested matches, head-to-head outcomes, and podium finishes.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedTeamCode}
              onChange={(e) => setSelectedTeamCode(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose School / Team --</option>
              {teams?.map(t => (
                <option key={t.id || t.code} value={t.code || t.id}>{t.name} ({t.code || t.name})</option>
              ))}
            </select>

            <button
              type="button"
              disabled={!selectedTeamCode}
              onClick={handleDownloadDelegation}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Dossier</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
