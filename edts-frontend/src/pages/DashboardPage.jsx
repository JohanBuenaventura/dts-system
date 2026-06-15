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
  ChevronDown,
  SlidersHorizontal,
  CalendarDays
} from 'lucide-react';

// ─── STATUS BADGE (Synced with Premium Dashboard Aesthetics) ────────────────
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-zinc-800/60 bg-zinc-950/40 backdrop-blur-md">
      <p className="text-xs text-zinc-500 font-medium">
        Showing <span className="font-semibold text-zinc-300">{from}</span> to <span className="font-semibold text-zinc-300">{to}</span> of{' '}
        <span className="font-semibold text-indigo-400">{total}</span> documents
      </p>
      <div className="flex items-center gap-1">
        {/* First */}
        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className="p-2 rounded-xl border border-zinc-800 text-zinc-400 bg-zinc-900/20 hover:bg-zinc-800/80 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        {/* Prev */}
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="p-2 rounded-xl border border-zinc-800 text-zinc-400 bg-zinc-900/20 hover:bg-zinc-800/80 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        
        {/* Page numbers */}
        {pages[0] > 1 && <span className="px-1 text-zinc-600 text-xs font-bold">...</span>}
        {pages.map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 text-xs rounded-xl border transition-all font-semibold tracking-tight
              ${p === page
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-950'
                : 'border-zinc-800 text-zinc-400 bg-zinc-900/20 hover:bg-zinc-800 hover:text-zinc-200'}`}>
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="px-1 text-zinc-600 text-xs font-bold">...</span>}
        
        {/* Next */}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className="p-2 rounded-xl border border-zinc-800 text-zinc-400 bg-zinc-900/20 hover:bg-zinc-800/80 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        {/* Last */}
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}
          className="p-2 rounded-xl border border-zinc-800 text-zinc-400 bg-zinc-900/20 hover:bg-zinc-800/80 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
          <ChevronsRight className="w-3.5 h-3.5" />
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

  const inputClass = "w-full bg-zinc-900/20 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-900/40 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200 appearance-none";

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      {/* Ambient glows */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* ── Header Area ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                Document Ledger
              </h2>
            </div>
            {pagination && (
              <p className="text-xs text-zinc-500 mt-2 font-medium">
                A total of <span className="text-zinc-400 font-semibold">{pagination.total}</span> recorded document{pagination.total !== 1 ? 's' : ''} available.
              </p>
            )}
          </div>
          
          {/* Action Row */}
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <div className="flex items-center bg-zinc-900/30 border border-zinc-800/60 p-1 rounded-xl backdrop-blur-md">
              <button onClick={handleExportCSV} disabled={exporting || loading}
                className="hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-30 flex items-center gap-1.5">
                <FileDown className="w-3.5 h-3.5" /> CSV
              </button>
              <div className="w-[1px] h-4 bg-zinc-800/80 mx-1" />
              <button onClick={handleExportPDF} disabled={exporting || loading}
                className="hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-30 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
            </div>

            <Link to="/documents/create"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-950 border border-indigo-500 active:scale-[0.98]">
              <Plus className="w-3.5 h-3.5" /> New Document
            </Link>
          </div>
        </div>

        {/* ── Filters Container ── */}
        <div className="bg-zinc-900/20 border border-zinc-900/80 p-4 rounded-2xl mb-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3 text-zinc-500">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Filter Ledger Records</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative group">
              <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Search title, tracking code..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
            
            {/* Status Select */}
            <div className="relative">
              <select value={filter} onChange={e => handleFilter(e.target.value)} className={inputClass}>
                <option value="" className="bg-zinc-950 text-zinc-400">All Flow Statuses</option>
                {['Created','In Transit','Received','Completed'].map(s => (
                  <option key={s} value={s} className="bg-zinc-950 text-zinc-200">{s}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                 <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Type Select */}
            <div className="relative">
              <select value={type} onChange={e => handleType(e.target.value)} className={inputClass}>
                <option value="" className="bg-zinc-950 text-zinc-400">All Document Categories</option>
                {DOC_TYPES.map(t => <option key={t} value={t} className="bg-zinc-950 text-zinc-200">{t}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                 <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Table Board Container ── */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl shadow-black/20 overflow-hidden">
          
          {loading ? (
            <div className="p-8 divide-y divide-zinc-900">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="py-4 flex items-center justify-between gap-6 animate-pulse">
                  <div className="h-3 w-24 bg-zinc-800 rounded" />
                  <div className="h-3 flex-1 bg-zinc-800/60 rounded" />
                  <div className="h-3 w-20 bg-zinc-800/40 rounded" />
                  <div className="h-5 w-16 bg-zinc-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-950/60 border border-zinc-900 flex items-center justify-center mb-4 shadow-inner">
                <Search className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-zinc-300 font-semibold text-sm mb-1">No matching documents</p>
              <p className="text-zinc-500 text-xs mb-5 max-w-xs leading-relaxed">No records matched your current query parameters. Try widening or updating filters.</p>
              {(search || filter || type) && (
                <button
                  onClick={() => { setSearch(''); setFilter(''); setType(''); setPage(1); fetchDocs({ page: 1, search: '', status: '', type: '' }); }}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs transition-colors border border-indigo-500/20 px-3 py-2 rounded-xl bg-indigo-500/5 hover:bg-indigo-600/10">
                  Clear Parameters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-zinc-900/40 border-b border-zinc-800/60">
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tracking Code</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Document Details</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Current Location</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Logged Date</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {docs.map(doc => (
                      <tr key={doc.id} className="hover:bg-zinc-900/30 transition-colors group">
                        
                        {/* Code Column */}
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-indigo-400 font-semibold tracking-tight">
                          {doc.tracking_code}
                        </td>
                        
                        {/* Title details Column */}
                        <td className="px-6 py-4 max-w-xs sm:max-w-md">
                          <div className="text-sm font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">
                            {doc.title}
                          </div>
                        </td>
                        
                        {/* Type Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400 font-medium">
                          {doc.type}
                        </td>
                        
                        {/* Target Location Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400 font-medium">
                          <div className="inline-flex items-center gap-1.5 bg-zinc-950/40 border border-zinc-900 px-2 py-1 rounded-lg">
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            {doc.current_location_dept}
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${statusBadge(doc.status)}`}>
                            {doc.status}
                          </span>
                        </td>
                        
                        {/* Date Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-zinc-600" />
                            {new Date(doc.created_at).toLocaleDateString(undefined, {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </div>
                        </td>
                        
                        {/* Action Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link to={`/documents/${doc.id}`}
                            className="text-zinc-500 hover:text-indigo-400 border border-transparent hover:border-zinc-800 bg-transparent hover:bg-zinc-950 p-1.5 rounded-xl transition-all inline-flex items-center justify-center">
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Bottom Pagination Integration */}
              <Pagination pagination={pagination} onPageChange={handlePageChange} />
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default DocumentsPage;