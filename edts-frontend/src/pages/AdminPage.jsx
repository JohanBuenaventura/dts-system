// src/pages/AdminPage.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { 
  ShieldAlert, Users, Building2, ClipboardList, Plus, 
  Trash2, Edit, Key, Power, Archive, RefreshCw, AlertCircle, 
  CheckCircle2, X, ChevronLeft, ChevronRight, Loader2, ChevronDown, FileText, Tags
} from 'lucide-react';

const TABS = ['Users', 'Departments', 'Document Types', 'Documents', 'System Logs'];

const inputClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 appearance-none";

const roleBadge = (role) => ({
  'Super Admin': 'bg-purple-100 text-purple-700 border border-purple-200',
  'Admin':       'bg-blue-100 text-blue-700 border border-blue-200',
  'Staff':       'bg-gray-100 text-gray-600 border border-gray-200',
}[role] || 'bg-gray-100 text-gray-600 border border-gray-200');

const statusDot = (status) => ({
  success: 'bg-emerald-500', warning: 'bg-amber-500', error: 'bg-rose-500',
}[status] || 'bg-gray-400');

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-in fade-in duration-200">
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-md p-6 relative">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
      </div>
      {children}
    </div>
  </div>
);

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
      <p className="text-xs text-gray-500 font-medium">
        Page <span className="text-gray-900">{page}</span> of <span className="text-gray-900">{totalPages}</span> · {pagination.total} total
      </p>
      <div className="flex gap-1.5">
        <button onClick={() => onPageChange(page - 1)} disabled={!pagination.hasPrev} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={() => onPageChange(page + 1)} disabled={!pagination.hasNext} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

const AdminPage = () => {
  const [activeTab,   setActiveTab]   = useState('Users');
  const [users,       setUsers]       = useState([]);
  const [departments, setDepartments] = useState([]);
  const [docTypes,    setDocTypes]    = useState([]); 
  const [documents,   setDocuments]   = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [pending,     setPending]     = useState([]);
  
  const [logPagination, setLogPagination] = useState(null);
  const [logPage,     setLogPage]     = useState(1);
  const [logStatus,   setLogStatus]   = useState('');
  const [logAction,   setLogAction]   = useState('');
  
  const [loading,     setLoading]     = useState(true);
  const [message,     setMessage]     = useState({ type: '', text: '' });
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedTypes, setShowArchivedTypes] = useState(false);
  const [modal,       setModal]       = useState(null);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState(null);
  
  const [userForm,    setUserForm]    = useState({ full_name: '', email: '', password: '', role: 'Staff', department: '' });
  const [deptForm,    setDeptForm]    = useState({ name: '' });
  const [docTypeForm, setDocTypeForm] = useState({ name: '' });
  const [resetPass,   setResetPass]   = useState({ password: '', confirm: '' });
  const [formLoading, setFormLoading] = useState(false);

  const deptNames = departments.filter(d => !d.is_archived).map(d => d.name);
  const visibleDepts = departments.filter(d => showArchived ? true : !d.is_archived);
  const visibleTypes = docTypes.filter(k => showArchivedTypes ? true : !k.is_archived);

  // ── Fetchers
  const fetchUsers       = async () => { const r = await api.get('/admin/users');       setUsers(r.data.data); };
  const fetchDepartments = async () => { const r = await api.get('/admin/departments'); setDepartments(r.data.data); };
  const fetchDocTypes    = async () => { const r = await api.get('/admin/document-types'); setDocTypes(r.data.data); };
  const fetchPending     = async () => { const r = await api.get('/admin/pending');     setPending(r.data.data); };
  const fetchDocs        = async () => { const r = await api.get('/admin/documents');   setDocuments(r.data.data); };

  const fetchAll = async () => {
    setLoading(true);
    try { await Promise.all([fetchUsers(), fetchDepartments(), fetchDocTypes(), fetchPending(), fetchDocs()]); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (activeTab === 'System Logs') fetchLogs(logPage); }, [activeTab, logPage, logStatus, logAction]);

  const showMsg = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage({ type: '', text: '' }), 4000); };
  const closeModal = () => {
    setModal(null); setSelectedUser(null); setSelectedDept(null); setSelectedDocType(null);
    setUserForm({ full_name: '', email: '', password: '', role: 'Staff', department: '' });
    setDeptForm({ name: '' }); setDocTypeForm({ name: '' }); setResetPass({ password: '', confirm: '' });
  };

  const handleDecision = async (id, decision) => {
    try { await api.patch(`/admin/pending/${id}`, { decision }); showMsg('success', `User ${decision}d successfully.`); fetchPending(); fetchUsers(); }
    catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
  };

  // ── Document Types Handlers
  const handleCreateDocType = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try { await api.post('/admin/document-types', docTypeForm); showMsg('success', 'Document Type created.'); closeModal(); fetchDocTypes(); }
    catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleEditDocType = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try { await api.put(`/admin/document-types/${selectedDocType.id}`, docTypeForm); showMsg('success', 'Document Type renamed.'); closeModal(); fetchDocTypes(); }
    catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleArchiveDocType = async (docType) => {
    const action = docType.is_archived ? 'restore' : 'archive';
    if (!window.confirm(`${action === 'archive' ? 'Archive' : 'Restore'} document type "${docType.name}"?`)) return;
    try { const r = await api.patch(`/admin/document-types/${docType.id}/archive`); showMsg('success', r.data.message); fetchDocTypes(); }
    catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
  };

  const handleDeleteDocType = async (docType) => {
    if (!window.confirm(`Permanently delete "${docType.name}"? This cannot be undone.`)) return;
    try { await api.delete(`/admin/document-types/${docType.id}`); showMsg('success', 'Deleted.'); fetchDocTypes(); }
    catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
  };

  // ── User / Dept / Doc Handlers
  const handleCreateUser = async (e) => { e.preventDefault(); setFormLoading(true); try { await api.post('/admin/users', userForm); showMsg('success', 'User created.'); closeModal(); fetchUsers(); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } finally { setFormLoading(false); } };
  const handleEditUser = async (e) => { e.preventDefault(); setFormLoading(true); try { await api.put(`/admin/users/${selectedUser.id}`, userForm); showMsg('success', 'User updated.'); closeModal(); fetchUsers(); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } finally { setFormLoading(false); } };
  const handleResetPassword = async (e) => { e.preventDefault(); if (resetPass.password !== resetPass.confirm) return showMsg('error', 'Passwords do not match.'); setFormLoading(true); try { await api.patch(`/admin/users/${selectedUser.id}/password`, { password: resetPass.password }); showMsg('success', 'Password reset.'); closeModal(); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } finally { setFormLoading(false); } };
  const handleToggle = async (id) => { try { const r = await api.patch(`/admin/users/${id}/toggle`); showMsg('success', r.data.message); fetchUsers(); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } };
  const handleDeleteUser = async (user) => { if (!window.confirm(`Delete "${user.full_name}"?`)) return; try { const r = await api.delete(`/admin/users/${user.id}`); showMsg('success', r.data.message); fetchUsers(); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } };
  const handleCreateDept = async (e) => { e.preventDefault(); setFormLoading(true); try { await api.post('/admin/departments', deptForm); showMsg('success', 'Department created.'); closeModal(); fetchDepartments(); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } finally { setFormLoading(false); } };
  const handleEditDept = async (e) => { e.preventDefault(); setFormLoading(true); try { await api.put(`/admin/departments/${selectedDept.id}`, deptForm); showMsg('success', 'Department renamed.'); closeModal(); fetchAll(); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } finally { setFormLoading(false); } };
  const handleArchiveDept = async (dept) => { const action = dept.is_archived ? 'restore' : 'archive'; if (!window.confirm(`${action === 'archive' ? 'Archive' : 'Restore'} department "${dept.name}"?`)) return; try { const r = await api.patch(`/admin/departments/${dept.id}/archive`); showMsg('success', r.data.message); fetchDepartments(); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } };
  const handleDeleteDept = async (dept) => { if (!window.confirm(`Permanently delete "${dept.name}"? This cannot be undone.`)) return; try { await api.delete(`/admin/departments/${dept.id}`); showMsg('success', 'Department deleted.'); fetchDepartments(); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } };
  const handleDeleteDoc = async (doc) => { if (!window.confirm(`Permanently delete document "${doc.tracking_code} - ${doc.title}"?`)) return; try { await api.delete(`/admin/documents/${doc.id}`); showMsg('success', 'Document deleted.'); fetchDocs(); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } };
  
  const fetchLogs = async (page = 1) => { try { const r = await api.get('/admin/logs', { params: { page, limit: 20, status: logStatus, action: logAction } }); setLogs(r.data.data); setLogPagination(r.data.pagination); } catch(err) { console.error(err); } };
  const handleClearLogs = async () => { if (!window.confirm('Clear all logs older than 30 days?')) return; try { const r = await api.delete('/admin/logs/clear', { data: { days: 30 } }); showMsg('success', r.data.message); fetchLogs(1); } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); } };

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-blue-500/30 selection:text-blue-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-100 rounded-lg"><ShieldAlert className="w-6 h-6 text-blue-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Super Admin Panel</h2>
          </div>
          <p className="text-gray-500 text-sm ml-11">Manage system configurations, users, and monitoring</p>
        </div>

        {message.text && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 shadow-sm
            ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto pb-px">
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
                  ${isActive ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                {tab === 'Users'          && <><Users className={`w-4 h-4 ${isActive ? 'text-blue-600' : ''}`} /> Users ({users.length})</>}
                {tab === 'Departments'    && <><Building2 className={`w-4 h-4 ${isActive ? 'text-blue-600' : ''}`} /> Departments ({departments.filter(d => !d.is_archived).length})</>}
                {tab === 'Document Types' && <><Tags className={`w-4 h-4 ${isActive ? 'text-blue-600' : ''}`} /> Document Types ({docTypes.filter(k => !k.is_archived).length})</>}
                {tab === 'Documents'      && <><FileText className={`w-4 h-4 ${isActive ? 'text-blue-600' : ''}`} /> Documents ({documents.length})</>}
                {tab === 'System Logs'    && <><ClipboardList className={`w-4 h-4 ${isActive ? 'text-blue-600' : ''}`} /> System Logs</>}
              </button>
            );
          })}
        </div>

        {/* ── USERS TAB ── */}
        {activeTab === 'Users' && (
           <div className="animate-in fade-in duration-300">
             {/* Pending Approvals */}
             {pending.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 shadow-sm">
                <h3 className="font-semibold text-amber-800 mb-4 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4" /> Pending Approvals ({pending.length})
                </h3>
                <div className="space-y-2">
                  {pending.map(p => (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100 shadow-sm gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.full_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.email} · <span className="text-blue-600 font-medium">{p.department}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleDecision(p.id, 'approve')} className="text-xs px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg font-medium transition-colors border border-emerald-200 flex-1 sm:flex-none text-center">Approve</button>
                        <button onClick={() => handleDecision(p.id, 'reject')} className="text-xs px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg font-medium transition-colors border border-rose-200 flex-1 sm:flex-none text-center">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
             <div className="flex justify-end mb-4"><button onClick={() => setModal('createUser')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"><Plus className="w-4 h-4" /> Create User</button></div>
             <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
               {loading ? <div className="p-12 text-center text-gray-500 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50 border-b border-gray-200">
                       <tr>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">User Details</th>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Role & Dept</th>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {users.map(user => (
                         <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4"><span className="font-medium text-gray-900 block">{user.full_name}</span><span className="text-xs text-gray-500">{user.email}</span></td>
                           <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold mb-1.5 inline-block ${roleBadge(user.role)}`}>{user.role}</span><span className="block text-xs text-gray-500">{user.department}</span></td>
                           <td className="px-6 py-4"><span className={`flex items-center gap-1.5 text-xs font-medium ${user.is_active ? 'text-emerald-600' : 'text-rose-600'}`}><span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />{user.is_active ? 'Active' : 'Inactive'}</span></td>
                           <td className="px-6 py-4">
                             {user.role !== 'Super Admin' && (
                               <div className="flex gap-2">
                                 <button onClick={() => { setSelectedUser(user); setUserForm({ full_name: user.full_name, email: user.email, department: user.department, role: user.role, password: '' }); setModal('editUser'); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Edit className="w-4 h-4" /></button>
                                 <button onClick={() => { setSelectedUser(user); setModal('resetPassword'); }} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><Key className="w-4 h-4" /></button>
                                 <button onClick={() => handleToggle(user.id)} className={`p-1.5 rounded-lg transition-colors ${user.is_active ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}><Power className="w-4 h-4" /></button>
                                 <button onClick={() => handleDeleteUser(user)} className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>
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
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" /> Show archived departments</label>
              <button onClick={() => setModal('createDept')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Add Department</button>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
               {loading ? <div className="p-12 text-center text-gray-500 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50 border-b border-gray-200">
                       <tr>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Department Name</th>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Active Users</th>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {visibleDepts.map(dept => (
                         <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /> {dept.name}</td>
                           <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-semibold">{dept.user_count || 0} users</span></td>
                           <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${dept.is_archived ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>{dept.is_archived ? 'Archived' : 'Active'}</span></td>
                           <td className="px-6 py-4">
                              {dept.name !== 'System Administrator' && (
                                <div className="flex gap-2">
                                  {!dept.is_archived && <button onClick={() => { setSelectedDept(dept); setDeptForm({ name: dept.name }); setModal('editDept'); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Edit className="w-4 h-4" /></button>}
                                  <button onClick={() => handleArchiveDept(dept)} className={`p-1.5 rounded-lg ${dept.is_archived ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{dept.is_archived ? <RefreshCw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}</button>
                                  {dept.is_archived && <button onClick={() => handleDeleteDept(dept)} className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>}
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

        {/* ── DOCUMENT TYPES TAB (NEW) ── */}
        {activeTab === 'Document Types' && (
          <div className="animate-in fade-in duration-300">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
                <input type="checkbox" checked={showArchivedTypes} onChange={e => setShowArchivedTypes(e.target.checked)} className="rounded border-gray-300 text-blue-600 w-4 h-4" />
                Show archived types
              </label>
              <button onClick={() => setModal('createDocType')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Document Type
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
               {loading ? <div className="p-12 text-center text-gray-500 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50 border-b border-gray-200">
                       <tr>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Document Type</th>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                         <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {visibleTypes.map(type => (
                         <tr key={type.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2"><Tags className="w-4 h-4 text-gray-400" /> {type.name}</td>
                           <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${type.is_archived ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>{type.is_archived ? 'Archived' : 'Active'}</span></td>
                           <td className="px-6 py-4">
                              <div className="flex gap-2">
                                {!type.is_archived && <button onClick={() => { setSelectedDocType(type); setDocTypeForm({ name: type.name }); setModal('editDocType'); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Edit className="w-4 h-4" /></button>}
                                <button onClick={() => handleArchiveDocType(type)} className={`p-1.5 rounded-lg ${type.is_archived ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{type.is_archived ? <RefreshCw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}</button>
                                {type.is_archived && <button onClick={() => handleDeleteDocType(type)} className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>}
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

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'Documents' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {loading ? <div className="p-12 text-center text-gray-500 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Tracking Code</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Title / Type</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Location</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Urgency</th>
                        <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {documents.map(doc => (
                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-blue-600">{doc.tracking_code}</td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900 block">{doc.title}</span>
                            <span className="text-xs text-gray-500">{doc.document_type || doc.document_kind}</span>
                          </td>
                          <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-semibold border ${doc.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>{doc.status}</span></td>
                          <td className="px-6 py-4 text-gray-600 text-xs">{doc.current_location_dept}</td>
                          <td className="px-6 py-4"><span className={`text-xs font-medium px-2 py-1 rounded-md ${doc.urgency === 'Highly Urgent' ? 'bg-red-100 text-red-700' : doc.urgency === 'Urgent' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{doc.urgency}</span></td>
                          <td className="px-6 py-4">
                            <button onClick={() => handleDeleteDoc(doc)} className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                      {documents.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No documents found.</td></tr>}
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
                <select value={logStatus} onChange={e => { setLogStatus(e.target.value); setLogPage(1); }} className={`${inputClass} pr-10 w-full sm:w-48`}>
                  <option value="">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"><ChevronDown className="w-4 h-4" /></div>
              </div>
              <input type="text" placeholder="Filter by action..." value={logAction} onChange={e => { setLogAction(e.target.value); setLogPage(1); }} className={`${inputClass} flex-1`} />
              <button onClick={handleClearLogs} className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><Trash2 className="w-4 h-4" /> Clear Logs</button>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Status & Action</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">User</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-gray-500 uppercase">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${statusDot(log.status)}`} />
                            <span className={`text-xs font-semibold uppercase ${log.status === 'success' ? 'text-emerald-600' : log.status === 'warning' ? 'text-amber-600' : 'text-rose-600'}`}>{log.status}</span>
                          </div>
                          <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{log.action}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{log.description}</td>
                        <td className="px-6 py-4 text-xs">{log.user_name ? <><span className="text-gray-900 font-medium block">{log.user_name}</span><span className="text-gray-500">{log.user_role}</span></> : <span className="text-gray-400 italic">System</span>}</td>
                        <td className="px-6 py-4 text-gray-500 text-xs">{new Date(log.created_at).toLocaleDateString()} <br/>{new Date(log.created_at).toLocaleTimeString()}</td>
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
          <form onSubmit={handleCreateUser} className="space-y-4">
            {['full_name','email','password'].map(field => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">{field.replace('_',' ')}</label>
                <input type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  required value={userForm[field]} onChange={e => setUserForm({ ...userForm, [field]: e.target.value })}
                  className={inputClass} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Role</label>
                <div className="relative">
                  <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className={inputClass}>
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Department</label>
                <div className="relative">
                  <select required value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })} className={inputClass}>
                    <option value="">-- Select --</option>
                    {deptNames.filter(d => d !== 'System Administrator').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="submit" disabled={formLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm">
                {formLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'editUser' && (
        <Modal title={`Edit User — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleEditUser} className="space-y-4">
            {['full_name','email'].map(field => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">{field.replace('_',' ')}</label>
                <input type={field === 'email' ? 'email' : 'text'} required value={userForm[field]} onChange={e => setUserForm({ ...userForm, [field]: e.target.value })} className={inputClass} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Role</label>
                <div className="relative">
                  <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className={inputClass}>
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Department</label>
                <div className="relative">
                  <select required value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })} className={inputClass}>
                    <option value="">-- Select --</option>
                    {deptNames.filter(d => d !== 'System Administrator').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="submit" disabled={formLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm">
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'resetPassword' && (
        <Modal title={`Reset Password — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">New Password</label>
              <input type="password" required minLength={6} value={resetPass.password} onChange={e => setResetPass({ ...resetPass, password: e.target.value })} className={inputClass} placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Confirm Password</label>
              <input type="password" required minLength={6} value={resetPass.confirm} onChange={e => setResetPass({ ...resetPass, confirm: e.target.value })} className={inputClass} placeholder="Repeat new password" />
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="submit" disabled={formLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm">
                {formLoading ? 'Resetting...' : 'Force Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'createDept' && (
        <Modal title="Add Department" onClose={closeModal}>
          <form onSubmit={handleCreateDept} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Department Name</label>
              <input type="text" required value={deptForm.name} onChange={e => setDeptForm({ name: e.target.value })} className={inputClass} placeholder="e.g. Legal Affairs" />
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="submit" disabled={formLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm">
                {formLoading ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'editDept' && (
        <Modal title={`Rename — ${selectedDept?.name}`} onClose={closeModal}>
          <form onSubmit={handleEditDept} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">New Name</label>
              <input type="text" required value={deptForm.name} onChange={e => setDeptForm({ name: e.target.value })} className={inputClass} />
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              This will automatically update the department name for all currently associated users and documents.
            </p>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="submit" disabled={formLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm">
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'createDocType' && (
        <Modal title="Add Document Type" onClose={closeModal}>
          <form onSubmit={handleCreateDocType} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Type Name</label>
              <input type="text" required value={docTypeForm.name} onChange={e => setDocTypeForm({ name: e.target.value })} className={inputClass} placeholder="e.g. Letter of Approval" />
            </div>
            <button type="submit" disabled={formLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm">
              {formLoading ? 'Creating...' : 'Create Type'}
            </button>
          </form>
        </Modal>
      )}

      {modal === 'editDocType' && (
        <Modal title={`Rename — ${selectedDocType?.name}`} onClose={closeModal}>
          <form onSubmit={handleEditDocType} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">New Name</label>
              <input type="text" required value={docTypeForm.name} onChange={e => setDocTypeForm({ name: e.target.value })} className={inputClass} />
            </div>
            <button type="submit" disabled={formLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm">
              {formLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}

    </div>
  );
};
export default AdminPage;