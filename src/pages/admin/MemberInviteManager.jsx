import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import Unauthorized from '../Unauthorized';

const Icons = {
  UserPlus: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Mail: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Shield: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Info: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  Search: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Users: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Phone: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Book: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Calendar: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Copy: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  ChevronRight: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Edit: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
    </svg>
  ),
  Trash: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
};

const TIER_BADGES = {
  Admin: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  Member: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20',
  Participant: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
};

const TIER_GRADIENTS = {
  Admin: 'from-rose-500 to-orange-500',
  Member: 'from-indigo-500 to-purple-500',
  Participant: 'from-emerald-500 to-teal-500'
};

export default function MemberInviteManager() {
  const { user: currentUser, roleTier } = useAuth();

  // Strict RBAC gate checking
  if (roleTier !== 'Admin') {
    return <Unauthorized />;
  }

  // Dashboard states
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'invite'
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleChangingUserId, setRoleChangingUserId] = useState(null);

  // Editing mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', branch: '', academic_year: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Invite states
  const [form, setForm] = useState({ name: '', email: '', phone: '', role_tier: 'Member' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Fetch all users
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await api.get('/users');
      if (res.ok && res.data?.success) {
        setUsers(res.data.users || []);
      } else {
        setUsersError(res.data?.error || 'Failed to fetch users.');
      }
    } catch (err) {
      console.error(err);
      setUsersError('Network error. Failed to fetch users.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setRoleChangingUserId(userId);
    try {
      const res = await api.patch(`/users/${userId}/role`, { role_tier: newRole });
      if (res.ok && res.data?.success) {
        // Update user in users list
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role_tier: newRole } : u));
        
        // Update selected user details card if matching
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(prev => ({ ...prev, role_tier: newRole }));
        }
      } else {
        alert(res.data?.error || 'Failed to update user role.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to update user role.');
    } finally {
      setRoleChangingUserId(null);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setIsEditing(false);
    setEditError('');
  };

  const handleStartEdit = () => {
    if (!selectedUser) return;
    setEditForm({
      name: selectedUser.name || '',
      email: selectedUser.email || '',
      phone: selectedUser.phone || '',
      branch: selectedUser.branch || '',
      academic_year: selectedUser.academic_year || ''
    });
    setEditError('');
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setEditError('Name and email are required.');
      return;
    }

    setEditLoading(true);
    setEditError('');

    try {
      const res = await api.put(`/users/${selectedUser.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        branch: editForm.branch.trim(),
        academic_year: editForm.academic_year.trim()
      });

      if (res.ok && res.data?.success) {
        // Update local users list
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
          ...u,
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          branch: editForm.branch.trim(),
          academic_year: editForm.academic_year.trim()
        } : u));

        // Update selectedUser
        setSelectedUser(prev => ({
          ...prev,
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          branch: editForm.branch.trim(),
          academic_year: editForm.academic_year.trim()
        }));

        setIsEditing(false);
      } else {
        setEditError(res.data?.error || 'Failed to update user details.');
      }
    } catch (err) {
      console.error(err);
      setEditError('Network connection error. Save failed.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you absolutely sure you want to delete this user account? This will permanently remove all associated registrations and records. This action cannot be undone.')) {
      return;
    }

    try {
      const res = await api.del(`/users/${userId}`);
      if (res.ok && res.data?.success) {
        // Remove from local list
        setUsers(prev => prev.filter(u => u.id !== userId));
        setSelectedUser(null);
        setIsEditing(false);
        alert(res.data.message || 'User has been successfully deleted.');
      } else {
        alert(res.data?.error || 'Failed to delete user.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to delete user.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.role_tier) return;

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const res = await api.post('/users/invite', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role_tier: form.role_tier
      });

      if (res.status === 201 && res.data?.success) {
        setSuccess({
          name: form.name,
          role: form.role_tier,
          accountId: res.data.account_id,
          emailSent: !!res.data.email_sent
        });
        setForm({ name: '', email: '', phone: '', role_tier: 'Member' });
        // Refresh users list
        fetchUsers();
      } else {
        setError(res.data?.error || 'Invitation dispatch failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Network connectivity error. Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Stats calculation
  const stats = {
    total: users.length,
    admin: users.filter(u => u.role_tier === 'Admin').length,
    member: users.filter(u => u.role_tier === 'Member').length,
    participant: users.filter(u => u.role_tier === 'Participant').length,
  };

  // Filter users list
  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.unique_registration_id && u.unique_registration_id.toLowerCase().includes(query)) ||
      (u.phone && u.phone.includes(query));
    
    const matchesRole = roleFilter === 'All' || u.role_tier === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 text-slate-100 animate-fade-in max-w-7xl">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="section-header">User & Access Management</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Review registration lists, modify access roles, and invite teammates or superusers.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/[0.03] border border-white/[0.08] p-1 rounded-xl shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'list'
                ? 'bg-brand-500/15 border border-brand-500/20 text-brand-300 shadow-glow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Teammate Directory
          </button>
          <button
            onClick={() => {
              setActiveTab('invite');
              setSuccess(null);
              setError('');
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'invite'
                ? 'bg-brand-500/15 border border-brand-500/20 text-brand-300 shadow-glow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Invite User
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', count: stats.total, color: 'text-white' },
          { label: 'System Admins', count: stats.admin, color: 'text-rose-400' },
          { label: 'Auditor Members', count: stats.member, color: 'text-indigo-300' },
          { label: 'Participants', count: stats.participant, color: 'text-emerald-400' }
        ].map((item, idx) => (
          <div key={idx} className="glass-card p-4 rounded-2xl border border-white/[0.05] bg-white/[0.01] flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</span>
            <span className={`text-2xl font-black mt-1 ${item.color}`}>{usersLoading ? '...' : item.count}</span>
          </div>
        ))}
      </div>

      {/* ── Main Panel Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Main directory list or invite form */}
        <div className="lg:col-span-8 space-y-4">
          
          {activeTab === 'list' ? (
            /* DIRECTORY VIEW */
            <div className="glass-card p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01] relative overflow-hidden min-h-[400px]">
              <div className="absolute inset-0 bg-dots opacity-[0.02] pointer-events-none" />

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6 pb-4 border-b border-white/[0.05]">
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <Icons.Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, ID, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs focus:border-brand-500/50 focus:outline-none"
                  />
                </div>

                {/* Role Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Filter:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="All" className="bg-surface-900">All Tiers</option>
                    <option value="Admin" className="bg-surface-900">Admin</option>
                    <option value="Member" className="bg-surface-900">Member</option>
                    <option value="Participant" className="bg-surface-900">Participant</option>
                  </select>
                </div>
              </div>

              {/* Directory Content */}
              {usersLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Icons.Spinner className="w-6 h-6 text-brand-400" />
                  <span className="text-slate-400 text-xs animate-pulse">Loading directory entries...</span>
                </div>
              ) : usersError ? (
                <div className="py-20 text-center text-red-400 text-xs font-bold uppercase tracking-wider">
                  ⚠️ Error: {usersError}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-xs">
                  No directory records match your current query filters.
                </div>
              ) : (
                /* Responsive Table/List */
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.05] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="pb-3 pl-2">Teammate Details</th>
                        <th className="pb-3 hidden sm:table-cell">Account Serial</th>
                        <th className="pb-3">Role Tier</th>
                        <th className="pb-3 text-right pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {filteredUsers.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        const isSelected = selectedUser && selectedUser.id === u.id;
                        return (
                          <tr 
                            key={u.id}
                            onClick={() => handleUserSelect(u)}
                            className={`hover:bg-white/[0.02] transition-colors cursor-pointer group ${
                              isSelected ? 'bg-white/[0.04]' : ''
                            }`}
                          >
                            {/* Profile Info */}
                            <td className="py-3.5 pl-2 flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${TIER_GRADIENTS[u.role_tier] || TIER_GRADIENTS.Participant} flex items-center justify-center text-white font-bold shrink-0 shadow`}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-200 block group-hover:text-brand-300 transition-colors">
                                  {u.name}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[150px] sm:max-w-[200px]">
                                  {u.email}
                                </span>
                              </div>
                            </td>

                            {/* Serial Code */}
                            <td className="py-3.5 hidden sm:table-cell font-mono text-[10px] text-slate-400">
                              {u.unique_registration_id || '—'}
                            </td>

                            {/* Role Badge */}
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                TIER_BADGES[u.role_tier] || TIER_BADGES.Participant
                              }`}>
                                {u.role_tier}
                              </span>
                            </td>

                            {/* Quick promote/demote or warning */}
                            <td className="py-3.5 text-right pr-2" onClick={(e) => e.stopPropagation()}>
                              {isSelf ? (
                                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block py-1.5">
                                  LOCKED (YOU)
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  {roleChangingUserId === u.id ? (
                                    <Icons.Spinner className="w-3.5 h-3.5 text-brand-400" />
                                  ) : (
                                    <select
                                      value={u.role_tier}
                                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                      className="px-2 py-1 rounded bg-black/35 border border-white/[0.08] text-slate-300 text-[10px] font-semibold focus:outline-none cursor-pointer"
                                    >
                                      <option value="Admin">Admin</option>
                                      <option value="Member">Member</option>
                                      <option value="Participant">Participant</option>
                                    </select>
                                  )}
                                  <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors hidden sm:block" />
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* INVITATION FORM VIEW */
            <div className="glass-card p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01] relative overflow-hidden">
              <div className="absolute inset-0 bg-dots opacity-[0.03] pointer-events-none" />

              <div className="flex items-center gap-2 mb-6 border-b border-white/[0.05] pb-3">
                <span className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                  <Icons.UserPlus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">
                    Invite Teammate Form
                  </h3>
                  <p className="text-[9px] text-slate-500">Auto-generates deterministic credentials and mails them securely</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Vikram Malhotra"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    />
                  </div>

                  {/* Role Allocation */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Role Tier Allocation
                    </label>
                    <select
                      value={form.role_tier}
                      onChange={(e) => setForm({ ...form, role_tier: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 text-xs font-semibold focus:border-brand-500/60 focus:outline-none pr-8 cursor-pointer"
                    >
                      <option value="Member" className="bg-surface-900">Member (Auditor)</option>
                      <option value="Admin" className="bg-surface-900">Admin (Superuser)</option>
                      <option value="Participant" className="bg-surface-900">Participant (General User)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. teammate@mavericks.club"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Mobile Number (Used as Password)
                    </label>
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="e.g. 9876543212"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/5 border border-red-500/10 text-red-400 text-xs rounded-xl font-bold uppercase tracking-wider">
                    ⚠️ Error: {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-black flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <>
                      <Icons.Spinner className="w-4 h-4 text-black" />
                      Inviting teammate...
                    </>
                  ) : (
                    'Grant Privileges & Invite User'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: User Detail Card / Guidelines */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {selectedUser ? (
            /* USER CARD (EDITING or VIEWING) */
            <div className="glass-card p-5 rounded-3xl border border-white/[0.08] bg-white/[0.002] text-left flex flex-col justify-between gap-5 animate-fade-in shadow-xl relative overflow-hidden">
              
              <div className="absolute top-0 right-0 p-3 flex items-center gap-1.5">
                {!isEditing && (
                  <button
                    onClick={handleStartEdit}
                    className="p-1 rounded bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                    title="Edit User Profile"
                  >
                    <Icons.Edit className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setIsEditing(false);
                  }}
                  className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                  title="Close details"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {isEditing ? (
                /* EDITING MODE FORM */
                <form onSubmit={handleSaveEdit} className="space-y-4 mt-3">
                  <div className="border-b border-white/[0.05] pb-3 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-300">
                      Edit User Profile
                    </span>
                    <h4 className="text-sm font-bold text-slate-200 truncate mt-1">{selectedUser.name}</h4>
                  </div>

                  {editError && (
                    <div className="p-2.5 bg-red-500/5 border border-red-500/10 text-red-400 text-[10px] rounded-lg font-bold uppercase tracking-wider">
                      ⚠️ {editError}
                    </div>
                  )}

                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/35 border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Email</label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/35 border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Mobile Phone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/35 border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    />
                  </div>

                  {/* Branch / Department */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Department / Branch</label>
                    <input
                      type="text"
                      value={editForm.branch}
                      onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/35 border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    />
                  </div>

                  {/* Academic Year */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Academic Year</label>
                    <input
                      type="text"
                      value={editForm.academic_year}
                      onChange={(e) => setEditForm({ ...editForm, academic_year: e.target.value })}
                      placeholder="e.g. FY, SY, TY, Final"
                      className="w-full px-3 py-2 rounded-xl bg-black/35 border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="w-1/2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200 text-[10px] font-bold uppercase tracking-wider transition-colors text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="w-1/2 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all shadow-glow-sm flex items-center justify-center gap-1.5"
                    >
                      {editLoading ? (
                        <Icons.Spinner className="w-3.5 h-3.5 text-white" />
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* VIEWING MODE */
                <>
                  {/* Avatar Header */}
                  <div className="flex flex-col items-center text-center mt-3 pb-4 border-b border-white/[0.05]">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${TIER_GRADIENTS[selectedUser.role_tier] || TIER_GRADIENTS.Participant} flex items-center justify-center text-white text-2xl font-black shadow-lg mb-3`}>
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <h4 className="text-sm font-black text-slate-200">{selectedUser.name}</h4>
                    
                    <span className={`mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      TIER_BADGES[selectedUser.role_tier] || TIER_BADGES.Participant
                    }`}>
                      {selectedUser.role_tier}
                    </span>
                  </div>

                  {/* Data Items */}
                  <div className="space-y-4 py-2">
                    {/* ID */}
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Account Serial ID</span>
                        <strong className="font-mono text-slate-300">{selectedUser.unique_registration_id || 'N/A'}</strong>
                      </div>
                      {selectedUser.unique_registration_id && (
                        <button
                          onClick={() => handleCopyId(selectedUser.unique_registration_id)}
                          className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                          title="Copy Serial ID"
                        >
                          {copiedId ? (
                            <Icons.Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Icons.Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Contact Email */}
                    <div className="text-xs">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                        <Icons.Mail className="w-3 h-3 text-slate-500 inline" /> Email Address
                      </span>
                      <strong className="text-slate-300 font-sans break-all select-all">{selectedUser.email}</strong>
                    </div>

                    {/* Contact Phone */}
                    <div className="text-xs">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                        <Icons.Phone className="w-3 h-3 text-slate-500 inline" /> Mobile Number
                      </span>
                      <strong className="text-slate-300 font-sans select-all">{selectedUser.phone || 'N/A'}</strong>
                    </div>

                    {/* Academic Metadata */}
                    <div className="grid grid-cols-2 gap-4 pt-1 border-t border-white/[0.05]">
                      <div className="text-xs">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                          <Icons.Book className="w-3 h-3 text-slate-500 inline" /> Department
                        </span>
                        <strong className="text-slate-300 truncate block mt-0.5">{selectedUser.branch || 'N/A'}</strong>
                      </div>
                      <div className="text-xs">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                          <Icons.Calendar className="w-3 h-3 text-slate-500 inline" /> Academic Year
                        </span>
                        <strong className="text-slate-300 truncate block mt-0.5">{selectedUser.academic_year || 'N/A'}</strong>
                      </div>
                    </div>

                    {/* Status and Registration */}
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="text-xs">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Account State</span>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full ${
                          selectedUser.is_active === 1 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.is_active === 1 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {selectedUser.is_active === 1 ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Member Since</span>
                        <strong className="text-slate-300 block mt-1">
                          {selectedUser.created_at
                            ? new Date(selectedUser.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                            : 'N/A'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Role Selector */}
                  <div className="pt-3 border-t border-white/[0.05] space-y-3.5">
                    {selectedUser.id === currentUser?.id ? (
                      <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[10px] text-slate-500 text-center leading-normal">
                        You cannot change your own role or delete your account to prevent lockout.
                      </div>
                    ) : (
                      <>
                        {/* Change Role */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">
                            Modify User Access Tier
                          </label>
                          {roleChangingUserId === selectedUser.id ? (
                            <div className="w-full flex items-center justify-center py-2 bg-white/[0.03] rounded-xl">
                              <Icons.Spinner className="w-4 h-4 text-brand-400" />
                            </div>
                          ) : (
                            <select
                              value={selectedUser.role_tier}
                              onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 text-xs font-semibold focus:outline-none cursor-pointer"
                            >
                              <option value="Admin">Admin (Superuser)</option>
                              <option value="Member">Member (Auditor)</option>
                              <option value="Participant">Participant (General User)</option>
                            </select>
                          )}
                        </div>

                        {/* Danger zone actions */}
                        <button
                          onClick={() => handleDeleteUser(selectedUser.id)}
                          className="w-full py-2 px-3 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-500/25 hover:border-rose-500/45 text-rose-400 hover:text-rose-300 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                          Delete User Account
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : success ? (
            /* EMERALD SUCCESS ALERT (FOR INVITE) */
            <div className="glass-card p-5 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-teal-950/20 text-left flex flex-col justify-between gap-4 animate-fade-in shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Icons.Check className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Invitation Complete
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Account Name</span>
                    <strong className="text-sm text-slate-200 block">{success.name}</strong>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Account Serial ID</span>
                    <strong className="text-xs font-mono text-emerald-400 block">{success.accountId}</strong>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Allocated Tier</span>
                    <strong className="text-[10px] font-bold uppercase text-brand-400 block">{success.role}</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-black/30 border border-white/5 rounded-xl text-[10px] text-slate-400 leading-normal flex items-start gap-2">
                <Icons.Mail className="w-4 h-4 shrink-0 text-brand-400 mt-0.5" />
                <span>
                  {success.emailSent 
                    ? 'Mailer credentials email delivered successfully.' 
                    : 'Dev-mode: Credentials logged inside PHP error logs.'}
                </span>
              </div>
            </div>
          ) : (
            /* DEFAULT INFORMATIONAL SIDE PANEL */
            <div className="glass-card p-5 rounded-3xl border border-white/[0.08] bg-white/[0.002] text-left flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-brand-300 uppercase tracking-widest pb-2 border-b border-white/[0.06]">
                  Privilege Guidelines
                </h3>
                
                <ul className="space-y-3.5 text-xs text-slate-400 list-disc list-inside leading-relaxed">
                  <li>
                    Select any user in the directory to inspect their full profile details (phone, branch, year).
                  </li>
                  <li>
                    Click the <strong>edit icon</strong> in the top right of the details panel to edit a user's details.
                  </li>
                  <li>
                    Click the <strong>delete button</strong> at the bottom of the details panel to permanently remove a user.
                  </li>
                  <li>
                    Use the quick role tier dropdown selectors to promote or demote users in real-time.
                  </li>
                  <li>
                    Every operation is recorded inside the forensic system audit ledger with operator tags.
                  </li>
                </ul>
              </div>

              <div className="p-3.5 bg-brand-500/5 border border-brand-500/10 rounded-2xl text-[9px] text-slate-500 flex gap-2">
                <Icons.Info className="w-4 h-4 shrink-0 text-brand-400 mt-0.5" />
                <span>
                  Admin tier holds full system write access. Exercise caution when modifying or deleting users.
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
