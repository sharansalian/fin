import { useState } from 'react';
import { usePlugins } from '../plugins/usePlugins';
import { usePremium } from '../hooks/usePremium';
import { Puzzle, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Plugins.module.css';

export default function Plugins() {
  const { plugins, active, activate, deactivate, isActive, settingsPanels } = usePlugins();
  const { isPremium } = usePremium();
  const [expanded, setExpanded] = useState(null);

  const togglePlugin = (id, premium) => {
    if (premium && !isPremium) return;
    if (isActive(id)) {
      deactivate(id);
    } else {
      activate(id);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <Puzzle size={20} />
        <div>
          <h3 className={styles.introTitle}>Plugins</h3>
          <p className={styles.introDesc}>
            Extend Pocket with plugins for integrations, content processing, and custom UI.
          </p>
        </div>
      </div>

      <div className={styles.stats}>
        <span>{plugins.length} available</span>
        <span className={styles.dot} />
        <span>{active.length} active</span>
      </div>

      {plugins.length === 0 && (
        <p className={styles.empty}>No plugins installed yet. Plugins will appear here once registered.</p>
      )}

      <div className={styles.list}>
        {plugins.map((plugin) => {
          const Icon = plugin.icon || Puzzle;
          const on = isActive(plugin.id);
          const locked = plugin.premium && !isPremium;
          const isExpanded = expanded === plugin.id;
          const panel = settingsPanels.find((p) => p.pluginId === plugin.id);

          return (
            <div key={plugin.id} className={`${styles.card} ${on ? styles.cardActive : ''}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <Icon size={18} />
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardNameRow}>
                    <span className={styles.cardName}>{plugin.name}</span>
                    {plugin.version && <span className={styles.cardVersion}>v{plugin.version}</span>}
                    {plugin.premium && <span className={styles.premiumBadge}>Premium</span>}
                  </div>
                  <p className={styles.cardDesc}>{plugin.description}</p>
                </div>
                <button
                  className={`${styles.toggle} ${on ? styles.toggleOn : ''} ${locked ? styles.toggleLocked : ''}`}
                  onClick={() => togglePlugin(plugin.id, plugin.premium)}
                  title={locked ? 'Upgrade to Premium' : on ? 'Disable' : 'Enable'}
                >
                  {on ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>

              {on && panel && (
                <>
                  <button
                    className={styles.expandBtn}
                    onClick={() => setExpanded(isExpanded ? null : plugin.id)}
                  >
                    Settings
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {isExpanded && (
                    <div className={styles.settingsPanel}>
                      <panel.Component />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
