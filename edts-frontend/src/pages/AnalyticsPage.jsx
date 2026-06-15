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

// ── Chart Colors Optimized for Dark Mode ──
const STATUS_COLORS = {
  'Created':    '#71717A', // zinc-500
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

// ── Custom Dark Mode Tooltip ──
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 px-4 py-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm flex items-center gap-2 mt-1 first:mt-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-zinc-400 font-medium">{entry.name}:</span>
            <span className="font-bold text-zinc-100">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ── Redesigned Glassmorphic Stat Card ──
const StatCard = ({ label, value, borderColor, icon: Icon, iconColor, sub }) => (
  <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-lg shadow-black/20 flex items-center justify-between group transition-all hover:border-zinc-700/80 hover:bg-zinc-900/60">
    <div>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-zinc-100 mt-1.5">{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-1 font-medium">{sub}</p>}
    </div>
    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${borderColor} bg-zinc-950/50 shadow-inner group-hover:scale-105 transition-transform duration-300`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
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
    <div className="min-h-screen bg-zinc-950 font-sans relative overflow-hidden">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-zinc-400">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm font-medium tracking-wide">Compiling analytics matrix data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* ── Header Area ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
              Analytics Dashboard
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-2 font-medium flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-zinc-600" />
            {isSuperAdmin
              ? 'System-wide document transaction statistics and flow distributions.'
              : `Aggregated document lifecycle tracking logs for ${user?.department}.`}
          </p>
        </div>

        {/* ── SUPER ADMIN CARDS ── */}
        {isSuperAdmin && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Documents" value={stats.documents.total}     borderColor="border-indigo-900/50"  iconColor="text-indigo-400"  icon={FolderKanban} sub="System-wide" />
            <StatCard label="In Transit"      value={stats.documents.inTransit} borderColor="border-amber-900/50"   iconColor="text-amber-400"   icon={Truck} />
            <StatCard label="Received"        value={stats.documents.received}  borderColor="border-indigo-900/40"  iconColor="text-indigo-400"  icon={Inbox} />
            <StatCard label="Completed"       value={stats.documents.completed} borderColor="border-emerald-900/50" iconColor="text-emerald-400" icon={CheckCircle2} />
            <StatCard label="Active Users"    value={stats.users}               borderColor="border-purple-900/50"  iconColor="text-purple-400"  icon={Users} sub="Registered accounts" />
            <StatCard label="Departments"     value={stats.departments}         borderColor="border-cyan-900/50"    iconColor="text-cyan-400"    icon={Building2} />
            <StatCard label="Created"         value={stats.documents.created}   borderColor="border-zinc-700"       iconColor="text-zinc-400"    icon={FileText} sub="Not yet routed" />
          </div>
        )}

        {/* ── ADMIN CARDS ── */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Documents" value={localCounts.total}     borderColor="border-indigo-900/50"  iconColor="text-indigo-400"  icon={FolderKanban} sub="In your dept" />
            <StatCard label="In Transit"      value={localCounts.inTransit} borderColor="border-amber-900/50"   iconColor="text-amber-400"   icon={Truck} />
            <StatCard label="Received"        value={localCounts.received}  borderColor="border-indigo-900/40"  iconColor="text-indigo-400"  icon={Inbox} />
            <StatCard label="Completed"       value={localCounts.completed} borderColor="border-emerald-900/50" iconColor="text-emerald-400" icon={CheckCircle2} />
          </div>
        )}

        {/* ── ROW 1: Pie + Line Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Pie Distribution Card */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl p-6 shadow-black/10">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2 mb-1 text-sm">
              <PieChartIcon className="w-4 h-4 text-indigo-400" /> Document Status Breakdown
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              {isSuperAdmin ? 'Global system distribution summary' : `Current metrics within ${user?.department}`}
            </p>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-zinc-600 text-sm font-medium">
                No active document data sets found.
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
                  <Legend formatter={v => <span className="text-xs font-semibold text-zinc-400 tracking-tight">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Line Chart Card (Super Admin only) */}
          {isSuperAdmin && (
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl p-6 shadow-black/10">
              <h3 className="font-semibold text-zinc-100 flex items-center gap-2 mb-1 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Monthly Document Volume
              </h3>
              <p className="text-xs text-zinc-500 mb-6">System transaction trends over the trailing 6 months</p>
              {!stats?.monthly || stats.monthly.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-zinc-600 text-sm font-medium">
                  No tracking sequences logged yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={stats.monthly} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717A', fontWeight: 500 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717A', fontWeight: 500 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone" dataKey="count" name="Documents"
                      stroke="#6366F1" strokeWidth={3}
                      dot={{ fill: '#18181B', stroke: '#6366F1', strokeWidth: 2, r: 4 }} 
                      activeDot={{ r: 6, fill: '#6366F1', stroke: '#A5B4FC' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>

        {/* ── ROW 2: Bar Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Bar Chart — Department (Super Admin only) */}
          {isSuperAdmin && (
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl p-6 shadow-black/10">
              <h3 className="font-semibold text-zinc-100 flex items-center gap-2 mb-1 text-sm">
                <Building2 className="w-4 h-4 text-cyan-400" /> Documents per Department
              </h3>
              <p className="text-xs text-zinc-500 mb-6">Structural location density indices</p>
              {!stats?.perDepartment || stats.perDepartment.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-zinc-600 text-sm font-medium">
                  No distribution logs found.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={stats.perDepartment}
                    margin={{ top: 5, right: 10, left: -25, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                    <XAxis
                      dataKey="department"
                      tick={{ fontSize: 10, fill: '#71717A', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#71717A', fontWeight: 500 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#27272A', opacity: 0.15 }} />
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

          {/* Bar Chart — Horizontal Categories */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl p-6 shadow-black/10">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2 mb-1 text-sm">
              <Layers className="w-4 h-4 text-purple-400" /> Documents by Type
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              {isSuperAdmin ? 'System-wide classification matrix' : `Classification parameters in ${user?.department}`}
            </p>
            {(isSuperAdmin ? stats?.byType : adminByType)?.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-zinc-600 text-sm font-medium">
                No categorized items indexed.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={isSuperAdmin ? stats?.byType : adminByType}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#71717A', fontWeight: 500 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: '#A1A1AA', fontWeight: 500 }} tickLine={false} axisLine={false} width={75} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#27272A', opacity: 0.15 }} />
                  <Bar dataKey="count" name="Documents" radius={[0, 4, 4, 0]} barSize={20}>
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