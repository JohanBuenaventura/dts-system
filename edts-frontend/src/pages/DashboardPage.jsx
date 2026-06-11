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
  FileText
} from 'lucide-react';

const StatCard = ({ label, value, colorClass, icon: Icon, iconColor }) => (
  <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-lg shadow-black/20 flex items-center justify-between group transition-all hover:border-zinc-700/80 hover:bg-zinc-900/60">
    <div>
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-zinc-100 mt-2">{value}</p>
    </div>
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${colorClass} bg-zinc-950/50 shadow-inner group-hover:scale-105 transition-transform duration-300`}>
      <Icon className={`w-6 h-6 ${iconColor}`} />
    </div>
  </div>
);

const DashboardPage = () => {
  const { user }              = useAuth();
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const isSuperAdmin          = user?.role === 'Super Admin';
  const isAdmin               = user?.role === 'Admin';

  useEffect(() => {
    api.get('/documents', { params: { page: 1, limit: 9999 } })
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
      'Created':    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
      'In Transit': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Received':   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      'Completed':  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return map[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* Welcome */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{user?.full_name}</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-2 flex items-center gap-2">
            {isSuperAdmin ? (
              <><ShieldAlert className="w-4 h-4 text-indigo-400" /> Super Admin · Full System Overview</>
            ) : (
              <><FileText className="w-4 h-4 text-zinc-500" /> {user?.role} · {user?.department}</>
            )}
          </p>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <div className="flex items-center space-x-2 text-zinc-400 mb-10">
             <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
             <span className="text-sm font-medium">Loading statistics...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard 
              label="Total Documents" 
              value={counts.total}     
              colorClass="border-zinc-700" 
              iconColor="text-zinc-400"
              icon={FolderKanban} 
            />
            <StatCard 
              label="In Transit"      
              value={counts.inTransit} 
              colorClass="border-amber-900/50" 
              iconColor="text-amber-400"
              icon={Truck} 
            />
            <StatCard 
              label="Received"        
              value={counts.received}  
              colorClass="border-indigo-900/50" 
              iconColor="text-indigo-400"
              icon={Inbox} 
            />
            <StatCard 
              label="Completed"       
              value={counts.completed} 
              colorClass="border-emerald-900/50" 
              iconColor="text-emerald-400"
              icon={CheckCircle2} 
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3 mb-10 flex-wrap">
          <Link to="/documents/create"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-900/20 border border-indigo-500">
            <Plus className="w-4 h-4" /> Create Document
          </Link>
          <Link to="/documents"
            className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 backdrop-blur-md">
            <Files className="w-4 h-4 text-zinc-400" /> View All Documents
          </Link>
          {(isSuperAdmin || isAdmin) && (
            <Link to="/analytics"
              className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 backdrop-blur-md">
              <BarChart3 className="w-4 h-4 text-cyan-400" /> View Analytics
            </Link>
          )}
          {isSuperAdmin && (
            <Link to="/admin"
              className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 backdrop-blur-md">
              <ShieldAlert className="w-4 h-4 text-purple-400" /> User Management
            </Link>
          )}
        </div>

        {/* Recent Documents */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Recent Documents
            </h3>
            <Link to="/documents" className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium flex items-center gap-1 group">
              View all <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          {loading ? (
            <div className="p-8 text-zinc-500 text-sm text-center">Loading recent activity...</div>
          ) : recent.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <Inbox className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-zinc-400 text-sm mb-2">No documents yet.</p>
              <Link to="/documents/create" className="text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors">
                Create your first document
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {recent.map(doc => (
                <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors group">
                  <div>
                    <p className="font-medium text-zinc-200 text-sm group-hover:text-indigo-200 transition-colors">{doc.title}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-mono tracking-tight">
                      {doc.tracking_code} <span className="text-zinc-700 mx-1">•</span> {doc.type} <span className="text-zinc-700 mx-1">•</span> {doc.current_location_dept}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border uppercase tracking-wider ${statusBadge(doc.status)}`}>
                      {doc.status}
                    </span>
                    <Link to={`/documents/${doc.id}`}
                      className="text-zinc-400 hover:text-indigo-400 transition-colors p-2 rounded-lg hover:bg-zinc-800">
                      <ArrowRight className="w-4 h-4" />
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