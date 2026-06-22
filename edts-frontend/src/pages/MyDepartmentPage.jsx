// src/pages/MyDepartmentPage.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  Plus,
  X,
  Mail,
  Calendar,
  KeyRound,
  Trash2,
  Check,
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';

// ── Light Modal Component ──
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in">
    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-md p-6 relative overflow-hidden">
      {/* Subtle top decoration */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-cyan-500" />
      
      <div className="flex items-center justify-between mb-6 mt-2">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h3>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ── Redesigned Light Metric Card ──
const MetricCard = ({ label, value, borderColor, icon: Icon, iconColor }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-indigo-300 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-extrabold text-gray-900 mt-1.5 tracking-tight">{value ?? '0'}</p>
      </div>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${borderColor} bg-gray-50 shadow-inner group-hover:scale-105 transition-transform duration-300`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

const MyDepartmentPage = () => {
  const { user }              = useAuth();
  const [users,   setUsers]   = useState([]);
  const [pending, setPending] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [modal,   setModal]   = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form,    setForm]    = useState({ full_name: '', email: '', password: '' });
  const [resetPass, setResetPass] = useState({ password: '', confirm: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetchPending = async () => {
    try {
      const res = await api.get('/dept/my-department/pending');
      setPending(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dept/my-department/users');
      setUsers(res.data.data);
      await fetchPending(); 
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

  const handleDecision = async (id, decision) => {
    try {
      await api.patch(`/dept/my-department/pending/${id}`, { decision });
      showMsg('success', `User successfully ${decision}ed.`);
      fetchUsers(); 
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Action failed.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.post('/dept/my-department/users', form);
      showMsg('success', 'Staff account successfully created.'); closeModal(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Creation failed.'); }
    finally { setFormLoading(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.put(`/dept/my-department/users/${selectedUser.id}`, form);
      showMsg('success', 'User configuration updated.'); closeModal(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Update failed.'); }
    finally { setFormLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPass.password !== resetPass.confirm) return showMsg('error', 'Passwords do not match.');
    setFormLoading(true);
    try {
      await api.patch(`/dept/my-department/users/${selectedUser.id}/password`, { password: resetPass.password });
      showMsg('success', 'Password updated successfully.'); closeModal();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Reset failed.'); }
    finally { setFormLoading(false); }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/dept/my-department/users/${id}/toggle`);
      showMsg('success', res.data.message); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Toggle failed.'); }
  };

  const staffOnly = users.filter(u => u.role === 'Staff');

  const inputClass = "w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder-gray-400 transition-all";

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-indigo-500/30 selection:text-indigo-900 relative overflow-x-hidden">
      
      {/* Ambient glows to match light dashboard */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100 blur-[120px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-100/60 blur-[100px] rounded-full" />

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-indigo-600" />
              Department Management
            </h2>
            <p className="text-gray-500 text-sm mt-1.5 flex items-center gap-1.5 font-medium">
              Admin Overview for{' '}
              <span className="bg-gradient-to-r from-gray-900 to-indigo-600 bg-clip-text text-transparent font-bold">
                {user?.department}
              </span>
            </p>
          </div>

          <button 
            onClick={() => setModal('create')}
            className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20 active:scale-[0.98] self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>

        {/* ── Feedback Banner ── */}
        {message.text && (
          <div className={`px-4 py-3.5 rounded-xl mb-6 text-sm font-bold border flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1
            ${message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-red-50 border-red-200 text-red-600'}`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
            {message.text}
          </div>
        )}

        {/* ── Pending Registration Actions ── */}
        {pending.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-2xl p-5 mb-8 shadow-xl shadow-gray-200/50">
            <h3 className="font-bold text-amber-700 mb-4 flex items-center gap-2 text-sm tracking-wide uppercase">
              <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" /> Pending Requests ({pending.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pending.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-bold text-gray-900 truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5 font-mono">{p.email}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleDecision(p.id, 'approve')}
                      className="text-xs px-3 py-1.5 bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-lg font-bold transition-all shadow-sm"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleDecision(p.id, 'reject')}
                      className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg font-bold transition-all shadow-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Internal Department Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <MetricCard label="Total Staff" value={staffOnly.length} borderColor="border-gray-200" iconColor="text-gray-500" icon={Users} />
          <MetricCard label="Active Status" value={staffOnly.filter(u => u.is_active).length} borderColor="border-emerald-200" iconColor="text-emerald-500" icon={UserCheck} />
          <MetricCard label="Suspended" value={staffOnly.filter(u => !u.is_active).length} borderColor="border-red-200" iconColor="text-red-500" icon={UserX} />
        </div>

        {/* ── Core Table Panel ── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Synchronizing roster...</span>
            </div>
          ) : staffOnly.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                <Users className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-gray-900 font-bold text-sm">No registered staff users found.</p>
              <p className="text-gray-500 text-xs mt-1 font-medium">Add internal users using the actions controller above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email Address</th>
                    <th className="px-6 py-4">Account Status</th>
                    <th className="px-6 py-4">Joined Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staffOnly.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4 font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{u.full_name}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs font-medium">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border
                          ${u.is_active 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                            : 'bg-red-100 text-red-700 border-red-200'}`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-mono font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(u.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-1.5 justify-end flex-wrap">
                          <button 
                            onClick={() => { setSelectedUser(u); setForm({ full_name: u.full_name, email: u.email, password: '' }); setModal('edit'); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-gray-600 border border-gray-200 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all font-bold shadow-sm"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => { setSelectedUser(u); setModal('resetPassword'); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-gray-600 border border-gray-200 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-all font-bold shadow-sm"
                          >
                            Reset PW
                          </button>
                          <button 
                            onClick={() => handleToggle(u.id)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg font-bold border transition-all shadow-sm
                              ${u.is_active 
                                ? 'bg-white text-red-600 border-gray-200 hover:bg-red-50 hover:border-red-200' 
                                : 'bg-white text-emerald-600 border-gray-200 hover:bg-emerald-50 hover:border-emerald-200'}`}
                          >
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

      </main>

      {/* ── Create Modal ── */}
      {modal === 'create' && (
        <Modal title="Add New Staff Member" onClose={closeModal}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Full Name</label>
              <input 
                type="text" required value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className={inputClass}
                placeholder="E.g., Juan dela Cruz" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Email Address</label>
              <input 
                type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className={`${inputClass} font-mono`}
                placeholder="staff@example.com" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Temporary Password</label>
              <input 
                type="password" required minLength={6} value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className={inputClass}
                placeholder="Minimum 6 characters" 
              />
            </div>
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-700">
              <Building2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span>User will automatically inherit access scope: <b className="text-indigo-900 font-bold">{user?.department}</b></span>
            </div>
            <div className="flex gap-3 pt-3">
              <button 
                type="submit" disabled={formLoading}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                {formLoading ? 'Creating account...' : 'Create Staff'}
              </button>
              <button 
                type="button" onClick={closeModal}
                className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {modal === 'edit' && (
        <Modal title={`Modify Roster Profile`} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Full Name</label>
              <input 
                type="text" required value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className={inputClass} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Email Address</label>
              <input 
                type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className={`${inputClass} font-mono`} 
              />
            </div>
            <div className="flex gap-3 pt-3">
              <button 
                type="submit" disabled={formLoading}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                {formLoading ? 'Saving updates...' : 'Save Changes'}
              </button>
              <button 
                type="button" onClick={closeModal}
                className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Reset Password Modal ── */}
      {modal === 'resetPassword' && (
        <Modal title={`Force Credential Reset`} onClose={closeModal}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">New Password</label>
              <input 
                type="password" required minLength={6} value={resetPass.password}
                onChange={e => setResetPass({ ...resetPass, password: e.target.value })}
                className={inputClass}
                placeholder="Minimum 6 characters" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Confirm New Password</label>
              <input 
                type="password" required minLength={6} value={resetPass.confirm}
                onChange={e => setResetPass({ ...resetPass, confirm: e.target.value })}
                className={inputClass}
                placeholder="Repeat new password exactly" 
              />
            </div>
            <div className="flex gap-3 pt-3">
              <button 
                type="submit" disabled={formLoading}
                className="flex-1 bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                {formLoading ? 'Resetting password...' : 'Override Password'}
              </button>
              <button 
                type="button" onClick={closeModal}
                className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
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