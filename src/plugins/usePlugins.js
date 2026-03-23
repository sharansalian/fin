import { useContext } from 'react';
import { PluginContext } from './pluginContext';

export function usePlugins() {
  const ctx = useContext(PluginContext);
  if (!ctx) throw new Error('usePlugins must be used within PluginProvider');
  return ctx;
}
