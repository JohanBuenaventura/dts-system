// src/pages/AdminPage.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const TABS = ['Users', 'Departments'];

const roleBadge = (role) => {
  const map = {
    'Super Admin': 'bg-purple-100 text-purple-700',
    'Admin':       'bg-blue-100 text-blue-700',
    'Staff':       'bg-gray-100 text-gray-600',
  };
  return map[role] || 'bg-gray-100 text-gray-600';
};

// ─── MODAL COMPONENT ──────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <button onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
      </div>
      {children}
    </div>
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const AdminPage = () => {
  const [activeTab,    setActiveTab]    = useState('Users');
  const [users,        setUsers]        = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [message,      setMessage]      = useState({ type: '', text: '' });

  // Modal states
  const [modal, setModal] = useState(null);
  // null | 'createUser' | 'editUser' | 'resetPassword' | 'createDept' | 'editDept'

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);

  // Form states
  const [userForm, setUserForm] = useState({
    full_name: '', email: '', password: '', role: 'Staff', department: '',
  });
  const [deptForm,  setDeptForm]  = useState({ name: '' });
  const [resetPass, setResetPass] = useState({ password: '', confirm: '' });
  const [formLoading, setFormLoading] = useState(false);

  // ── Fetch data
  const fetchUsers = async () => {
    const res = await api.get('/admin/users');
    setUsers(res.data.data);
  };

  const fetchDepartments = async () => {
    const res = await api.get('/admin/departments');
    setDepartments(res.data.data);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchDepartments()]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const closeModal = () => {
    setModal(null);
    setSelectedUser(null);
    setSelectedDept(null);
    setUserForm({ full_name: '', email: '', password: '', role: 'Staff', department: '' });
    setDeptForm({ name: '' });
    setResetPass({ password: '', confirm: '' });
  };

  // ── User Actions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/admin/users', userForm);
      showMsg('success', 'User created successfully.');
      closeModal();
      fetchUsers();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to create user.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}`, userForm);
      showMsg('success', 'User updated successfully.');
      closeModal();
      fetchUsers();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to update user.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPass.password !== resetPass.confirm) {
      return showMsg('error', 'Passwords do not match.');
    }
    setFormLoading(true);
    try {
      await api.patch(`/admin/users/${selectedUser.id}/password`, { password: resetPass.password });
      showMsg('success', 'Password reset successfully.');
      closeModal();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/admin/users/${id}/toggle`);
      showMsg('success', res.data.message);
      fetchUsers();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete user "${user.full_name}"? This cannot be undone.`)) return;
    try {
      const res = await api.delete(`/admin/users/${user.id}`);
      showMsg('success', res.data.message);
      fetchUsers();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to delete user.');
    }
  };

  // ── Department Actions
  const handleCreateDept = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/admin/departments', deptForm);
      showMsg('success', 'Department created successfully.');
      closeModal();
      fetchDepartments();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to create department.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditDept = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.put(`/admin/departments/${selectedDept.id}`, deptForm);
      showMsg('success', 'Department updated successfully.');
      closeModal();
      fetchAll();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to update department.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteDept = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;
    try {
      await api.delete(`/admin/departments/${dept.id}`);
      showMsg('success', 'Department deleted successfully.');
      fetchAll();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to delete department.');
    }
  };

  const deptNames = departments.map(d => d.name);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">👑 Super Admin Panel</h2>
          <p className="text-gray-500 text-sm mt-1">Manage users, departments, and system settings</p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`px-4 py-3 rounded-lg mb-5 text-sm font-medium
            ${message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition
                ${activeTab === tab
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === 'Users' ? `👤 Users (${users.length})` : `🏢 Departments (${departments.length})`}
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
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading users...</div>
              ) : (
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
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                              ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {user.role !== 'Super Admin' && (
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setUserForm({
                                      full_name:  user.full_name,
                                      email:      user.email,
                                      department: user.department,
                                      role:       user.role,
                                      password:   '',
                                    });
                                    setModal('editUser');
                                  }}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                                  Edit
                                </button>
                                <button
                                  onClick={() => { setSelectedUser(user); setModal('resetPassword'); }}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition">
                                  Reset PW
                                </button>
                                <button
                                  onClick={() => handleToggle(user.id)}
                                  className={`text-xs px-2.5 py-1.5 rounded-lg transition
                                    ${user.is_active
                                      ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                      : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                                  {user.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                                  Delete
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
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setModal('createDept')}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
                + Add Department
              </button>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading departments...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-5 py-3 text-left">Department Name</th>
                        <th className="px-5 py-3 text-left">Active Users</th>
                        <th className="px-5 py-3 text-left">Created At</th>
                        <th className="px-5 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {departments.map(dept => (
                        <tr key={dept.id} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-4 font-medium text-gray-800">🏢 {dept.name}</td>
                          <td className="px-5 py-4">
                            <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
                              {dept.user_count} users
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-400">
                            {new Date(dept.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedDept(dept);
                                  setDeptForm({ name: dept.name });
                                  setModal('editDept');
                                }}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                                Rename
                              </button>
                              <button
                                onClick={() => handleDeleteDept(dept)}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                                Delete
                              </button>
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

      </div>

      {/* ── MODALS ── */}

      {/* Create User */}
      {modal === 'createUser' && (
        <Modal title="Create New User" onClose={closeModal}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" required value={userForm.full_name}
                onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juan dela Cruz" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={userForm.email}
                onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required minLength={6} value={userForm.password}
                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={userForm.role}
                onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select required value={userForm.department}
                onChange={e => setUserForm({ ...userForm, department: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select Department --</option>
                {deptNames.filter(d => d !== 'System Administrator').map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
                {formLoading ? 'Creating...' : 'Create User'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User */}
      {modal === 'editUser' && (
        <Modal title={`Edit — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" required value={userForm.full_name}
                onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={userForm.email}
                onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={userForm.role}
                onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select required value={userForm.department}
                onChange={e => setUserForm({ ...userForm, department: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select Department --</option>
                {deptNames.filter(d => d !== 'System Administrator').map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password */}
      {modal === 'resetPassword' && (
        <Modal title={`Reset Password — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" required minLength={6}
                value={resetPass.password}
                onChange={e => setResetPass({ ...resetPass, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" required minLength={6}
                value={resetPass.confirm}
                onChange={e => setResetPass({ ...resetPass, confirm: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Repeat new password" />
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

      {/* Create Department */}
      {modal === 'createDept' && (
        <Modal title="Add New Department" onClose={closeModal}>
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
                {formLoading ? 'Creating...' : 'Create Department'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Department */}
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
              ⚠️ Renaming will update all users and documents assigned to this department.
            </p>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
                {formLoading ? 'Saving...' : 'Save Name'}
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