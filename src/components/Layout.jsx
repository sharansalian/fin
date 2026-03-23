import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { logout } from '../firebase/auth';
import {
  Bookmark, Archive, Heart, Tag, LogOut, Plus,
  Gem, Settings, Sun, Moon, Upload, MessageSquarePlus, Info,
  LayoutGrid, Puzzle,
} from 'lucide-react';
import { usePremium } from '../hooks/usePremium';
import { usePlugins } from '../plugins';
import AddArticleModal from './AddArticleModal';
import ImportModal from './ImportModal';
import PluginSlot from '../plugins/PluginSlot';
import styles from './Layout.module.css';

const navItems = [
  { to: '/', icon: Bookmark, label: 'My List', exact: true },
  { to: '/archive', icon: Archive, label: 'Archive' },
  { to: '/favorites', icon: Heart, label: 'Favorites' },
  { to: '/tags', icon: Tag, label: 'Tags' },
  { to: '/collections', icon: LayoutGrid, label: 'Collections', premium: true },
  { to: '/plugins', icon: Puzzle, label: 'Plugins' },
  { to: '/support', icon: MessageSquarePlus, label: 'Support' },
];

export default function Layout({ children }) {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { theme, toggle } = useTheme();
  const { navItems: pluginNavItems, headerActions: pluginHeaderActions, settingsMenuItems: pluginSettingsItems } = usePlugins();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close settings dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = (user?.displayName || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getPageTitle = () => {
    if (location.pathname === '/') return 'My List';
    if (location.pathname.startsWith('/archive')) return 'Archive';
    if (location.pathname.startsWith('/favorites')) return 'Favorites';
    if (location.pathname.startsWith('/tags')) return 'Tags';
    if (location.pathname.startsWith('/collections')) return 'Collections';
    if (location.pathname.startsWith('/premium')) return 'Premium';
    if (location.pathname.startsWith('/plugins')) return 'Plugins';
    if (location.pathname.startsWith('/support')) return 'Support';
    if (location.pathname.startsWith('/about')) return 'About';
    // Check plugin-registered routes
    const pluginNav = pluginNavItems.find((n) => location.pathname.startsWith(n.to));
    if (pluginNav) return pluginNav.label;
    return 'Pocket';
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Bookmark size={18} fill="currentColor" />
          </div>
          <span className={styles.logoText}>Pocket</span>
        </div>

        <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
          <Plus size={18} />
          Save Article
        </button>

        <nav className={styles.nav}>
          {navItems.filter((n) => !n.premium || isPremium).map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          {pluginNavItems.map(({ to, icon: Icon, label, exact, pluginId }) => (
            <NavLink
              key={`${pluginId}-${to}`}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              {Icon ? <Icon size={18} /> : <Puzzle size={18} />}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userDetails}>
              <p className={styles.userName}>{user?.displayName || user?.email?.split('@')[0] || 'User'}</p>
              <p className={styles.userEmail}>{user?.email}</p>
            </div>
          </div>
          <button className={`${styles.logoutBtn} btn-ghost`} onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <h2 className={styles.pageTitle}>{getPageTitle()}</h2>

          <div className={styles.headerRight} ref={settingsRef}>
            <PluginSlot name="headerActions" />
            <button
              className={`${styles.headerIconBtn} ${styles.gemBtn}`}
              onClick={() => navigate('/premium')}
              title="Pocket Premium"
            >
              <Gem size={18} />
            </button>

            <button
              className={styles.headerIconBtn}
              onClick={() => setShowSettings((o) => !o)}
              title="Settings"
            >
              <Settings size={18} />
            </button>

            {showSettings && (
              <div className={styles.settingsDropdown}>
                <button onClick={() => { toggle(); setShowSettings(false); }}>
                  {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                  {theme === 'light' ? 'Dark mode' : 'Light mode'}
                </button>
                <button onClick={() => { setShowImport(true); setShowSettings(false); }}>
                  <Upload size={15} />
                  Import from CSV
                </button>
                <button onClick={() => { navigate('/about'); setShowSettings(false); }}>
                  <Info size={15} />
                  About Pocket
                </button>
                {pluginSettingsItems.map((item, i) => {
                  const ItemIcon = item.icon || Puzzle;
                  return (
                    <button key={`${item.pluginId}-${i}`} onClick={() => { item.onClick?.(); setShowSettings(false); }}>
                      <ItemIcon size={15} />
                      {item.label}
                    </button>
                  );
                })}
                <div className={styles.separator} />
                <button onClick={handleLogout}>
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className={styles.mobileNav}>
        {navItems.filter((n) => !n.premium || isPremium).map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        {pluginNavItems.map(({ to, icon: Icon, label, exact, pluginId }) => (
          <NavLink
            key={`${pluginId}-${to}`}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`
            }
          >
            {Icon ? <Icon size={20} /> : <Puzzle size={20} />}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Floating action button (mobile) */}
      <button className={styles.fab} onClick={() => setShowAdd(true)}>
        <Plus size={24} />
      </button>

      {showAdd && <AddArticleModal onClose={() => setShowAdd(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
