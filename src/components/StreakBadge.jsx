import { useState, useRef, useEffect } from 'react';
import { Flame, Trophy, BookOpen, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './StreakBadge.module.css';

export default function StreakBadge() {
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const streak = userProfile?.currentStreak || 0;
  const longest = userProfile?.longestStreak || 0;
  const total = userProfile?.totalArticlesRead || 0;
  const badges = userProfile?.badges || [];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={`${styles.trigger} ${streak > 0 ? styles.active : ''}`}
        onClick={() => setOpen((o) => !o)}
        title={streak > 0 ? `${streak}-day reading streak` : 'Start a reading streak'}
      >
        <Flame size={16} />
        {streak > 0 && <span className={styles.count}>{streak}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h4 className={styles.dropdownTitle}>Reading Streak</h4>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>

          <div className={styles.stats}>
            <div className={styles.statCard}>
              <Flame size={18} className={styles.statIconFire} />
              <div className={styles.statValue}>{streak}</div>
              <div className={styles.statLabel}>Current streak</div>
            </div>
            <div className={styles.statCard}>
              <Trophy size={18} className={styles.statIconTrophy} />
              <div className={styles.statValue}>{longest}</div>
              <div className={styles.statLabel}>Best streak</div>
            </div>
            <div className={styles.statCard}>
              <BookOpen size={18} className={styles.statIconBooks} />
              <div className={styles.statValue}>{total}</div>
              <div className={styles.statLabel}>Articles read</div>
            </div>
          </div>

          {badges.length > 0 && (
            <div className={styles.badgesSection}>
              <h5 className={styles.badgesTitle}>Badges</h5>
              <div className={styles.badgeGrid}>
                {badges.map((b) => (
                  <div key={b.id} className={styles.badge} title={b.name}>
                    <span className={styles.badgeIcon}>{b.icon}</span>
                    <span className={styles.badgeName}>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {badges.length === 0 && (
            <p className={styles.emptyBadges}>
              Read articles daily to earn badges and build your streak!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
