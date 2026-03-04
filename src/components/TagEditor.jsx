import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import styles from './TagEditor.module.css';

export default function TagEditor({ tags = [], onChange, compact = false }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Auto-focus input when mounted in non-compact mode
  useEffect(() => {
    if (!compact && inputRef.current) inputRef.current.focus();
  }, [compact]);

  const addTags = (raw) => {
    const newTags = raw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t && !tags.includes(t));
    if (newTags.length === 0) return;
    onChange([...tags, ...newTags]);
    setInput('');
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTags(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleBlur = () => {
    if (input.trim()) addTags(input);
  };

  return (
    <div
      ref={wrapperRef}
      className={`${styles.editor} ${compact ? styles.compact : ''}`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className={styles.pill}>
          {tag}
          <button
            className={styles.pillRemove}
            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            type="button"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <div className={styles.inputWrap}>
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length ? 'Add tag…' : 'Add tags (comma separated)…'}
        />
      </div>
      {input.trim() && (
        <button
          className={styles.addBtn}
          onClick={() => addTags(input)}
          type="button"
          title="Add tag"
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  );
}
