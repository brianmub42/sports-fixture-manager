import { useState, useEffect, useRef } from 'react';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { 
  Building2, Plus, ArrowRight, Loader2, Trophy, Globe, 
  Calendar, Award, Activity, BarChart3, CheckCircle2, 
  ShieldCheck, ArrowDownRight, Zap 
} from 'lucide-react';

function AnimatedCounter({ value, duration = 1500, suffix = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const end = parseInt(value, 10);
    if (isNaN(end)) return;

    let frameId;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function SelectOrganization() {
  const { organizations, isLoading, selectOrg, createOrg } = useOrganization();
  const [newOrgName, setNewOrgName] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const workspaceSectionRef = useRef(null);

  const scrollToWorkspaces = () => {
    workspaceSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleViewSample = () => {
    // Select the seeded demo organization
    selectOrg('demo-tournament');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim() || !creatorEmail.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      await createOrg(newOrgName, newEventTitle, creatorEmail.trim());
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
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-600/30 selection:text-blue-200">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 px-3 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-blue-500/10 border border-slate-800">
              <img src="/assets/fixture-grid-logo.png" alt="FixtureGrid Logo" className="h-8 w-auto object-contain" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] text-blue-450 font-bold uppercase tracking-wider">
                Tournament Manager
              </span>
              <span className="text-[9px] text-slate-400 -mt-0.5 font-medium">
                Multi-Sport Platform
              </span>
            </div>
          </div>
          
          <nav className="flex items-center gap-3">
            <button 
              onClick={scrollToWorkspaces}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={scrollToWorkspaces}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/35 transition-all cursor-pointer"
            >
              Create Workspace
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-blue-400 text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5 fill-blue-400/20" /> For churches, schools, sports clubs & corporates
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent max-w-4xl mx-auto mb-6">
          Run your competitions <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text">from one dashboard.</span>
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Manage your complete competition flow with auto-generated fixtures, visual brackets, real-time live scores, dynamic standings, and comprehensive analytics.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto mb-16">
          <button 
            onClick={scrollToWorkspaces}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-extrabold text-sm shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Create your workspace <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={handleViewSample}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800/80 font-bold text-sm text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            View sample dashboard <ArrowDownRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Hero Visual Mockup */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-800/80 bg-slate-900/30 backdrop-blur-sm p-2 shadow-2xl shadow-blue-500/5 overflow-hidden">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">dashboard.fixturegrid.com/demo-tournament</span>
              <span className="w-4 h-4" />
            </div>
            
            {/* Simulated UI elements inside mockup */}
            <div className="grid grid-cols-3 gap-3 text-left">
              <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-850 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Teams</span>
                <span className="text-lg font-bold">12 Participating</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-850 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Live Matches</span>
                <span className="text-lg font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> 2 Active
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-850 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Status</span>
                <span className="text-lg font-bold text-blue-400">Fixtures Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="border-y border-slate-900 bg-slate-950/40 backdrop-blur-sm py-12">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 text-center">
          <div>
            <div className="text-4xl font-extrabold text-blue-500 mb-1">
              <AnimatedCounter value="4" suffix="" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Tournament Formats</p>
            <p className="text-xs text-slate-500 mt-0.5">Round-Robin, Groups, Elimination</p>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-indigo-400 mb-1">
              <AnimatedCounter value="6" suffix="" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Sports Formats Preloaded</p>
            <p className="text-xs text-slate-500 mt-0.5">Soccer, Basketball, Athletics & more</p>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-emerald-400 mb-1">
              <AnimatedCounter value="100" suffix="%" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Organization Privacy</p>
            <p className="text-xs text-slate-500 mt-0.5">Private tenant workspaces</p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Everything you need in one system
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
            No spreadsheets, no manual calculation errors. Control every match from registration to trophy hand-off.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900 hover:border-slate-800 hover:bg-slate-900/50 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2">Fixtures</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Schedule matches across teams and venues dynamically with built-in clash detection.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900 hover:border-slate-800 hover:bg-slate-900/50 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2">Brackets</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Auto-generate round-robin draws, group stages, and single-elimination play-offs.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900 hover:border-slate-800 hover:bg-slate-900/50 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2">Live Scores</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Log match results in real-time. Scorekeeper updates sync instantly to the audience dashboard.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900 hover:border-slate-800 hover:bg-slate-900/50 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2">Analytics</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Track standings, round completion progress, and overall medal tallies dynamically.
            </p>
          </div>

        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-900 bg-slate-950/20 py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Set up your league in minutes
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
              Follow three simple steps to start hosting matches and sharing standings.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-lg shadow-lg shadow-blue-500/35 mb-4">
                1
              </div>
              <h3 className="font-bold text-lg mb-2">Create Workspace</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                Pick a host name, establish your tournament title, and initialize your private portal.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-lg shadow-indigo-500/35 mb-4">
                2
              </div>
              <h3 className="font-bold text-lg mb-2">Add Teams & Fixtures</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                Input your team codes, configure durations, and generate matching schedules instantly.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-lg shadow-lg shadow-emerald-500/35 mb-4">
                3
              </div>
              <h3 className="font-bold text-lg mb-2">Go Live with Scores</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                Invite scorekeepers to input goals, points, and durations directly from their phones.
              </p>
            </div>

            {/* Connecting Line (Desktop) */}
            <div className="hidden sm:block absolute top-10 left-[15%] right-[15%] h-[2px] bg-slate-900 -z-0" />
          </div>
        </div>
      </section>

      {/* Interactive Workspaces & Registration Hub */}
      <section ref={workspaceSectionRef} className="border-t border-slate-900 bg-slate-950 py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Access Workspace Hub
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
              Choose an existing organization workspace or register a new one to launch your dashboard.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            
            {/* List of existing organizations */}
            <div className="bg-slate-900/30 backdrop-blur-md border border-slate-900 hover:border-slate-800/80 rounded-2xl p-6 md:p-8 transition-colors duration-300">
              <h2 className="text-xl font-bold flex items-center gap-2.5 mb-6 border-b border-slate-900 pb-4">
                <Building2 className="w-5 h-5 text-blue-400" /> Existing Workspaces
              </h2>

              {organizations && organizations.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      onClick={() => selectOrg(org.slug)}
                      className="group flex items-center justify-between p-4 rounded-xl border border-slate-900 bg-slate-950/45 hover:bg-slate-900/40 hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
                    >
                      <div>
                        <h3 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                          {org.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-slate-500" /> /{org.slug}
                        </p>
                        {org.event_title && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Event: {org.event_title}
                          </p>
                        )}
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 group-hover:bg-blue-600 transition-all duration-300">
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium text-sm">No workspaces configured yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Get started by creating one on the right!</p>
                </div>
              )}
            </div>

            {/* Create new organization form */}
            <div className="bg-slate-900/30 backdrop-blur-md border border-slate-900 hover:border-slate-800/80 rounded-2xl p-6 md:p-8 transition-colors duration-300">
              <h2 className="text-xl font-bold flex items-center gap-2.5 mb-6 border-b border-slate-900 pb-4">
                <Plus className="w-5 h-5 text-emerald-400" /> Create Workspace
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Organization / Host Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oakridge High, City Sports"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Event / Tournament Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Sports Day, Summer Cup"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Creator Email Address * (For Expiration &amp; Lockout Alerts)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@school.com"
                    value={creatorEmail}
                    onChange={(e) => setCreatorEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !newOrgName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-emerald-500/15 duration-300 cursor-pointer text-sm"
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
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-slate-500 text-xs text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Your workspace data stays private to your organization.</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-300 transition-colors">Support</a>
            <span className="text-slate-850">|</span>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            <span className="text-slate-850">|</span>
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
          </div>

          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">FixtureGrid</span>
              <img 
                src="/assets/fixture-grid-logo.png" 
                alt="FixtureGrid" 
                className="h-4 object-contain rounded bg-white px-0.5" 
              />
            </div>
            <span className="text-slate-850">|</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-450">Powered by</span>
              <img 
                src="/assets/etechzim-logo.png" 
                alt="etechzim" 
                className="h-4 object-contain brightness-0 invert opacity-75 hover:opacity-100 transition-opacity" 
              />
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-[11px] text-slate-600">
          &copy; {new Date().getFullYear()} FixtureGrid Tournament Manager. Built for multiple organizations. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
