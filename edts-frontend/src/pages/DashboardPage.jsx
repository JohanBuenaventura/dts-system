// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import {
  FolderKanban,
  Truck,
  Inbox,
  CheckCircle2,
  Plus,
  Files,
  BarChart3,
  ShieldAlert,
  ArrowRight,
  FileText,
  Activity,
} from 'lucide-react';

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, borderColor, icon: Icon, iconColor, loading }) => (
  <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-lg shadow-black/20 flex items-center justify-between group transition-all hover:border-zinc-700/80 hover:bg-zinc-900/60">
    <div>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-12 rounded-lg bg-zinc-800 animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-zinc-100 mt-1.5">{value ?? '—'}</p>
      )}
    </div>
    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${borderColor} bg-zinc-950/50 shadow-inner group-hover:scale-105 transition-transform duration-300`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
  </div>
);

// ── Status Badge ─────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    'Created':    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    'In Transit': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Received':   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'Completed':  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  return map[status] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
};

// ── Activity dot color ────────────────────────────────────────────────────────
const activityDot = (status) => {
  const map = {
    'Created':    'bg-zinc-500',
    'In Transit': 'bg-amber-400',
    'Received':   'bg-indigo-400',
    'Completed':  'bg-emerald-400',
  };
  return map[status] ?? 'bg-zinc-500';
};

// ── Progress bar fill ─────────────────────────────────────────────────────────
const progressColor = (status) => {
  const map = {
    'Completed':  'bg-emerald-500/60',
    'In Transit': 'bg-amber-500/60',
    'Received':   'bg-indigo-500/60',
    'Created':    'bg-zinc-500/60',
  };
  return map[status] ?? 'bg-zinc-500/60';
};

// ── Main Component ────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { user }              = useAuth();
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin      = user?.role === 'Admin';

  useEffect(() => {
    api.get('/documents', { params: { page: 1, limit: 9999 } })
      .then(res => setDocs(res.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    total:     docs.length,
    inTransit: docs.filter(d => d.status === 'In Transit').length,
    received:  docs.filter(d => d.status === 'Received').length,
    completed: docs.filter(d => d.status === 'Completed').length,
    created:   docs.filter(d => d.status === 'Created').length,
  };

  const recent   = docs.slice(0, 5);
  const statuses = ['Completed', 'In Transit', 'Received', 'Created'];
  const statColors = {
    Completed:  'text-emerald-400',
    'In Transit':'text-amber-400',
    Received:   'text-indigo-400',
    Created:    'text-zinc-400',
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">

      {/* Ambient glows */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* ── Welcome ── */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Welcome back,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              {user?.full_name}
            </span>
          </h2>
          <p className="text-zinc-500 text-sm mt-1.5 flex items-center gap-2">
            {isSuperAdmin ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                Super Admin · Full System Overview
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                {user?.role} · {user?.department}
              </>
            )}
          </p>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Documents"
            value={counts.total}
            borderColor="border-zinc-700"
            iconColor="text-zinc-400"
            icon={FolderKanban}
            loading={loading}
          />
          <StatCard
            label="In Transit"
            value={counts.inTransit}
            borderColor="border-amber-900/50"
            iconColor="text-amber-400"
            icon={Truck}
            loading={loading}
          />
          <StatCard
            label="Received"
            value={counts.received}
            borderColor="border-indigo-900/50"
            iconColor="text-indigo-400"
            icon={Inbox}
            loading={loading}
          />
          <StatCard
            label="Completed"
            value={counts.completed}
            borderColor="border-emerald-900/50"
            iconColor="text-emerald-400"
            icon={CheckCircle2}
            loading={loading}
          />
        </div>

        {/* ── Quick Actions ── */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <Link
            to="/documents/create"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create Document
          </Link>
          <Link
            to="/documents"
            className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 backdrop-blur-md"
          >
            <Files className="w-4 h-4 text-zinc-400" />
            View All Documents
          </Link>
          {(isSuperAdmin || isAdmin) && (
            <Link
              to="/analytics"
              className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 backdrop-blur-md"
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              View Analytics
            </Link>
          )}
          {isSuperAdmin && (
            <Link
              to="/admin"
              className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 backdrop-blur-md"
            >
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              User Management
            </Link>
          )}
        </div>

        {/* ── Bottom Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Documents — 2/3 */}
          <div className="lg:col-span-2 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
              <h3 className="font-semibold text-zinc-100 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-indigo-400" />
                Recent Documents
              </h3>
              <Link
                to="/documents"
                className="text-indigo-400 hover:text-indigo-300 transition-colors text-xs font-medium flex items-center gap-1 group"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {loading ? (
              <div className="divide-y divide-zinc-800/60">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-2/3 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-2.5 w-1/2 bg-zinc-800/60 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-20 bg-zinc-800 rounded-full animate-pulse ml-4" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                  <Inbox className="w-5 h-5 text-zinc-600" />
                </div>
                <p className="text-zinc-400 text-sm mb-2">No documents yet.</p>
                <Link
                  to="/documents/create"
                  className="text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors"
                >
                  Create your first document
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {recent.map(doc => (
                  <div
                    key={doc.id}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-200 text-sm group-hover:text-indigo-200 transition-colors truncate">
                        {doc.title}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 font-mono tracking-tight">
                        {doc.tracking_code}
                        <span className="text-zinc-700 mx-1">·</span>
                        {doc.type}
                        <span className="text-zinc-700 mx-1">·</span>
                        {doc.current_location_dept}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border uppercase tracking-wider ${statusBadge(doc.status)}`}
                      >
                        {doc.status}
                      </span>
                      <Link
                        to={`/documents/${doc.id}`}
                        className="text-zinc-600 hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Status Breakdown */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-zinc-100 text-sm">Status Breakdown</h3>
              </div>
              <div className="p-5 space-y-3.5">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-2.5 w-1/3 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-1.5 bg-zinc-800 rounded-full animate-pulse" />
                    </div>
                  ))
                ) : (
                  statuses.map(status => {
                    const count = docs.filter(d => d.status === status).length;
                    const pct   = docs.length > 0 ? (count / docs.length) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-zinc-400 font-medium">{status}</span>
                          <span className={`font-semibold font-mono ${statColors[status]}`}>{count}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor(status)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden flex-1">
              <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
                <h3 className="font-semibold text-zinc-100 text-sm">Recent Activity</h3>
              </div>
              <div className="p-4 space-y-3">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 mt-1.5 flex-shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-full" />
                        <div className="h-2 bg-zinc-800/60 rounded animate-pulse w-1/3" />
                      </div>
                    </div>
                  ))
                ) : (
                  recent.map(doc => (
                    <div key={doc.id} className="flex gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${activityDot(doc.status)}`} />
                      <div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          <span className="font-semibold text-zinc-200">{doc.title}</span>
                          {' '}is{' '}
                          <span className="font-medium">{doc.status}</span>.
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">{doc.tracking_code}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};

export default DashboardPage;