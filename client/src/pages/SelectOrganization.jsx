import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { 
  Building2, Plus, ArrowRight, Loader2, Trophy, Globe, 
  Calendar, Award, Activity, BarChart3, CheckCircle2, 
  ShieldCheck, ArrowDownRight, Zap, Search, X, Eye, EyeOff,
  Lock, User, Mail, ChevronDown, ChevronUp, Sparkles, Filter
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';

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
  const navigate = useNavigate();
  const { organizations, isLoading, selectOrg, createOrg } = useOrganization();
  
  // Workspace search & filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'schools' | 'featured'
  const [showAllWorkspaces, setShowAllWorkspaces] = useState(false);
  const lastVisitedSlug = typeof localStorage !== 'undefined' ? localStorage.getItem('organization_slug') : null;

  // Create Workspace & Admin account form state
  const [newOrgName, setNewOrgName] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [adminName, setAdminName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    if (!newOrgName.trim() || !creatorEmail.trim() || !adminName.trim() || !password) return;

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await createOrg({
        name: newOrgName.trim(),
        event_title: newEventTitle.trim(),
        creator_email: creatorEmail.trim(),
        admin_name: adminName.trim(),
        password: password
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create workspace. Try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center text-slate-800 dark:text-white transition-colors">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-gray-400 font-medium">Resolving your sports workspaces...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white font-sans selection:bg-blue-600/30 selection:text-blue-200 transition-colors duration-200">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-900 transition-colors">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 px-3 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800">
              <img src="/assets/fixture-grid-logo.png" alt="FixtureGrid Logo" className="h-8 w-auto object-contain" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                Tournament Manager
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 -mt-0.5 font-medium">
                Multi-Sport Platform
              </span>
            </div>
          </div>
          
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <button 
              onClick={() => navigate('/watch/demo-tournament')}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Live FanZone
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 text-blue-700 dark:text-blue-400 text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5 fill-blue-500/20 text-blue-600 dark:text-blue-400" /> For churches, schools, sports clubs &amp; corporates
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-b from-slate-950 via-slate-850 to-slate-650 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent max-w-4xl mx-auto mb-6">
          Run your competitions <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">from one dashboard.</span>
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Manage your complete competition flow with auto-generated fixtures, visual brackets, real-time live scores, dynamic standings, and comprehensive analytics.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-xl mx-auto mb-16">
          <button 
            onClick={() => navigate('/watch/demo-tournament')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 font-extrabold text-sm text-white shadow-xl shadow-rose-600/25 hover:shadow-rose-600/40 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Watch Live Spectator FanZone <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={scrollToWorkspaces}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-extrabold text-sm text-white shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Create your workspace <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={handleViewSample}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold text-sm text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            View sample dashboard <ArrowDownRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Hero Visual Mockup */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-250 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/30 backdrop-blur-sm p-2 shadow-xl dark:shadow-2xl dark:shadow-blue-500/5 overflow-hidden">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-900 pb-3">
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
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Teams</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">12 Participating</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Live Matches</span>
                <span className="text-lg font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> 2 Active
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Status</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">Fixtures Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="border-y border-slate-200 dark:border-slate-900 bg-white/70 dark:bg-slate-950/40 backdrop-blur-sm py-12 transition-colors">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 text-center">
          <div>
            <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-500 mb-1">
              <AnimatedCounter value="4" suffix="" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tournament Formats</p>
            <p className="text-xs text-slate-500 mt-0.5">Round-Robin, Groups, Elimination</p>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-1">
              <AnimatedCounter value="6" suffix="" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Sports Formats Preloaded</p>
            <p className="text-xs text-slate-500 mt-0.5">Soccer, Basketball, Athletics &amp; more</p>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-1">
              <AnimatedCounter value="100" suffix="%" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Organization Privacy</p>
            <p className="text-xs text-slate-500 mt-0.5">Private tenant workspaces</p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Everything you need in one system
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
            No spreadsheets, no manual calculation errors. Control every match from registration to trophy hand-off.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900 hover:border-blue-400 dark:hover:border-slate-800 hover:shadow-md transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Tournament Fixtures</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Schedule matches across teams and venues dynamically with built-in clash detection.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900 hover:border-indigo-400 dark:hover:border-slate-800 hover:shadow-md transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Brackets</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Auto-generate round-robin draws, group stages, and single-elimination play-offs.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900 hover:border-emerald-400 dark:hover:border-slate-800 hover:shadow-md transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Live Scores</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Log match results in real-time. Scorekeeper updates sync instantly to the audience dashboard.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900 hover:border-purple-400 dark:hover:border-slate-800 hover:shadow-md transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Analytics</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Track standings, round completion progress, and overall medal tallies dynamically.
            </p>
          </div>

        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 dark:border-slate-900 bg-slate-100/50 dark:bg-slate-950/20 py-24 transition-colors">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Set up your league in minutes
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
              Follow three simple steps to start hosting matches and sharing standings.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-lg shadow-lg shadow-blue-500/35 mb-4">
                1
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Create Workspace</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs">
                Pick a host name, establish your tournament title, and initialize your private portal.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-lg shadow-indigo-500/35 mb-4">
                2
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Add Teams &amp; Fixtures</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs">
                Input your team codes, configure durations, and generate matching schedules instantly.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-lg shadow-lg shadow-emerald-500/35 mb-4">
                3
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Go Live with Scores</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs">
                Invite scorekeepers to input goals, points, and durations directly from their phones.
              </p>
            </div>

            {/* Connecting Line (Desktop) */}
            <div className="hidden sm:block absolute top-10 left-[15%] right-[15%] h-[2px] bg-slate-200 dark:bg-slate-900 -z-0" />
          </div>
        </div>
      </section>

      {/* Interactive Workspaces & Registration Hub */}
      <section ref={workspaceSectionRef} className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 py-24 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Access Workspace Hub
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
              Choose an existing organization workspace or register a new one to launch your dashboard.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* List of existing organizations (7 cols on lg) */}
            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900/30 backdrop-blur-md border border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-800/80 rounded-2xl p-5 sm:p-7 transition-colors duration-300 shadow-sm flex flex-col justify-between">
              <div>
                {/* Header & Quick Recent Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-200 dark:border-slate-900 pb-3.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Existing Workspaces</h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                      {organizations?.length || 0}
                    </span>
                  </div>

                  {lastVisitedSlug && organizations?.some(o => o.slug === lastVisitedSlug) && (
                    <button
                      type="button"
                      onClick={() => selectOrg(lastVisitedSlug)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="Continue in your last active workspace"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Resume: <strong className="font-bold">{organizations.find(o => o.slug === lastVisitedSlug)?.name?.slice(0, 16)}...</strong></span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                </div>

                {/* Instant Search Bar */}
                <div className="relative mb-3.5">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search school, tournament, or /slug..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                {(() => {
                  const totalCount = organizations?.length || 0;
                  const schoolsCount = (organizations || []).filter(o => /school|college|high|primary|academy|convent/i.test(o.name)).length;
                  const featuredCount = (organizations || []).filter(o => o.is_featured || o.slug === 'demo-tournament').length;

                  return (
                    <div className="flex items-center gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
                      <button
                        type="button"
                        onClick={() => setFilterType('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                          filterType === 'all'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        All ({totalCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterType('schools')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                          filterType === 'schools'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        🏫 Schools ({schoolsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterType('featured')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                          filterType === 'featured'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        ⭐ Featured ({featuredCount})
                      </button>
                    </div>
                  );
                })()}

                {/* Workspaces Responsive Grid */}
                {(() => {
                  const filtered = (organizations || []).filter(org => {
                    const q = searchQuery.trim().toLowerCase();
                    const matchesSearch = !q ||
                      org.name?.toLowerCase().includes(q) ||
                      org.slug?.toLowerCase().includes(q) ||
                      (org.event_title && org.event_title.toLowerCase().includes(q));

                    if (!matchesSearch) return false;

                    if (filterType === 'schools') {
                      return /school|college|high|primary|academy|convent/i.test(org.name);
                    }
                    if (filterType === 'featured') {
                      return org.is_featured || org.slug === 'demo-tournament';
                    }
                    return true;
                  }).sort((a, b) => a.name.localeCompare(b.name));

                  const displayed = showAllWorkspaces ? filtered : filtered.slice(0, 6);

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 px-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-950/30">
                        <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No workspaces matched "{searchQuery}"</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">Try searching with a different term or clear filters</p>
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                          className="mt-3 px-3 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Clear Search
                        </button>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                        {displayed.map((org) => {
                          const initials = (org.name || 'WS').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
                          const isFeatured = org.is_featured || org.slug === 'demo-tournament';
                          return (
                            <div
                              key={org.id}
                              onClick={() => selectOrg(org.slug)}
                              className="group p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/50 hover:bg-blue-50/50 dark:hover:bg-slate-900/60 hover:border-blue-400 dark:hover:border-blue-500/60 transition-all duration-200 cursor-pointer shadow-xs flex flex-col justify-between"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                      {org.name}
                                    </h3>
                                    {isFeatured && (
                                      <span className="shrink-0 text-[9px] font-extrabold px-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        ⭐
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {org.event_title || `/${org.slug}`}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-semibold">
                                <span className="font-mono">/{org.slug}</span>
                                <span className="flex items-center gap-0.5 font-bold">Open <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Expander button if more than 6 items */}
                      {filtered.length > 6 && (
                        <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-900 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Showing <strong className="text-slate-700 dark:text-slate-300">{displayed.length}</strong> of {filtered.length} workspaces
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAllWorkspaces(!showAllWorkspaces)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {showAllWorkspaces ? (
                              <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                            ) : (
                              <>View All ({filtered.length}) <ChevronDown className="w-3.5 h-3.5" /></>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Create new organization form (5 cols on lg) */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/30 backdrop-blur-md border border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-800/80 rounded-2xl p-5 sm:p-7 transition-colors duration-300 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-900 pb-3.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Create Workspace</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Set up tournament &amp; admin account</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Instant Setup
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold leading-relaxed">
                    {error}
                  </div>
                )}

                {/* Section 1: Workspace Info */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Organization / School Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Oakridge High, City Sports Club"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Event / Tournament Title <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Annual Sports Championship"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Section 2: Administrator Credentials (Mandatory) */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-850 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Administrator Credentials</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Administrator Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Coach David Moyo"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Administrator Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. admin@school.com"
                      value={creatorEmail}
                      onChange={(e) => setCreatorEmail(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Min 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-xl pl-3 pr-8 py-2.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full bg-white dark:bg-slate-950 border rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-xs focus:outline-none transition-all shadow-xs ${
                          confirmPassword && password !== confirmPassword
                            ? 'border-red-400 focus:border-red-500'
                            : 'border-slate-300 dark:border-slate-850 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>

                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-red-500 font-medium">⚠️ Passwords do not match</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newOrgName.trim() || !creatorEmail.trim() || !adminName.trim() || !password}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-400 disabled:to-slate-400 dark:disabled:from-slate-800 dark:disabled:to-slate-800 disabled:text-slate-200 dark:disabled:text-slate-500 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-emerald-500/20 duration-300 cursor-pointer text-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating Workspace &amp; Account...
                      </>
                    ) : (
                      <>
                        Create Workspace &amp; Launch Dashboard <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Atomic Setup:</strong> Your workspace and administrator login are created simultaneously. No abandoned data is saved if you leave before completing.
                  </span>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    Already have an account? <span className="underline">Sign in here</span>
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-slate-100 dark:bg-slate-950 py-12 text-slate-500 text-xs text-center transition-colors">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Your workspace data stays private to your organization.</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors">Support</a>
            <span className="text-slate-300 dark:text-slate-800">|</span>
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors">Terms</a>
            <span className="text-slate-300 dark:text-slate-800">|</span>
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors">Privacy</a>
          </div>

          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 dark:text-slate-400 font-semibold">FixtureGrid</span>
              <img 
                src="/assets/fixture-grid-logo.png" 
                alt="FixtureGrid" 
                className="h-4 object-contain rounded bg-white px-0.5" 
              />
            </div>
            <span className="text-slate-300 dark:text-slate-800">|</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-450">Powered by</span>
              <img 
                src="/assets/etechzim-logo.png" 
                alt="etechzim" 
                className="h-4 object-contain dark:brightness-0 dark:invert opacity-75 hover:opacity-100 transition-opacity" 
              />
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-[11px] text-slate-500 dark:text-slate-600">
          &copy; {new Date().getFullYear()} FixtureGrid Tournament Manager. Built for multiple organizations. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
