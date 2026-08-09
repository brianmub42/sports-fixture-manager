import { useState, useEffect } from 'react';
import { useSettings, useUpdateSettings, useResetDatabase, useVenues, useCreateVenue, useDeleteVenue } from '../hooks/useFixtures.js';
import { Settings as SettingsIcon, Save, RefreshCw, AlertTriangle, ShieldAlert, Plus, Trash2, Star, ExternalLink, Users, MapPin } from 'lucide-react';
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

  const [form, setForm] = useState({ org_name: '', event_title: '', enable_player_registration: false });
  const [resetType, setResetType] = useState('fixtures_only');
  const [confirmText, setConfirmText] = useState('');
  const [resetSuccess, setResetSuccess] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const [sponsors, setSponsors] = useState([]);
  const [sponsorSaving, setSponsorSaving] = useState(false);
  const [sponsorSuccess, setSponsorSuccess] = useState(false);
  const [newSponsor, setNewSponsor] = useState({ name: '', logoUrl: '', tag: '', website: '' });

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

  // Venue Management State
  const { data: venues, isLoading: loadingVenues } = useVenues();
  const [newVenue, setNewVenue] = useState({ name: '', type: 'court' });
  const createVenueMutation = useCreateVenue();
  const deleteVenueMutation = useDeleteVenue();

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
    if (settings) {
      setForm({
        org_name: settings.org_name || '',
        event_title: settings.event_title || '',
        enable_player_registration: !!settings.enable_player_registration
      });
      setSponsors(settings.sponsors || []);
    }
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setUpdateSuccess(false);
    try {
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
    <div className="max-w-2xl mx-auto space-y-6">
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

      {/* Sponsors & Partners Manager */}
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add New Sponsor</p>
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
              <label className="block text-xs font-medium mb-1 text-gray-500">Logo URL (optional)</label>
              <input
                type="url"
                value={newSponsor.logoUrl}
                onChange={(e) => setNewSponsor(s => ({ ...s, logoUrl: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">Website (optional)</label>
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

      {/* Team Management */}
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
              <div key={u.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                <div>
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  u.role === 'admin' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                    : u.role === 'scorekeeper'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {u.role.toUpperCase()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add User Form */}
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
              <input
                type="password"
                required
                value={newUser.password}
                onChange={(e) => setNewUser(s => ({ ...s, password: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                placeholder="••••••••"
              />
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
            className="k-btn flex items-center gap-2 disabled:opacity-40 mt-2"
          >
            <Plus size={14} />
            {createUserMutation.isLoading ? 'Creating...' : 'Create User'}
          </button>
        </form>

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
              className="k-btn bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
            >
              Copy Invitation Text
            </button>
          </div>
        )}
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add New Venue</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">Venue Name *</label>
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
              <label className="block text-xs font-medium mb-1 text-gray-500">Venue Type</label>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    className="text-red-600"
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
                    className="text-red-600"
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
    </div>
  );
}
