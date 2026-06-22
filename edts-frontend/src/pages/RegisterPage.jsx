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
  ChevronDown,
  Eye,
  EyeOff 
} from 'lucide-react';

const DEPARTMENTS = [
  'Registrar', 'Finance', 'HR', 'IT', 'Academic Affairs',
  'Student Affairs', 'Research', 'Procurement', 'Administration',
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '', department: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    // Client-side Password Match Verification
    if (form.password !== form.confirm_password) {
      setError('Password entries do not match. Please verify your security key.');
      return;
    }

    setLoading(true);
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

  const inputClass = "w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 appearance-none";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-900">
      
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-100/60 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[400px] z-10 animate-in fade-in duration-300 my-8">
        
        {/* Brand Registry Header */}
        <div className="flex flex-col items-center text-center mb-6 group">
          <div className="h-12 w-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm transition-all duration-300 group-hover:border-indigo-300 group-hover:shadow-indigo-500/10">
            <UserPlus className="w-5 h-5 text-gray-500 transition-colors group-hover:text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mt-4">Enroll Registry Slot</h1>
          <p className="text-gray-500 text-xs mt-1.5 font-medium">
            Requested clearance target structure defaults to: <span className="text-gray-700 bg-gray-100 border border-gray-200 font-mono font-bold px-1.5 py-0.5 rounded-md">Staff</span>
          </p>
        </div>

        {/* Card Component Form Layout */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xl shadow-gray-200/50">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl mb-5 text-xs font-bold tracking-wide flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-5 text-xs font-semibold leading-relaxed flex items-start gap-2 animate-in fade-in duration-200 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5 animate-pulse" /> <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Full Identity Name</label>
              <input type="text" name="full_name" value={form.full_name} onChange={handleChange} required className={inputClass} placeholder="Juan dela Cruz" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Corporate Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required className={inputClass} placeholder="name@company.com" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Target Department Mapping</label>
              <div className="relative">
                <select name="department" value={form.department} onChange={handleChange} required className={inputClass}>
                  <option value="" className="text-gray-500">-- Select Cluster Branch --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d} className="text-gray-900">{d}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-3.5 h-3.5" /></div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Initialize Passphrase Security Key</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  value={form.password} 
                  onChange={handleChange} 
                  required 
                  minLength={6} 
                  className={`${inputClass} pr-10`} 
                  placeholder="Min. 6 alphanumeric hashes" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Confirm Passphrase Key</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  name="confirm_password" 
                  value={form.confirm_password} 
                  onChange={handleChange} 
                  required 
                  minLength={6} 
                  className={`${inputClass} pr-10`} 
                  placeholder="Verify hash integrity" 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || success} className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-xl text-xs transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 group shadow-lg shadow-gray-900/20 active:scale-[0.98] mt-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
              ) : success ? (
                <><span>Enrolled Node Successfully</span><CheckCircle2 className="w-4 h-4 text-emerald-400" /></>
              ) : (
                <><span className="tracking-tight font-bold">Deploy Registry Node</span><ArrowRight className="w-4 h-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6 font-medium">
          Node registry active?{' '}
          <Link to="/login" className="text-gray-900 hover:text-indigo-600 font-bold transition underline underline-offset-4 decoration-gray-300 hover:decoration-indigo-600">Sign in terminal</Link>
        </p>

      </div>
    </div>
  );
};

export default RegisterPage;