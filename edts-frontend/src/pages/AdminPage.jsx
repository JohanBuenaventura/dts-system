// src/pages/AdminPage.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { 
  ShieldAlert, Users, Building2, ClipboardList, Plus, 
  Trash2, Edit, Key, Power, Archive, RefreshCw, AlertCircle, 
  CheckCircle2, X, ChevronLeft, ChevronRight, Loader2, ChevronDown
} from 'lucide-react';

const TABS = ['Users', 'Departments', 'System Logs'];

// ── Shared Input Class ──
const inputClass = "w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 appearance-none";

const roleBadge = (role) => {
  const map = {
    'Super Admin': 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    'Admin':       'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    'Staff':       'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  };
  return map[role] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
};

const statusDot = (status) => {
  const map = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error:   'bg-rose-400',
  };
  return map[status] || 'bg-zinc-400';
};

// ── Glassmorphic Modal ──
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-in fade-in duration-200">
    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-zinc-100">{title}</h3>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ── Dark Theme Pagination ──
const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/30">
      <p className="text-xs text-zinc-500">
        Page <span className="font-medium text-zinc-300">{page}</span> of <span className="font-medium text-zinc-300">{totalPages}</span> · {pagination.total} total
      </p>
      <div className="flex gap-1.5">
        <button onClick={() => onPageChange(page - 1)} disabled={!pagination.hasPrev}
          className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center text-xs px-3">
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
        </button>
        <button onClick={() => onPageChange(page + 1)} disabled={!pagination.hasNext}
          className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center text-xs px-3">
          Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </button>
      </div>
    </div>
  );
};

const AdminPage = () => {
  const [activeTab,   setActiveTab]   = useState('Users');
  const [users,       setUsers]       = useState([]);
  const [departments, setDepartments] = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [pending,     setPending]     = useState([]); // Added pending approvals state
  const [logPagination, setLogPagination] = useState(null);
  const [logPage,     setLogPage]     = useState(1);
  const [logStatus,   setLogStatus]   = useState('');
  const [logAction,   setLogAction]   = useState('');
  const [loading,     setLoading]     = useState(true);
  const [message,     setMessage]     = useState({ type: '', text: '' });
  const [showArchived, setShowArchived] = useState(false);
  const [modal,       setModal]       = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [userForm,    setUserForm]    = useState({ full_name: '', email: '', password: '', role: 'Staff', department: '' });
  const [deptForm,    setDeptForm]    = useState({ name: '' });
  const [resetPass,   setResetPass]   = useState({ password: '', confirm: '' });
  const [formLoading, setFormLoading] = useState(false);

  const deptNames = departments.filter(d => !d.is_archived).map(d => d.name);

  const fetchUsers       = async () => { const r = await api.get('/admin/users');       setUsers(r.data.data); };
  const fetchDepartments = async () => { const r = await api.get('/admin/departments'); setDepartments(r.data.data); };
  
  // Added fetch pending users function
  const fetchPending = async () => {
    try {
      const res = await api.get('/admin/pending');
      setPending(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchAll = async () => {
    setLoading(true);
    try { 
      // Fetch users, departments, and pending registration requests concurrently
      await Promise.all([fetchUsers(), fetchDepartments(), fetchPending()]); 
    }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (activeTab === 'System Logs') fetchLogs(logPage);
  }, [activeTab, logPage, logStatus, logAction]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const closeModal = () => {
    setModal(null); setSelectedUser(null); setSelectedDept(null);
    setUserForm({ full_name: '', email: '', password: '', role: 'Staff', department: '' });
    setDeptForm({ name: '' });
    setResetPass({ password: '', confirm: '' });
  };

  // Added decision handler for admin actions
  const handleDecision = async (id, decision) => {
    try {
      await api.patch(`/admin/pending/${id}`, { decision });
      showMsg('success', `User ${decision}d.`);
      fetchPending();
      fetchUsers();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed.');
    }
  };

  // ── User handlers
  const handleCreateUser = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.post('/admin/users', userForm);
      showMsg('success', 'User created.'); closeModal(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleEditUser = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}`, userForm);
      showMsg('success', 'User updated.'); closeModal(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPass.password !== resetPass.confirm) return showMsg('error', 'Passwords do not match.');
    setFormLoading(true);
    try {
      await api.patch(`/admin/users/${selectedUser.id}/password`, { password: resetPass.password });
      showMsg('success', 'Password reset.'); closeModal();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleToggle = async (id) => {
    try { const r = await api.patch(`/admin/users/${id}/toggle`); showMsg('success', r.data.message); fetchUsers(); }
    catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete "${user.full_name}"?`)) return;
    try { const r = await api.delete(`/admin/users/${user.id}`); showMsg('success', r.data.message); fetchUsers(); }
    catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
  };

  // ── Department handlers
  const handleCreateDept = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.post('/admin/departments', deptForm);
      showMsg('success', 'Department created.'); closeModal(); fetchDepartments();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleEditDept = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.put(`/admin/departments/${selectedDept.id}`, deptForm);
      showMsg('success', 'Department renamed.'); closeModal(); fetchAll();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleArchiveDept = async (dept) => {
    const action = dept.is_archived ? 'restore' : 'archive';
    if (!window.confirm(`${action === 'archive' ? 'Archive' : 'Restore'} department "${dept.name}"?`)) return;
    try {
      const r = await api.patch(`/admin/departments/${dept.id}/archive`);
      showMsg('success', r.data.message); fetchDepartments();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
  };

  const handleDeleteDept = async (dept) => {
    if (!window.confirm(`Permanently delete "${dept.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/departments/${dept.id}`);
      showMsg('success', 'Department deleted.'); fetchDepartments();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
  };

  const fetchLogs = async (page = 1) => {
    const r = await api.get('/admin/logs', { params: { page, limit: 20, status: logStatus, action: logAction } });
    setLogs(r.data.data);
    setLogPagination(r.data.pagination);
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all logs older than 30 days?')) return;
    try {
      const r = await api.delete('/admin/logs/clear', { data: { days: 30 } });
      showMsg('success', r.data.message); fetchLogs(1);
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
  };

  const visibleDepts = departments.filter(d => showArchived ? true : !d.is_archived);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      {/* Ambient glows */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-purple-400" /> Super Admin Panel
          </h2>
          <p className="text-zinc-500 text-sm mt-1.5 ml-8">Manage users, departments, and system logs</p>
        </div>

        {message.text && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium tracking-wide flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200
            ${message.type === 'success' ? 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-400' : 'bg-rose-950/40 border border-rose-900/50 text-rose-400'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-zinc-800/80 overflow-x-auto pb-px">
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
                  ${isActive ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}>
                {tab === 'Users' && <><Users className={`w-4 h-4 ${isActive ? 'text-indigo-400' : ''}`} /> Users ({users.length})</>}
                {tab === 'Departments' && <><Building2 className={`w-4 h-4 ${isActive ? 'text-indigo-400' : ''}`} /> Departments ({departments.filter(d => !d.is_archived).length})</>}
                {tab === 'System Logs' && <><ClipboardList className={`w-4 h-4 ${isActive ? 'text-indigo-400' : ''}`} /> System Logs</>}
              </button>
            )
          })}
        </div>

        {/* ── USERS TAB ── */}
        {activeTab === 'Users' && (
          <div>
            {/* Pending Registration Requests Block */}
            {pending.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6 shadow-sm">
                <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  ⏳ Pending Approvals ({pending.length})
                </h3>
                <div className="space-y-2">
                  {pending.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-yellow-100 shadow-sm">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.full_name}</p>
                        <p className="text-xs text-gray-400">{p.email} · <span className="text-indigo-600 font-medium">{p.department}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleDecision(p.id, 'approve')}
                          className="text-xs px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg font-medium transition">
                          Approve
                        </button>
                        <button onClick={() => handleDecision(p.id, 'reject')}
                          className="text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mb-4">
              <button onClick={() => setModal('createUser')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500 active:scale-[0.98]">
                <Plus className="w-4 h-4" /> Create User
              </button>
            </div>
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-zinc-500 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/60 border-b border-zinc-800/80">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-zinc-200">{user.full_name}</td>
                          <td className="px-6 py-4 text-zinc-400">{user.email}</td>
                          <td className="px-6 py-4 text-zinc-400">{user.department}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold ${roleBadge(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold border ${user.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {user.role !== 'Super Admin' && (
                              <div className="flex gap-2">
                                <button onClick={() => { setSelectedUser(user); setUserForm({ full_name: user.full_name, email: user.email, department: user.department, role: user.role, password: '' }); setModal('editUser'); }}
                                  className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-transparent hover:border-blue-500/20" title="Edit User">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setSelectedUser(user); setModal('resetPassword'); }}
                                  className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors border border-transparent hover:border-amber-500/20" title="Reset Password">
                                  <Key className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleToggle(user.id)}
                                  className={`p-1.5 rounded-lg transition-colors border border-transparent ${user.is_active ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/20'}`} title={user.is_active ? 'Deactivate' : 'Activate'}>
                                  <Power className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteUser(user)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors border border-transparent hover:border-rose-500/20" title="Delete User">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DEPARTMENTS TAB ── */}
        {activeTab === 'Departments' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer group">
                <input type="checkbox" checked={showArchived}
                  onChange={e => setShowArchived(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50" />
                <span className="group-hover:text-zinc-300 transition-colors">Show archived departments</span>
              </label>
              <button onClick={() => setModal('createDept')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500 active:scale-[0.98] w-fit">
                <Plus className="w-4 h-4" /> Add Department
              </button>
            </div>
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
              {loading ? <div className="p-12 text-center text-zinc-500 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/60 border-b border-zinc-800/80">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Active Users</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Archived By</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {visibleDepts.map(dept => (
                        <tr key={dept.id} className={`hover:bg-zinc-800/30 transition-colors ${dept.is_archived ? 'opacity-50' : ''}`}>
                          <td className="px-6 py-4 font-medium text-zinc-200 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-zinc-500" /> {dept.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-2.5 py-1 rounded-full font-medium">
                              {dept.user_count} users
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold border ${dept.is_archived ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                              {dept.is_archived ? 'Archived' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-500 text-xs">
                            {dept.is_archived ? (
                              <span>{dept.archived_by_name} <br/><span className="text-zinc-600">{new Date(dept.archived_at).toLocaleDateString()}</span></span>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {!dept.is_archived && (
                                <button onClick={() => { setSelectedDept(dept); setDeptForm({ name: dept.name }); setModal('editDept'); }}
                                  className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-transparent hover:border-blue-500/20" title="Rename">
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => handleArchiveDept(dept)}
                                className={`p-1.5 rounded-lg transition-colors border border-transparent ${dept.is_archived ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/20'}`} title={dept.is_archived ? 'Restore' : 'Archive'}>
                                {dept.is_archived ? <RefreshCw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                              </button>
                              {dept.is_archived && (
                                <button onClick={() => handleDeleteDept(dept)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors border border-transparent hover:border-rose-500/20" title="Permanently Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SYSTEM LOGS TAB ── */}
        {activeTab === 'System Logs' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative">
                <select value={logStatus} onChange={e => { setLogStatus(e.target.value); setLogPage(1); }}
                  className={`${inputClass} sm:w-48 py-2`}>
                  <option value="" className="bg-zinc-900 text-zinc-200">All Statuses</option>
                  <option value="success" className="bg-zinc-900 text-zinc-200">Success</option>
                  <option value="warning" className="bg-zinc-900 text-zinc-200">Warning</option>
                  <option value="error" className="bg-zinc-900 text-zinc-200">Error</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                   <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <input type="text" placeholder="Filter by action..."
                value={logAction} onChange={e => { setLogAction(e.target.value); setLogPage(1); }}
                className={`${inputClass} py-2 flex-1`} />
              <button onClick={handleClearLogs}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Clear Old
              </button>
            </div>

            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/60 border-b border-zinc-800/80">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">IP Address</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {logs.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No logs found matching criteria.</td></tr>
                    ) : logs.map(log => (
                      <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${statusDot(log.status)}`} />
                            <span className={`text-[11px] font-semibold uppercase tracking-wider
                              ${log.status === 'success' ? 'text-emerald-400' : log.status === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>
                              {log.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 px-2 py-1 rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 text-xs max-w-xs truncate">{log.description}</td>
                        <td className="px-6 py-4 text-zinc-300 text-xs">
                          {log.user_name ? (
                            <span>{log.user_name}<br /><span className="text-zinc-500">{log.user_role}</span></span>
                          ) : <span className="text-zinc-600">System</span>}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">{log.ip_address || '—'}</td>
                        <td className="px-6 py-4 text-zinc-500 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={logPagination} onPageChange={setLogPage} />
            </div>
          </div>
        )}

      </div>

      {/* ── MODALS ── */}

      {modal === 'createUser' && (
        <Modal title="Create New User" onClose={closeModal}>
          <form onSubmit={handleCreateUser} className="space-y-5">
            {['full_name','email','password'].map(field => (
              <div key={field}>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{field.replace('_',' ')}</label>
                <input type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  required value={userForm[field]}
                  onChange={e => setUserForm({ ...userForm, [field]: e.target.value })}
                  className={inputClass} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Role</label>
              <div className="relative">
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className={inputClass}>
                  <option value="Staff" className="bg-zinc-900 text-zinc-200">Staff</option>
                  <option value="Admin" className="bg-zinc-900 text-zinc-200">Admin</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-4 h-4" /></div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Department</label>
              <div className="relative">
                <select required value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })} className={inputClass}>
                  <option value="" className="bg-zinc-900 text-zinc-500">-- Select --</option>
                  {deptNames.filter(d => d !== 'System Administrator').map(d => <option key={d} value={d} className="bg-zinc-900 text-zinc-200">{d}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500 active:scale-[0.98]">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-medium py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center backdrop-blur-md">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'editUser' && (
        <Modal title={`Edit — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleEditUser} className="space-y-5">
            {['full_name','email'].map(field => (
              <div key={field}>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{field.replace('_',' ')}</label>
                <input type={field === 'email' ? 'email' : 'text'} required value={userForm[field]}
                  onChange={e => setUserForm({ ...userForm, [field]: e.target.value })}
                  className={inputClass} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Role</label>
              <div className="relative">
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className={inputClass}>
                  <option value="Staff" className="bg-zinc-900 text-zinc-200">Staff</option>
                  <option value="Admin" className="bg-zinc-900 text-zinc-200">Admin</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-4 h-4" /></div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Department</label>
              <div className="relative">
                <select required value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })} className={inputClass}>
                  <option value="" className="bg-zinc-900 text-zinc-500">-- Select --</option>
                  {deptNames.filter(d => d !== 'System Administrator').map(d => <option key={d} value={d} className="bg-zinc-900 text-zinc-200">{d}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500 active:scale-[0.98]">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-medium py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center backdrop-blur-md">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'resetPassword' && (
        <Modal title={`Reset Password — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">New Password</label>
              <input type="password" required minLength={6} value={resetPass.password}
                onChange={e => setResetPass({ ...resetPass, password: e.target.value })}
                className={inputClass} placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Confirm Password</label>
              <input type="password" required minLength={6} value={resetPass.confirm}
                onChange={e => setResetPass({ ...resetPass, confirm: e.target.value })}
                className={inputClass} placeholder="Repeat password" />
            </div>
            <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-medium py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 border border-amber-500 active:scale-[0.98]">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-medium py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center backdrop-blur-md">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'createDept' && (
        <Modal title="Add Department" onClose={closeModal}>
          <form onSubmit={handleCreateDept} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Department Name</label>
              <input type="text" required value={deptForm.name}
                onChange={e => setDeptForm({ name: e.target.value })}
                className={inputClass} placeholder="e.g. Legal Affairs" />
            </div>
            <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500 active:scale-[0.98]">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Department'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-medium py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center backdrop-blur-md">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'editDept' && (
        <Modal title={`Rename — ${selectedDept?.name}`} onClose={closeModal}>
          <form onSubmit={handleEditDept} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">New Name</label>
              <input type="text" required value={deptForm.name}
                onChange={e => setDeptForm({ name: e.target.value })}
                className={inputClass} />
            </div>
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              This will automatically update the department name for all currently associated users and documents.
            </p>
            <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500 active:scale-[0.98]">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-medium py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center backdrop-blur-md">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default AdminPage;