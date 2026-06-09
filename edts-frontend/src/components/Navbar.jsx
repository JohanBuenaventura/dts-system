// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) =>
    location.pathname === path
      ? 'bg-blue-700 text-white'
      : 'text-blue-100 hover:bg-blue-700 hover:text-white';

  const isAdminOrAbove = user?.role === 'Admin' || user?.role === 'Super Admin';
  const isSuperAdmin   = user?.role === 'Super Admin';

  return (
    <nav className="bg-blue-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">📄</span>
            <span className="text-white font-bold text-lg tracking-wide">EDTS</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/dashboard')}`}>
              Dashboard
            </Link>
            <Link to="/documents"
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/documents')}`}>
              Documents
            </Link>
            <Link to="/documents/create"
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/documents/create')}`}>
              + New
            </Link>
            {isAdminOrAbove && (
              <Link to="/analytics"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/analytics')}`}>
                📊 Analytics
              </Link>
            )}
            {isSuperAdmin && (
              <Link to="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/admin')}`}>
                👑 Users
              </Link>
            )}
            {isAdminOrAbove && !isSuperAdmin && (
  <Link to="/my-department"
    className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/my-department')}`}>
    🏢 My Department
  </Link>
)}
          </div>

          {/* User Info + Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{user?.full_name}</p>
              <p className="text-blue-300 text-xs">
                {isSuperAdmin ? '👑 Super Admin' : `${user?.role} · ${user?.department}`}
              </p>
            </div>
            <button onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-md transition">
              Logout
            </button>
          </div>

        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex gap-2 pb-3 flex-wrap">
          <Link to="/dashboard"        className="text-blue-100 hover:text-white text-sm px-2">Dashboard</Link>
          <Link to="/documents"        className="text-blue-100 hover:text-white text-sm px-2">Documents</Link>
          <Link to="/documents/create" className="text-blue-100 hover:text-white text-sm px-2">+ New</Link>
          {isAdminOrAbove && (
            <Link to="/analytics" className="text-blue-100 hover:text-white text-sm px-2">📊 Analytics</Link>
          )}
          {isSuperAdmin && (
            <Link to="/admin" className="text-blue-100 hover:text-white text-sm px-2">👑 Users</Link>
          )}
          {isAdminOrAbove && !isSuperAdmin && (
  <Link to="/my-department"
    className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/my-department')}`}>
    🏢 My Department
  </Link>
)}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;