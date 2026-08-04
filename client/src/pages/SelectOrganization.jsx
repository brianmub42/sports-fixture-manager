import { useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { Building2, Plus, ArrowRight, Loader2, Trophy, Globe } from 'lucide-react';

export default function SelectOrganization() {
  const { organizations, isLoading, selectOrg, createOrg } = useOrganization();
  const [newOrgName, setNewOrgName] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      await createOrg(newOrgName, newEventTitle);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create organization. Try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Resolving your sports workspaces...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold mb-4 animate-pulse">
            <Trophy className="w-4 h-4" /> Multi-Tenant Sports Platform
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            KALIFE Sports Day Manager
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Choose an existing organization workspace or register a new one to manage your fixtures, sports, standings, and results.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* List of existing organizations */}
          <div className="bg-gray-900/45 backdrop-blur-md border border-gray-800 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
              <Building2 className="w-5 h-5 text-blue-400" /> Existing Workspaces
            </h2>

            {organizations && organizations.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => selectOrg(org.slug)}
                    className="group flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      <h3 className="font-bold group-hover:text-blue-400 transition-colors">
                        {org.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> /{org.slug}
                      </p>
                      {org.event_title && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Event: {org.event_title}
                        </p>
                      )}
                    </div>
                    <div className="p-2 rounded-lg bg-gray-800 group-hover:bg-blue-600 transition-all duration-300">
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No workspaces configured yet.</p>
                <p className="text-xs text-gray-500 mt-1">Get started by creating one on the right!</p>
              </div>
            )}
          </div>

          {/* Create new organization form */}
          <div className="bg-gray-900/45 backdrop-blur-md border border-gray-800 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
              <Plus className="w-5 h-5 text-green-400" /> Create Workspace
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kalife High, City Sports"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Event / Tournament Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Sports Day, Summer Cup"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newOrgName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/20 duration-300 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    Create Workspace <Plus className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 mt-12">
        &copy; {new Date().getFullYear()} KALIFE Sports Day Platform. Built for multiple organizations.
      </div>
    </div>
  );
}
