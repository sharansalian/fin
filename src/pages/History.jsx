import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTransactions, deleteTransaction } from '../firebase/transactions';
import { format } from 'date-fns';
import {
  Search, Filter, Trash2, TrendingUp, TrendingDown,
  Calendar, ChevronDown, X, ScanLine
} from 'lucide-react';
import { CATEGORY_COLORS } from '../utils/smsParser';
import { Link } from 'react-router-dom';
import styles from './History.module.css';

const CATEGORIES = ['all', 'food', 'shopping', 'transport', 'entertainment', 'health', 'utilities', 'education', 'investment', 'transfer', 'income', 'others'];

export default function History() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [deletingId, setDeletingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getTransactions(user.uid, 200);
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    setDeletingId(id);
    try {
      await deleteTransaction(user.uid, id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      alert('Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.merchant?.toLowerCase().includes(q) ||
          t.bank?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'all') {
      result = result.filter((t) => t.type === filterType);
    }

    if (filterCategory !== 'all') {
      result = result.filter((t) => t.category === filterCategory);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': return new Date(b.date) - new Date(a.date);
        case 'date-asc': return new Date(a.date) - new Date(b.date);
        case 'amount-desc': return b.amount - a.amount;
        case 'amount-asc': return a.amount - b.amount;
        default: return 0;
      }
    });

    return result;
  }, [transactions, search, filterType, filterCategory, sortBy]);

  const totalDebit = filtered.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const totalCredit = filtered.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((txn) => {
      const key = txn.date ? format(new Date(txn.date), 'MMMM yyyy') : 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(txn);
    });
    return groups;
  }, [filtered]);

  if (loading) return <HistorySkeleton />;

  return (
    <div className={styles.page}>
      {/* Search + filters bar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={`input-field ${styles.searchInput}`}
            placeholder="Search merchants, banks, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <button
          className={`btn-secondary ${styles.filterToggle} ${showFilters ? styles.filterToggleActive : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={15} /> Filters
          {(filterType !== 'all' || filterCategory !== 'all') && (
            <span className={styles.filterBadge}>
              {[filterType !== 'all', filterCategory !== 'all'].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Type</label>
            <div className={styles.filterBtns}>
              {['all', 'debit', 'credit'].map((t) => (
                <button
                  key={t}
                  className={`${styles.filterBtn} ${filterType === t ? styles.filterBtnActive : ''}`}
                  onClick={() => setFilterType(t)}
                >
                  {t === 'debit' ? <TrendingDown size={13} /> : t === 'credit' ? <TrendingUp size={13} /> : null}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label>Category</label>
            <div className={styles.filterBtns}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`${styles.filterBtn} ${filterCategory === c ? styles.filterBtnActive : ''}`}
                  onClick={() => setFilterCategory(c)}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label>Sort by</label>
            <select
              className={`input-field ${styles.sortSelect}`}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date-desc">Date (newest first)</option>
              <option value="date-asc">Date (oldest first)</option>
              <option value="amount-desc">Amount (high to low)</option>
              <option value="amount-asc">Amount (low to high)</option>
            </select>
          </div>

          {(filterType !== 'all' || filterCategory !== 'all') && (
            <button
              className="btn-ghost"
              onClick={() => { setFilterType('all'); setFilterCategory('all'); }}
            >
              <X size={14} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Summary row */}
      {filtered.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Showing</span>
            <span className={styles.summaryValue}>{filtered.length} transactions</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Total Spent</span>
            <span className={`${styles.summaryValue} amount-debit`}>-₹{fmt(totalDebit)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Total Received</span>
            <span className={`${styles.summaryValue} amount-credit`}>+₹{fmt(totalCredit)}</span>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><ScanLine size={36} /></div>
          <h3>No transactions found</h3>
          <p>
            {transactions.length === 0
              ? 'Scan your bank SMS to add transactions'
              : 'Try adjusting your search or filters'}
          </p>
          {transactions.length === 0 && (
            <Link to="/scan" className="btn-primary" style={{ marginTop: '12px', fontSize: '14px' }}>
              Scan SMS
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.groups}>
          {Object.entries(grouped).map(([month, txns]) => (
            <div key={month} className={styles.group}>
              <div className={styles.groupHeader}>
                <div className={styles.groupMonth}>
                  <Calendar size={14} />
                  {month}
                </div>
                <div className={styles.groupStats}>
                  <span className="amount-credit">+₹{fmt(txns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0))}</span>
                  <span className={styles.groupStatDivider}>·</span>
                  <span className="amount-debit">-₹{fmt(txns.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0))}</span>
                </div>
              </div>

              <div className={styles.txnList}>
                {txns.map((txn) => (
                  <TxnRow key={txn.id} txn={txn} onDelete={handleDelete} deleting={deletingId === txn.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TxnRow({ txn, onDelete, deleting }) {
  const [expanded, setExpanded] = useState(false);
  const color = CATEGORY_COLORS[txn.category] || '#AEB6BF';

  return (
    <div className={styles.txnRow}>
      <div className={styles.txnMain} onClick={() => setExpanded(!expanded)}>
        <div className={styles.txnIcon} style={{ background: `${color}18` }}>
          <span>{txn.categoryIcon || '📌'}</span>
        </div>
        <div className={styles.txnDetails}>
          <p className={styles.txnMerchant}>{txn.merchant}</p>
          <div className={styles.txnMeta}>
            <span className={`badge ${txn.type === 'debit' ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
              {txn.type}
            </span>
            <span>{txn.bank}</span>
            <span>·</span>
            <span>{txn.date ? format(new Date(txn.date), 'dd MMM yyyy') : '—'}</span>
          </div>
        </div>
        <div className={styles.txnRight}>
          <p className={`${styles.txnAmount} ${txn.type === 'debit' ? 'amount-debit' : 'amount-credit'}`}>
            {txn.type === 'debit' ? '-' : '+'}₹{fmt(txn.amount)}
          </p>
          <div className={styles.txnChevron}>
            {expanded ? <ChevronDown size={14} /> : <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className={styles.txnExpanded}>
          <div className={styles.txnExpandedGrid}>
            <div>
              <span className={styles.expandLabel}>Category</span>
              <span className={styles.expandValue}>{txn.categoryIcon} {txn.category}</span>
            </div>
            {txn.balance && (
              <div>
                <span className={styles.expandLabel}>Balance after</span>
                <span className={styles.expandValue}>₹{fmt(txn.balance)}</span>
              </div>
            )}
            <div>
              <span className={styles.expandLabel}>Source</span>
              <span className={styles.expandValue}>{txn.source || 'sms'}</span>
            </div>
          </div>
          {txn.rawSMS && (
            <div className={styles.rawSms}>
              <span className={styles.expandLabel}>Original SMS</span>
              <p>{txn.rawSMS}</p>
            </div>
          )}
          <button
            className={`btn-ghost ${styles.deleteBtn}`}
            onClick={() => onDelete(txn.id)}
            disabled={deleting}
          >
            {deleting ? <span className="spinner" style={{ width: '14px', height: '14px' }} /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '64px', borderRadius: 'var(--radius-md)' }} />
      ))}
    </div>
  );
}

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
