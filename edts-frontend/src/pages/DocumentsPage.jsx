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
  ChevronsRight
} from 'lucide-react';

// ─── STATUS BADGE (Synced with Dashboard) ─────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    'Created':    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    'In Transit': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Received':   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'Completed':  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  return map[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
};

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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/30">
      <p className="text-xs text-zinc-500">
        Showing <span className="font-medium text-zinc-300">{from}</span> to <span className="font-medium text-zinc-300">{to}</span> of{' '}
        <span className="font-medium text-zinc-300">{total}</span> documents
      </p>
      <div className="flex items-center gap-1.5">
        {/* First */}
        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        {/* Prev */}
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {/* Page numbers */}
        {pages[0] > 1 && <span className="px-1 text-zinc-600 text-xs">...</span>}
        {pages.map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium
              ${p === page
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="px-1 text-zinc-600 text-xs">...</span>}
        
        {/* Next */}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
        {/* Last */}
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
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

  // Filters
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('');
  const [type,    setType]    = useState('');
  const [page,    setPage]    = useState(1);
  const [limit]               = useState(10);

  // ── Fetch paginated documents
  const fetchDocs = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/documents', {
        params: {
          page:   params.page   ?? page,
          limit,
          search: params.search ?? search,
          status: params.status ?? filter,
          type:   params.type   ?? type,
        },
      });
      setDocs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filter, type]);

  useEffect(() => { fetchDocs(); }, [page]);

  // Reset to page 1 on filter change
  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    fetchDocs({ page: 1, search: val });
  };

  const handleFilter = (val) => {
    setFilter(val);
    setPage(1);
    fetchDocs({ page: 1, status: val });
  };

  const handleType = (val) => {
    setType(val);
    setPage(1);
    fetchDocs({ page: 1, type: val });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // ── Fetch ALL docs for export (no pagination)
  const fetchAllForExport = async () => {
    const res = await api.get('/documents', {
      params: { page: 1, limit: 9999, search, status: filter, type },
    });
    return res.data.data;
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const all = await fetchAllForExport();
      exportDocumentsCSV(all);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const all = await fetchAllForExport();
      exportDocumentsPDF(all);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // Shared input styling class
  const inputClass = "w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 appearance-none";

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      {/* Ambient glows */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-indigo-400" />
              Document Ledger
            </h2>
            {pagination && (
              <p className="text-sm text-zinc-500 mt-1">
                Showing {pagination.total} total document{pagination.total !== 1 ? 's' : ''} in the system
              </p>
            )}
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleExportCSV} disabled={exporting}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 flex items-center gap-2">
              <FileDown className="w-4 h-4" /> CSV
            </button>
            <button onClick={handleExportPDF} disabled={exporting}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 flex items-center gap-2">
              <FileText className="w-4 h-4" /> PDF
            </button>
            <Link to="/documents/create"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500 active:scale-[0.98]">
              <Plus className="w-4 h-4" /> New Document
            </Link>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="relative group">
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search title or tracking code..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          
          <div className="relative">
            <select value={filter} onChange={e => handleFilter(e.target.value)} className={inputClass}>
              <option value="" className="bg-zinc-900 text-zinc-200">All Statuses</option>
              {['Created','In Transit','Received','Completed'].map(s => (
                <option key={s} value={s} className="bg-zinc-900 text-zinc-200">{s}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
               <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          <div className="relative">
            <select value={type} onChange={e => handleType(e.target.value)} className={inputClass}>
              <option value="" className="bg-zinc-900 text-zinc-200">All Document Types</option>
              {DOC_TYPES.map(t => <option key={t} value={t} className="bg-zinc-900 text-zinc-200">{t}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
               <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ── Table Container ── */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
          
          {loading ? (
            <div className="p-12">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-4 w-24 bg-zinc-800/80 rounded animate-pulse" />
                    <div className="h-4 flex-1 bg-zinc-800/60 rounded animate-pulse" />
                    <div className="h-6 w-20 bg-zinc-800/80 rounded-full animate-pulse" />
                    <div className="h-4 w-16 bg-zinc-800/60 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : docs.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-inner shadow-zinc-800/50">
                <Search className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-300 font-medium mb-2">No documents found</p>
              <p className="text-zinc-500 text-sm mb-6 max-w-sm">We couldn't find any records matching your current search or filter criteria.</p>
              {(search || filter || type) && (
                <button
                  onClick={() => { setSearch(''); setFilter(''); setType(''); setPage(1); fetchDocs({ page: 1, search: '', status: '', type: '' }); }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors border border-indigo-500/30 px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-800/80">
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Tracking Code</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {docs.map(doc => (
                      <tr key={doc.id} className="hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-indigo-400 font-medium">
                          {doc.tracking_code}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-zinc-200 group-hover:text-indigo-100 transition-colors">
                          {doc.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                          {doc.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${statusBadge(doc.status)}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                          {doc.current_location_dept}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-500">
                          {new Date(doc.created_at).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link to={`/documents/${doc.id}`}
                            className="text-zinc-500 hover:text-indigo-400 transition-colors p-2 rounded-lg hover:bg-zinc-800 inline-flex">
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination pagination={pagination} onPageChange={handlePageChange} />
            </>
          )}
        </div>

      </div>
    </div>
  );
};

// Quick helper for standardizing custom chevron down for the selects
const ChevronDown = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export default DocumentsPage;