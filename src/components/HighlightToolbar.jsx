import { useState, useEffect, useCallback, useRef } from 'react';
import { Highlighter, MessageSquare, Trash2, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addHighlight, deleteHighlight, getHighlights } from '../firebase/articles';
import styles from './HighlightToolbar.module.css';

// Apply highlight marks inside the content DOM element.
// Uses TreeWalker to safely wrap matching text nodes without breaking HTML.
function applyHighlightMarks(contentEl, highlights) {
  if (!contentEl || !highlights.length) return;
  // Remove existing marks first
  contentEl.querySelectorAll('mark[data-hl]').forEach((m) => {
    const parent = m.parentNode;
    parent.replaceChild(document.createTextNode(m.textContent), m);
    parent.normalize();
  });
  // Apply each highlight
  highlights.forEach((h) => {
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.textContent.indexOf(h.text);
      if (idx === -1) continue;
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + h.text.length);
      const mark = document.createElement('mark');
      mark.dataset.hl = h.id;
      mark.style.background = 'rgba(250, 204, 21, 0.25)';
      mark.style.borderBottom = '2px solid #facc15';
      mark.style.padding = '1px 0';
      mark.style.borderRadius = '2px';
      mark.style.cursor = 'pointer';
      if (h.note) mark.title = h.note;
      try { range.surroundContents(mark); } catch { /* skip if range crosses elements */ }
      break; // only first occurrence per highlight
    }
  });
}

// Floating selection toolbar
function SelectionToolbar({ rect, onHighlight, onNote }) {
  if (!rect) return null;
  const top = rect.top + window.scrollY - 52;
  const left = rect.left + rect.width / 2;
  return (
    <div className={styles.toolbar} style={{ top, left, transform: 'translateX(-50%)' }}>
      <button className={`${styles.btn} ${styles.btnHighlight}`} onClick={onHighlight}>
        <Highlighter size={14} /> Highlight
      </button>
      <div className={styles.separator} />
      <button className={`${styles.btn} ${styles.btnNote}`} onClick={onNote}>
        <MessageSquare size={14} /> Note
      </button>
    </div>
  );
}

// Note input popover
function NotePopover({ rect, onSave, onCancel }) {
  const [note, setNote] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const top = rect ? rect.top + window.scrollY - 180 : 0;
  const left = rect ? rect.left + rect.width / 2 : 0;

  return (
    <div className={styles.notePopover} style={{ top, left, transform: 'translateX(-50%)' }}>
      <textarea
        ref={inputRef}
        className={styles.noteInput}
        placeholder="Add a note…"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(note); } }}
      />
      <div className={styles.noteActions}>
        <button className={styles.noteCancel} onClick={onCancel}>Cancel</button>
        <button className={styles.noteSave} onClick={() => onSave(note)}>Save</button>
      </div>
    </div>
  );
}

// Highlights panel (shown in reader)
export function HighlightsPanel({ highlights, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!highlights.length) return null;
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <Highlighter size={14} /> {highlights.length} Highlight{highlights.length > 1 ? 's' : ''}
        </span>
        <button className={styles.collapseBtn} onClick={() => setCollapsed((c) => !c)}>
          <ChevronUp size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
        </button>
      </div>
      {!collapsed && (
        <div className={styles.highlightList}>
          {highlights.map((h) => (
            <div key={h.id} className={styles.highlightItem}>
              <div className={styles.highlightContent}>
                <p className={styles.highlightText}>"{h.text}"</p>
                {h.note && <p className={styles.highlightNote}>{h.note}</p>}
              </div>
              <button className={styles.highlightDelete} onClick={() => onDelete(h.id)} title="Remove">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Main hook: manages text selection, highlighting, and Firestore sync
export function useHighlights({ articleId, contentRef, isPremium }) {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [selectionRect, setSelectionRect] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [showNote, setShowNote] = useState(false);

  // Load highlights from Firestore
  useEffect(() => {
    if (!isPremium || !articleId || !user?.uid) return;
    getHighlights(user.uid, articleId).then(setHighlights).catch(() => {});
  }, [articleId, user?.uid, isPremium]);

  // Apply highlight marks to DOM whenever highlights or content change
  useEffect(() => {
    if (contentRef?.current && highlights.length > 0) {
      applyHighlightMarks(contentRef.current, highlights);
    }
  }, [highlights, contentRef]);

  // Listen for text selection
  const handleMouseUp = useCallback(() => {
    if (!isPremium) return;
    const selection = window.getSelection();
    const text = selection?.toString()?.trim();
    if (!text || text.length < 3) { setSelectionRect(null); setSelectedText(''); return; }
    // Make sure selection is inside the content area
    if (contentRef?.current && !contentRef.current.contains(selection.anchorNode)) {
      setSelectionRect(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionRect(rect);
    setSelectedText(text);
    setShowNote(false);
  }, [isPremium, contentRef]);

  const clearSelection = useCallback(() => {
    setSelectionRect(null);
    setSelectedText('');
    setShowNote(false);
    window.getSelection()?.removeAllRanges();
  }, []);

  const saveHighlight = useCallback(async (note = '') => {
    if (!selectedText || !user?.uid || !articleId) return;
    const data = { text: selectedText, note: note || '', color: 'yellow' };
    const docRef = await addHighlight(user.uid, articleId, data);
    const newHighlight = { id: docRef.id, ...data };
    setHighlights((prev) => [newHighlight, ...prev]);
    clearSelection();
  }, [selectedText, user?.uid, articleId, clearSelection]);

  const removeHighlight = useCallback(async (highlightId) => {
    if (!user?.uid || !articleId) return;
    await deleteHighlight(user.uid, articleId, highlightId);
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    // Remove mark from DOM
    if (contentRef?.current) {
      const mark = contentRef.current.querySelector(`mark[data-hl="${highlightId}"]`);
      if (mark) {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    }
  }, [user?.uid, articleId, contentRef]);

  const handleHighlightClick = useCallback(() => saveHighlight(''), [saveHighlight]);
  const handleNoteClick = useCallback(() => setShowNote(true), []);
  const handleNoteSave = useCallback((note) => saveHighlight(note), [saveHighlight]);

  const toolbar = isPremium && selectionRect && !showNote ? (
    <SelectionToolbar rect={selectionRect} onHighlight={handleHighlightClick} onNote={handleNoteClick} />
  ) : null;

  const notePopover = isPremium && showNote && selectionRect ? (
    <NotePopover rect={selectionRect} onSave={handleNoteSave} onCancel={clearSelection} />
  ) : null;

  return {
    highlights,
    toolbar,
    notePopover,
    handleMouseUp,
    removeHighlight,
    clearSelection,
  };
}
