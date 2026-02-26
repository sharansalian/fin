import { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { batchImportArticles } from '../firebase/articles';
import styles from './ImportModal.module.css';

// Robust CSV parser that handles quoted fields, escaped quotes, and CRLF line endings
function parseCSV(text) {
  const rows = [];
  let col = '';
  let row = [];
  let inQuotes = false;
  // Normalise line endings
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      if (inQuotes && src[i + 1] === '"') {
        col += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(col);
      col = '';
    } else if (ch === '\n' && !inQuotes) {
      row.push(col);
      col = '';
      rows.push(row);
      row = [];
    } else {
      col += ch;
    }
  }
  // Last field / row
  if (col || row.length) {
    row.push(col);
    rows.push(row);
  }
  return rows;
}

// Convert parsed CSV rows into article objects using the Pocket export format:
// columns: title, url, time_added, tags, status
function parsePocketCSV(text) {
  const rows = parseCSV(text.trim());
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const titleIdx = header.indexOf('title');
  const urlIdx = header.indexOf('url');
  const timeIdx = header.indexOf('time_added');
  const tagsIdx = header.indexOf('tags');
  const statusIdx = header.indexOf('status');

  if (urlIdx === -1) return [];

  const articles = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const url = r[urlIdx]?.trim();
    if (!url) continue;
    // Validate URL
    try { new URL(url); } catch { continue; }

    const rawTags = tagsIdx !== -1 ? (r[tagsIdx] || '') : '';
    const tags = rawTags
      .split('|')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const status = statusIdx !== -1 ? (r[statusIdx] || '').trim().toLowerCase() : 'unread';
    const isArchived = status === 'archive' || status === 'archived';
    const isRead = isArchived || status === 'read';

    const timeAdded = timeIdx !== -1 ? parseInt(r[timeIdx], 10) || 0 : 0;

    articles.push({
      url,
      title: titleIdx !== -1 ? (r[titleIdx]?.trim() || url) : url,
      tags,
      isArchived,
      isRead,
      savedAt: timeAdded || Math.floor(Date.now() / 1000),
    });
  }
  return articles;
}

export default function ImportModal({ onClose }) {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState(null); // { articles, fileName }
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [done, setDone] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Please select a .csv file.');
      return;
    }
    setError('');
    setParsed(null);
    setDone(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const articles = parsePocketCSV(e.target.result);
        if (articles.length === 0) {
          setError('No valid articles found. Make sure the file has a "url" column.');
          return;
        }
        setParsed({ articles, fileName: file.name });
      } catch {
        setError('Failed to parse the CSV file. Please check the format.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setProgress({ done: 0, total: parsed.articles.length });
    try {
      await batchImportArticles(user.uid, parsed.articles, (done, total) => {
        setProgress({ done, total });
      });
      setDone(true);
      window.dispatchEvent(new CustomEvent('pocket:refresh'));
    } catch (err) {
      const msg = err?.code === 'permission-denied'
        ? 'Permission denied — Firestore rules may still be deploying. Try again in a minute.'
        : `Import failed: ${err?.message || 'Unknown error'}`;
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && !importing && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Import from CSV</h3>
          <button className={styles.closeBtn} onClick={onClose} disabled={importing}>
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className={styles.success}>
            <CheckCircle size={44} className={styles.successIcon} />
            <h4>Import complete!</h4>
            <p>{progress.done} article{progress.done !== 1 ? 's' : ''} imported successfully.</p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <p className={styles.hint}>
              Import articles from a Pocket CSV export or any CSV file with a <code>url</code> column.
              Supported columns: <code>title</code>, <code>url</code>, <code>time_added</code>, <code>tags</code>, <code>status</code>.
            </p>

            {!parsed ? (
              <div
                className={styles.dropzone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={28} className={styles.dropIcon} />
                <p className={styles.dropText}>Drop your CSV file here or <span>browse</span></p>
                <p className={styles.dropSub}>Supports Pocket export format (.csv)</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div className={styles.preview}>
                <FileText size={20} className={styles.fileIcon} />
                <div className={styles.previewInfo}>
                  <p className={styles.fileName}>{parsed.fileName}</p>
                  <p className={styles.fileStats}>
                    {parsed.articles.length} article{parsed.articles.length !== 1 ? 's' : ''} found
                    {' · '}
                    {parsed.articles.filter((a) => a.isArchived).length} archived
                    {' · '}
                    {parsed.articles.filter((a) => a.tags.length > 0).length} tagged
                  </p>
                </div>
                <button
                  className={styles.changeFile}
                  onClick={() => { setParsed(null); setError(''); }}
                  disabled={importing}
                >
                  Change
                </button>
              </div>
            )}

            {importing && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                </div>
                <p className={styles.progressText}>
                  Importing {progress.done} / {progress.total}…
                </p>
              </div>
            )}

            {error && (
              <div className={styles.errorBox}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.actions}>
              <button className="btn-secondary" onClick={onClose} disabled={importing}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={!parsed || importing}
              >
                {importing ? <Loader size={15} className={styles.spin} /> : null}
                {importing ? 'Importing…' : `Import ${parsed ? parsed.articles.length : ''} Articles`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
