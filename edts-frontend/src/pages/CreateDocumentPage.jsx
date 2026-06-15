// src/pages/CreateDocumentPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { FilePlus, ArrowLeft, AlertCircle, Loader2, ChevronDown, FileText } from 'lucide-react';

const DOC_TYPES = [
  'Financial', 'Administrative', 'Academic', 'HR', 'Legal',
  'Procurement', 'Research', 'Correspondence', 'Other',
];

const CreateDocumentPage = () => {
  const { user }        = useAuth();
  const navigate        = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', type: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/documents', form);
      navigate(`/documents/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to instantiate document instance inside ledger.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-zinc-900/20 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-900/40 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200 appearance-none";

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 relative z-10">

        {/* Back Link Breadcrumb Navigation */}
        <div className="mb-6 group">
          <Link to="/documents" className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-indigo-400 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
            Return to Ledger
          </Link>
        </div>

        {/* Form Container Panel */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl p-6 sm:p-10 shadow-black/20">
          
          {/* Section Description Metadata */}
          <div className="mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <FilePlus className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Declare New Document</h2>
            <p className="text-xs text-zinc-500 flex items-center gap-2 mt-2 font-medium">
              Originating Allocation: 
              <span className="inline-flex items-center gap-1.5 bg-zinc-950/40 border border-zinc-900 px-2 py-0.5 rounded-lg text-zinc-400 font-semibold">
                <span className="w-1 h-1 rounded-full bg-indigo-400" />
                {user?.department}
              </span>
            </p>
          </div>

          {error && (
            <div className="bg-rose-950/40 border border-rose-900/50 text-rose-400 px-4 py-3 rounded-xl mb-6 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Document Title <span className="text-rose-500/80">*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange} required className={inputClass} placeholder="e.g. Operational Budget Proposal Q3" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Ledger Category Type <span className="text-rose-500/80">*</span></label>
              <div className="relative">
                <select name="type" value={form.type} onChange={handleChange} required className={inputClass}>
                  <option value="" className="bg-zinc-950 text-zinc-600">-- Select Classification --</option>
                  {DOC_TYPES.map(t => <option key={t} value={t} className="bg-zinc-950 text-zinc-200">{t}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500"><ChevronDown className="w-3.5 h-3.5" /></div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Structural Remarks Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={`${inputClass} resize-none`} placeholder="Append context details regarding validation or processing intent..." />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-zinc-800/60">
              <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 border border-indigo-500 shadow-lg shadow-indigo-950 active:scale-[0.98] text-xs">
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Instantiating...</> : <><FileText className="w-3.5 h-3.5" /> Create Entry</>}
              </button>
              <Link to="/documents" className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-semibold px-5 py-2 rounded-xl transition duration-200 flex items-center justify-center text-xs backdrop-blur-md">Cancel</Link>
            </div>
          </form>
          
        </div>
      </div>
    </div>
  );
};

export default CreateDocumentPage;