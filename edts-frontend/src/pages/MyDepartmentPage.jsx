// src/pages/MyDepartmentPage.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
      </div>
      {children}
    </div>
  </div>
);

const MyDepartmentPage = () => {
  const { user }              = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [modal,   setModal]   = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form,    setForm]    = useState({ full_name: '', email: '', password: '' });
  const [resetPass, setResetPass] = useState({ password: '', confirm: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dept/my-department/users');
      setUsers(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const closeModal = () => {
    setModal(null); setSelectedUser(null);
    setForm({ full_name: '', email: '', password: '' });
    setResetPass({ password: '', confirm: '' });
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.post('/dept/my-department/users', form);
      showMsg('success', 'Staff account created.'); closeModal(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.put(`/dept/my-department/users/${selectedUser.id}`, form);
      showMsg('success', 'User updated.'); closeModal(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPass.password !== resetPass.confirm) return showMsg('error', 'Passwords do not match.');
    setFormLoading(true);
    try {
      await api.patch(`/dept/my-department/users/${selectedUser.id}/password`, { password: resetPass.password });
      showMsg('success', 'Password reset.'); closeModal();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/dept/my-department/users/${id}/toggle`);
      showMsg('success', res.data.message); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Failed.'); }
  };

  const staffOnly = users.filter(u => u.role === 'Staff');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🏢 My Department</h2>
          <p className="text-gray-500 text-sm mt-1">
            Managing Staff in <span className="font-semibold text-blue-700">{user?.department}</span>
          </p>
        </div>

        {message.text && (
          <div className={`px-4 py-3 rounded-lg mb-5 text-sm font-medium
            ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Total Staff</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{staffOnly.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{staffOnly.filter(u => u.is_active).length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-red-400">
            <p className="text-sm text-gray-500">Inactive</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{staffOnly.filter(u => !u.is_active).length}</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={() => setModal('create')}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
            + Add Staff
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : staffOnly.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No staff in your department yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Email</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Joined</th>
                    <th className="px-5 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staffOnly.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4 font-medium text-gray-800">{u.full_name}</td>
                      <td className="px-5 py-4 text-gray-500">{u.email}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => { setSelectedUser(u); setForm({ full_name: u.full_name, email: u.email, password: '' }); setModal('edit'); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                            Edit
                          </button>
                          <button onClick={() => { setSelectedUser(u); setModal('resetPassword'); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition">
                            Reset PW
                          </button>
                          <button onClick={() => handleToggle(u.id)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg transition ${u.is_active ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                            {u.is_active ? 'Deactivate' : 'Activate'}
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

      {/* Create Modal */}
      {modal === 'create' && (
        <Modal title="Add Staff Member" onClose={closeModal}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" required value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juan dela Cruz" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="staff@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required minLength={6} value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min. 6 characters" />
            </div>
            <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
              Staff will be assigned to <span className="font-medium text-blue-600">{user?.department}</span>
            </p>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
                {formLoading ? 'Creating...' : 'Create Staff'}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && (
        <Modal title={`Edit — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" required value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

      {/* Reset Password Modal */}
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

    </div>
  );
};

export default MyDepartmentPage;