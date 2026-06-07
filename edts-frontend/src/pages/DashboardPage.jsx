// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const StatCard = ({ label, value, color, icon }) => (
  <div className={`bg-white rounded-xl shadow p-5 border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </div>
);

const DashboardPage = () => {
  const { user }            = useAuth();
  const [docs, setDocs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/documents')
      .then(res => setDocs(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    total:     docs.length,
    created:   docs.filter(d => d.status === 'Created').length,
    inTransit: docs.filter(d => d.status === 'In Transit').length,
    received:  docs.filter(d => d.status === 'Received').length,
    completed: docs.filter(d => d.status === 'Completed').length,
  };

  const recent = docs.slice(0, 5);

  const statusBadge = (status) => {
    const map = {
      'Created':    'bg-gray-100 text-gray-700',
      'In Transit': 'bg-yellow-100 text-yellow-700',
      'Received':   'bg-blue-100 text-blue-700',
      'Completed':  'bg-green-100 text-green-700',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome back, {user?.full_name} 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {user?.department} · {user?.role}
          </p>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <p className="text-gray-400">Loading stats...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Documents" value={counts.total}     color="border-blue-500"   icon="📁" />
            <StatCard label="In Transit"      value={counts.inTransit} color="border-yellow-500" icon="🚚" />
            <StatCard label="Received"        value={counts.received}  color="border-blue-400"   icon="📥" />
            <StatCard label="Completed"       value={counts.completed} color="border-green-500"  icon="✅" />
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <Link to="/documents/create"
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
            + Create Document
          </Link>
          <Link to="/documents"
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium transition">
            View All Documents
          </Link>
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Recent Documents</h3>
          </div>
          {loading ? (
            <div className="p-6 text-gray-400 text-sm">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="p-6 text-gray-400 text-sm">No documents yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map(doc => (
                <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{doc.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {doc.tracking_code} · {doc.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge(doc.status)}`}>
                      {doc.status}
                    </span>
                    <Link to={`/documents/${doc.id}`}
                      className="text-blue-600 hover:underline text-xs">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;