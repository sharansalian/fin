/**
 * SaveHandler — handles PWA share target (/save?url=...)
 * Shared logic from @pocket/core; identical across all apps.
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth }                      from '@pocket/core/context';
import { addArticle, updateArticle }    from '@pocket/core/firebase';
import { fetchMetadataOnly }            from '@pocket/core/utils';

export default function SaveHandler() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const saved     = useRef(false);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;

    const urlParam  = params.get('url') || '';
    const textParam = params.get('text') || '';
    const title     = params.get('title') || '';

    let rawUrl = urlParam.trim();
    if (!rawUrl && textParam) {
      const match = textParam.match(/https?:\/\/[^\s]+/);
      rawUrl = match ? match[0] : textParam.trim();
    }
    if (!rawUrl) { navigate('/'); return; }
    if (!/^https?:\/\//i.test(rawUrl)) rawUrl = 'https://' + rawUrl;

    (async () => {
      try { new URL(rawUrl); } catch { navigate('/'); return; }
      const domain = new URL(rawUrl).hostname.replace('www.', '');
      try {
        const ref = await addArticle(user.uid, {
          url: rawUrl, title: title || domain,
          excerpt: '', heroImage: '', domain, tags: [],
          estimatedReadTime: 0, content: '', fetchStatus: 'pending',
        });
        fetchMetadataOnly(rawUrl).then((meta) =>
          updateArticle(user.uid, ref.id, {
            title: meta.title || title || domain,
            excerpt: meta.excerpt, heroImage: meta.heroImage, domain: meta.domain,
          }).catch(() => {})
        );
      } catch { /* silent */ }
      navigate('/');
    })();
  }, [params, user.uid, navigate]);

  return (
    <div className="center-screen">
      <div className="spinner" />
      <p>Saving…</p>
    </div>
  );
}
