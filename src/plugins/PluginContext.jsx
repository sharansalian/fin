import { useSyncExternalStore, useCallback } from 'react';
import pluginManager from './PluginManager';
import { PluginContext } from './pluginContext';

export function PluginProvider({ children }) {
  // Re-render consumers whenever the manager's state changes
  const snapshot = useSyncExternalStore(
    (cb) => pluginManager.subscribe(cb),
    () => ({
      plugins: pluginManager.getAllPlugins(),
      active: pluginManager.getActivePlugins(),
      navItems: pluginManager.getNavItems(),
      routes: pluginManager.getRoutes(),
      headerActions: pluginManager.getHeaderActions(),
      settingsMenuItems: pluginManager.getSettingsMenuItems(),
      settingsPanels: pluginManager.getSettingsPanels(),
    }),
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
