import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addArticle, updateArticle } from '../firebase/articles';
import { fetchMetadataOnly } from '../utils/articleFetcher';

export default function SaveHandler() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;

    // `url` param is the canonical share target field.
    // `text` is used by some apps (LinkedIn, Twitter) and may contain a URL
    // embedded in prose like "Check this out: https://example.com" — extract it.
    const urlParam = params.get('url') || '';
    const textParam = params.get('text') || '';
    const title = params.get('title') || '';

    let rawUrl = urlParam.trim();
    if (!rawUrl && textParam) {
      const match = textParam.match(/https?:\/\/[^\s]+/);
      rawUrl = match ? match[0] : textParam.trim();
    }

    if (!rawUrl) { navigate('/'); return; }

    let url = rawUrl;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    const save = async () => {
      try {
        new URL(url);
      } catch {
        navigate('/');
        return;
      }

      try {
        const domain = new URL(url).hostname.replace('www.', '');
        const docRef = await addArticle(user.uid, {
          url,
          title: title || domain,
          excerpt: '',
          heroImage: '',
          domain,
          tags: [],
          estimatedReadTime: 0,
          content: '',
          fetchStatus: 'pending',
        });

        // Fetch metadata in background
        fetchMetadataOnly(url).then((meta) => {
          updateArticle(user.uid, docRef.id, {
            title: meta.title || title || domain,
            excerpt: meta.excerpt,
            heroImage: meta.heroImage,
            domain: meta.domain,
          }).catch(() => {});
        });
      } catch (e) {
        // Silently fail, just navigate home
      }

      navigate('/');
    };

    save();
  }, [params, user.uid, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <Loader size={32} style={{ animation: 'rotate 0.7s linear infinite', color: 'var(--accent-primary)' }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Saving article…</p>
    </div>
  );
}
