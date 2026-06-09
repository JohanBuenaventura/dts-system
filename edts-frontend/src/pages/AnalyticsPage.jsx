// src/pages/AnalyticsPage.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const STATUS_COLORS = {
  'Created':    '#6B7280',
  'In Transit': '#F59E0B',
  'Received':   '#3B82F6',
  'Completed':  '#10B981',
};

const BAR_COLORS = [
  '#3B82F6','#8B5CF6','#10B981','#F59E0B',
  '#EF4444','#06B6D4','#F97316','#84CC16','#EC4899',
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
        <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({ label, value, color, icon, sub }) => (
  <div className={`bg-white rounded-xl shadow p-5 border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </div>
);

const AnalyticsPage = () => {
  const { user }              = useAuth();
  const [stats,   setStats]   = useState(null);
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const isSuperAdmin          = user?.role === 'Super Admin';
  const isAdmin               = user?.role === 'Admin';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Super Admin gets full system stats
        if (isSuperAdmin) {
          const res = await api.get('/admin/stats');
          setStats(res.data.data);
        }

        // Admin gets their department documents
        const docsRes = await api.get('/documents', {
          params: { page: 1, limit: 9999 },
        });
        setDocs(docsRes.data.data);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Local counts for Admin (department level)
  const localCounts = {
    total:     docs.length,
    created:   docs.filter(d => d.status === 'Created').length,
    inTransit: docs.filter(d => d.status === 'In Transit').length,
    received:  docs.filter(d => d.status === 'Received').length,
    completed: docs.filter(d => d.status === 'Completed').length,
  };

  // ── Pie data
  const pieData = [
    { name: 'Created',    value: isSuperAdmin ? stats?.documents.created   ?? 0 : localCounts.created,   color: STATUS_COLORS['Created']    },
    { name: 'In Transit', value: isSuperAdmin ? stats?.documents.inTransit ?? 0 : localCounts.inTransit, color: STATUS_COLORS['In Transit'] },
    { name: 'Received',   value: isSuperAdmin ? stats?.documents.received  ?? 0 : localCounts.received,  color: STATUS_COLORS['Received']   },
    { name: 'Completed',  value: isSuperAdmin ? stats?.documents.completed ?? 0 : localCounts.completed, color: STATUS_COLORS['Completed']  },
  ].filter(d => d.value > 0);

  // ── Doc type breakdown for Admin (from local docs)
  const adminByType = docs.reduce((acc, doc) => {
    const existing = acc.find(d => d.type === doc.type);
    if (existing) existing.count++;
    else acc.push({ type: doc.type, count: 1 });
    return acc;
  }, []).sort((a, b) => b.count - a.count);

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading analytics...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">📊 Analytics</h2>
          <p className="text-gray-500 text-sm mt-1">
            {isSuperAdmin
              ? 'System-wide document statistics'
              : `Document statistics for ${user?.department}`}
          </p>
        </div>

        {/* ── SUPER ADMIN STAT CARDS ── */}
        {isSuperAdmin && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Documents" value={stats.documents.total}     color="border-blue-500"   icon="📁" sub="System-wide" />
            <StatCard label="In Transit"      value={stats.documents.inTransit} color="border-yellow-500" icon="🚚" />
            <StatCard label="Received"        value={stats.documents.received}  color="border-blue-400"   icon="📥" />
            <StatCard label="Completed"       value={stats.documents.completed} color="border-green-500"  icon="✅" />
            <StatCard label="Active Users"    value={stats.users}               color="border-purple-500" icon="👤" sub="Registered accounts" />
            <StatCard label="Departments"     value={stats.departments}         color="border-indigo-500" icon="🏢" />
            <StatCard label="Created"         value={stats.documents.created}   color="border-gray-400"   icon="📋" sub="Not yet routed" />
          </div>
        )}

        {/* ── ADMIN STAT CARDS ── */}
        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Documents" value={localCounts.total}     color="border-blue-500"   icon="📁" sub="In your dept" />
            <StatCard label="In Transit"      value={localCounts.inTransit} color="border-yellow-500" icon="🚚" />
            <StatCard label="Received"        value={localCounts.received}  color="border-blue-400"   icon="📥" />
            <StatCard label="Completed"       value={localCounts.completed} color="border-green-500"  icon="✅" />
          </div>
        )}

        {/* ── ROW 1: Pie + Line ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Status Breakdown Pie */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-1">Document Status Breakdown</h3>
            <p className="text-xs text-gray-400 mb-4">
              {isSuperAdmin ? 'All documents system-wide' : `Documents in ${user?.department}`}
            </p>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-gray-300 text-sm">
                No documents yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span className="text-sm text-gray-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly Volume Line — Super Admin only, hidden for Admin */}
{isSuperAdmin && (
<div className="bg-white rounded-xl shadow p-6">
  <h3 className="font-semibold text-gray-800 mb-1">Monthly Document Volume</h3>
  <p className="text-xs text-gray-400 mb-4">Last 6 months — system-wide</p>
  {!stats?.monthly || stats.monthly.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-gray-300 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={stats.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="count" name="Documents"
                    stroke="#3B82F6" strokeWidth={2.5}
                    dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
)}
        </div>

        {/* ── ROW 2 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Documents per Department — Super Admin only, hidden for Admin */}
{isSuperAdmin && (
<div className="bg-white rounded-xl shadow p-6">
  <h3 className="font-semibold text-gray-800 mb-1">Documents per Department</h3>
  <p className="text-xs text-gray-400 mb-4">Current document location</p>
  {!stats?.perDepartment || stats.perDepartment.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-gray-300 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stats.perDepartment}
                  margin={{ top: 5, right: 10, left: 0, bottom: 65 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickLine={false}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Documents" radius={[4, 4, 0, 0]}>
                    {stats.perDepartment.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
)}

          {/* Documents by Type */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-1">Documents by Type</h3>
            <p className="text-xs text-gray-400 mb-4">
              {isSuperAdmin ? 'System-wide breakdown' : `Breakdown in ${user?.department}`}
            </p>
            {(isSuperAdmin ? stats?.byType : adminByType)?.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-gray-300 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={isSuperAdmin ? stats?.byType : adminByType}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 70, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Documents" radius={[0, 4, 4, 0]}>
                    {(isSuperAdmin ? stats?.byType : adminByType)?.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsPage;