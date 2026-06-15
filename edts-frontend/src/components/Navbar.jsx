// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  LayoutDashboard,
  Files,
  Plus,
  BarChart3,
  ShieldAlert,
  Building2,
  LogOut
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdminOrAbove = user?.role === 'Admin' || user?.role === 'Super Admin';
  const isSuperAdmin   = user?.role === 'Super Admin';

  // Cohesive styling rules for interactive nav links
  const getNavLinkClass = (path) => {
    const baseClass = "px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 border";
    return location.pathname === path
      ? `${baseClass} bg-zinc-900/80 text-zinc-100 border-zinc-700/60 shadow-md shadow-black/10`
      : `${baseClass} text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border-transparent`;
  };

  const getMobileNavLinkClass = (path) => {
    const baseClass = "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border";
    return location.pathname === path
      ? `${baseClass} bg-zinc-900/80 text-zinc-100 border-zinc-800`
      : `${baseClass} text-zinc-400 hover:text-zinc-200 border-transparent`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/70 backdrop-blur-md border-b border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand Logo ── */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-zinc-900/60 border border-zinc-800 shadow-inner group-hover:border-zinc-700 transition-colors">
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-zinc-100 font-bold text-base tracking-tight uppercase">
              EDTS
            </span>
          </Link>

          {/* ── Desktop Navigation ── */}
          <div className="hidden md:flex items-center gap-1.5">
            <Link to="/dashboard" className={getNavLinkClass('/dashboard')}>
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link to="/documents" className={getNavLinkClass('/documents')}>
              <Files className="w-4 h-4" />
              Documents
            </Link>
            <Link to="/documents/create" className={getNavLinkClass('/documents/create')}>
              <Plus className="w-4 h-4" />
              New
            </Link>
            {isAdminOrAbove && (
              <Link to="/analytics" className={getNavLinkClass('/analytics')}>
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Analytics
              </Link>
            )}
            {isSuperAdmin && (
              <Link to="/admin" className={getNavLinkClass('/admin')}>
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                Users
              </Link>
            )}
            {isAdminOrAbove && !isSuperAdmin && (
              <Link to="/my-department" className={getNavLinkClass('/my-department')}>
                <Building2 className="w-4 h-4 text-amber-400" />
                My Department
              </Link>
            )}
          </div>

          {/* ── User Meta & Session Trigger ── */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-zinc-200 text-sm font-medium tracking-tight">
                {user?.full_name}
              </p>
              <p className="text-zinc-500 text-[11px] font-mono mt-0.5 uppercase tracking-wider">
                {isSuperAdmin ? 'Super Admin' : `${user?.role} · ${user?.department}`}
              </p>
            </div>
            
            <button 
              onClick={handleLogout}
              className="bg-zinc-900/50 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 border border-zinc-800 text-zinc-400 p-2 sm:px-3 sm:py-1.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>

        {/* ── Mobile Navigation Menu ── */}
        <div className="md:hidden flex gap-1 pb-3 flex-wrap border-t border-zinc-900 pt-2">
          <Link to="/dashboard" className={getMobileNavLinkClass('/dashboard')}>
            Dashboard
          </Link>
          <Link to="/documents" className={getMobileNavLinkClass('/documents')}>
            Documents
          </Link>
          <Link to="/documents/create" className={getMobileNavLinkClass('/documents/create')}>
            + New
          </Link>
          {isAdminOrAbove && (
            <Link to="/analytics" className={getMobileNavLinkClass('/analytics')}>
              Analytics
            </Link>
          )}
          {isSuperAdmin && (
            <Link to="/admin" className={getMobileNavLinkClass('/admin')}>
              Users
          </Link>
          )}
          {isAdminOrAbove && !isSuperAdmin && (
            <Link to="/my-department" className={getMobileNavLinkClass('/my-department')}>
              Department
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;