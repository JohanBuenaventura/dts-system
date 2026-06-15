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

// ── Glassmorphic Modal Component ──
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in">
    <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/90 rounded-2xl shadow-2xl w-full max-w-md p-6 relative overflow-hidden">
      {/* Subtle top decoration */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
      
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-zinc-100 tracking-tight">{title}</h3>
        <button 
          onClick={onClose} 
          className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ── Redesigned Stat Card ──
const MetricCard = ({ label, value, borderColor, icon: Icon, iconColor }) => (
  <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-lg shadow-black/20 flex items-center justify-between group transition-all hover:border-zinc-700/80 hover:bg-zinc-900/60">
    <div>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-zinc-100 mt-1.5 tracking-tight">{value ?? '0'}</p>
    </div>
    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${borderColor} bg-zinc-950/50 shadow-inner group-hover:scale-105 transition-transform duration-300`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
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

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      {/* Ambient flows to match dashboard */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-indigo-400" />
              Department Management
            </h2>
            <p className="text-zinc-500 text-sm mt-1.5 flex items-center gap-1.5">
              Admin Overview for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-semibold">
                {user?.department}
              </span>
            </p>
          </div>

          <button 
            onClick={() => setModal('create')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500 active:scale-[0.98] self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>

        {/* ── Feedback Banner ── */}
        {message.text && (
          <div className={`px-4 py-3.5 rounded-xl mb-6 text-sm font-medium border flex items-center gap-2.5 backdrop-blur-md animate-fade-in
            ${message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* ── Pending Registration Actions ── */}
        {pending.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 mb-8 shadow-xl">
            <h3 className="font-semibold text-amber-400 mb-4 flex items-center gap-2 text-sm tracking-wide uppercase">
              <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" /> Pending Requests ({pending.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pending.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-zinc-900/50 backdrop-blur-md rounded-xl p-4 border border-zinc-800/60 shadow-inner">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-medium text-zinc-200 truncate">{p.full_name}</p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5 font-mono">{p.email}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleDecision(p.id, 'approve')}
                      className="text-xs px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg font-semibold transition-all"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleDecision(p.id, 'reject')}
                      className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-rose-950/30 hover:text-rose-400 hover:border-rose-900/40 rounded-lg font-medium transition-all"
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
          <MetricCard label="Total Staff" value={staffOnly.length} borderColor="border-zinc-700" iconColor="text-zinc-400" icon={Users} />
          <MetricCard label="Active Status" value={staffOnly.filter(u => u.is_active).length} borderColor="border-emerald-900/50" iconColor="text-emerald-400" icon={UserCheck} />
          <MetricCard label="Suspended" value={staffOnly.filter(u => !u.is_active).length} borderColor="border-rose-900/50" iconColor="text-rose-400" icon={UserX} />
        </div>

        {/* ── Core Table Panel ── */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Synchronizing roster...</span>
            </div>
          ) : staffOnly.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-zinc-400 text-sm">No registered staff users found.</p>
              <p className="text-zinc-600 text-xs mt-1">Add internal users using the actions controller above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-zinc-900/50 border-b border-zinc-800/80 text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Email Address</th>
                    <th className="px-6 py-3.5">Account Status</th>
                    <th className="px-6 py-3.5">Joined Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {staffOnly.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors group">
                      <td className="px-6 py-4 font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors">{u.full_name}</td>
                      <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border uppercase tracking-wider
                          ${u.is_active 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                          {new Date(u.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-1.5 justify-end flex-wrap">
                          <button 
                            onClick={() => { setSelectedUser(u); setForm({ full_name: u.full_name, email: u.email, password: '' }); setModal('edit'); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-300 border border-zinc-700/60 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => { setSelectedUser(u); setModal('resetPassword'); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 border border-zinc-700/60 hover:text-amber-400 hover:border-amber-900/50 transition-all"
                          >
                            Reset PW
                          </button>
                          <button 
                            onClick={() => handleToggle(u.id)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all
                              ${u.is_active 
                                ? 'bg-zinc-900/50 text-rose-400 border-zinc-800 hover:bg-rose-950/20 hover:border-rose-900/40' 
                                : 'bg-zinc-900/50 text-emerald-400 border-zinc-800 hover:bg-emerald-950/20 hover:border-emerald-900/40'}`}
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
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <input 
                type="text" required value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-zinc-700 transition-all"
                placeholder="E.g., Juan dela Cruz" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input 
                type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-zinc-700 transition-all font-mono"
                placeholder="staff@example.com" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Temporary Password</label>
              <input 
                type="password" required minLength={6} value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-zinc-700 transition-all"
                placeholder="Minimum 6 characters" 
              />
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-xs text-zinc-500">
              <Building2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>User will automatically inherit access scope: <b className="text-zinc-300 font-medium">{user?.department}</b></span>
            </div>
            <div className="flex gap-3 pt-3">
              <button 
                type="submit" disabled={formLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white font-medium py-2.5 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {formLoading ? 'Creating account...' : 'Create Staff'}
              </button>
              <button 
                type="button" onClick={closeModal}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {modal === 'edit' && (
        <Modal title={`Modify Roster Profile — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <input 
                type="text" required value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input 
                type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono" 
              />
            </div>
            <div className="flex gap-3 pt-3">
              <button 
                type="submit" disabled={formLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white font-medium py-2.5 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {formLoading ? 'Saving updates...' : 'Save Changes'}
              </button>
              <button 
                type="button" onClick={closeModal}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Reset Password Modal ── */}
      {modal === 'resetPassword' && (
        <Modal title={`Force Credential Reset — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">New Password</label>
              <input 
                type="password" required minLength={6} value={resetPass.password}
                onChange={e => setResetPass({ ...resetPass, password: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Minimum 6 characters" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
              <input 
                type="password" required minLength={6} value={resetPass.confirm}
                onChange={e => setResetPass({ ...resetPass, confirm: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Repeat new password exactly" 
              />
            </div>
            <div className="flex gap-3 pt-3">
              <button 
                type="submit" disabled={formLoading}
                className="flex-1 bg-amber-600 hover:bg-amber-500 border border-amber-500 text-white font-medium py-2.5 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                {formLoading ? 'Resetting password...' : 'Override Password'}
              </button>
              <button 
                type="button" onClick={closeModal}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl text-sm transition-all"
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