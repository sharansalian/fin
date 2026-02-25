import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../firebase/auth';
import {
  LayoutDashboard, ScanLine, History, TrendingUp,
  LogOut, User, Bell, Sparkles
} from 'lucide-react';
import styles from './Layout.module.css';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scan', icon: ScanLine, label: 'Scan SMS' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/insights', icon: TrendingUp, label: 'Insights' },
];

export default function Layout({ children }) {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = (user?.displayName || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Sparkles size={18} />
          </div>
          <span className={styles.logoText}>FinScan</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userDetails}>
              <p className={styles.userName}>{user?.displayName || 'User'}</p>
              <p className={styles.userScore}>
                Score: <span>{userProfile?.creditScore || '—'}</span>
              </p>
            </div>
          </div>
          <button className={`${styles.logoutBtn} btn-ghost`} onClick={handleLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.pageTitle}>
              {navItems.find((n) => location.pathname.startsWith(n.to))?.label || 'FinScan'}
            </h2>
          </div>
          <div className={styles.headerRight}>
            <button className={`${styles.iconBtn} btn-ghost`}>
              <Bell size={18} />
            </button>
            <NavLink to="/profile" className={styles.headerAvatar}>
              {initials}
            </NavLink>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className={styles.mobileNav}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
