// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  LayoutDashboard, 
  FolderOpen, 
  PlusCircle, 
  BarChart3, 
  Users, 
  Building2, 
  LogOut,
  ShieldAlert
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();

  const handleLogout = () => { 
    logout(); 
    navigate('/login'); 
  };

  const isActive = (path) =>
    location.pathname === path
      ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
      : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border-transparent';

  const isAdminOrAbove = user?.role === 'Admin' || user?.role === 'Super Admin';
  const isSuperAdmin   = user?.role === 'Super Admin';

  return (
    <nav className="bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-900 sticky top-0 z-50 shadow-md shadow-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo / Brand */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center group-hover:border-indigo-500/40 transition-colors">
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-zinc-100 font-bold text-lg tracking-wide bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              EDTS
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5">
            <Link to="/dashboard"
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-semibold uppercase tracking-wider transition ${isActive('/dashboard')}`}>
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <Link to="/documents"
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-semibold uppercase tracking-wider transition ${isActive('/documents')}`}>
              <FolderOpen className="w-3.5 h-3.5" />
              Documents
            </Link>
            <Link to="/documents/create"
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold uppercase tracking-wider transition ${isActive('/documents/create')}`}>
              <PlusCircle className="w-3.5 h-3.5" />
              Create
            </Link>
            
            {isAdminOrAbove && (
              <Link to="/analytics"
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-semibold uppercase tracking-wider transition ${isActive('/analytics')}`}>
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
              </Link>
            )}
            
            {isSuperAdmin && (
              <Link to="/admin"
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-semibold uppercase tracking-wider transition ${isActive('/admin')}`}>
                <Users className="w-3.5 h-3.5" />
                Users
              </Link>
            )}
            
            {isAdminOrAbove && !isSuperAdmin && (
              <Link to="/my-department"
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-semibold uppercase tracking-wider transition ${isActive('/my-department')}`}>
                <Building2 className="w-3.5 h-3.5" />
                Department
              </Link>
            )}
          </div>

          {/* User Meta Frame & Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block border-r border-zinc-800 pr-4">
              <p className="text-zinc-200 text-sm font-semibold tracking-tight">{user?.full_name}</p>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-0.5 flex items-center justify-end gap-1">
                {isSuperAdmin ? (
                  <>
                    <ShieldAlert className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-400">Super Admin</span>
                  </>
                ) : (
                  <span>{user?.role} · {user?.department}</span>
                )}
              </p>
            </div>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-rose-950/30 hover:border-rose-900/50 hover:text-rose-400 text-zinc-300 text-xs font-semibold uppercase tracking-wider px-3.5 py-2 rounded-xl transition duration-200 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Dropdown Area */}
        <div className="md:hidden flex gap-1.5 pb-3.5 flex-wrap border-t border-zinc-900/60 pt-2">
          <Link to="/dashboard" className={`px-2.5 py-1 text-xs border rounded-lg font-medium ${location.pathname === '/dashboard' ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'text-zinc-500 border-transparent'}`}>Dashboard</Link>
          <Link to="/documents" className={`px-2.5 py-1 text-xs border rounded-lg font-medium ${location.pathname === '/documents' ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'text-zinc-500 border-transparent'}`}>Documents</Link>
          <Link to="/documents/create" className={`px-2.5 py-1 text-xs border rounded-lg font-medium ${location.pathname === '/documents/create' ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'text-zinc-500 border-transparent'}`}>+ Create</Link>
          {isAdminOrAbove && (
            <Link to="/analytics" className={`px-2.5 py-1 text-xs border rounded-lg font-medium ${location.pathname === '/analytics' ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'text-zinc-500 border-transparent'}`}>Analytics</Link>
          )}
          {isSuperAdmin && (
            <Link to="/admin" className={`px-2.5 py-1 text-xs border rounded-lg font-medium ${location.pathname === '/admin' ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'text-zinc-500 border-transparent'}`}>Users</Link>
          )}
          {isAdminOrAbove && !isSuperAdmin && (
            <Link to="/my-department" className={`px-2.5 py-1 text-xs border rounded-lg font-medium ${location.pathname === '/my-department' ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'text-zinc-500 border-transparent'}`}>Department</Link>
          )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;