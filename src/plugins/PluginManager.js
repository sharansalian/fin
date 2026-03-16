/**
 * PluginManager — core registry for Pocket plugins.
 *
 * A plugin is a plain object:
 * {
 *   id:          string       — unique identifier (e.g. "readwise-sync")
 *   name:        string       — display name
 *   description: string       — one-liner
 *   version:     string       — semver
 *   icon:        LucideIcon   — optional icon component
 *   premium:     boolean      — requires premium? (default false)
 *
 *   // — Lifecycle —
 *   onActivate(ctx)            — called when the plugin is enabled
 *   onDeactivate(ctx)          — called when the plugin is disabled
 *
 *   // — UI slots —
 *   navItems:    []            — extra sidebar / mobile nav items
 *   routes:      []            — extra <Route> definitions { path, element }
 *   settingsPanel: Component   — rendered inside Plugin Settings page
 *   headerActions: []          — extra buttons for the header area
 *   settingsMenuItems: []      — extra items in the settings dropdown
 *
 *   // — Content hooks —
 *   onArticleSave(article)     — runs after an article is saved
 *   onArticleDelete(article)   — runs after an article is deleted
 *   onArticleRead(article)     — runs when the reader opens an article
 *   onArticleArchive(article)  — runs when an article is archived
 *   transformContent(html)     — transform article HTML before render (return new html)
 *
 *   // — Integration hooks —
 *   exportArticle(article)     — export to external service
 *   importArticles()           — import from external service, return article[]
 * }
 */

class PluginManager {
  constructor() {
    this._plugins = new Map();
    this._active = new Set();
    this._listeners = new Set();
  }

  // --- Registry ---

  register(plugin) {
    if (!plugin.id) throw new Error('Plugin must have an id');
    if (this._plugins.has(plugin.id)) {
      console.warn(`Plugin "${plugin.id}" is already registered, skipping.`);
      return;
    }
    this._plugins.set(plugin.id, { ...plugin, premium: plugin.premium ?? false });
    this._notify();
  }

  unregister(id) {
    if (this._active.has(id)) this.deactivate(id);
    this._plugins.delete(id);
    this._notify();
  }

  getPlugin(id) {
    return this._plugins.get(id);
  }

  getAllPlugins() {
    return Array.from(this._plugins.values());
  }

  // --- Activation ---

  activate(id, ctx = {}) {
    const plugin = this._plugins.get(id);
    if (!plugin) throw new Error(`Plugin "${id}" not found`);
    if (this._active.has(id)) return;
    this._active.add(id);
    try { plugin.onActivate?.(ctx); } catch (e) { console.error(`Plugin "${id}" onActivate error:`, e); }
    this._persist();
    this._notify();
  }

  deactivate(id, ctx = {}) {
    const plugin = this._plugins.get(id);
    if (!plugin || !this._active.has(id)) return;
    try { plugin.onDeactivate?.(ctx); } catch (e) { console.error(`Plugin "${id}" onDeactivate error:`, e); }
    this._active.delete(id);
    this._persist();
    this._notify();
  }

  isActive(id) {
    return this._active.has(id);
  }

  getActivePlugins() {
    return this.getAllPlugins().filter((p) => this._active.has(p.id));
  }

  // --- UI Slot helpers ---

  getNavItems() {
    return this.getActivePlugins().flatMap((p) => (p.navItems || []).map((n) => ({ ...n, pluginId: p.id })));
  }

  getRoutes() {
    return this.getActivePlugins().flatMap((p) => (p.routes || []).map((r) => ({ ...r, pluginId: p.id })));
  }

  getHeaderActions() {
    return this.getActivePlugins().flatMap((p) => (p.headerActions || []).map((a) => ({ ...a, pluginId: p.id })));
  }

  getSettingsMenuItems() {
    return this.getActivePlugins().flatMap((p) => (p.settingsMenuItems || []).map((i) => ({ ...i, pluginId: p.id })));
  }

  getSettingsPanels() {
    return this.getActivePlugins()
      .filter((p) => p.settingsPanel)
      .map((p) => ({ pluginId: p.id, name: p.name, Component: p.settingsPanel }));
  }

  // --- Content hooks ---

  async runHook(hookName, ...args) {
    const results = [];
    for (const plugin of this.getActivePlugins()) {
      const fn = plugin[hookName];
      if (typeof fn === 'function') {
        try {
          results.push(await fn(...args));
        } catch (e) {
          console.error(`Plugin "${plugin.id}" ${hookName} error:`, e);
        }
      }
    }
    return results;
  }

  async transformContent(html) {
    let result = html;
    for (const plugin of this.getActivePlugins()) {
      if (typeof plugin.transformContent === 'function') {
        try {
          result = await plugin.transformContent(result);
        } catch (e) {
          console.error(`Plugin "${plugin.id}" transformContent error:`, e);
        }
      }
    }
    return result;
  }

  // --- Persistence (localStorage) ---

  _persist() {
    try {
      localStorage.setItem('pocket:activePlugins', JSON.stringify([...this._active]));
    } catch { /* quota exceeded, ignore */ }
  }

  restoreActive(ctx = {}) {
    try {
      const saved = JSON.parse(localStorage.getItem('pocket:activePlugins') || '[]');
      for (const id of saved) {
        if (this._plugins.has(id)) this.activate(id, ctx);
      }
    } catch { /* corrupt data, ignore */ }
  }

  // --- Change subscription ---

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    for (const fn of this._listeners) {
      try { fn(); } catch { /* swallow */ }
    }
  }
}

// Singleton
const pluginManager = new PluginManager();
export default pluginManager;
