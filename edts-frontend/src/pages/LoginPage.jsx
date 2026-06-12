// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
// Install lucide-react for beautiful, clean icons: npm i lucide-react
import { FileText, Loader2, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
  e.preventDefault();
  e.stopPropagation();

  setError('');
  setLoading(true);

  try {
    const res = await api.post('/auth/login', form);
    login(res.data.user, res.data.token);
    navigate('/dashboard');
  } catch (err) {
    const msg = err.response?.data?.message || 'Invalid email or password.';
    setError(msg);
    // Clear only the password — keep email so user doesn't retype it
    setForm((prev) => ({ ...prev, password: '' }));
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[420px] z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8 group">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner shadow-zinc-800/50 transition-all duration-300 group-hover:border-indigo-500/50 group-hover:shadow-indigo-500/10">
            <FileText className="w-5 h-5 text-zinc-400 transition-colors group-hover:text-indigo-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight mt-4">
            Welcome back to <span className="bg-gradient-to-r from-zinc-100 via-zinc-200 to-indigo-400 bg-clip-text text-transparent">DTS</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-1.5 font-medium">
            Document Tracking System & Ledger
          </p>
        </div>

        {/* Card Component */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl shadow-black/40">
          
          {error && (
            <div className="bg-red-950/40 border border-red-900/50 text-red-400 px-4 py-3 rounded-xl mb-6 text-xs font-medium tracking-wide flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                autoComplete="email"
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                placeholder="name@company.com"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 group shadow-lg shadow-zinc-950/20 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-700" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-zinc-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-900" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Navigation */}
        <p className="text-center text-xs text-zinc-500 mt-6 font-medium">
          New to the platform?{' '}
          <Link to="/register" className="text-zinc-300 hover:text-indigo-400 transition-colors font-semibold underline underline-offset-4 decoration-zinc-700 hover:decoration-indigo-400">
            Create an account
          </Link>
        </p>

      </div>
    </div>
  );
};

export default LoginPage;