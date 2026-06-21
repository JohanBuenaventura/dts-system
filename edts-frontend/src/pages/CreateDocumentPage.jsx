// src/pages/CreateDocumentPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link }   from 'react-router-dom';
import api                     from '../api/axios';
import Navbar                  from '../components/Navbar';
import { useAuth }             from '../context/AuthContext';
import { 
  FilePlus, 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  ChevronDown,
  Info
} from 'lucide-react';

const DOCUMENT_KINDS = [
  'Special Memo', 'Memorandum', 'Resolution', 'Letter',
  'Request Form', 'Certificate', 'Report', 'Endorsement',
  'Notice', 'Invitation', 'Minutes of Meeting',
  'Purchase Order', 'Voucher', 'Official Receipt',
  'Contract', 'Other',
];

const DEPARTMENT_TYPES = [
  'Academic', 'Administrative', 'Financial', 'Human Resources',
  'Legal', 'Procurement', 'Research', 'Student Affairs',
  'Operations', 'Other',
];

const URGENCY_LEVELS = ['Normal', 'Urgent', 'Highly Urgent'];

const urgencyColor = (u) => ({
  'Normal':        'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50',
  'Urgent':        'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'Highly Urgent': 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
}[u] || 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50');

const CreateDocumentPage = () => {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    title:           '',
    description:     '',
    type:            '',        // Department Type
    document_kind:   '',        // Document Kind
    due_date:        '',
    urgency:         'Normal',
    dest_department: '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // UPDATED: Now points to the open active-departments route
    api.get('/documents/active-departments')
      .then(res => setDepartments(res.data.data))
      .catch(console.error);
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation
    if (!form.title.trim()) return setError('Document title is required.');
    if (!form.document_kind) return setError('Please select a Document Kind.');
    if (!form.type) return setError('Please select a Department Type.');

    setLoading(true);
    try {
      const res = await api.post('/documents', form);
      navigate(`/documents/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create document.');
    } finally {
      setLoading(false);
    }
  };

  // Shared input styling class
  const inputClass = "w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 appearance-none";

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      {/* Ambient glows */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center text-xs font-medium text-zinc-500 mb-6 group w-max">
          <Link to="/documents" className="flex items-center hover:text-indigo-400 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
            Back to Documents
          </Link>
        </div>

        {/* ── Form Card ── */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl p-8 sm:p-10">
          
          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner shadow-zinc-800/50 mb-4">
              <FilePlus className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight mb-1">Create New Document</h2>
            <p className="text-sm text-zinc-500 flex items-center gap-2">
              Originating Department: <span className="font-semibold text-zinc-300 bg-zinc-800/50 px-2 py-0.5 rounded-md">{user?.department}</span>
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-rose-950/40 border border-rose-900/50 text-rose-400 px-4 py-3 rounded-xl mb-6 text-sm font-medium tracking-wide flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Document Title <span className="text-rose-500">*</span>
              </label>
              <input type="text" name="title" value={form.title}
                onChange={handleChange} required
                className={inputClass}
                placeholder="e.g. Budget Proposal 2024" />
            </div>

            {/* Document Kind + Department Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Document Kind */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Document Kind <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select name="document_kind" value={form.document_kind} onChange={handleChange} required className={inputClass}>
                    <option value="" className="bg-zinc-900 text-zinc-500">-- Select Kind --</option>
                    {DOCUMENT_KINDS.map(k => <option key={k} value={k} className="bg-zinc-900 text-zinc-200">{k}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Department Type */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Department Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select name="type" value={form.type} onChange={handleChange} required className={inputClass}>
                    <option value="" className="bg-zinc-900 text-zinc-500">-- Select Type --</option>
                    {DEPARTMENT_TYPES.map(t => <option key={t} value={t} className="bg-zinc-900 text-zinc-200">{t}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Destination Department */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                Destination Department <span className="text-zinc-600 font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <div className="relative">
                <select name="dest_department" value={form.dest_department} onChange={handleChange} className={inputClass}>
                  <option value="" className="bg-zinc-900 text-zinc-500">-- No specific destination --</option>
                  {departments
                    .filter(d => d.name !== user?.department)
                    .map(d => (
                      <option key={d.id} value={d.name} className="bg-zinc-900 text-zinc-200">{d.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2">Where is this document intended to go?</p>
            </div>

            {/* Due Date + Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  Due Date <span className="text-zinc-600 font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="date" name="due_date" value={form.due_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputClass} style={{ colorScheme: 'dark' }} />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Urgency
                </label>
                <div className="relative">
                  <select name="urgency" value={form.urgency} onChange={handleChange} className={inputClass}>
                    {URGENCY_LEVELS.map(u => (
                      <option key={u} value={u} className="bg-zinc-900 text-zinc-200">{u}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Urgency preview badge */}
            {form.urgency !== 'Normal' && (
              <div className={`px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 ${urgencyColor(form.urgency)}`}>
                <Info className="w-4 h-4" />
                <span>This document will be marked as <strong>{form.urgency}</strong></span>
              </div>
            )}

            {/* Description Textarea */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                Description <span className="text-zinc-600 font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <textarea name="description" value={form.description}
                onChange={handleChange} rows={4}
                className={`${inputClass} resize-none`}
                placeholder="Additional details about this document..." />
            </div>

            {/* Summary preview before submit */}
            {(form.title || form.document_kind || form.type) && (
              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl px-5 py-4 text-sm text-indigo-200 space-y-2">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Document Preview</p>
                {form.title         && <p>📄 <span className="text-indigo-400/80">Title:</span> <span className="font-medium text-indigo-100">{form.title}</span></p>}
                {form.document_kind && <p>📋 <span className="text-indigo-400/80">Kind:</span> <span className="font-medium text-indigo-100">{form.document_kind}</span></p>}
                {form.type          && <p>🏢 <span className="text-indigo-400/80">Dept Type:</span> <span className="font-medium text-indigo-100">{form.type}</span></p>}
                {form.urgency !== 'Normal' && <p>🔥 <span className="text-indigo-400/80">Urgency:</span> <span className="font-medium text-indigo-100">{form.urgency}</span></p>}
                {form.due_date      && <p>📅 <span className="text-indigo-400/80">Due:</span> <span className="font-medium text-indigo-100">{new Date(form.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>}
                {form.dest_department && <p>📬 <span className="text-indigo-400/80">Destination:</span> <span className="font-medium text-indigo-100">{form.dest_department}</span></p>}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-zinc-800/80">
              <button type="submit" disabled={loading}
                className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500 active:scale-[0.98]">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FilePlus className="w-4 h-4" />
                    Create Document
                  </>
                )}
              </button>
              <Link to="/documents"
                className="flex-1 sm:flex-none bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-medium px-8 py-3 rounded-xl transition-all duration-200 flex items-center justify-center backdrop-blur-md">
                Cancel
              </Link>
            </div>
          </form>
          
        </div>
      </div>
    </div>
  );
};

export default CreateDocumentPage;