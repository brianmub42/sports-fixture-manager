import React, { useState, useRef, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Trophy, ChevronDown, Plus, Check, Calendar, ArrowRight, LogOut, Sparkles } from 'lucide-react';
import CreateTournamentModal from './CreateTournamentModal.jsx';

export default function TournamentSwitcher({ eventTitle, orgName }) {
  const { myTournaments, currentOrgSlug, switchTournament, clearOrg } = useOrganization();
  const { isAdmin, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTournament = (slug) => {
    if (slug === currentOrgSlug) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    switchTournament(slug);
  };

  return (
    <>
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer shadow-xs"
          title="Switch Tournament or Create Next Tournament"
        >
          <Trophy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-[260px]">
            {eventTitle || 'Select Tournament'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header info */}
            <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Tournaments for
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                {orgName}
              </span>
            </div>

            {/* List of my tournaments */}
            <div className="max-h-60 overflow-y-auto py-1">
              {myTournaments && myTournaments.length > 0 ? (
                myTournaments.map((t) => {
                  const isActive = t.slug === currentOrgSlug;
                  return (
                    <button
                      key={t.id || t.slug}
                      type="button"
                      onClick={() => handleSelectTournament(t.slug)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="block truncate font-medium">{t.event_title || t.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block font-mono">
                          /watch/{t.slug}
                        </span>
                      </div>
                      {isActive && (
                        <div className="shrink-0 p-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-3.5 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Active Tournament: <strong>{eventTitle}</strong>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-1.5 pb-1 px-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/70 hover:bg-blue-100/70 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Next Tournament</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  clearOrg();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>All Public Workspaces</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateTournamentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}
