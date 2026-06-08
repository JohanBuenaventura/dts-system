// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute       from './components/ProtectedRoute';
import LoginPage            from './pages/LoginPage';
import RegisterPage         from './pages/RegisterPage';
import DashboardPage        from './pages/DashboardPage';
import DocumentsPage        from './pages/DocumentsPage';
import CreateDocumentPage   from './pages/CreateDocumentPage';
import DocumentDetailPage   from './pages/DocumentDetailPage';
import AdminPage            from './pages/AdminPage';

// Guard for Super Admin only routes
const SuperAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'Super Admin') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          }/>
          <Route path="/documents" element={
            <ProtectedRoute><DocumentsPage /></ProtectedRoute>
          }/>
          <Route path="/documents/create" element={
            <ProtectedRoute><CreateDocumentPage /></ProtectedRoute>
          }/>
          <Route path="/documents/:id" element={
            <ProtectedRoute><DocumentDetailPage /></ProtectedRoute>
          }/>

          {/* Super Admin Only */}
          <Route path="/admin" element={
            <SuperAdminRoute><AdminPage /></SuperAdminRoute>
          }/>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;