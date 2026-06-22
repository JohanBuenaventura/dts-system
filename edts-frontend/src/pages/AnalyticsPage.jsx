// src/pages/AnalyticsPage.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  BarChart3,
  FolderKanban,
  Truck,
  Inbox,
  CheckCircle2,
  Users,
  Building2,
  FileText,
  PieChart as PieChartIcon,
  TrendingUp,
  Layers,
  Activity
} from 'lucide-react';

// ── Chart Colors Optimized for Light Mode ──
const STATUS_COLORS = {
  'Created':    '#6B7280', // gray-500
  'In Transit': '#F59E0B', // amber-500
  'Received':   '#6366F1', // indigo-500
  'Completed':  '#10B981', // emerald-500
};

const BAR_COLORS = [
  '#6366F1', // indigo-500
  '#8B5CF6', // violet-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#F43F5E', // rose-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#EC4899', // pink-500
];

// ── Custom Light Mode Tooltip ──
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm flex items-center gap-2 mt-1 first:mt-0">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 font-medium">{entry.name}:</span>
            <span className="font-bold text-gray-900">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ── Redesigned Light Stat Card ──
const StatCard = ({ label, value, borderColor, icon: Icon, iconColor, sub }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-indigo-300 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-extrabold text-gray-900 mt-1.5">{value ?? '—'}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-1 font-medium">{sub}</p>}
      </div>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center border bg-gray-50 shadow-inner group-hover:scale-105 transition-transform duration-300 ${borderColor}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
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
        if (isSuperAdmin) {
          const res = await api.get('/admin/stats');
          setStats(res.data.data);
        }

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
  }, [isSuperAdmin]);

  const localCounts = {
    total:     docs.length,
    created:   docs.filter(d => d.status === 'Created').length,
    inTransit: docs.filter(d => d.status === 'In Transit').length,
    received:  docs.filter(d => d.status === 'Received').length,
    completed: docs.filter(d => d.status === 'Completed').length,
  };

  const pieData = [
    { name: 'Created',    value: isSuperAdmin ? stats?.documents.created   ?? 0 : localCounts.created,   color: STATUS_COLORS['Created']    },
    { name: 'In Transit', value: isSuperAdmin ? stats?.documents.inTransit ?? 0 : localCounts.inTransit, color: STATUS_COLORS['In Transit'] },
    { name: 'Received',   value: isSuperAdmin ? stats?.documents.received  ?? 0 : localCounts.received,  color: STATUS_COLORS['Received']   },
    { name: 'Completed',  value: isSuperAdmin ? stats?.documents.completed ?? 0 : localCounts.completed, color: STATUS_COLORS['Completed']  },
  ].filter(d => d.value > 0);

  const adminByType = docs.reduce((acc, doc) => {
    const existing = acc.find(d => d.type === doc.type);
    if (existing) existing.count++;
    else acc.push({ type: doc.type, count: 1 });
    return acc;
  }, []).sort((a, b) => b.count - a.count);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 font-sans relative overflow-hidden">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-gray-500">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <p className="text-sm font-medium tracking-wide">Compiling analytics data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-indigo-500/30 selection:text-indigo-900 relative overflow-x-hidden">
      
      {/* Ambient glows */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100 blur-[120px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-100/60 blur-[100px] rounded-full" />

      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Analytics Dashboard
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2 font-medium">
            <Activity className="w-3.5 h-3.5 text-gray-400" />
            {isSuperAdmin
              ? 'System-wide document statistics and trends'
              : `Document statistics for ${user?.department}`}
          </p>
        </div>

        {/* ── SUPER ADMIN STAT CARDS ── */}
        {isSuperAdmin && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Documents" value={stats.documents.total}     borderColor="border-indigo-200"  iconColor="text-indigo-600"  icon={FolderKanban} sub="System-wide" />
            <StatCard label="In Transit"      value={stats.documents.inTransit} borderColor="border-amber-200"   iconColor="text-amber-500"   icon={Truck} />
            <StatCard label="Received"        value={stats.documents.received}  borderColor="border-blue-200"    iconColor="text-blue-500"    icon={Inbox} />
            <StatCard label="Completed"       value={stats.documents.completed} borderColor="border-emerald-200" iconColor="text-emerald-500" icon={CheckCircle2} />
            <StatCard label="Active Users"    value={stats.users}               borderColor="border-purple-200"  iconColor="text-purple-500"  icon={Users} sub="Registered accounts" />
            <StatCard label="Departments"     value={stats.departments}         borderColor="border-cyan-200"    iconColor="text-cyan-500"    icon={Building2} />
            <StatCard label="Created"         value={stats.documents.created}   borderColor="border-gray-200"    iconColor="text-gray-500"    icon={FileText} sub="Not yet routed" />
          </div>
        )}

        {/* ── ADMIN STAT CARDS ── */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Documents" value={localCounts.total}     borderColor="border-indigo-200"  iconColor="text-indigo-600"  icon={FolderKanban} sub="In your dept" />
            <StatCard label="In Transit"      value={localCounts.inTransit} borderColor="border-amber-200"   iconColor="text-amber-500"   icon={Truck} />
            <StatCard label="Received"        value={localCounts.received}  borderColor="border-blue-200"    iconColor="text-blue-500"    icon={Inbox} />
            <StatCard label="Completed"       value={localCounts.completed} borderColor="border-emerald-200" iconColor="text-emerald-500" icon={CheckCircle2} />
          </div>
        )}

        {/* ── UNIFIED CHART GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 1. Status Breakdown Pie (Visible to All) */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1 text-sm">
              <PieChartIcon className="w-4 h-4 text-indigo-600" /> Document Status Breakdown
            </h3>
            <p className="text-xs text-gray-500 mb-6 font-medium">
              {isSuperAdmin ? 'All documents system-wide' : `Documents in ${user?.department}`}
            </p>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm font-medium">
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
                    stroke="none"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span className="text-xs font-bold text-gray-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 2. Monthly Volume Line (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Monthly Document Volume
              </h3>
              <p className="text-xs text-gray-500 mb-6 font-medium">Last 6 months — system-wide</p>
              {!stats?.monthly || stats.monthly.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm font-medium">
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={stats.monthly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone" dataKey="count" name="Documents"
                      stroke="#6366F1" strokeWidth={3}
                      dot={{ fill: '#FFFFFF', stroke: '#6366F1', strokeWidth: 2, r: 4 }} 
                      activeDot={{ r: 6, fill: '#6366F1', stroke: '#C7D2FE' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* 3. Documents per Department (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1 text-sm">
                <Building2 className="w-4 h-4 text-cyan-500" /> Documents per Department
              </h3>
              <p className="text-xs text-gray-500 mb-6 font-medium">Current document location distribution</p>
              {!stats?.perDepartment || stats.perDepartment.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm font-medium">
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={stats.perDepartment}
                    margin={{ top: 5, right: 10, left: -20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis
                      dataKey="department"
                      tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6', opacity: 0.5 }} />
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

          {/* 4. Documents by Type (Visible to All) */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1 text-sm">
              <Layers className="w-4 h-4 text-purple-500" /> Documents by Type
            </h3>
            <p className="text-xs text-gray-500 mb-6 font-medium">
              {isSuperAdmin ? 'System-wide type breakdown' : `Breakdown in ${user?.department}`}
            </p>
            {(isSuperAdmin ? stats?.byType : adminByType)?.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm font-medium">
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
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }} tickLine={false} axisLine={false} width={80} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6', opacity: 0.5 }} />
                  <Bar dataKey="count" name="Documents" radius={[0, 4, 4, 0]} barSize={24}>
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