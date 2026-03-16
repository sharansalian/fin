import { usePlugins } from './usePlugins';

/**
 * Renders UI injected by active plugins into a named slot.
 *
 * Usage: <PluginSlot name="headerActions" />
 *
 * Supported slots:
 *   - headerActions: renders buttons in the header area
 *   - settingsMenuItems: renders items in the settings dropdown
 */
export default function PluginSlot({ name, ...props }) {
  const plugins = usePlugins();
  const items = plugins[name] || [];

  if (items.length === 0) return null;

  return items.map((item, i) => {
    if (item.component) {
      const Comp = item.component;
      return <Comp key={`${item.pluginId}-${i}`} {...props} />;
    }
    if (item.render) {
      return <span key={`${item.pluginId}-${i}`}>{item.render(props)}</span>;
    }
    return null;
  });
}
