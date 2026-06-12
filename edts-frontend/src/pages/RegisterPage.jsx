// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { 
  UserPlus, 
  Loader2, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown 
} from 'lucide-react';

const DEPARTMENTS = [
  'Registrar', 'Finance', 'HR', 'IT', 'Academic Affairs',
  'Student Affairs', 'Research', 'Procurement', 'Administration',
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', department: '',
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Shared input styling class
  const inputClass = "w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 appearance-none";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 sm:px-6 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[420px] z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8 group">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner shadow-zinc-800/50 transition-all duration-300 group-hover:border-indigo-500/50 group-hover:shadow-indigo-500/10">
            <UserPlus className="w-5 h-5 text-zinc-400 transition-colors group-hover:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mt-4">
            Create an Account
          </h1>
          <p className="text-zinc-500 text-sm mt-1.5 font-medium">
            You will be registered as <span className="text-zinc-300 bg-zinc-800/50 px-2 py-0.5 rounded-md">Staff</span>
          </p>
        </div>

        {/* Card Component */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl shadow-black/40">
          
          {error && (
            <div className="bg-rose-950/40 border border-rose-900/50 text-rose-400 px-4 py-3 rounded-xl mb-6 text-xs font-medium tracking-wide flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 px-4 py-3 rounded-xl mb-6 text-xs font-medium tracking-wide flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="Juan dela Cruz"
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="name@company.com"
              />
            </div>

            {/* Department Select */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Department
              </label>
              <div className="relative">
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  required
                  className={inputClass}
                >
                  <option value="" className="bg-zinc-900 text-zinc-500">-- Select Department --</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d} className="bg-zinc-900 text-zinc-200">{d}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                   <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className={inputClass}
                placeholder="Min. 6 characters"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 group shadow-lg shadow-zinc-950/20 active:scale-[0.98] mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-700" />
              ) : success ? (
                <>
                  <span>Success</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 text-zinc-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-900" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Navigation */}
        <p className="text-center text-xs text-zinc-500 mt-6 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-zinc-300 hover:text-indigo-400 transition-colors font-semibold underline underline-offset-4 decoration-zinc-700 hover:decoration-indigo-400">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
};

export default RegisterPage;