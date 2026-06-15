// src/pages/AdminPage.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { 
  ShieldAlert, Users, Building2, ClipboardList, Plus, 
  Trash2, Edit, Key, Power, Archive, RefreshCw, AlertCircle, 
  CheckCircle2, X, ChevronLeft, ChevronRight, Loader2, ChevronDown, Check
} from 'lucide-react';

const TABS = ['Users', 'Departments', 'System Logs'];
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
  const map = { success: 'bg-emerald-400', warning: 'bg-amber-400', error: 'bg-rose-400' };
  return map[status] || 'bg-zinc-400';
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-in fade-in duration-200">
    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-bold text-zinc-100">{title}</h3>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/60 bg-zinc-950/40 backdrop-blur-md">
      <p className="text-xs text-zinc-500 font-medium">
        Page <span className="font-semibold text-zinc-300">{page}</span> of <span className="font-semibold text-zinc-300">{totalPages}</span> · <span className="text-indigo-400 font-semibold">{total}</span> total records
      </p>
      <div className="flex gap-1.5">
        <button onClick={() => onPageChange(page - 1)} disabled={!pagination.hasPrev}
          className="p-1.5 rounded-xl border border-zinc-800 text-zinc-400 bg-zinc-900/20 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center text-xs px-3 font-semibold">
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
        </button>
        <button onClick={() => onPageChange(page + 1)} disabled={!pagination.hasNext}
          className="p-1.5 rounded-xl border border-zinc-800 text-zinc-400 bg-zinc-900/20 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center text-xs px-3 font-semibold">
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
  const [pending,     setPending]     = useState([]); 
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
  const fetchPending     = async () => { const r = await api.get('/admin/pending');     setPending(r.data.data); };

  const fetchAll = async () => {
    setLoading(true);
    try { await Promise.all([fetchUsers(), fetchDepartments(), fetchPending()]); }
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

  const handleDecision = async (id, decision) => {
    try {
      await api.patch(`/admin/pending/${id}`, { decision });
      showMsg('success', `Registration targeted slot has been successfully ${decision}ed.`);
      fetchPending(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Approval processing failure.'); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.post('/admin/users', userForm);
      showMsg('success', 'User node declared successfully.'); closeModal(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Execution error.'); }
    finally { setFormLoading(false); }
  };

  const handleEditUser = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}`, userForm);
      showMsg('success', 'User adjustments committed.'); closeModal(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed updating fields.'); }
    finally { setFormLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPass.password !== resetPass.confirm) return showMsg('error', 'Authentication verification mismatch.');
    setFormLoading(true);
    try {
      await api.patch(`/admin/users/${selectedUser.id}/password`, { password: resetPass.password });
      showMsg('success', 'Forced passphrase key rewritten.'); closeModal();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Error parsing token pass.'); }
    finally { setFormLoading(false); }
  };

  const handleToggle = async (id) => {
    try { const r = await api.patch(`/admin/users/${id}/toggle`); showMsg('success', r.data.message); fetchUsers(); }
    catch (err) { showMsg('error', err.response?.data?.message || 'Toggle validation failure.'); }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Permanently wipe active registry record "${user.full_name}"?`)) return;
    try { const r = await api.delete(`/admin/users/${user.id}`); showMsg('success', r.data.message); fetchUsers(); }
    catch (err) { showMsg('error', err.response?.data?.message || 'Wipe request error.'); }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.post('/admin/departments', deptForm);
      showMsg('success', 'New operational department tracking directory created.'); closeModal(); fetchDepartments();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Declaration error.'); }
    finally { setFormLoading(false); }
  };

  const handleEditDept = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.put(`/admin/departments/${selectedDept.id}`, deptForm);
      showMsg('success', 'Department structural rename propagated.'); closeModal(); fetchAll();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Rename propagation failure.'); }
    finally { setFormLoading(false); }
  };

  const handleArchiveDept = async (dept) => {
    const action = dept.is_archived ? 'restore' : 'archive';
    if (!window.confirm(`Request directory ${action} for department string "${dept.name}"?`)) return;
    try {
      const r = await api.patch(`/admin/departments/${dept.id}/archive`);
      showMsg('success', r.data.message); fetchDepartments();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Archive modification denied.'); }
  };

  const handleDeleteDept = async (dept) => {
    if (!window.confirm(`Hard delete department tracking container "${dept.name}"? This operation cannot be rolled back.`)) return;
    try {
      await api.delete(`/admin/departments/${dept.id}`);
      showMsg('success', 'Department fully purged from data clusters.'); fetchDepartments();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Purge processing denied.'); }
  };

  const fetchLogs = async (page = 1) => {
    const r = await api.get('/admin/logs', { params: { page, limit: 20, status: logStatus, action: logAction } });
    setLogs(r.data.data); setLogPagination(r.data.pagination);
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Purge historical data sequences older than 30 cycles?')) return;
    try {
      const r = await api.delete('/admin/logs/clear', { data: { days: 30 } });
      showMsg('success', r.data.message); fetchLogs(1);
    } catch (err) { showMsg('error', err.response?.data?.message || 'Log scrubbing pipeline failure.'); }
  };

  const visibleDepts = departments.filter(d => showArchived ? true : !d.is_archived);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* Brand Main Cluster Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Super Admin Panel</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-2 font-medium">Root execution workspace for registry validation, cluster modification, and chronological tracing.</p>
        </div>

        {message.text && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium tracking-wide flex items-center gap-2 border animate-in fade-in slide-in-from-top-1 duration-200
            ${message.type === 'success' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400' : 'bg-rose-950/40 border-rose-900/50 text-rose-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${message.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {message.text}
          </div>
        )}

        {/* Tab System Controls Container Row */}
        <div className="flex gap-1.5 mb-6 border-b border-zinc-900 overflow-x-auto pb-px">
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => { setActiveTab(tab); setLogPage(1); }}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 whitespace-nowrap tracking-tight
                  ${isActive ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'}`}>
                {tab === 'Users' && <><Users className="w-3.5 h-3.5" /> Users Ledger ({users.length})</>}
                {tab === 'Departments' && <><Building2 className="w-3.5 h-3.5" /> Departments ({departments.filter(d => !d.is_archived).length})</>}
                {tab === 'System Logs' && <><ClipboardList className="w-3.5 h-3.5" /> Chrono Sequences</>}
              </button>
            )
          })}
        </div>

        {/* ── MODULE BLOCK: USERS ── */}
        {activeTab === 'Users' && (
          <div className="animate-in fade-in duration-200">
            {pending.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 mb-6 backdrop-blur-md">
                <h3 className="font-semibold text-amber-400 text-sm mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Global Verification Queues ({pending.length})
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {pending.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-zinc-900/30 rounded-xl px-4 py-3 border border-zinc-800/60 backdrop-blur-xl">
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">{p.full_name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{p.email} · <span className="text-indigo-400 font-mono font-semibold">{p.department}</span></p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleDecision(p.id, 'approve')} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs transition font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Grant</button>
                        <button onClick={() => handleDecision(p.id, 'reject')} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs transition font-semibold flex items-center gap-1"><X className="w-3.5 h-3.5" /> Deny</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mb-4">
              <button onClick={() => setModal('createUser')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold border border-indigo-500 shadow-md shadow-indigo-950 transition active:scale-[0.98] flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Declare User Node</button>
            </div>
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
              {loading ? <div className="p-12 text-center text-zinc-500 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left table-auto border-collapse">
                    <thead>
                      <tr className="bg-zinc-900/40 border-b border-zinc-800/60">
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Department Link</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Role Access</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-zinc-200">{user.full_name}</td>
                          <td className="px-6 py-4 text-sm text-zinc-400">{user.email}</td>
                          <td className="px-6 py-4 text-xs text-zinc-400 font-medium">{user.department}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${roleBadge(user.role)}`}>{user.role}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold border ${user.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {user.role !== 'Super Admin' ? (
                              <div className="flex justify-end gap-1.5">
                                <button onClick={() => { setSelectedUser(user); setUserForm({ full_name: user.full_name, email: user.email, department: user.department, role: user.role, password: '' }); setModal('editUser'); }} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Modify Node"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { setSelectedUser(user); setModal('resetPassword'); }} className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors" title="Rewrite Core Token"><Key className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleToggle(user.id)} className={`p-1.5 rounded-lg transition-colors ${user.is_active ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`} title="Toggle Operations"><Power className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteUser(user)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors" title="Purge Record"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : <span className="text-[10px] text-zinc-600 font-mono pr-4 select-none">SYSTEM ROOT</span>}
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

        {/* ── MODULE BLOCK: DEPARTMENTS ── */}
        {activeTab === 'Departments' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 cursor-pointer group">
                <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded border-zinc-800 bg-zinc-950 text-indigo-500 focus:ring-indigo-500/20" />
                <span className="group-hover:text-zinc-300 transition-colors">Include archived indices</span>
              </label>
              <button onClick={() => setModal('createDept')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold border border-indigo-500 transition shadow-md shadow-indigo-950 active:scale-[0.98] flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Expand Department Directory</button>
            </div>
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
              {loading ? <div className="p-12 text-center text-zinc-500 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left table-auto border-collapse">
                    <thead>
                      <tr className="bg-zinc-900/40 border-b border-zinc-800/60">
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Department Tracking Scope</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active Allocations</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Index Status</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Archived Origin</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60">
                      {visibleDepts.map(dept => (
                        <tr key={dept.id} className={`hover:bg-zinc-900/30 transition-colors ${dept.is_archived ? 'opacity-45' : ''}`}>
                          <td className="px-6 py-4 text-sm font-semibold text-zinc-200 flex items-center gap-2"><Building2 className="w-4 h-4 text-zinc-600" /> {dept.name}</td>
                          <td className="px-6 py-4"><span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] px-2.5 py-0.5 rounded-lg font-bold">{dept.user_count} allocated</span></td>
                          <td className="px-6 py-4"><span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold border ${dept.is_archived ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{dept.is_archived ? 'Archived' : 'Active'}</span></td>
                          <td className="px-6 py-4 text-zinc-500 text-xs font-medium">{dept.is_archived ? <span>{dept.archived_by_name} <br/><span className="text-zinc-600 font-mono text-[10px]">{new Date(dept.archived_at).toLocaleDateString()}</span></span> : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-1.5">
                              {!dept.is_archived && <button onClick={() => { setSelectedDept(dept); setDeptForm({ name: dept.name }); setModal('editDept'); }} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Modify Index Mapping"><Edit className="w-3.5 h-3.5" /></button>}
                              <button onClick={() => handleArchiveDept(dept)} className={`p-1.5 rounded-lg transition-colors ${dept.is_archived ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`} title={dept.is_archived ? 'Restore Mapping' : 'Isolate Archive'}>{dept.is_archived ? <RefreshCw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}</button>
                              {dept.is_archived && <button onClick={() => handleDeleteDept(dept)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors" title="Purge Mapping"><Trash2 className="w-3.5 h-3.5" /></button>}
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

        {/* ── MODULE BLOCK: SYSTEM LOGS (CHRONO) ── */}
        {activeTab === 'System Logs' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row gap-2 mb-4 bg-zinc-900/20 border border-zinc-900 p-3 rounded-xl backdrop-blur-md">
              <div className="relative">
                <select value={logStatus} onChange={e => { setLogStatus(e.target.value); setLogPage(1); }} className={`${inputClass} md:w-44 py-2`}>
                  <option value="" className="bg-zinc-950 text-zinc-400">All Event Sequences</option>
                  <option value="success" className="bg-zinc-950 text-emerald-400">Success</option>
                  <option value="warning" className="bg-zinc-950 text-amber-400">Warning</option>
                  <option value="error" className="bg-zinc-950 text-rose-400">Failure</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-3.5 h-3.5" /></div>
              </div>
              <input type="text" placeholder="Query chronological token matching action string..." value={logAction} onChange={e => { setLogAction(e.target.value); setLogPage(1); }} className={`${inputClass} py-2 flex-1`} />
              <button onClick={handleClearLogs} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 self-start md:self-center whitespace-nowrap"><Trash2 className="w-3.5 h-3.5" /> Prune History</button>
            </div>

            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left table-auto border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/40 border-b border-zinc-800/60">
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sequence Code</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Action Directive</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Execution Payload Metadata</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Operator Identity</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Network Route IP</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Timestamp Mapping</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {logs.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-600 text-xs font-medium">No sequence history matches parameters.</td></tr>
                    ) : logs.map(log => (
                      <tr key={log.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot(log.status)}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${log.status === 'success' ? 'text-emerald-400' : log.status === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>{log.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className="font-mono text-[10px] bg-zinc-950/50 border border-zinc-900 text-indigo-400 px-2 py-0.5 rounded font-semibold">{log.action}</span></td>
                        <td className="px-6 py-4 text-xs text-zinc-400 max-w-xs truncate font-medium">{log.description}</td>
                        <td className="px-6 py-4 text-xs font-medium text-zinc-300">
                          {log.user_name ? <span>{log.user_name}<br /><span className="text-zinc-600 text-[10px] font-semibold uppercase">{log.user_role}</span></span> : <span className="text-zinc-600 font-mono">ROOT_KERN</span>}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">{log.ip_address || '—'}</td>
                        <td className="px-6 py-4 text-xs text-zinc-500 font-medium whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
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

      {/* ── INTERNAL DIALOG MODALS ── */}
      {modal === 'createUser' && (
        <Modal title="Initialize User Registry" onClose={closeModal}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            {['full_name','email','password'].map(f => (
              <div key={f}>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{f.replace('_',' ')}</label>
                <input type={f === 'password' ? 'password' : f === 'email' ? 'email' : 'text'} required value={userForm[f]} onChange={e => setUserForm({ ...userForm, [f]: e.target.value })} className={inputClass} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">System Clearance</label>
              <div className="relative">
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className={inputClass}>
                  <option value="Staff" className="bg-zinc-950">Staff</option>
                  <option value="Admin" className="bg-zinc-950">Admin</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-4 h-4" /></div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Scope Department Map</label>
              <div className="relative">
                <select required value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })} className={inputClass}>
                  <option value="" className="bg-zinc-950 text-zinc-600">-- Select Mapped Token --</option>
                  {deptNames.filter(d => d !== 'System Administrator').map(d => <option key={d} value={d} className="bg-zinc-950">{d}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-zinc-800/60">
              <button type="submit" disabled={formLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition text-xs border border-indigo-500 shadow-md">{formLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Commit Node'}</button>
              <button type="button" onClick={closeModal} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition text-xs">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'editUser' && (
        <Modal title={`Modify Node Parameters — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleEditUser} className="space-y-4">
            {['full_name','email'].map(f => (
              <div key={f}>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{f.replace('_',' ')}</label>
                <input type={f === 'email' ? 'email' : 'text'} required value={userForm[f]} onChange={e => setUserForm({ ...userForm, [f]: e.target.value })} className={inputClass} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Clearance Authorization</label>
              <div className="relative">
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className={inputClass}>
                  <option value="Staff" className="bg-zinc-950">Staff</option>
                  <option value="Admin" className="bg-zinc-950">Admin</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-4 h-4" /></div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Scope Department Map</label>
              <div className="relative">
                <select required value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })} className={inputClass}>
                  <option value="" className="bg-zinc-950 text-zinc-600">-- Select --</option>
                  {deptNames.filter(d => d !== 'System Administrator').map(d => <option key={d} value={d} className="bg-zinc-950">{d}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-zinc-800/60">
              <button type="submit" disabled={formLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition text-xs border border-indigo-500">{formLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Commit Changes'}</button>
              <button type="button" onClick={closeModal} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition text-xs">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'resetPassword' && (
        <Modal title={`Key Override Array — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">New Token Passphrase</label>
              <input type="password" required minLength={6} value={resetPass.password} onChange={e => setResetPass({ ...resetPass, password: e.target.value })} className={inputClass} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Confirm String Entry</label>
              <input type="password" required minLength={6} value={resetPass.confirm} onChange={e => setResetPass({ ...resetPass, confirm: e.target.value })} className={inputClass} placeholder="••••••••" />
            </div>
            <div className="flex gap-2 pt-3 border-t border-zinc-800/60">
              <button type="submit" disabled={formLoading} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl transition text-xs border border-amber-500">{formLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Rewrite Key'}</button>
              <button type="button" onClick={closeModal} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition text-xs">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'createDept' && (
        <Modal title="Initialize Department Directory Mapping" onClose={closeModal}>
          <form onSubmit={handleCreateDept} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Department Unique Title</label>
              <input type="text" required value={deptForm.name} onChange={e => setDeptForm({ name: e.target.value })} className={inputClass} placeholder="e.g. Strategic Planning Division" />
            </div>
            <div className="flex gap-2 pt-3 border-t border-zinc-800/60">
              <button type="submit" disabled={formLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition text-xs border border-indigo-500 shadow-md">Create Directory</button>
              <button type="button" onClick={closeModal} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition text-xs">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'editDept' && (
        <Modal title={`Modify Structural Mapping Index`} onClose={closeModal}>
          <form onSubmit={handleEditDept} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Updated Index String</label>
              <input type="text" required value={deptForm.name} onChange={e => setDeptForm({ name: e.target.value })} className={inputClass} />
            </div>
            <div className="text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex gap-2 font-medium leading-relaxed">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Structural updates will cascade immediately down across matching cluster user keys and active document ledger traces.
            </div>
            <div className="flex gap-2 pt-3 border-t border-zinc-800/60">
              <button type="submit" disabled={formLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition text-xs border border-indigo-500">Cascade Rename</button>
              <button type="button" onClick={closeModal} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition text-xs">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default AdminPage;