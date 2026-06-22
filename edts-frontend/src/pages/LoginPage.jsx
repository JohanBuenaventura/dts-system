// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { 
  FileText, 
  Loader2, 
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';

const LoginPage = () => {
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
      setForm((prev) => ({ ...prev, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50 font-sans selection:bg-indigo-500/30 selection:text-indigo-900">
      
      {/* =========================================
          LEFT PANEL: Branding & Visuals 
          ========================================= */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center border-r border-gray-200 bg-white">
        
        {/* Soft Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-100 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-100/60 blur-[100px] rounded-full pointer-events-none" />

        {/* Branding Content */}
        <div className="z-10 flex flex-col items-center text-center max-w-md px-8">
          <div className="h-16 w-16 mb-6 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center shadow-inner shadow-gray-200/50">
            <FileText className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Welcome to <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-indigo-600 bg-clip-text text-transparent">DTS</span>
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Your centralized Document Tracking System & Ledger. Streamline your workflow and keep everything organized in one place.
          </p>
        </div>
      </div>

      {/* =========================================
          RIGHT PANEL: Login Form
          ========================================= */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 sm:px-12 relative bg-gray-50">
        
        <div className="w-full max-w-[420px] z-10">
          
          {/* Mobile-only header */}
          <div className="flex flex-col items-center text-center mb-8 lg:hidden group">
            <div className="h-12 w-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm transition-all duration-300 group-hover:border-indigo-300 group-hover:shadow-indigo-500/10">
              <FileText className="w-5 h-5 text-gray-500 transition-colors group-hover:text-indigo-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight mt-4">
              Welcome back to <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-indigo-600 bg-clip-text text-transparent">DTS</span>
            </h1>
            <p className="text-gray-500 text-xs mt-1.5 font-medium">
              Document Tracking System & Ledger
            </p>
          </div>

          {/* Form Header (Desktop) */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
            <p className="text-gray-500 text-sm mt-2 font-medium">Enter your credentials to access your account.</p>
          </div>

          {/* Form Card Component */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl shadow-gray-200/50">
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-xs font-semibold tracking-wide flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  placeholder="name@company.com"
                />
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 group shadow-lg shadow-gray-900/20 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Navigation */}
          <p className="text-center text-xs text-gray-500 mt-6 font-medium">
            New to the platform?{' '}
            <Link to="/register" className="text-gray-900 hover:text-indigo-600 transition-colors font-bold underline underline-offset-4 decoration-gray-300 hover:decoration-indigo-600">
              Create an account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;