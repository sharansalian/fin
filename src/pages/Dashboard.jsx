import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTransactions } from '../firebase/transactions';
import { format } from 'date-fns';
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight,
  ScanLine, ChevronRight, Award, Zap
} from 'lucide-react';
import { CATEGORY_COLORS } from '../utils/smsParser';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getTransactions(user.uid, 50)
        .then(setTransactions)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const totalCredit = transactions
    .filter((t) => t.type === 'credit')
    .reduce((s, t) => s + (t.amount || 0), 0);

  const totalDebit = transactions
    .filter((t) => t.type === 'debit')
    .reduce((s, t) => s + (t.amount || 0), 0);

  const recentTxns = transactions.slice(0, 5);

  const categoryTotals = transactions
    .filter((t) => t.type === 'debit')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const greeting = getGreeting(user?.displayName);
  const score = userProfile?.creditScore || '—';

  if (loading) return <DashboardSkeleton />;

  return (
    <div className={styles.dashboard}>
      {/* Hero section */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.greeting}>{greeting}</p>
          <h1 className={styles.heroTitle}>
            {transactions.length === 0
              ? 'Ready to track your finances?'
              : `You've spent ₹${fmt(totalDebit)} this period`}
          </h1>
          {transactions.length === 0 && (
            <Link to="/scan" className={`btn-primary ${styles.heroCta}`}>
              <ScanLine size={16} /> Scan Your First SMS
            </Link>
          )}
        </div>
        <div className={styles.scoreCard}>
          <p className={styles.scoreLabel}>Credit Score</p>
          <div className={styles.scoreValue}>{score}</div>
          <div className={styles.scoreBar}>
            <div
              className={styles.scoreBarFill}
              style={{ width: `${((score - 300) / 550) * 100}%` }}
            />
          </div>
          <p className={styles.scoreStatus}>
            {score >= 750 ? '✦ Excellent' : score >= 650 ? '◈ Good' : '◇ Fair'}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <StatCard
          label="Total Income"
          value={`₹${fmt(totalCredit)}`}
          icon={<TrendingUp size={18} />}
          color="green"
          sub={`${transactions.filter((t) => t.type === 'credit').length} transactions`}
        />
        <StatCard
          label="Total Spent"
          value={`₹${fmt(totalDebit)}`}
          icon={<TrendingDown size={18} />}
          color="red"
          sub={`${transactions.filter((t) => t.type === 'debit').length} transactions`}
        />
        <StatCard
          label="Net Balance"
          value={`₹${fmt(totalCredit - totalDebit)}`}
          icon={<Wallet size={18} />}
          color={totalCredit - totalDebit >= 0 ? 'green' : 'red'}
          sub="Income minus expenses"
        />
        <StatCard
          label="Top Spending"
          value={topCategory ? capitalize(topCategory[0]) : '—'}
          icon={<Award size={18} />}
          color="gold"
          sub={topCategory ? `₹${fmt(topCategory[1])}` : 'No data yet'}
        />
      </div>

      {/* Main grid */}
      <div className={styles.grid}>
        {/* Recent transactions */}
        <div className={styles.recentCard}>
          <div className={styles.cardHeader}>
            <h3>Recent Transactions</h3>
            <Link to="/history" className={styles.viewAll}>
              View all <ChevronRight size={14} />
            </Link>
          </div>

          {recentTxns.length === 0 ? (
            <EmptyState
              icon={<ScanLine size={32} />}
              title="No transactions yet"
              desc="Scan your bank SMS messages to get started"
              cta={{ label: 'Scan SMS', to: '/scan' }}
            />
          ) : (
            <div className={styles.txnList}>
              {recentTxns.map((txn) => (
                <TransactionRow key={txn.id} txn={txn} />
              ))}
            </div>
          )}
        </div>

        {/* Quick actions + insights */}
        <div className={styles.sidePanel}>
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              QUICK ACTIONS
            </h3>
            <div className={styles.quickActions}>
              <QuickAction to="/scan" icon={<ScanLine size={20} />} label="Scan SMS" color="gold" />
              <QuickAction to="/history" icon={<Wallet size={20} />} label="History" color="blue" />
              <QuickAction to="/insights" icon={<TrendingUp size={20} />} label="Insights" color="green" />
              <QuickAction to="/insights" icon={<Zap size={20} />} label="AI Tips" color="purple" />
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                SPENDING BY CATEGORY
              </h3>
              <div className={styles.categoryList}>
                {Object.entries(categoryTotals)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([cat, amt]) => (
                    <CategoryBar
                      key={cat}
                      category={cat}
                      amount={amt}
                      total={totalDebit}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }) {
  const colors = {
    green: 'var(--accent-green)',
    red: 'var(--accent-red)',
    gold: 'var(--accent-gold)',
    blue: 'var(--accent-blue)',
  };
  return (
    <div className={`card ${styles.statCard}`}>
      <div className={styles.statIcon} style={{ background: `${colors[color]}18`, color: colors[color] }}>
        {icon}
      </div>
      <div>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statValue}>{value}</p>
        <p className={styles.statSub}>{sub}</p>
      </div>
    </div>
  );
}

function TransactionRow({ txn }) {
  return (
    <div className={styles.txnRow}>
      <div
        className={styles.txnIcon}
        style={{ background: `${CATEGORY_COLORS[txn.category] || '#AEB6BF'}18` }}
      >
        <span>{txn.categoryIcon || '📌'}</span>
      </div>
      <div className={styles.txnDetails}>
        <p className={styles.txnMerchant}>{txn.merchant}</p>
        <p className={styles.txnMeta}>
          {txn.bank} · {txn.date ? format(new Date(txn.date), 'dd MMM yyyy') : '—'}
        </p>
      </div>
      <div className={`${styles.txnAmount} ${txn.type === 'debit' ? 'amount-debit' : 'amount-credit'}`}>
        {txn.type === 'debit' ? '-' : '+'}₹{fmt(txn.amount)}
      </div>
    </div>
  );
}

function QuickAction({ to, icon, label, color }) {
  const colors = {
    gold: 'var(--accent-gold)',
    blue: 'var(--accent-blue)',
    green: 'var(--accent-green)',
    purple: 'var(--accent-purple)',
  };
  return (
    <Link to={to} className={styles.quickAction}>
      <div className={styles.quickActionIcon} style={{ background: `${colors[color]}18`, color: colors[color] }}>
        {icon}
      </div>
      <span>{label}</span>
    </Link>
  );
}

function CategoryBar({ category, amount, total }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  const color = CATEGORY_COLORS[category] || '#AEB6BF';
  return (
    <div className={styles.categoryBar}>
      <div className={styles.categoryBarHeader}>
        <span className={styles.categoryName}>{capitalize(category)}</span>
        <span className={styles.categoryAmount}>₹{fmt(amount)}</span>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc, cta }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h4>{title}</h4>
      <p>{desc}</p>
      {cta && (
        <Link to={cta.to} className="btn-primary" style={{ marginTop: '12px', fontSize: '13px', padding: '10px 20px' }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className={styles.dashboard}>
      <div className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-xl)', marginBottom: '24px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
}

const fmt = (n) => {
  if (!n && n !== 0) return '0';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

function getGreeting(name) {
  const hour = new Date().getHours();
  const time = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${time}, ${name?.split(' ')[0] || 'there'} 👋`;
}
