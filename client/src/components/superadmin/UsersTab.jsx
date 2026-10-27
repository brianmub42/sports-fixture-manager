import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminApi } from '../../api.js';
import { 
  Users, Search, Plus, Key, Building2, Edit3, Trash2, 
  Lock, Unlock, Shield, ShieldCheck, RefreshCw, UserCheck 
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext.jsx';
import UserModal from './modals/UserModal.jsx';
import ResetPasswordModal from './modals/ResetPasswordModal.jsx';
import UserWorkspacesModal from './modals/UserWorkspacesModal.jsx';

export default function UsersTab({ allTenants }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [lockedFilter, setLockedFilter] = useState('');

  // Modals state
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [workspacesUser, setWorkspacesUser] = useState(null);

  // Query users
  const { data, isLoading, error } = useQuery({
    queryKey: ['superadmin_users', search, roleFilter, lockedFilter],
    queryFn: () => superadminApi.getUsers({
      search,
      role: roleFilter,
      isLocked: lockedFilter,
      limit: 100
    }).then(r => r.data)
  });

  const users = data?.users || [];
  const totalUsers = data?.total || 0;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (userData) => superadminApi.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_users'] });
      showToast('Global user account created successfully!', 'success');
      setShowCreateModal(false);
    },
    onError: (err) => alert('Failed to create user: ' + (err.response?.data?.error || err.message))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => superadminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_users'] });
      showToast('User account updated!', 'success');
      setEditingUser(null);
    },
    onError: (err) => alert('Failed to update user: ' + (err.response?.data?.error || err.message))
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }) => superadminApi.resetUserPassword(id, newPassword),
    onSuccess: () => {
      showToast('Password updated successfully!', 'success');
    },
    onError: (err) => alert('Failed to reset password: ' + (err.response?.data?.error || err.message))
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => superadminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_users'] });
      showToast('User deleted from platform!', 'success');
    },
    onError: (err) => alert('Failed to delete user: ' + (err.response?.data?.error || err.message))
  });

  // Toggle lock
  const handleToggleLock = (user) => {
    const nextLocked = !user.is_locked;
    const action = nextLocked ? 'lock' : 'unlock';
    if (confirm(`Are you sure you want to ${action} ${user.name} (${user.email})?`)) {
      updateMutation.mutate({ id: user.id, data: { is_locked: nextLocked } });
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'superadmin':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-300 dark:border-purple-800">Superadmin</span>;
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">Admin</span>;
      case 'scorekeeper':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Scorekeeper</span>;
      case 'media_manager':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">Media</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Viewer</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-gray-50 dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-xs font-semibold"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Add User</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 font-semibold"
          >
            <option value="all">All Roles</option>
            <option value="superadmin">Superadmins</option>
            <option value="admin">Admins</option>
            <option value="scorekeeper">Scorekeepers</option>
            <option value="media_manager">Media Managers</option>
            <option value="viewer">Viewers</option>
          </select>

          {/* Status Filter */}
          <select
            value={lockedFilter}
            onChange={(e) => setLockedFilter(e.target.value)}
            className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="false">Active Only</option>
            <option value="true">Locked / Suspended</option>
          </select>

          <span className="text-xs font-bold text-slate-400 px-1">
            {totalUsers} user{totalUsers !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="k-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">User Account</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Workspace Memberships</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Created / Last Login</th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500" style={{ width: '190px' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs text-gray-500">
                    No users found matching the search criteria.
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{u.name}</div>
                          <div className="text-xs text-slate-400 font-mono truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {getRoleBadge(u.role)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.workspaces && u.workspaces.length > 0 ? (
                          <>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                              {u.workspaces.length} workspace{u.workspaces.length !== 1 ? 's' : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => setWorkspacesUser(u)}
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                            >
                              <Building2 size={11} />
                              <span>Manage</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setWorkspacesUser(u)}
                            className="text-[11px] text-slate-400 hover:text-blue-500 italic inline-flex items-center gap-1"
                          >
                            <Plus size={11} />
                            <span>Assign</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {u.is_locked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                          <Lock size={11} /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <Check size={11} /> Active
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                      <div>Registered: {new Date(u.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        {u.last_login_at ? `Last login: ${new Date(u.last_login_at).toLocaleDateString()}` : 'Never logged in'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPasswordUser(u)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Reset Password"
                        >
                          <Key size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit User Info & Role"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleLock(u)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            u.is_locked
                              ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
                              : 'border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30'
                          }`}
                          title={u.is_locked ? 'Unlock Account' : 'Lock Account'}
                        >
                          {u.is_locked ? <Unlock size={13} /> : <Lock size={13} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`⚠️ Delete user "${u.name}" (${u.email}) permanently?`)) {
                              deleteMutation.mutate(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create / Edit Modal */}
      <UserModal
        user={editingUser}
        isOpen={Boolean(editingUser) || showCreateModal}
        onClose={() => {
          setEditingUser(null);
          setShowCreateModal(false);
        }}
        onSave={(formData) => {
          if (editingUser) {
            updateMutation.mutate({ id: editingUser.id, data: formData });
          } else {
            createMutation.mutate(formData);
          }
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        user={passwordUser}
        isOpen={Boolean(passwordUser)}
        onClose={() => setPasswordUser(null)}
        onReset={(userId, newPassword, onSuccess) => {
          resetPasswordMutation.mutate({ id: userId, newPassword }, { onSuccess });
        }}
        isResetting={resetPasswordMutation.isPending}
      />

      {/* User Workspaces Membership Modal */}
      <UserWorkspacesModal
        user={workspacesUser}
        allTenants={allTenants}
        isOpen={Boolean(workspacesUser)}
        onClose={() => setWorkspacesUser(null)}
      />
    </div>
  );
}
