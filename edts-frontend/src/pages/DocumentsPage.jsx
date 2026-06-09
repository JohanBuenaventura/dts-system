// src/pages/DocumentsPage.jsx
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { exportDocumentsCSV, exportDocumentsPDF } from '../utils/exportUtils';

const statusBadge = (status) => {
  const map = {
    'Created':    'bg-gray-100 text-gray-700',
    'In Transit': 'bg-yellow-100 text-yellow-700',
    'Received':   'bg-blue-100 text-blue-700',
    'Completed':  'bg-green-100 text-green-700',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{from}</span> to <span className="font-medium">{to}</span> of{' '}
        <span className="font-medium">{total}</span> documents
      </p>
      <div className="flex items-center gap-1">
        {/* First */}
        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
          «
        </button>
        {/* Prev */}
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
          ‹ Prev
        </button>
        {/* Page numbers */}
        {pages[0] > 1 && <span className="px-1 text-gray-300 text-xs">...</span>}
        {pages.map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition
              ${p === page
                ? 'bg-blue-700 border-blue-700 text-white font-semibold'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="px-1 text-gray-300 text-xs">...</span>}
        {/* Next */}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
          Next ›
        </button>
        {/* Last */}
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
          »
        </button>
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const DocumentsPage = () => {
  const [docs,       setDocs]       = useState([]);
  const [allDocs,    setAllDocs]    = useState([]);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Documents</h2>
            {pagination && (
              <p className="text-sm text-gray-500 mt-1">
                {pagination.total} total document{pagination.total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Export Buttons */}
            <button onClick={handleExportCSV} disabled={exporting}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center gap-1.5">
              📥 CSV
            </button>
            <button onClick={handleExportPDF} disabled={exporting}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center gap-1.5">
              📄 PDF
            </button>
            <Link to="/documents/create"
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              + New Document
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <input
            type="text"
            placeholder="Search title or tracking code..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select value={filter} onChange={e => handleFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            {['Created','In Transit','Received','Completed'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={type} onChange={e => handleType(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Types</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading documents...</div>
          ) : docs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No documents found.{' '}
              {(search || filter || type) && (
                <button
                  onClick={() => { setSearch(''); setFilter(''); setType(''); setPage(1); fetchDocs({ page: 1, search: '', status: '', type: '' }); }}
                  className="text-blue-600 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3 text-left">Tracking Code</th>
                      <th className="px-6 py-3 text-left">Title</th>
                      <th className="px-6 py-3 text-left">Type</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Location</th>
                      <th className="px-6 py-3 text-left">Created</th>
                      <th className="px-6 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {docs.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-mono text-xs text-blue-700">{doc.tracking_code}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{doc.title}</td>
                        <td className="px-6 py-4 text-gray-500">{doc.type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(doc.status)}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{doc.current_location_dept}</td>
                        <td className="px-6 py-4 text-gray-400 text-xs">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/documents/${doc.id}`}
                            className="text-blue-600 hover:underline font-medium">
                            View →
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

export default DocumentsPage;