import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Client-side fallback for /p/:code share links.
 *
 * Normally the sharePreview Cloud Function handles these requests and serves
 * HTML with OG meta tags + a redirect. This component acts as a safety net
 * when the Cloud Function isn't reachable (e.g. Vercel deployment, function
 * not deployed, offline with SW fallback).
 *
 * Flow: read /shares/{code} from Firestore → redirect to /save?url=…
 */
export default function ShareRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) { setError(true); return; }

    const lookup = async () => {
      try {
        const snap = await getDoc(doc(db, 'shares', code));
        if (!snap.exists()) { setError(true); return; }

        const data = snap.data();
        if (!data.url) { setError(true); return; }

        const params = new URLSearchParams({ url: data.url });
        if (data.title) params.set('title', data.title);
        if (data.heroImage) params.set('heroImage', data.heroImage);
        navigate(`/save?${params.toString()}`, { replace: true });
      } catch {
        setError(true);
      }
    };

    lookup();
  }, [code, navigate]);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '24px',
      }}>
        <h1 style={{ fontSize: '72px', fontWeight: '900', color: 'var(--accent-primary)' }}>404</h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
          This shared link is no longer available
        </p>
        <a href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
          Go to Pocket
        </a>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Opening shared article...</p>
    </div>
  );
}
