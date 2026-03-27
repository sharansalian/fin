import { useCallback, useRef, useSyncExternalStore } from 'react';
import pluginManager from './PluginManager';
import { PluginContext } from './pluginContext';

/**
 * Build a snapshot object from the plugin manager.
 * Kept outside the component so it can be reused by the cached getter.
 */
function buildSnapshot() {
  return {
    plugins: pluginManager.getAllPlugins(),
    active: pluginManager.getActivePlugins(),
    navItems: pluginManager.getNavItems(),
    routes: pluginManager.getRoutes(),
    headerActions: pluginManager.getHeaderActions(),
    settingsMenuItems: pluginManager.getSettingsMenuItems(),
    settingsPanels: pluginManager.getSettingsPanels(),
  };
}

/**
 * A version counter that increments every time the plugin manager notifies.
 * Used to decide whether we need a new snapshot object.
 */
let storeVersion = 0;
pluginManager.subscribe(() => { storeVersion++; });

export function PluginProvider({ children }) {
  // Cache the snapshot so useSyncExternalStore gets a stable reference
  // until the store actually changes.
  const cacheRef = useRef({ version: -1, snapshot: null });

  const getSnapshot = () => {
    if (cacheRef.current.version !== storeVersion) {
      cacheRef.current = { version: storeVersion, snapshot: buildSnapshot() };
    }
    return cacheRef.current.snapshot;
  };

  const snapshot = useSyncExternalStore(
    (cb) => pluginManager.subscribe(cb),
    getSnapshot,
  );

  const activate = useCallback((id, ctx) => pluginManager.activate(id, ctx), []);
  const deactivate = useCallback((id, ctx) => pluginManager.deactivate(id, ctx), []);
  const isActive = useCallback((id) => pluginManager.isActive(id), []);
  const runHook = useCallback((name, ...args) => pluginManager.runHook(name, ...args), []);
  const transformContent = useCallback((html) => pluginManager.transformContent(html), []);

  return (
    <PluginContext.Provider value={{ ...snapshot, activate, deactivate, isActive, runHook, transformContent }}>
      {children}
    </PluginContext.Provider>
  );
}
