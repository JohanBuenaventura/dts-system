// src/pages/CreateDocumentPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link }   from 'react-router-dom';
import api                     from '../api/axios';
import Navbar                  from '../components/Navbar';
import { useAuth }             from '../context/AuthContext';
import { FilePlus, ArrowLeft, AlertCircle, Loader2, ChevronDown, Info } from 'lucide-react';

const DEPARTMENT_TYPES = [
  'Academic', 'Administrative', 'Financial', 'Human Resources', 
  'Legal', 'Procurement', 'Research', 'Student Affairs', 
  'Operations', 'Other'
];

const URGENCY_LEVELS = ['Normal', 'Urgent', 'Highly Urgent'];

const urgencyColor = (u) => ({
  'Normal':        'bg-gray-100 text-gray-600 border border-gray-200',
  'Urgent':        'bg-amber-100 text-amber-700 border border-amber-200',
  'Highly Urgent': 'bg-red-100 text-red-700 border border-red-200',
}[u] || 'bg-gray-100 text-gray-600 border border-gray-200');

const CreateDocumentPage = () => {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]); // Using dynamic Document Types

  // CHANGED: document_kind is now document_type
  const [form, setForm] = useState({ 
    title: '', description: '', type: '', document_type: '', due_date: '', urgency: 'Normal', dest_department: '' 
  });
  
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch both active departments AND active document types at the same time
    Promise.all([
      api.get('/documents/active-departments'),
      api.get('/documents/active-types') // Ensure your backend has this route!
    ])
    .then(([deptRes, typeRes]) => {
      setDepartments(deptRes.data.data);
      setDocumentTypes(typeRes.data.data);
    })
    .catch(console.error);
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError('');
    
    if (!form.title.trim()) return setError('Document title is required.');
    if (!form.document_type) return setError('Please select a Document Type.');
    if (!form.type) return setError('Please select a Department Category.');

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

  const inputClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 appearance-none";

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-blue-500/30 selection:text-blue-900 relative overflow-x-hidden">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <div className="flex items-center text-xs font-medium text-gray-500 mb-6 group w-max">
          <Link to="/documents" className="flex items-center hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover:-translate-x-0.5" /> Back to Documents
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 sm:p-10">
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
              <FilePlus className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Create New Document</h2>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              Originating Department: <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">{user?.department}</span>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Document Title <span className="text-red-500">*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange} required className={inputClass} placeholder="e.g. Budget Proposal 2024" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Document Type <span className="text-red-500">*</span></label>
                <div className="relative">
                  {/* CHANGED: name is document_type, and value is mapped from our DB */}
                  <select name="document_type" value={form.document_type} onChange={handleChange} required className={inputClass}>
                    <option value="">-- Select Type --</option>
                    {documentTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Department Category <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select name="type" value={form.type} onChange={handleChange} required className={inputClass}>
                    <option value="">-- Select Category --</option>
                    {DEPARTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Destination Department <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
              <div className="relative">
                <select name="dest_department" value={form.dest_department} onChange={handleChange} className={inputClass}>
                  <option value="">-- No specific destination --</option>
                  {departments.filter(d => d.name !== user?.department).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Due Date <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                <input type="date" name="due_date" value={form.due_date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} className={inputClass} />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Urgency</label>
                <div className="relative">
                  <select name="urgency" value={form.urgency} onChange={handleChange} className={inputClass}>
                    {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
                </div>
              </div>
            </div>

            {form.urgency !== 'Normal' && (
              <div className={`px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 ${urgencyColor(form.urgency)}`}>
                <Info className="w-4 h-4" /> <span>This document will be marked as <strong>{form.urgency}</strong></span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={`${inputClass} resize-none`} placeholder="Additional details..." />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
              <button type="submit" disabled={loading} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><FilePlus className="w-4 h-4" /> Create Document</>}
              </button>
              <Link to="/documents" className="flex-1 sm:flex-none bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium px-8 py-3 rounded-xl transition-all flex items-center justify-center">
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