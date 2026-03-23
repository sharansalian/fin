import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PluginProvider, usePlugins } from './plugins';
import setupPlugins from './plugins/setup';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import MyList from './pages/MyList';
import Archive from './pages/Archive';
import Favorites from './pages/Favorites';
import Tags from './pages/Tags';
import Reader from './pages/Reader';
import SaveHandler from './pages/SaveHandler';
import Collections from './pages/Collections';
import Premium from './pages/Premium';
import Support from './pages/Support';
import About from './pages/About';
import Plugins from './pages/Plugins';
import NotFound from './pages/NotFound';
import ShareRedirect from './pages/ShareRedirect';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import BlogReadingToolkit from './pages/BlogReadingToolkit';

// Register built-in plugins once at module load
setupPlugins();

const REDIRECT_AFTER_LOGIN_KEY = 'redirectAfterLogin';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          background: 'var(--accent-primary)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    // Preserve the full path+search so the share flow isn't lost after login
    const intended = window.location.pathname + window.location.search;
    if (intended !== '/' && intended !== '/login') {
      sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, intended);
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}

export { REDIRECT_AFTER_LOGIN_KEY };

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

// Root route: marketing landing page for guests, app for signed-in users
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Landing />;
  return (
    <Layout>
      <MyList />
    </Layout>
  );
}

function usePluginRoutes() {
  const { routes } = usePlugins();
  return routes.map(({ path, element, pluginId }) => (
    <Route
      key={`${pluginId}-${path}`}
      path={path}
      element={
        <ProtectedRoute>
          <Layout>{element}</Layout>
        </ProtectedRoute>
      }
    />
  ));
}

function AppRoutes() {
  const pluginRoutes = usePluginRoutes();
  return (
    <Routes>
      {/* Root: show landing page for guests, app for signed-in users */}
      <Route path="/" element={<RootRoute />} />
      <Route
        path="/archive"
        element={
          <ProtectedRoute>
            <Layout>
              <Archive />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <Layout>
              <Favorites />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tags"
        element={
          <ProtectedRoute>
            <Layout>
              <Tags />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tags/:tag"
        element={
          <ProtectedRoute>
            <Layout>
              <Tags />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/collections"
        element={
          <ProtectedRoute>
            <Layout>
              <Collections />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/read/:id"
        element={
          <ProtectedRoute>
            <Reader />
          </ProtectedRoute>
        }
      />
      <Route
        path="/save"
        element={
          <ProtectedRoute>
            <SaveHandler />
          </ProtectedRoute>
        }
      />
      <Route
        path="/premium"
        element={
          <ProtectedRoute>
            <Layout>
              <Premium />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <Layout>
              <Support />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <Layout>
              <About />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/p/:code" element={<ShareRedirect />} />
      <Route path="/blog/reading-toolkit" element={<BlogReadingToolkit />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/refund" element={<Refund />} />
      <Route
        path="/plugins"
        element={
          <ProtectedRoute>
            <Layout>
              <Plugins />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* Dynamic plugin routes */}
      {pluginRoutes}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PluginProvider>
            <AppRoutes />
          </PluginProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
