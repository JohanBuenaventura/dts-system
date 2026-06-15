// src/pages/MyDepartmentPage.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Users, Check, X, UserPlus, Edit, Key, Power, 
  Loader2, ChevronDown, UserCheck, AlertCircle, ShieldAlert 
} from 'lucide-react';

// ── Shared Dark Input Class ──
const inputClass = "w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 appearance-none";

// ── Glassmorphic Modal Component ──
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-in fade-in duration-200">
    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-bold text-zinc-100">{title}</h3>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-xl font-bold line-none">×</button>
      </div>
      {children}
    </div>
  </div>
);

// ── Stat Card Component ──
const StatCard = ({ label, value, borderColor, icon: Icon, iconColor }) => (
  <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-lg shadow-black/20 flex items-center justify-between group transition-all hover:border-zinc-700/80 hover:bg-zinc-900/60">
    <div>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-zinc-100 mt-1.5">{value ?? '—'}</p>
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
      showMsg('success', `User registration request successfully ${decision}ed.`);
      fetchUsers(); 
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Action execution failed.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.post('/dept/my-department/users', form);
      showMsg('success', 'Staff account created successfully.'); closeModal(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Creation failed.'); }
    finally { setFormLoading(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      await api.put(`/dept/my-department/users/${selectedUser.id}`, form);
      showMsg('success', 'Staff information updated.'); closeModal(); fetchUsers();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Update failed.'); }
    finally { setFormLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPass.password !== resetPass.confirm) return showMsg('error', 'Passwords do not match.');
    setFormLoading(true);
    try {
      await api.patch(`/dept/my-department/users/${selectedUser.id}/password`, { password: resetPass.password });
      showMsg('success', 'User password updated successfully.'); closeModal();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Password reset failed.'); }
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
      
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">My Department</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-2 font-medium">
              Managing authorized system staff roles in <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 font-semibold">{user?.department}</span>
            </p>
          </div>
          
          <button onClick={() => setModal('create')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg border border-indigo-500 active:scale-[0.98] self-start sm:self-center">
            <UserPlus className="w-3.5 h-3.5" /> Add New Staff
          </button>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium tracking-wide flex items-center gap-2 border animate-in fade-in slide-in-from-top-1 duration-200
            ${message.type === 'success' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400' : 'bg-rose-950/40 border-rose-900/50 text-rose-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${message.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {message.text}
          </div>
        )}

        {/* Department Pending Approvals Notice */}
        {pending.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 mb-8 backdrop-blur-md">
            <h3 className="font-semibold text-amber-400 text-sm mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Pending Registrations ({pending.length})
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {pending.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-zinc-900/30 rounded-xl px-4 py-3 border border-zinc-800/60 backdrop-blur-xl">
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{p.full_name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{p.email}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleDecision(p.id, 'approve')}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs transition duration-200 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => handleDecision(p.id, 'reject')}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs transition duration-200 flex items-center gap-1 font-medium">
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Staff Accounts" value={staffOnly.length} borderColor="border-zinc-700" iconColor="text-zinc-400" icon={Users} />
          <StatCard label="Active Personnel" value={staffOnly.filter(u => u.is_active).length} borderColor="border-emerald-900/50" iconColor="text-emerald-400" icon={UserCheck} />
          <StatCard label="Deactivated Slots" value={staffOnly.filter(u => !u.is_active).length} borderColor="border-rose-900/50" iconColor="text-rose-400" icon={Power} />
        </div>

        {/* Table Board Container */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : staffOnly.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <Users className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-zinc-400 text-sm font-medium">No operational staff accounts listed yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-zinc-900/40 border-b border-zinc-800/60">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Operational Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Enrolled Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {staffOnly.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-zinc-200">{u.full_name}</td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${u.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-500 font-medium">{new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setSelectedUser(u); setForm({ full_name: u.full_name, email: u.email, password: '' }); setModal('edit'); }}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-transparent hover:border-blue-500/20 hover:bg-blue-500/20 transition-colors" title="Edit Profile">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setSelectedUser(u); setModal('resetPassword'); }}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-transparent hover:border-amber-500/20 hover:bg-amber-500/20 transition-colors" title="Reset Password">
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleToggle(u.id)}
                            className={`p-1.5 rounded-lg border border-transparent transition-colors ${u.is_active ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/20'}`} title={u.is_active ? 'Deactivate Account' : 'Activate Account'}>
                            <Power className="w-3.5 h-3.5" />
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

      {/* ── MODALS SECTION ── */}
      {modal === 'create' && (
        <Modal title="Add Department Staff" onClose={closeModal}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
              <input type="text" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className={inputClass} placeholder="Juan dela Cruz" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="staff@company.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
              <input type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={inputClass} placeholder="••••••••" />
            </div>
            <div className="text-xs text-zinc-500 bg-zinc-950/40 px-3 py-2 border border-zinc-800/60 rounded-xl font-medium">
              Staff record will be auto-allocated to: <span className="font-semibold text-indigo-400">{user?.department}</span>
            </div>
            <div className="flex gap-2 pt-2 border-t border-zinc-800/60">
              <button type="submit" disabled={formLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-xs">
                {formLoading ? 'Creating...' : 'Enroll Account'}
              </button>
              <button type="button" onClick={closeModal} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition text-xs">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'edit' && (
        <Modal title={`Modify — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
              <input type="text" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
            <div className="flex gap-2 pt-2 border-t border-zinc-800/60">
              <button type="submit" disabled={formLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-xs">
                {formLoading ? 'Saving...' : 'Commit Changes'}
              </button>
              <button type="button" onClick={closeModal} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition text-xs">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'resetPassword' && (
        <Modal title={`Force Key Restructure — ${selectedUser?.full_name}`} onClose={closeModal}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">New Password</label>
              <input type="password" required minLength={6} value={resetPass.password} onChange={e => setResetPass({ ...resetPass, password: e.target.value })} className={inputClass} placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Confirm Password</label>
              <input type="password" required minLength={6} value={resetPass.confirm} onChange={e => setResetPass({ ...resetPass, confirm: e.target.value })} className={inputClass} placeholder="Repeat password string" />
            </div>
            <div className="flex gap-2 pt-2 border-t border-zinc-800/60">
              <button type="submit" disabled={formLoading} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-xs">
                {formLoading ? 'Resetting...' : 'Execute Reset'}
              </button>
              <button type="button" onClick={closeModal} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition text-xs">
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