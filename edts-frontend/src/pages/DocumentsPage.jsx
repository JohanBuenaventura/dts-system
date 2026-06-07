// src/pages/DocumentsPage.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const statusBadge = (status) => {
  const map = {
    'Created':    'bg-gray-100 text-gray-700',
    'In Transit': 'bg-yellow-100 text-yellow-700',
    'Received':   'bg-blue-100 text-blue-700',
    'Completed':  'bg-green-100 text-green-700',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

const DocumentsPage = () => {
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('All');

  useEffect(() => {
    api.get('/documents')
      .then(res => setDocs(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter(d => {
    const matchStatus = filter === 'All' || d.status === filter;
    const matchSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.tracking_code.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Documents</h2>
          <Link to="/documents/create"
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition w-fit">
            + New Document
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by title or tracking code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
          />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {['All','Created','In Transit','Received','Completed'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading documents...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No documents found.</div>
          ) : (
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
                  {filtered.map(doc => (
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
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Link to={`/documents/${doc.id}`}
                          className="text-blue-600 hover:underline font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DocumentsPage;