import { useCallback, useState } from 'react';
import { useNavigate }       from 'react-router-dom';
import { loginWithGoogle }   from '@pocket/core/firebase';

export default function Login() {
  const navigate = useNavigate();
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      const redirect = sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirect, { replace: true });
    } catch (e) {
      setError(e?.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return (
    <div className="center-screen">
      <div className="auth-card">
        {/* ✏️ CUSTOMIZE: logo, app name, branding */}
        <h1 className="app-name">My App</h1>
        <p className="app-tagline">Your one-line pitch goes here.</p>

        <button
          className="btn-primary btn-google"
          onClick={handleGoogle}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
}
