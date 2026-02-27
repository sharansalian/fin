/**
 * ✏️ CUSTOMIZE: add/remove routes for your app.
 *
 * Shared code comes from @pocket/core:
 *   AuthProvider, useAuth, ThemeProvider  → @pocket/core/context
 *   loginWithGoogle, logout               → @pocket/core/firebase
 *   getArticles, addArticle, …            → @pocket/core/firebase
 *   fetchMetadataOnly, summarizeArticle   → @pocket/core/utils
 *
 * Per-app code lives here in apps/<your-app>/src/
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth }  from '@pocket/core/context';
import { ThemeProvider }          from '@pocket/core/context';
import Login  from './pages/Login.jsx';
import Home   from './pages/Home.jsx';
import SaveHandler from './pages/SaveHandler.jsx';

// Protect routes that need auth
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen"><div className="spinner" /></div>;
  if (!user) {
    const intended = window.location.pathname + window.location.search;
    if (intended !== '/' && intended !== '/login')
      sessionStorage.setItem('redirectAfterLogin', intended);
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Share target — receives ?url=... from Android share sheet */}
      <Route path="/save"  element={<ProtectedRoute><SaveHandler /></ProtectedRoute>} />

      {/* ✏️ Add your pages here */}
      <Route path="/"      element={<ProtectedRoute><Home /></ProtectedRoute>} />

      <Route path="*"      element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
