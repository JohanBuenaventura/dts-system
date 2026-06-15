// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { UserPlus, Loader2, ArrowRight, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';

const DEPARTMENTS = [
  'Registrar', 'Finance', 'HR', 'IT', 'Academic Affairs',
  'Student Affairs', 'Research', 'Procurement', 'Administration',
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', department: '' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess('Registry allocation successfully added to index arrays. Deployment pending supervisor authorization.');
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Node declaration rejected from registry pipeline.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-zinc-900/20 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-900/40 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200 appearance-none";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[380px] z-10 animate-in fade-in duration-300">
        
        {/* Brand Registry Header */}
        <div className="flex flex-col items-center text-center mb-6 group">
          <div className="h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
            <UserPlus className="w-4 h-4 text-zinc-500 transition group-hover:text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight mt-3.5">Enroll Registry Slot</h1>
          <p className="text-zinc-500 text-xs mt-1.5 font-medium">
            Requested clearance target structure defaults to: <span className="text-zinc-300 bg-zinc-900 border border-zinc-800 font-mono font-bold px-1.5 py-0.5 rounded-md">Staff</span>
          </p>
        </div>

        {/* Card Component Form Layout */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          {error && (
            <div className="bg-rose-950/40 border border-rose-900/50 text-rose-400 px-4 py-2.5 rounded-xl mb-5 text-xs font-semibold tracking-wide flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 px-4 py-3 rounded-xl mb-5 text-xs font-semibold leading-relaxed flex items-start gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" /> <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Full Identity Name</label>
              <input type="text" name="full_name" value={form.full_name} onChange={handleChange} required className={inputClass} placeholder="Juan dela Cruz" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Corporate Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required className={inputClass} placeholder="name@company.com" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Target Department Mapping</label>
              <div className="relative">
                <select name="department" value={form.department} onChange={handleChange} required className={inputClass}>
                  <option value="" className="bg-zinc-950 text-zinc-600">-- Select Cluster Branch --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-zinc-950 text-zinc-200">{d}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-3.5 h-3.5" /></div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Initialize Passphrase Security Key</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} className={inputClass} placeholder="Min. 6 alphanumeric hashes" />
            </div>

            <button type="submit" disabled={loading || success} className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-xs transition duration-200 disabled:opacity-40 flex items-center justify-center gap-2 group shadow-lg active:scale-[0.98] mt-2">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-800" /> : success ? <><span>Enrolled Node Successfully</span><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></> : <><span className="tracking-tight font-bold">Deploy Registry Node</span><ArrowRight className="w-3.5 h-3.5 text-zinc-500 transition-transform group-hover:translate-x-0.5" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6 font-medium">
          Node registry active?{' '}
          <Link to="/login" className="text-zinc-400 hover:text-indigo-400 font-bold transition underline underline-offset-4 decoration-zinc-800">Sign in terminal</Link>
        </p>

      </div>
    </div>
  );
};

export default RegisterPage;