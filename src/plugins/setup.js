/**
 * Registers built-in example plugins and restores previously active ones.
 * Called once at app startup.
 */
import pluginManager from './PluginManager';
import readwiseSyncPlugin from './examples/readwise-sync';
import wordCountPlugin from './examples/word-count';
import highlighterPlugin from './examples/highlighter';

export default function setupPlugins() {
  pluginManager.register(readwiseSyncPlugin);
  pluginManager.register(wordCountPlugin);
  pluginManager.register(highlighterPlugin);

  // Restore previously active plugins from localStorage
  pluginManager.restoreActive();
}
