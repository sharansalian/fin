import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Saves and restores the scroll position of the Layout `.content` div
 * (the immediate parent of the page's root element) per route.
 *
 * @param {React.RefObject} pageRef  - ref attached to the page's root div
 * @param {boolean}         ready    - true once data has loaded and content is rendered
 */
export function useScrollRestore(pageRef, ready) {
  const { pathname } = useLocation();
  const key = `scroll:${pathname}`;

  // Restore saved position once content is ready
  useEffect(() => {
    if (!ready) return;
    const container = pageRef.current?.parentElement;
    if (!container) return;
    const saved = sessionStorage.getItem(key);
    if (saved) container.scrollTop = parseInt(saved, 10);
  }, [ready, key, pageRef]);

  // Persist scroll position as the user scrolls
  useEffect(() => {
    if (!ready) return;
    const container = pageRef.current?.parentElement;
    if (!container) return;
    const save = () => sessionStorage.setItem(key, String(container.scrollTop));
    container.addEventListener('scroll', save, { passive: true });
    return () => container.removeEventListener('scroll', save);
  }, [ready, key, pageRef]);
}
