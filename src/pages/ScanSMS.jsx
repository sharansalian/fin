import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addTransactionsBatch } from '../firebase/transactions';
import { parseSMS, parseMultipleSMS, SAMPLE_SMS } from '../utils/smsParser';
import { format } from 'date-fns';
import {
  ScanLine, ClipboardPaste, Check, X, AlertCircle,
  Sparkles, ChevronDown, ChevronUp, RefreshCw, Upload, FileText
} from 'lucide-react';
import styles from './ScanSMS.module.css';

const TABS = ['paste', 'bulk', 'demo'];

export default function ScanSMS() {
  const { user } = useAuth();
  const [tab, setTab] = useState('paste');
  const [smsText, setSmsText] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [bulkParsed, setBulkParsed] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Single SMS parse
  const handleParse = () => {
    setError('');
    setSaved(false);
    const result = parseSMS(smsText);
    if (!result) {
      setError('Could not detect a transaction in this SMS. Make sure it contains an amount and debit/credit keyword.');
      setParsed(null);
    } else {
      setParsed(result);
    }
  };

  const handleSaveSingle = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      await addTransactionsBatch(user.uid, [parsed]);
      setSaved(true);
      setSmsText('');
      setParsed(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Bulk parse
  const handleBulkParse = () => {
    const lines = bulkText.split('\n').filter((l) => l.trim());
    const results = parseMultipleSMS(lines);
    setBulkParsed(results);
  };

  const removeBulkItem = (id) => {
    setBulkParsed((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveBulk = async () => {
    if (bulkParsed.length === 0) return;
    setSaving(true);
    try {
      await addTransactionsBatch(user.uid, bulkParsed);
      setSaved(true);
      setBulkText('');
      setBulkParsed([]);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Demo data
  const handleLoadDemo = async () => {
    setSaving(true);
    setError('');
    try {
      const results = parseMultipleSMS(SAMPLE_SMS);
      await addTransactionsBatch(user.uid, results);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Failed to load demo data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Tab switcher */}
      <div className={styles.tabs}>
        {[
          { id: 'paste', label: 'Paste SMS', icon: <ClipboardPaste size={15} /> },
          { id: 'bulk', label: 'Bulk Import', icon: <FileText size={15} /> },
          { id: 'demo', label: 'Load Demo', icon: <Sparkles size={15} /> },
        ].map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => { setTab(t.id); setError(''); setSaved(false); }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {saved && (
        <div className={styles.successMsg}>
          <Check size={16} /> Transactions saved successfully!
        </div>
      )}

      {error && (
        <div className={styles.errorMsg}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Single paste */}
      {tab === 'paste' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Paste Bank SMS</h2>
            <p>Copy a bank SMS and paste it below. We'll extract the transaction automatically.</p>
          </div>

          <div className={styles.smsInputWrap}>
            <textarea
              className={styles.smsInput}
              placeholder={`Paste your bank SMS here...\n\nExample:\nYour HDFC Bank Account XX1234 has been debited by INR 450.00 on 20-01-2025 at SWIGGY. Available Balance: INR 12,450.50`}
              value={smsText}
              onChange={(e) => { setSmsText(e.target.value); setError(''); setParsed(null); }}
              rows={6}
            />
            <div className={styles.smsActions}>
              <button
                className="btn-primary"
                onClick={handleParse}
                disabled={!smsText.trim()}
              >
                <ScanLine size={16} /> Parse SMS
              </button>
              {smsText && (
                <button className="btn-ghost" onClick={() => { setSmsText(''); setParsed(null); setError(''); }}>
                  <X size={16} /> Clear
                </button>
              )}
            </div>
          </div>

          {parsed && (
            <div className={styles.parsedResult}>
              <div className={styles.parsedHeader}>
                <div className={styles.parsedCheck}>
                  <Check size={16} />
                </div>
                <div>
                  <h3>Transaction Detected</h3>
                  <p>Review the details and save</p>
                </div>
              </div>

              <ParsedCard txn={parsed} />

              <div className={styles.parsedActions}>
                <button
                  className="btn-primary"
                  onClick={handleSaveSingle}
                  disabled={saving}
                >
                  {saving ? <span className="spinner" /> : <><Check size={15} /> Save Transaction</>}
                </button>
                <button className="btn-ghost" onClick={() => { setParsed(null); setSmsText(''); }}>
                  Discard
                </button>
              </div>
            </div>
          )}

          <div className={styles.supportedBanks}>
            <p>Supported banks & apps:</p>
            <div className={styles.bankTags}>
              {['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes Bank', 'IDFC', 'UPI', 'PhonePe', 'GPay', 'Paytm'].map((b) => (
                <span key={b} className={`badge badge-gold`}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk import */}
      {tab === 'bulk' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Bulk SMS Import</h2>
            <p>Paste multiple SMS messages, one per line. We'll parse all transactions at once.</p>
          </div>

          <textarea
            className={styles.smsInput}
            placeholder="Paste multiple SMS messages here, one per line..."
            value={bulkText}
            onChange={(e) => { setBulkText(e.target.value); setBulkParsed([]); }}
            rows={10}
          />

          <div className={styles.bulkActions}>
            <button
              className="btn-primary"
              onClick={handleBulkParse}
              disabled={!bulkText.trim()}
            >
              <ScanLine size={16} /> Parse All
            </button>
          </div>

          {bulkParsed.length > 0 && (
            <div className={styles.bulkResults}>
              <div className={styles.bulkResultsHeader}>
                <h3>{bulkParsed.length} transaction{bulkParsed.length > 1 ? 's' : ''} found</h3>
                <button
                  className="btn-primary"
                  onClick={handleSaveBulk}
                  disabled={saving || bulkParsed.length === 0}
                  style={{ fontSize: '13px', padding: '10px 20px' }}
                >
                  {saving ? <span className="spinner" /> : `Save All (${bulkParsed.length})`}
                </button>
              </div>

              <div className={styles.bulkList}>
                {bulkParsed.map((txn) => (
                  <div key={txn.id} className={styles.bulkItem}>
                    <ParsedCard txn={txn} compact />
                    <button
                      className={`btn-ghost ${styles.removeBtn}`}
                      onClick={() => removeBulkItem(txn.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Demo data */}
      {tab === 'demo' && (
        <div className={styles.section}>
          <div className={styles.demoCard}>
            <div className={styles.demoIcon}>
              <Sparkles size={40} />
            </div>
            <h2>Load Demo Transactions</h2>
            <p>
              Don't have bank SMS yet? Load{' '}
              <strong>{SAMPLE_SMS.length} sample transactions</strong> across
              multiple banks and categories to explore the app.
            </p>

            <div className={styles.demoPreview}>
              {SAMPLE_SMS.slice(0, 4).map((sms, i) => (
                <div key={i} className={styles.demoSmsItem}>
                  <p>{sms.length > 100 ? sms.slice(0, 100) + '...' : sms}</p>
                </div>
              ))}
              <p className={styles.demoMore}>+{SAMPLE_SMS.length - 4} more</p>
            </div>

            <button
              className="btn-primary"
              onClick={handleLoadDemo}
              disabled={saving}
              style={{ marginTop: '8px' }}
            >
              {saving ? <><span className="spinner" /> Loading...</> : <><Sparkles size={16} /> Load {SAMPLE_SMS.length} Demo Transactions</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ParsedCard({ txn, compact }) {
  return (
    <div className={`${styles.parsedCard} ${compact ? styles.parsedCardCompact : ''}`}>
      <div className={styles.parsedCardRow}>
        <div className={styles.parsedField}>
          <span className={styles.fieldLabel}>Merchant</span>
          <span className={styles.fieldValue}>{txn.merchant}</span>
        </div>
        <div className={styles.parsedField}>
          <span className={styles.fieldLabel}>Amount</span>
          <span className={`${styles.fieldValue} ${txn.type === 'debit' ? 'amount-debit' : 'amount-credit'}`}>
            {txn.type === 'debit' ? '-' : '+'}₹{Number(txn.amount).toLocaleString('en-IN')}
          </span>
        </div>
        <div className={styles.parsedField}>
          <span className={styles.fieldLabel}>Type</span>
          <span className={`badge ${txn.type === 'debit' ? 'badge-red' : 'badge-green'}`}>
            {txn.type}
          </span>
        </div>
        <div className={styles.parsedField}>
          <span className={styles.fieldLabel}>Category</span>
          <span className={styles.fieldValue}>{txn.categoryIcon} {txn.category}</span>
        </div>
        <div className={styles.parsedField}>
          <span className={styles.fieldLabel}>Bank</span>
          <span className={styles.fieldValue}>{txn.bank}</span>
        </div>
        <div className={styles.parsedField}>
          <span className={styles.fieldLabel}>Date</span>
          <span className={styles.fieldValue}>
            {txn.date ? format(new Date(txn.date), 'dd MMM yyyy') : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
