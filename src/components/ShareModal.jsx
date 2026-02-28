import { useState, useEffect, useRef } from 'react';
import { Bookmark } from 'lucide-react';
import { createShareLink } from '../firebase/articles';
import styles from './ShareModal.module.css';

// SVG icons for platforms
const WhatsAppIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.841L2.25 2.25h6.977l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export default function ShareModal({ article, onClose }) {
  const [copied, setCopied] = useState('');          // 'link' | 'pocket'
  const [shortCode, setShortCode] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const overlayRef = useRef(null);

  // Create the short link in the background as soon as the modal opens
  useEffect(() => {
    let cancelled = false;
    setCreatingLink(true);
    createShareLink(article)
      .then((code) => { if (!cancelled) { setShortCode(code); setCreatingLink(false); } })
      .catch(() => { if (!cancelled) setCreatingLink(false); });
    return () => { cancelled = true; };
  }, [article.id]); // eslint-disable-line

  const origin = window.location.origin;
  const pocketUrl = shortCode ? `${origin}/p/${shortCode}` : '';
  const articleUrl = article.url;

  const shareText = encodeURIComponent(article.title || '');
  const shareUrl  = encodeURIComponent(articleUrl);

  const socials = [
    {
      label: 'WhatsApp',
      icon: <WhatsAppIcon />,
      cls: styles.iconWhatsApp,
      href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
    },
    {
      label: 'LinkedIn',
      icon: <LinkedInIcon />,
      cls: styles.iconLinkedIn,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    },
    {
      label: 'X / Twitter',
      icon: <TwitterIcon />,
      cls: styles.iconTwitter,
      href: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`,
    },
  ];

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2200);
    } catch { /* ignore */ }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: article.title, url: pocketUrl || articleUrl });
    } catch { /* cancelled */ }
  };

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={styles.sheet}>
        <div className={styles.handle} />

        {/* Article preview */}
        <div className={styles.preview}>
          {article.heroImage ? (
            <img src={article.heroImage} alt="" className={styles.previewImg} onError={(e) => { e.currentTarget.style.display='none'; }} />
          ) : (
            <div className={styles.previewImgPlaceholder}>
              {(article.title || article.domain || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.previewText}>
            <div className={styles.previewTitle}>{article.title || article.domain}</div>
            <div className={styles.previewDomain}>{article.domain}</div>
          </div>
        </div>

        {/* Social icons */}
        <div className={styles.grid}>
          {socials.map(({ label, icon, cls, href }) => (
            <a
              key={label}
              className={styles.socialBtn}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
            >
              <div className={`${styles.socialIcon} ${cls}`}>{icon}</div>
              <span className={styles.socialLabel}>{label}</span>
            </a>
          ))}

          {/* Copy article link */}
          <button className={styles.socialBtn} onClick={() => copyText(articleUrl, 'link')}>
            <div className={`${styles.socialIcon} ${styles.iconCopy}`}>
              {copied === 'link' ? '✓' : '🔗'}
            </div>
            <span className={`${styles.socialLabel} ${copied === 'link' ? styles.copiedLabel : ''}`}>
              {copied === 'link' ? 'Copied!' : 'Copy link'}
            </span>
          </button>

          {/* Send to Pocket user — short link */}
          <button
            className={styles.socialBtn}
            disabled={creatingLink}
            onClick={() => pocketUrl && copyText(pocketUrl, 'pocket')}
          >
            <div className={`${styles.socialIcon} ${styles.iconPocket}`}>
              <Bookmark size={22} color="white" />
            </div>
            <span className={`${styles.socialLabel} ${copied === 'pocket' ? styles.copiedLabel : ''}`}>
              {copied === 'pocket' ? 'Copied!' : 'Pocket link'}
            </span>
          </button>

          {/* Native share sheet (mobile) */}
          {!!navigator.share && (
            <button className={styles.socialBtn} onClick={handleNativeShare}>
              <div className={`${styles.socialIcon} ${styles.iconNative}`}>⬆</div>
              <span className={styles.socialLabel}>More</span>
            </button>
          )}
        </div>

        {creatingLink && <p className={styles.creatingLabel}>Creating short link…</p>}

        <div className={styles.closeRow}>
          <button className={styles.closeBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
