import { Highlighter } from 'lucide-react';
import HighlighterSettings from './HighlighterSettings';

/**
 * Highlighter Plugin
 *
 * Demonstrates a plugin with a settings panel and content hooks.
 * Adds text highlighting support to the reader.
 */
const highlighterPlugin = {
  id: 'highlighter',
  name: 'Highlighter',
  description: 'Highlight and save important passages while reading articles.',
  version: '1.0.0',
  icon: Highlighter,
  premium: false,

  settingsPanel: HighlighterSettings,

  onActivate() {
    console.log('[highlighter] Plugin activated');
  },

  onDeactivate() {
    console.log('[highlighter] Plugin deactivated');
  },

  onArticleRead(article) {
    console.log('[highlighter] Article opened for reading:', article?.title);
  },
};

export default highlighterPlugin;
