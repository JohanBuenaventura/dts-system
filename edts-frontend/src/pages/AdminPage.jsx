// src/pages/AdminPage.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const TABS = ['Users', 'Departments', 'System Logs'];

const roleBadge = (role) => {
  const map = {
    'Super Admin': 'bg-purple-100 text-purple-700',
    'Admin':       'bg-blue-100 text-blue-700',
    'Staff':       'bg-gray-100 text-gray-600',
  };
  return map[role] || 'bg-gray-100 text-gray-600';
};

const statusDot = (status) => {
  const map = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error:   'bg-red-500',
  };
  return map[status] || 'bg-gray-400';
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
      </div>
      {children}
    </div>
  </div>
);

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Page {page} of {totalPages} · {pagination.total} total
      </p>
      <div className="flex gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={!pagination.hasPrev}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
          ‹ Prev
        </button>
        <button onClick={() => onPageChange(page + 1)} disabled={!pagination.hasNext}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
          Next ›
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
  const fetchLogs        = async (page = 1) => {
    const r = await api.get('/admin/logs', { params: { page, limit: 20, status: logStatus, action: logAction } });
    setLogs(r.data.data);
    setLogPagination(r.data.pagination);
  };

  const fetchAll = async () => {
    setLoading(true);
    try { await Promise.all([fetchUsers(), fetchDepartments()]); }
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

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all logs older than 30 days?')) return;
    try {
      const r = await api.delete('/admin/logs/clear', { data: { days: 30 } });
      showMsg('success', r.data.message); fetchLogs(1);
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
  };

  const visibleDepts = departments.filter(d => showArchived ? true : !d.is_archived);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">👑 Super Admin Panel</h2>
          <p className="text-gray-500 text-sm mt-1">Manage users, departments, and system logs</p>
        </div>

        {message.text && (
          <div className={`px-4 py-3 rounded-lg mb-5 text-sm font-medium
            ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition
                ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === 'Users'        && `👤 Users (${users.length})`}
              {tab === 'Departments'  && `🏢 Departments (${departments.filter(d => !d.is_archived).length})`}
              {tab === 'System Logs'  && `📋 System Logs`}
            </button>
          ))}
        </div>

        {/* ── USERS TAB ── */}
        {activeTab === 'Users' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setModal('createUser')}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
                + Create User
              </button>
            </div>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-5 py-3 text-left">Name</th>
                        <th className="px-5 py-3 text-left">Email</th>
                        <th className="px-5 py-3 text-left">Department</th>
                        <th className="px-5 py-3 text-left">Role</th>
                        <th className="px-5 py-3 text-left">Status</th>
                        <th className="px-5 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-4 font-medium text-gray-800">{user.full_name}</td>
                          <td className="px-5 py-4 text-gray-500">{user.email}</td>
                          <td className="px-5 py-4 text-gray-500">{user.department}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {user.role !== 'Super Admin' && (
                              <div className="flex gap-2 flex-wrap">
                                <button onClick={() => { setSelectedUser(user); setUserForm({ full_name: user.full_name, email: user.email, department: user.department, role: user.role, password: '' }); setModal('editUser'); }}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">Edit</button>
                                <button onClick={() => { setSelectedUser(user); setModal('resetPassword'); }}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition">Reset PW</button>
                                <button onClick={() => handleToggle(user.id)}
                                  className={`text-xs px-2.5 py-1.5 rounded-lg transition ${user.is_active ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                                  {user.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button onClick={() => handleDeleteUser(user)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">Delete</button>
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
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <input type="checkbox" checked={showArchived}
                  onChange={e => setShowArchived(e.target.checked)}
                  className="rounded border-gray-300" />
                Show archived departments
              </label>
              <button onClick={() => setModal('createDept')}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
                + Add Department
              </button>
            </div>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-5 py-3 text-left">Department</th>
                        <th className="px-5 py-3 text-left">Active Users</th>
                        <th className="px-5 py-3 text-left">Status</th>
                        <th className="px-5 py-3 text-left">Archived By</th>
                        <th className="px-5 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visibleDepts.map(dept => (
                        <tr key={dept.id} className={`hover:bg-gray-50 transition ${dept.is_archived ? 'opacity-60' : ''}`}>
                          <td className="px-5 py-4 font-medium text-gray-800">
                            🏢 {dept.name}
                            {dept.is_archived && <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Archived</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
                              {dept.user_count} users
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${dept.is_archived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                              {dept.is_archived ? 'Archived' : 'Active'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-400 text-xs">
                            {dept.is_archived ? (
                              <span>{dept.archived_by_name} · {new Date(dept.archived_at).toLocaleDateString()}</span>
                            ) : '—'}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              {!dept.is_archived && (
                                <button onClick={() => { setSelectedDept(dept); setDeptForm({ name: dept.name }); setModal('editDept'); }}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                                  Rename
                                </button>
                              )}
                              <button onClick={() => handleArchiveDept(dept)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg transition ${dept.is_archived ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}>
                                {dept.is_archived ? 'Restore' : 'Archive'}
                              </button>
                              {dept.is_archived && (
                                <button onClick={() => handleDeleteDept(dept)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                                  Delete
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
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <select value={logStatus} onChange={e => { setLogStatus(e.target.value); setLogPage(1); }}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
              <input type="text" placeholder="Filter by action..."
                value={logAction} onChange={e => { setLogAction(e.target.value); setLogPage(1); }}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1" />
              <button onClick={handleClearLogs}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition">
                🗑 Clear Old Logs
              </button>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left">Action</th>
                      <th className="px-5 py-3 text-left">Description</th>
                      <th className="px-5 py-3 text-left">User</th>
                      <th className="px-5 py-3 text-left">IP Address</th>
                      <th className="px-5 py-3 text-left">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No logs found.</td></tr>
                    ) : logs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${statusDot(log.status)}`} />
                            <span className={`text-xs font-medium capitalize
                              ${log.status === 'success' ? 'text-green-600' : log.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                              {log.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-600 max-w-xs truncate">{log.description}</td>
                        <td className="px-5 py-4 text-gray-500 text-xs">
                          {log.user_name ? (
                            <span>{log.user_name}<br /><span className="text-gray-400">{log.user_role}</span></span>
                          ) : <span className="text-gray-300">System</span>}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-gray-400">{log.ip_address || '—'}</td>
                        <td className="px-5 py-4 text-gray-400 text-xs">{new Date(log.created_at).toLocaleString()}</td>
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
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field.replace('_',' ')}</label>
                <input type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  required value={userForm[field]}
                  onChange={e => setUserForm({ ...userForm, [field]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select required value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select --</option>
                {deptNames.filter(d => d !== 'System Administrator').map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
                {formLoading ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'editUser' && (
        <Modal title={`Edit — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleEditUser} className="space-y-4">
            {['full_name','email'].map(field => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field.replace('_',' ')}</label>
                <input type={field === 'email' ? 'email' : 'text'} required value={userForm[field]}
                  onChange={e => setUserForm({ ...userForm, [field]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select required value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select --</option>
                {deptNames.filter(d => d !== 'System Administrator').map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
                {formLoading ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'resetPassword' && (
        <Modal title={`Reset Password — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" required minLength={6} value={resetPass.password}
                onChange={e => setResetPass({ ...resetPass, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" required minLength={6} value={resetPass.confirm}
                onChange={e => setResetPass({ ...resetPass, confirm: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Repeat password" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
                {formLoading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'createDept' && (
        <Modal title="Add Department" onClose={closeModal}>
          <form onSubmit={handleCreateDept} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
              <input type="text" required value={deptForm.name}
                onChange={e => setDeptForm({ name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Legal Affairs" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
                {formLoading ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'editDept' && (
        <Modal title={`Rename — ${selectedDept?.name}`} onClose={closeModal}>
          <form onSubmit={handleEditDept} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Name</label>
              <input type="text" required value={deptForm.name}
                onChange={e => setDeptForm({ name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <p className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              ⚠️ This will update all users and documents in this department.
            </p>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
                {formLoading ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition">
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