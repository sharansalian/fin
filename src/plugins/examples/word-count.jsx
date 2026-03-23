import { Hash } from 'lucide-react';

/**
 * Word Count Plugin
 *
 * Demonstrates a content processing plugin that transforms article HTML
 * to inject a word count and estimated reading time banner.
 */
const wordCountPlugin = {
  id: 'word-count',
  name: 'Word Count & Reading Time',
  description: 'Show word count and estimated reading time at the top of every article.',
  version: '1.0.0',
  icon: Hash,
  premium: false,

  onActivate() {
    console.log('[word-count] Plugin activated');
  },

  onDeactivate() {
    console.log('[word-count] Plugin deactivated');
  },

  async transformContent(html) {
    // Strip HTML tags to count words
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text.split(' ').filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 238));

    const banner = `<div style="
      padding: 10px 16px;
      margin-bottom: 20px;
      background: var(--bg-glass);
      border-radius: 8px;
      font-size: 13px;
      color: var(--text-secondary);
      display: flex;
      gap: 16px;
    ">
      <span>${words.toLocaleString()} words</span>
      <span>${minutes} min read</span>
    </div>`;

    return banner + html;
  },
};

export default wordCountPlugin;
