import { useState, useEffect, useRef } from 'react';
import { useSettings, useUpdateSettings, useResetDatabase, useVenues, useCreateVenue, useDeleteVenue, useSports, useCreateSport, useDeleteSport } from '../hooks/useFixtures.js';
import { Settings as SettingsIcon, Save, RefreshCw, AlertTriangle, ShieldAlert, Plus, Trash2, Star, ExternalLink, Users, MapPin, Award, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { settingsApi, authApi } from '../api.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function Settings() {
  const { data: settings, isLoading, refetch } = useSettings();
  const updateSettings = useUpdateSettings();
  const resetDb = useResetDatabase();
  const { isAdmin, isAuthenticated } = useAuth();
  const { currentOrgSlug } = useOrganization();
  const isInitializedRef = useRef(false);

  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General Setup', icon: SettingsIcon },
    { id: 'points', name: 'Points & Ranks', icon: Award },
    { id: 'sports_venues', name: 'Sports & Venues', icon: MapPin },
    { id: 'users', name: 'Official Users', icon: Users },
    { id: 'reset', name: 'Danger Zone', icon: ShieldAlert },
  ];

  const [form, setForm] = useState({ org_name: '', event_title: '', enable_player_registration: false });
  const [resetType, setResetType] = useState('results_only');
  const [confirmText, setConfirmText] = useState('');
  const [resetSuccess, setResetSuccess] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const [sponsors, setSponsors] = useState([]);
  const [sponsorSaving, setSponsorSaving] = useState(false);
  const [sponsorSuccess, setSponsorSuccess] = useState(false);
  const [newSponsor, setNewSponsor] = useState({ name: '', logoUrl: '', tag: '', website: '' });

  const [pointsAllocation, setPointsAllocation] = useState([]);
  const [pointsSaving, setPointsSaving] = useState(false);
  const [pointsSuccess, setPointsSuccess] = useState(false);
  const [newPoint, setNewPoint] = useState({ position: '', points: '' });

  // Team Management State
  const queryClient = useQueryClient();
  const { data: teamUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await authApi.getUsers();
      return res.data;
    },
    enabled: isAuthenticated && isAdmin
  });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'scorekeeper' });
  const [createdUserCredentials, setCreatedUserCredentials] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', role: 'scorekeeper' });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const createUserMutation = useMutation({
    mutationFn: (data) => authApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreatedUserCredentials({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role
      });
      setNewUser({ name: '', email: '', password: '', role: 'scorekeeper' });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => authApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      setEditForm({ name: '', email: '', password: '', role: 'scorekeeper' });
      alert('User updated successfully!');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => authApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('User deleted successfully!');
    }
  });

  const handleEditUserClick = (u) => {
    setEditingUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role
    });
  };

  const handleUpdateUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateUserMutation.mutateAsync({
        id: editingUser.id,
        data: {
          name: editForm.name,
          email: editForm.email,
          password: editForm.password,
          role: editForm.role
        }
      });
    } catch (err) {
      alert('Failed to update user: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteUserClick = async (id) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      await deleteUserMutation.mutateAsync(id);
    } catch (err) {
      alert('Failed to delete user: ' + (err.response?.data?.error || err.message));
    }
  };

  // Venue Management State
  const { data: venues, isLoading: loadingVenues } = useVenues();
  const [newVenue, setNewVenue] = useState({ name: '', type: 'court' });
  const createVenueMutation = useCreateVenue();
  const deleteVenueMutation = useDeleteVenue();

  // Sport Management State
  const { data: sports, isLoading: loadingSports } = useSports();
  const [newSport, setNewSport] = useState({ name: '', scoring_type: 'points', win_points: 3, draw_points: 1 });
  const createSportMutation = useCreateSport();
  const deleteSportMutation = useDeleteSport();

  const handleCreateSport = async (e) => {
    e.preventDefault();
    if (!newSport.name.trim()) return;
    try {
      await createSportMutation.mutateAsync(newSport);
      setNewSport({ name: '', scoring_type: 'points', win_points: 3, draw_points: 1 });
    } catch (err) {
      alert('Failed to add sport: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSport = async (id) => {
    if (!confirm('Are you sure you want to delete this sport? All fixtures associated with it will also be deleted.')) return;
    try {
      await deleteSportMutation.mutateAsync(id);
    } catch (err) {
      alert('Failed to delete sport: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateVenue = async (e) => {
    e.preventDefault();
    if (!newVenue.name.trim()) return;
    try {
      await createVenueMutation.mutateAsync(newVenue);
      setNewVenue({ name: '', type: 'court' });
    } catch (err) {
      alert('Failed to add venue: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteVenue = async (id) => {
    if (!confirm('Are you sure you want to delete this venue?')) return;
    try {
      await deleteVenueMutation.mutateAsync(id);
    } catch (err) {
      alert('Failed to delete venue: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl max-w-lg mx-auto mt-12 shadow-lg">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-red-500 animate-bounce" />
        <h2 className="text-xl font-bold mb-1">Access Denied</h2>
        <p className="text-sm">You must be logged in as an official administrator to view or edit workspace settings.</p>
      </div>
    );
  }

  useEffect(() => {
    if (settings && !isInitializedRef.current) {
      setForm({
        org_name: settings.org_name || '',
        event_title: settings.event_title || '',
        enable_player_registration: !!settings.enable_player_registration
      });
      setSponsors(settings.sponsors || []);

      if (settings.points_allocation) {
        const arr = Object.entries(settings.points_allocation).map(([pos, pts]) => ({
          position: parseInt(pos),
          points: parseInt(pts)
        })).sort((a, b) => a.position - b.position);
        setPointsAllocation(arr);
      } else {
        setPointsAllocation([]);
      }
      isInitializedRef.current = true;
    }
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setUpdateSuccess(false);
    try {
      isInitializedRef.current = false;
      await updateSettings.mutateAsync(form);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (confirmText !== 'RESET') {
      alert('Please type RESET in the confirmation box to proceed.');
      return;
    }
    setResetSuccess(null);
    try {
      await resetDb.mutateAsync(resetType);
      setResetSuccess('Database reset completed successfully! You can now generate a new setup.');
      setConfirmText('');
    } catch (err) {
      console.error(err);
      alert('Reset failed: ' + err.message);
    }
  };

  const handleAddSponsor = () => {
    if (!newSponsor.name.trim()) return;
    setSponsors(prev => [...prev, { ...newSponsor, name: newSponsor.name.trim() }]);
    setNewSponsor({ name: '', logoUrl: '', tag: '', website: '' });
  };

  const handleRemoveSponsor = (idx) => {
    setSponsors(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveSponsors = async () => {
    setSponsorSaving(true);
    setSponsorSuccess(false);
    try {
      isInitializedRef.current = false;
      await settingsApi.saveSponsors(sponsors);
      setSponsorSuccess(true);
      setTimeout(() => setSponsorSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save sponsors: ' + err.message);
    } finally {
      setSponsorSaving(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUserMutation.mutateAsync(newUser);
    } catch (err) {
      alert('Failed to create user: ' + (err.response?.data?.error || err.message));
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 gap-1.5 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 pr-0 md:pr-6 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-205 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md transform translate-x-0 md:translate-x-1'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-150/50 dark:hover:bg-gray-800/40'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-amber-500' : 'text-gray-400'} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 w-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'general' && (
            <>
              {/* Edit Organization Info */}
              <form onSubmit={handleSave} className="k-card">
                <div className="flex items-center gap-2 mb-4">
                  <SettingsIcon size={18} className="text-blue-500" />
                  <h2 className="text-lg font-semibold">Organization Setup</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Configure the headers and details displayed across the entire Sports Manager interface.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Organization / Host Name</label>
                    <input
                      type="text"
                      required
                      value={form.org_name}
                      onChange={(e) => setForm({ ...form, org_name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      placeholder="e.g. Oakridge High Sports"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Event / Tournament Title</label>
                    <input
                      type="text"
                      required
                      value={form.event_title}
                      onChange={(e) => setForm({ ...form, event_title: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      placeholder="e.g. Inter-District Championship"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <input
                      type="checkbox"
                      id="enable_player_registration"
                      checked={form.enable_player_registration}
                      onChange={(e) => setForm({ ...form, enable_player_registration: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer"
                    />
                    <label htmlFor="enable_player_registration" className="text-sm font-medium select-none cursor-pointer">
                      Enable Player Registration & Team Sheets (Lineups)
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={updateSettings.isLoading}
                    className="k-btn k-btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={14} />
                    {updateSettings.isLoading ? 'Saving...' : 'Save Settings'}
                  </button>
                  {updateSuccess && (
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">Settings saved successfully!</span>
                  )}
                </div>
              </form>

              {/* Sponsors & Partners Ribbon */}
              <div className="k-card">
                <div className="flex items-center gap-2 mb-1">
                  <Star size={18} className="text-yellow-500" />
                  <h2 className="text-lg font-semibold">Sponsors &amp; Partners Ribbon</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  Add event sponsors and partners. They will scroll across the bottom ribbon visible to all visitors.
                </p>

                {/* Existing sponsors list */}
                <div className="space-y-2 mb-5">
                  {sponsors.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-center">
                      No sponsors added yet — default placeholders will be shown.
                    </p>
                  ) : (
                    sponsors.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                        {s.logoUrl ? (
                          <img src={s.logoUrl} alt={s.name} className="h-8 w-16 object-contain rounded" onError={(e) => e.target.style.display='none'} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0">
                            <Star className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.tag || 'Sponsor'}{s.website ? ` · ${s.website}` : ''}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSponsor(i)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new sponsor form */}
                <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-555 uppercase tracking-wider">Add New Sponsor</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500">Name *</label>
                      <input
                        type="text"
                        value={newSponsor.name}
                        onChange={(e) => setNewSponsor(s => ({ ...s, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500">Tag / Category</label>
                      <input
                        type="text"
                        value={newSponsor.tag}
                        onChange={(e) => setNewSponsor(s => ({ ...s, tag: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        placeholder="Gold Partner"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-550">Logo URL (optional)</label>
                      <input
                        type="url"
                        value={newSponsor.logoUrl}
                        onChange={(e) => setNewSponsor(s => ({ ...s, logoUrl: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-550">Website (optional)</label>
                      <input
                        type="url"
                        value={newSponsor.website}
                        onChange={(e) => setNewSponsor(s => ({ ...s, website: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSponsor}
                    disabled={!newSponsor.name.trim()}
                    className="k-btn flex items-center gap-2 disabled:opacity-40"
                  >
                    <Plus size={14} />
                    Add to List
                  </button>
                </div>

                {/* Save sponsors button */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleSaveSponsors}
                    disabled={sponsorSaving}
                    className="k-btn k-btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={14} />
                    {sponsorSaving ? 'Saving...' : 'Save Sponsors'}
                  </button>
                  {sponsorSuccess && (
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">Sponsors saved! Ribbon updated.</span>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'points' && (
            <div className="k-card">
              <div className="flex items-center gap-2 mb-1">
                <Award size={18} className="text-amber-500" />
                <h2 className="text-lg font-semibold">Points Allocation &amp; Positions</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Configure the points awarded to teams based on their position/placement in Athletics/Novelty events, and the overall sport standings.
              </p>

              {pointsAllocation.length === 0 ? (
                <div className="p-3.5 bg-amber-550/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 rounded-xl text-sm mb-4 animate-pulse">
                  <strong>Not Configured:</strong> No points allocation has been configured yet. Administrators must set this up from the onset.
                </div>
              ) : (
                <div className="space-y-2 mb-5">
                  {pointsAllocation.map((p, idx) => (
                    <div key={p.position} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold font-mono">#{p.position}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Position {p.position}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          Awards <strong className="text-gray-800 dark:text-gray-200">{p.points}</strong> point{p.points !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={p.points}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setPointsAllocation(prev => prev.map((item, i) => i === idx ? { ...item, points: val } : item));
                          }}
                          className="w-20 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-center font-semibold animate-pulse"
                          placeholder="Points"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPointsAllocation(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                          title="Remove position"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new position form */}
              <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/10">
                <p className="text-xs font-semibold text-gray-555 uppercase tracking-wider">Add Position Allocation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-555">Position * (e.g. 1, 2, 3)</label>
                    <input
                      type="number"
                      min={1}
                      value={newPoint.position}
                      onChange={(e) => setNewPoint(s => ({ ...s, position: parseInt(e.target.value) || '' }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-555">Points * (e.g. 10, 7, 5)</label>
                    <input
                      type="number"
                      min={0}
                      value={newPoint.points}
                      onChange={(e) => setNewPoint(s => ({ ...s, points: parseInt(e.target.value) || '' }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold"
                      placeholder="10"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newPoint.position || newPoint.points === '') return;
                    if (pointsAllocation.some(p => p.position === newPoint.position)) {
                      alert(`Position ${newPoint.position} is already configured.`);
                      return;
                    }
                    setPointsAllocation(prev => [...prev, { position: newPoint.position, points: newPoint.points }].sort((a, b) => a.position - b.position));
                    setNewPoint({ position: '', points: '' });
                  }}
                  disabled={!newPoint.position || newPoint.points === ''}
                  className="k-btn flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  <Plus size={14} />
                  Add Position
                </button>
              </div>

              {/* Save button */}
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-150 dark:border-gray-800">
                <button
                  type="button"
                  onClick={async () => {
                    setPointsSaving(true);
                    setPointsSuccess(false);
                    try {
                      const obj = {};
                      pointsAllocation.forEach(p => {
                        obj[p.position] = p.points;
                      });
                      isInitializedRef.current = false;
                      await updateSettings.mutateAsync({ points_allocation: pointsAllocation.length > 0 ? obj : null });
                      setPointsSuccess(true);
                      setTimeout(() => setPointsSuccess(false), 3000);
                    } catch (err) {
                      console.error(err);
                      alert('Failed to save points allocation: ' + err.message);
                    } finally {
                      setPointsSaving(false);
                    }
                  }}
                  disabled={pointsSaving}
                  className="k-btn k-btn-primary flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Save size={14} />
                  {pointsSaving ? 'Saving...' : 'Save Points Allocation'}
                </button>
                {pointsSuccess && (
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">Points allocation saved successfully!</span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sports_venues' && (
            <>
              {/* Sport Management */}
              <div className="k-card">
                <div className="flex items-center gap-2 mb-1">
                  <Award size={18} className="text-blue-500" />
                  <h2 className="text-lg font-semibold">Sporting Disciplines</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  Configure sporting disciplines and custom scoring formats (Points-based or Placement-based) for this organization.
                </p>

                {/* Existing Sports List */}
                <div className="space-y-2 mb-6">
                  {loadingSports ? (
                    <div className="text-xs text-gray-400 italic py-2">Loading sports...</div>
                  ) : sports?.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-center">
                      No sports registered yet. Add a new sport below to get started.
                    </p>
                  ) : (
                    sports?.map((s) => (
                      <div key={s.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                        <div>
                          <p className="text-sm font-semibold">{s.name}</p>
                          <p className="text-xs text-gray-400 capitalize">
                            {s.scoring_type === 'points' ? `Points (Win: ${s.win_points} pts, Draw: ${s.draw_points} pts)` : 'Placement / Novelty'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSport(s.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Delete Sport"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Sport Form */}
                <form onSubmit={handleCreateSport} className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-555 uppercase tracking-wider">Add New Sport</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-550">Sport Name *</label>
                      <input
                        type="text"
                        required
                        value={newSport.name}
                        onChange={(e) => setNewSport(s => ({ ...s, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        placeholder="e.g. Netball, Table Tennis"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-550">Scoring Format</label>
                      <select
                        value={newSport.scoring_type}
                        onChange={(e) => setNewSport(s => ({ ...s, scoring_type: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      >
                        <option value="points">Points-based (Round-Robin matches)</option>
                        <option value="placement">Placement-based (Athletics / Novelty runs)</option>
                      </select>
                    </div>
                  </div>

                  {newSport.scoring_type === 'points' && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-550">Win Points</label>
                        <input
                          type="number"
                          min={0}
                          value={newSport.win_points}
                          onChange={(e) => setNewSport(s => ({ ...s, win_points: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-555">Draw Points</label>
                        <input
                          type="number"
                          min={0}
                          value={newSport.draw_points}
                          onChange={(e) => setNewSport(s => ({ ...s, draw_points: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={createSportMutation.isLoading || !newSport.name.trim()}
                    className="k-btn flex items-center gap-2 disabled:opacity-40 mt-2"
                  >
                    <Plus size={14} />
                    {createSportMutation.isLoading ? 'Adding...' : 'Add Sport'}
                  </button>
                </form>
              </div>

              {/* Venue Management */}
              <div className="k-card">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={18} className="text-emerald-500" />
                  <h2 className="text-lg font-semibold">Venue Management</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  Configure physical courts, fields, and pitches available for scheduling fixtures in this organization.
                </p>

                {/* Existing Venues List */}
                <div className="space-y-2 mb-6">
                  {loadingVenues ? (
                    <div className="text-xs text-gray-400 italic py-2">Loading venues...</div>
                  ) : venues?.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-center">
                      No venues registered yet. Generate fixtures to create them or add new ones below.
                    </p>
                  ) : (
                    venues?.map((v) => (
                      <div key={v.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                        <div>
                          <p className="text-sm font-semibold">{v.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{v.type}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteVenue(v.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Delete Venue"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Venue Form */}
                <form onSubmit={handleCreateVenue} className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-555 uppercase tracking-wider">Add New Venue</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-550">Venue Name *</label>
                      <input
                        type="text"
                        required
                        value={newVenue.name}
                        onChange={(e) => setNewVenue(s => ({ ...s, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        placeholder="e.g. Soccer Pitch A, VB Court 1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-550">Venue Type</label>
                      <select
                        value={newVenue.type}
                        onChange={(e) => setNewVenue(s => ({ ...s, type: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      >
                        <option value="court">Court</option>
                        <option value="pitch">Pitch</option>
                        <option value="field">Field</option>
                        <option value="track">Track</option>
                        <option value="area">Area</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={createVenueMutation.isLoading || !newVenue.name.trim()}
                    className="k-btn flex items-center gap-2 disabled:opacity-40 mt-2"
                  >
                    <Plus size={14} />
                    {createVenueMutation.isLoading ? 'Adding...' : 'Add Venue'}
                  </button>
                </form>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div className="k-card">
              <div className="flex items-center gap-2 mb-1">
                <Users size={18} className="text-purple-500" />
                <h2 className="text-lg font-semibold">Team Management</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Manage access for your organization. Scorekeepers can update live scores but cannot change settings or generate fixtures.
              </p>

              {/* Existing Users List */}
              <div className="space-y-2 mb-6">
                {loadingUsers ? (
                  <div className="text-xs text-gray-400 italic py-2">Loading users...</div>
                ) : (
                  teamUsers?.map((u) => (
                    <div key={u.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 flex-wrap sm:flex-nowrap gap-2">
                      <div>
                        <p className="text-sm font-semibold">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-auto sm:ml-0">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                            : u.role === 'scorekeeper'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {u.role.toUpperCase()}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEditUserClick(u)}
                          className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          title="Edit User"
                        >
                          <SettingsIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUserClick(u.id)}
                          className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Edit/Add User Form Toggle */}
              {editingUser ? (
                <form onSubmit={handleUpdateUserSubmit} className="border border-solid border-blue-500 dark:border-blue-700 rounded-xl p-4 space-y-3 bg-blue-500/5">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Edit User: {editingUser.name}</p>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-555">Name *</label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm(s => ({ ...s, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-555">Email *</label>
                      <input
                        type="email"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm(s => ({ ...s, email: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-555">New Password (leave blank to keep current)</label>
                      <div className="relative">
                        <input
                          type={showEditPassword ? "text" : "password"}
                          value={editForm.password}
                          onChange={(e) => setEditForm(s => ({ ...s, password: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 dark:hover:text-gray-300 cursor-pointer"
                        >
                          {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-555">Role</label>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm(s => ({ ...s, role: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      >
                        <option value="scorekeeper">Scorekeeper</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={updateUserMutation.isLoading}
                      className="k-btn k-btn-primary flex items-center gap-2 text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                    >
                      {updateUserMutation.isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateUser} className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add New User</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500">Name *</label>
                      <input
                        type="text"
                        required
                        value={newUser.name}
                        onChange={(e) => setNewUser(s => ({ ...s, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500">Email *</label>
                      <input
                        type="email"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser(s => ({ ...s, email: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500">Password *</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={newUser.password}
                          onChange={(e) => setNewUser(s => ({ ...s, password: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 dark:hover:text-gray-300 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500">Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser(s => ({ ...s, role: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      >
                        <option value="scorekeeper">Scorekeeper</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={createUserMutation.isLoading || !newUser.name || !newUser.email || !newUser.password}
                    className="k-btn flex items-center gap-2 disabled:opacity-40 mt-2 cursor-pointer"
                  >
                    <Plus size={14} />
                    {createUserMutation.isLoading ? 'Creating...' : 'Create User'}
                  </button>
                </form>
              )}

              {createdUserCredentials && (
                <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">User Created Successfully!</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Copy the invitation details below to share with <strong>{createdUserCredentials.name}</strong>:
                  </p>
                  <div className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-mono select-all whitespace-pre-wrap">
                    {`Hello ${createdUserCredentials.name}!

You have been added as a ${createdUserCredentials.role.toUpperCase()} for the "${form.org_name}" workspace.

Workspace Link: ${window.location.origin}/login?workspace=${currentOrgSlug}
Email: ${createdUserCredentials.email}
Password: ${createdUserCredentials.password}

Please log in to manage fixtures and scores.`}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Hello ${createdUserCredentials.name}!\n\nYou have been added as a ${createdUserCredentials.role.toUpperCase()} for the "${form.org_name}" workspace.\n\nWorkspace Link: ${window.location.origin}/login?workspace=${currentOrgSlug}\nEmail: ${createdUserCredentials.email}\nPassword: ${createdUserCredentials.password}\n\nPlease log in to manage fixtures and scores.`;
                      navigator.clipboard.writeText(text);
                      alert('Invitation copied to clipboard!');
                    }}
                    className="k-btn bg-blue-600 hover:bg-blue-505 text-white text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                  >
                    Copy Invitation Text
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="k-card border border-red-200 dark:border-red-900/50 bg-red-50/10">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert size={18} className="text-red-500" />
                <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Fresh Organization Reset</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Clear existing data to start fresh for a new organization, tournament, or season.
              </p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Reset Scope</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className={`flex flex-col p-3 border rounded-lg cursor-pointer ${
                      resetType === 'results_only'
                        ? 'border-red-500 bg-red-50/30 dark:bg-red-950/20'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}>
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <input
                          type="radio"
                          name="reset_type"
                          value="results_only"
                          checked={resetType === 'results_only'}
                          onChange={() => setResetType('results_only')}
                          className="text-red-600 cursor-pointer"
                        />
                        Clear Results Only
                      </div>
                      <span className="text-xs text-gray-400 mt-1">Resets scores and event placements. Keeps fixtures, teams, venues, and custom sports intact.</span>
                    </label>

                    <label className={`flex flex-col p-3 border rounded-lg cursor-pointer ${
                      resetType === 'fixtures_only'
                        ? 'border-red-500 bg-red-50/30 dark:bg-red-950/20'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}>
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <input
                          type="radio"
                          name="reset_type"
                          value="fixtures_only"
                          checked={resetType === 'fixtures_only'}
                          onChange={() => setResetType('fixtures_only')}
                          className="text-red-650 cursor-pointer"
                        />
                        Reset Fixtures & Teams
                      </div>
                      <span className="text-xs text-gray-400 mt-1">Clears all fixtures, results, venues, and custom teams. Keeps existing sports config.</span>
                    </label>

                    <label className={`flex flex-col p-3 border rounded-lg cursor-pointer ${
                      resetType === 'full'
                        ? 'border-red-500 bg-red-50/30 dark:bg-red-950/20'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}>
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <input
                          type="radio"
                          name="reset_type"
                          value="full"
                          checked={resetType === 'full'}
                          onChange={() => setResetType('full')}
                          className="text-red-655 cursor-pointer"
                        />
                        Full Reset
                      </div>
                      <span className="text-xs text-gray-400 mt-1">Clears everything including fixtures, teams, venues, and custom sports configs.</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-lg">
                  <div className="flex gap-2 text-red-800 dark:text-red-400 text-xs">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <strong>Warning:</strong> This action is permanent and cannot be undone. All matches, points, and standings for this scope will be deleted.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Confirm by typing <span className="font-mono bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded text-xs font-bold">RESET</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-mono"
                    placeholder="Type RESET here"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetDb.isLoading || confirmText !== 'RESET'}
                  className="k-btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={resetDb.isLoading ? 'animate-spin' : ''} />
                  {resetDb.isLoading ? 'Resetting...' : 'Execute Reset'}
                </button>

                {resetSuccess && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400 rounded-lg">
                    {resetSuccess}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


