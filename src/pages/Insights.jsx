import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTransactions } from '../firebase/transactions';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, Area, AreaChart
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, Zap, Award, AlertCircle, Target } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../utils/smsParser';
import { Link } from 'react-router-dom';
import styles from './Insights.module.css';

export default function Insights() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(0); // 0 = current month

  useEffect(() => {
    if (user) {
      getTransactions(user.uid, 300)
        .then(setTransactions)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return {
        label: format(d, 'MMM yy'),
        fullLabel: format(d, 'MMMM yyyy'),
        start: startOfMonth(d).toISOString(),
        end: endOfMonth(d).toISOString(),
      };
    });
  }, []);

  const selectedMonth = months[activeMonth];

  const monthTxns = useMemo(() => {
    return transactions.filter((t) => {
      const d = t.date;
      return d >= selectedMonth.start && d <= selectedMonth.end;
    });
  }, [transactions, selectedMonth]);

  const totalSpent = monthTxns.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const totalIncome = monthTxns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const map = {};
    monthTxns.filter((t) => t.type === 'debit').forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([cat, amt]) => ({
        name: cat,
        value: Math.round(amt),
        icon: CATEGORY_ICONS[cat] || '📌',
        color: CATEGORY_COLORS[cat] || '#AEB6BF',
        pct: totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthTxns, totalSpent]);

  // Monthly trend (last 6 months)
  const trendData = useMemo(() => {
    return months.map((m) => {
      const txns = transactions.filter((t) => t.date >= m.start && t.date <= m.end);
      return {
        month: m.label,
        spent: Math.round(txns.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0)),
        income: Math.round(txns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0)),
      };
    }).reverse();
  }, [transactions, months]);

  // Daily spending for selected month
  const dailyData = useMemo(() => {
    const map = {};
    monthTxns.filter((t) => t.type === 'debit').forEach((t) => {
      const day = t.date ? format(new Date(t.date), 'dd') : '?';
      map[day] = (map[day] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([day, amt]) => ({ day, amount: Math.round(amt) }))
      .sort((a, b) => Number(a.day) - Number(b.day));
  }, [monthTxns]);

  // AI insights
  const insights = useMemo(() => generateInsights(monthTxns, totalSpent, totalIncome, categoryData), [monthTxns, totalSpent, totalIncome, categoryData]);

  if (loading) return <InsightsSkeleton />;

  if (transactions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}><TrendingUp size={40} /></div>
        <h2>No data to analyze</h2>
        <p>Add some transactions first to see insights</p>
        <Link to="/scan" className="btn-primary" style={{ marginTop: '12px' }}>
          Scan SMS
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Month selector */}
      <div className={styles.monthSelector}>
        {months.map((m, i) => (
          <button
            key={i}
            className={`${styles.monthBtn} ${activeMonth === i ? styles.monthBtnActive : ''}`}
            onClick={() => setActiveMonth(i)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <h2 className={styles.monthTitle}>{selectedMonth.fullLabel}</h2>

      {/* Top stats */}
      <div className={styles.statsRow}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIcon} style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--accent-red)' }}>
            <TrendingDown size={20} />
          </div>
          <div>
            <p className={styles.statLabel}>Total Spent</p>
            <p className={styles.statValue}>₹{fmt(totalSpent)}</p>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIcon} style={{ background: 'rgba(0,208,132,0.1)', color: 'var(--accent-green)' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <p className={styles.statLabel}>Total Income</p>
            <p className={styles.statValue}>₹{fmt(totalIncome)}</p>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIcon} style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--accent-gold)' }}>
            <Target size={20} />
          </div>
          <div>
            <p className={styles.statLabel}>Savings</p>
            <p className={styles.statValue} style={{ color: totalIncome - totalSpent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              ₹{fmt(Math.abs(totalIncome - totalSpent))}
            </p>
            <p className={styles.statSub}>{totalIncome - totalSpent >= 0 ? 'Saved' : 'Over budget'}</p>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIcon} style={{ background: 'rgba(74,158,255,0.1)', color: 'var(--accent-blue)' }}>
            <Award size={20} />
          </div>
          <div>
            <p className={styles.statLabel}>Transactions</p>
            <p className={styles.statValue}>{monthTxns.length}</p>
            <p className={styles.statSub}>This month</p>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className={styles.chartsGrid}>
        {/* Category pie chart */}
        {categoryData.length > 0 && (
          <div className={`card ${styles.chartCard}`}>
            <h3 className={styles.chartTitle}>Spending by Category</h3>
            <div className={styles.pieWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className={styles.pieCenter}>
                <p className={styles.pieCenterLabel}>Spent</p>
                <p className={styles.pieCenterValue}>₹{fmt(totalSpent)}</p>
              </div>
            </div>

            <div className={styles.legend}>
              {categoryData.slice(0, 6).map((d) => (
                <div key={d.name} className={styles.legendItem}>
                  <div className={styles.legendDot} style={{ background: d.color }} />
                  <span className={styles.legendName}>{d.icon} {capitalize(d.name)}</span>
                  <span className={styles.legendPct}>{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly trend */}
        <div className={`card ${styles.chartCard}`}>
          <h3 className={styles.chartTitle}>6-Month Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF4757" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF4757" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D084" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D084" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<CustomLineTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
              <Area type="monotone" dataKey="income" stroke="#00D084" strokeWidth={2} fill="url(#incomeGrad)" name="Income" dot={false} />
              <Area type="monotone" dataKey="spent" stroke="#FF4757" strokeWidth={2} fill="url(#spentGrad)" name="Spent" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Daily spending bar chart */}
        {dailyData.length > 0 && (
          <div className={`card ${styles.chartCard} ${styles.chartCardFull}`}>
            <h3 className={styles.chartTitle}>Daily Spending — {selectedMonth.fullLabel}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="amount" fill="var(--accent-gold)" opacity={0.8} radius={[4, 4, 0, 0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className={styles.insightsSection}>
          <div className={styles.insightsSectionHeader}>
            <Zap size={18} style={{ color: 'var(--accent-gold)' }} />
            <h3>Smart Insights</h3>
          </div>
          <div className={styles.insightsList}>
            {insights.map((insight, i) => (
              <div key={i} className={`${styles.insightCard} ${styles[`insight-${insight.type}`]}`}>
                <span className={styles.insightIcon}>{insight.icon}</span>
                <div>
                  <p className={styles.insightTitle}>{insight.title}</p>
                  <p className={styles.insightDesc}>{insight.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Custom tooltips
const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{d.icon} {capitalize(d.name)}</p>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>₹{d.value.toLocaleString('en-IN')} ({d.pct}%)</p>
    </div>
  );
};

const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ fontSize: '13px', fontWeight: 600, color: p.color }}>
          {p.name}: ₹{p.value.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Day {label}</p>
      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-gold)' }}>₹{payload[0].value.toLocaleString('en-IN')}</p>
    </div>
  );
};

function generateInsights(txns, totalSpent, totalIncome, categoryData) {
  const insights = [];

  if (txns.length === 0) return insights;

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;

  if (savingsRate > 30) {
    insights.push({ type: 'positive', icon: '🎉', title: 'Great savings rate!', desc: `You saved ${savingsRate.toFixed(0)}% of your income this month. Keep it up!` });
  } else if (savingsRate < 0) {
    insights.push({ type: 'warning', icon: '⚠️', title: 'Over budget', desc: `You spent ₹${fmt(totalSpent - totalIncome)} more than you earned. Review your expenses.` });
  } else {
    insights.push({ type: 'neutral', icon: '💡', title: `Savings rate: ${savingsRate.toFixed(0)}%`, desc: 'Aim for 30%+ savings for financial health.' });
  }

  if (categoryData.length > 0) {
    const top = categoryData[0];
    if (top.pct > 40) {
      insights.push({ type: 'warning', icon: '📊', title: `High ${capitalize(top.name)} spending`, desc: `${top.pct}% of your spending went to ${top.name} (₹${fmt(top.value)}). Consider if this aligns with your goals.` });
    }
  }

  const foodSpent = categoryData.find((c) => c.name === 'food')?.value || 0;
  if (foodSpent > 5000) {
    insights.push({ type: 'tip', icon: '🍔', title: 'Food delivery spending', desc: `You spent ₹${fmt(foodSpent)} on food. Cooking at home can save 60-70% on meals.` });
  }

  const txnCount = txns.filter((t) => t.type === 'debit').length;
  if (txnCount > 30) {
    insights.push({ type: 'tip', icon: '💳', title: 'High transaction frequency', desc: `${txnCount} debit transactions this month. Consider batch purchases to reduce impulse spending.` });
  }

  const investmentSpent = categoryData.find((c) => c.name === 'investment')?.value || 0;
  if (investmentSpent === 0 && totalIncome > 0) {
    insights.push({ type: 'tip', icon: '📈', title: 'No investments detected', desc: 'Consider investing at least 20% of your income in mutual funds or SIPs for long-term wealth.' });
  }

  return insights.slice(0, 5);
}

function InsightsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="skeleton" style={{ height: '48px', borderRadius: 'var(--radius-full)', width: '400px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: 'var(--radius-lg)' }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: '320px', borderRadius: 'var(--radius-lg)' }} />)}
      </div>
    </div>
  );
}

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
