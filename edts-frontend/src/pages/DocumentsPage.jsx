// src/pages/DocumentsPage.jsx
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { exportDocumentsCSV, exportDocumentsPDF } from '../utils/exportUtils';
import { 
  Plus, 
  FileText, 
  FileDown, 
  ArrowRight, 
  Search, 
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown
} from 'lucide-react';

// ─── STATUS BADGE (Synced with Dashboard Light Theme) ─────────────────────────
const statusBadge = (status) => {
  const map = {
    'Created':    'bg-gray-100 text-gray-700 border border-gray-200',
    'In Transit': 'bg-amber-100 text-amber-700 border border-amber-200',
    'Received':   'bg-indigo-100 text-indigo-700 border border-indigo-200',
    'Completed':  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  };
  return map[status] || 'bg-gray-100 text-gray-700 border border-gray-200';
};

// ─── EXTRA HELPERS ────────────────────────────────────────────────────────────
const urgencyBadge = (urgency) => ({
  'Normal':        null,
  'Urgent':        <span className="ml-1 text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-full">Urgent</span>,
  'Highly Urgent': <span className="ml-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">🔥 High</span>,
}[urgency] || null);

const dueBadge = (due_status) => ({
  'overdue':  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">Overdue</span>,
  'due_soon': <span className="text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-600 border border-yellow-200 px-1.5 py-0.5 rounded-full">Due Soon</span>,
  'ok':       null,
}[due_status] || null);

const DOC_TYPES = [
  'Financial','Administrative','Academic','HR','Legal',
  'Procurement','Research','Correspondence','Other',
];

// ─── PAGINATION COMPONENT ─────────────────────────────────────────────────────
const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-white">
      <p className="text-xs text-gray-500 font-medium">
        Showing <span className="font-bold text-gray-900">{from}</span> to <span className="font-bold text-gray-900">{to}</span> of{' '}
        <span className="font-bold text-gray-900">{total}</span> documents
      </p>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {pages[0] > 1 && <span className="px-1 text-gray-400 text-xs font-bold">...</span>}
        {pages.map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-semibold tracking-tight
              ${p === page
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="px-1 text-gray-400 text-xs font-bold">...</span>}
        
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const DocumentsPage = () => {
  const [docs,       setDocs]       = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);

  // Filters State
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('');
  const [type,    setType]    = useState('');
  const [urgency, setUrgency] = useState(''); 
  const [page,    setPage]    = useState(1);
  const [limit]               = useState(10);

  // Fetch paginated documents
  const fetchDocs = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/documents', {
        params: {
          page:    params.page    ?? page,
          limit,
          search:  params.search  ?? search,
          status:  params.status  ?? filter,
          type:    params.type    ?? type,
          urgency: params.urgency ?? urgency,
        },
      });
      setDocs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filter, type, urgency]);

  useEffect(() => { fetchDocs(); }, [page]);

  // Handlers
  const handleSearch  = (val) => { setSearch(val); setPage(1); fetchDocs({ page: 1, search: val }); };
  const handleFilter  = (val) => { setFilter(val); setPage(1); fetchDocs({ page: 1, status: val }); };
  const handleType    = (val) => { setType(val);   setPage(1); fetchDocs({ page: 1, type: val }); };
  const handleUrgency = (val) => { setUrgency(val); setPage(1); fetchDocs({ page: 1, urgency: val }); };

  const handlePageChange = (newPage) => setPage(newPage);

  const fetchAllForExport = async () => {
    const res = await api.get('/documents', {
      params: { page: 1, limit: 9999, search, status: filter, type, urgency },
    });
    return res.data.data;
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try { const all = await fetchAllForExport(); exportDocumentsCSV(all); } 
    catch (err) { console.error(err); } 
    finally { setExporting(false); }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try { const all = await fetchAllForExport(); exportDocumentsPDF(all); } 
    catch (err) { console.error(err); } 
    finally { setExporting(false); }
  };

  const inputClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 appearance-none";

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-indigo-500/30 selection:text-indigo-900 relative overflow-x-hidden">
      
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100 blur-[120px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-100/60 blur-[100px] rounded-full" />

      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-indigo-600" />
              Document Ledger
            </h2>
            {pagination && (
              <p className="text-sm text-gray-500 mt-1 font-medium">
                Showing {pagination.total} total document{pagination.total !== 1 ? 's' : ''} in the system
              </p>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleExportCSV} disabled={exporting}
              className="bg-white hover:bg-emerald-50 text-emerald-700 border border-gray-200 hover:border-emerald-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 flex items-center gap-2 shadow-sm">
              <FileDown className="w-4 h-4 text-emerald-500" /> CSV
            </button>
            <button onClick={handleExportPDF} disabled={exporting}
              className="bg-white hover:bg-rose-50 text-rose-700 border border-gray-200 hover:border-rose-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 flex items-center gap-2 shadow-sm">
              <FileText className="w-4 h-4 text-rose-500" /> PDF
            </button>
            <Link to="/documents/create"
              className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-gray-900/20 active:scale-[0.98]">
              <Plus className="w-4 h-4" /> New Document
            </Link>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="relative group">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          
          <div className="relative">
            <select value={filter} onChange={e => handleFilter(e.target.value)} className={inputClass}>
              <option value="" className="text-gray-500">All Statuses</option>
              {['Created','In Transit','Received','Completed'].map(s => (
                <option key={s} value={s} className="text-gray-900">{s}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
          </div>

          <div className="relative">
            <select value={type} onChange={e => handleType(e.target.value)} className={inputClass}>
              <option value="" className="text-gray-500">All Types</option>
              {DOC_TYPES.map(t => <option key={t} value={t} className="text-gray-900">{t}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
          </div>

          <div className="relative">
            <select value={urgency} onChange={e => handleUrgency(e.target.value)} className={inputClass}>
              <option value="" className="text-gray-500">All Urgency</option>
              <option value="Normal" className="text-gray-900">Normal</option>
              <option value="Urgent" className="text-gray-900">Urgent</option>
              <option value="Highly Urgent" className="text-gray-900">Highly Urgent</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400"><ChevronDown className="w-4 h-4" /></div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
          
          {loading ? (
            <div className="p-12 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-bold mb-1">No documents found</p>
              <p className="text-gray-500 text-sm mb-6 font-medium">We couldn't find any records matching your current search or filter criteria.</p>
              {(search || filter || type || urgency) && (
                <button
                  onClick={() => { setSearch(''); setFilter(''); setType(''); setUrgency(''); setPage(1); fetchDocs({ page: 1, search: '', status: '', type: '', urgency: '' }); }}
                  className="text-indigo-600 hover:text-indigo-700 font-bold text-sm transition-colors border border-indigo-200 px-5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 shadow-sm">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="px-6 py-4 text-left">Tracking Code</th>
                      <th className="px-6 py-4 text-left">Title</th>
                      <th className="px-6 py-4 text-left">Type</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      <th className="px-6 py-4 text-left">Location</th>
                      <th className="px-6 py-4 text-left">Due Date</th>
                      <th className="px-6 py-4 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {docs.map(doc => (
                      <tr key={doc.id} className={`hover:bg-gray-50/80 transition-colors group
                        ${doc.due_status === 'overdue' ? 'border-l-[3px] border-l-red-500' : 'border-l-[3px] border-l-transparent'}
                        ${doc.urgency === 'Highly Urgent' ? 'border-l-[3px] border-l-red-600' : ''}`}>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600 tracking-tight">{doc.tracking_code}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{doc.title}</div>
                          <div className="mt-1">{urgencyBadge(doc.urgency)}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs font-medium">{doc.document_kind || doc.type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(doc.status)}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs font-medium">{doc.current_location_dept}</td>
                        <td className="px-6 py-4 text-xs">
                          {doc.due_date ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className={doc.due_status === 'overdue' ? 'text-red-600 font-bold' : 'text-gray-500 font-medium'}>
                                {new Date(doc.due_date).toLocaleDateString()}
                              </span>
                              {dueBadge(doc.due_status)}
                            </div>
                          ) : <span className="text-gray-300 font-medium">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/documents/${doc.id}`} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold text-sm transition-colors">
                            View <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={pagination} onPageChange={handlePageChange} />
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default DocumentsPage;