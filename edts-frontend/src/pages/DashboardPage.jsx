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
  AlertTriangle
} from 'lucide-react';

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, borderColor, icon: Icon, iconColor, loading }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-indigo-300 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        {loading ? (
          <div className="mt-2 h-8 w-12 rounded-lg bg-gray-200 animate-pulse" />
        ) : (
          <p className="text-3xl font-extrabold text-gray-900 mt-1.5">{value ?? '—'}</p>
        )}
      </div>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center border bg-gray-50 shadow-inner group-hover:scale-105 transition-transform duration-300 ${borderColor}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

// ── Status Badge ─────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    'Created':    'bg-gray-100 text-gray-700 border-gray-200',
    'In Transit': 'bg-amber-100 text-amber-700 border-amber-200',
    'Received':   'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Completed':  'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
};

// ── Activity dot color ────────────────────────────────────────────────────────
const activityDot = (status) => {
  const map = {
    'Created':    'bg-gray-400',
    'In Transit': 'bg-amber-500',
    'Received':   'bg-indigo-500',
    'Completed':  'bg-emerald-500',
  };
  return map[status] ?? 'bg-gray-400';
};

// ── Progress bar fill ─────────────────────────────────────────────────────────
const progressColor = (status) => {
  const map = {
    'Completed':  'bg-emerald-500',
    'In Transit': 'bg-amber-500',
    'Received':   'bg-indigo-500',
    'Created':    'bg-gray-400',
  };
  return map[status] ?? 'bg-gray-400';
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

// Sort by newest first, THEN grab the top 5
  const recent = [...docs]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
  const statuses = ['Completed', 'In Transit', 'Received', 'Created'];
  const statColors = {
    Completed:  'text-emerald-600',
    'In Transit':'text-amber-600',
    Received:   'text-indigo-600',
    Created:    'text-gray-600',
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-indigo-500/30 selection:text-indigo-900 relative overflow-x-hidden">

      {/* Ambient background glows */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100 blur-[120px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-100/60 blur-[100px] rounded-full" />

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* ── Welcome ── */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-indigo-600 bg-clip-text text-transparent">
              {user?.full_name}
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-1.5 flex items-center gap-2 font-medium">
            {isSuperAdmin ? (
              <>
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                Super Admin · Full System Overview
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-gray-400" />
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
            borderColor="border-gray-200"
            iconColor="text-gray-500"
            icon={FolderKanban}
            loading={loading}
          />
          <StatCard
            label="In Transit"
            value={counts.inTransit}
            borderColor="border-amber-200"
            iconColor="text-amber-500"
            icon={Truck}
            loading={loading}
          />
          <StatCard
            label="Received"
            value={counts.received}
            borderColor="border-indigo-200"
            iconColor="text-indigo-600"
            icon={Inbox}
            loading={loading}
          />
          <StatCard
            label="Completed"
            value={counts.completed}
            borderColor="border-emerald-200"
            iconColor="text-emerald-500"
            icon={CheckCircle2}
            loading={loading}
          />
        </div>

        {/* ── Quick Actions ── */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <Link
            to="/documents/create"
            className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-gray-900/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create Document
          </Link>
          <Link
            to="/documents"
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm"
          >
            <Files className="w-4 h-4 text-gray-400" />
            View All Documents
          </Link>
          {(isSuperAdmin || isAdmin) && (
            <Link
              to="/analytics"
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm"
            >
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              View Analytics
            </Link>
          )}
          {isSuperAdmin && (
            <Link
              to="/admin"
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm"
            >
              <ShieldAlert className="w-4 h-4 text-purple-500" />
              User Management
            </Link>
          )}
        </div>

        {/* ── Bottom Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Documents — 2/3 */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-indigo-600" />
                Recent Documents
              </h3>
              <Link
                to="/documents"
                className="text-indigo-600 hover:text-indigo-700 transition-colors text-xs font-bold flex items-center gap-1 group"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {loading ? (
              <div className="divide-y divide-gray-100">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
                      <div className="h-2.5 w-1/2 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse ml-4" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
                  <Inbox className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm mb-2 font-medium">No documents yet.</p>
                <Link
                  to="/documents/create"
                  className="text-indigo-600 hover:text-indigo-700 font-bold text-sm transition-colors"
                >
                  Create your first document
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recent.map(doc => (
                  <div
                    key={doc.id}
                    className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors truncate">
                        {doc.title}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 font-mono tracking-tight">
                        {doc.tracking_code}
                        <span className="text-gray-300 mx-1.5">•</span>
                        {doc.type}
                        <span className="text-gray-300 mx-1.5">•</span>
                        {doc.current_location_dept}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${statusBadge(doc.status)}`}
                      >
                        {doc.status}
                      </span>
                      <Link
                        to={`/documents/${doc.id}`}
                        className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors p-1.5 rounded-lg"
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
          <div className="flex flex-col gap-6">

            {/* Status Breakdown */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-gray-900 text-sm">Status Breakdown</h3>
              </div>
              <div className="p-5 space-y-4">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-2.5 w-1/3 bg-gray-200 rounded animate-pulse" />
                      <div className="h-1.5 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                  ))
                ) : (
                  statuses.map(status => {
                    const count = docs.filter(d => d.status === status).length;
                    const pct   = docs.length > 0 ? (count / docs.length) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-600 font-bold">{status}</span>
                          <span className={`font-bold font-mono ${statColors[status]}`}>{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden flex-1">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">Recent Activity</h3>
              </div>
              <div className="p-5 space-y-4">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mt-1.5 flex-shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-2.5 bg-gray-200 rounded animate-pulse w-full" />
                        <div className="h-2 bg-gray-100 rounded animate-pulse w-1/3" />
                      </div>
                    </div>
                  ))
                ) : (
                  recent.map(doc => (
                    <div key={doc.id} className="flex gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${activityDot(doc.status)}`} />
                      <div>
                        <p className="text-xs text-gray-600 leading-relaxed font-medium">
                          <span className="font-bold text-gray-900">{doc.title}</span>
                          {' '}is{' '}
                          <span className="font-bold">{doc.status}</span>.
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{doc.tracking_code}</p>
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