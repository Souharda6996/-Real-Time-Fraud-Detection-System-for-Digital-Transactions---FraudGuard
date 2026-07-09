'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Shield, AlertTriangle, Clock, ChevronDown, ChevronUp,
  TrendingUp, Zap, User, MapPin, Smartphone, DollarSign, Play, Pause
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { useStore } from '../../store/useStore.js';
import { generateTransaction } from '../../lib/generateTransaction.js';
import { KpiCard, RiskBadge, ScoreGauge, SkeletonLoader } from '../../components/ui/SharedComponents.js';

function LiveFeedRow({ txn, isNew }) {
  const [expanded, setExpanded] = useState(false);
  const setSelectedTxn = useStore(s => s.setSelectedTxn);

  const decisionColors = {
    APPROVE: '#22C55E', REVIEW: '#F59E0B', BLOCK: '#EF4444'
  };

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -16, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        background: expanded ? 'var(--bg-tertiary)' : 'transparent',
        border: `1px solid ${expanded ? 'var(--border-subtle)' : 'transparent'}`,
        borderRadius: 10,
        marginBottom: 2,
        overflow: 'hidden',
        transition: 'background 0.2s',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(v => !v)}
      whileHover={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Main row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 90px 80px 28px',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
      }}>
        {/* Txn info */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, color: 'var(--accent-burgundy)', fontFamily: 'var(--font-mono), monospace',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: 140,
            }}>
              {txn.id}
            </span>
            {txn.decision === 'BLOCK' && (
              <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.15)', color: '#EF4444', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                ⚠
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 12, color: '#F4F6FB', fontWeight: 500 }}>{txn.merchant}</span>
            <span style={{ fontSize: 11, color: '#4B5563' }}>·</span>
            <span style={{ fontSize: 11, color: '#8B93A8' }}>{txn.userName}</span>
            <span style={{ fontSize: 11, color: '#4B5563' }}>·</span>
            <span style={{ fontSize: 11, color: '#8B93A8' }}>{txn.location}</span>
          </div>
        </div>

        {/* Amount */}
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: '#F4F6FB', textAlign: 'right' }}>
          ₹{txn.amount?.toLocaleString('en-IN')}
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <div style={{
            width: 32, height: 4, borderRadius: 2, background: 'var(--border-subtle)', overflow: 'hidden',
          }}>
            <div style={{
              width: `${txn.score}%`, height: '100%',
              background: decisionColors[txn.decision],
              borderRadius: 2,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: decisionColors[txn.decision], fontWeight: 600, minWidth: 24 }}>
            {txn.score}
          </span>
        </div>

        {/* Badge */}
        <div>
          <RiskBadge decision={txn.decision} />
        </div>

        {/* Expand */}
        <div style={{ color: '#4B5563' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded reason codes */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 0 }}>
              <div style={{ fontSize: 11, color: '#8B93A8', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Decision Breakdown
              </div>

              {/* Layer scores */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {txn.layers && Object.entries(txn.layers).map(([layer, data]) => (
                  <div key={layer} style={{
                    background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 6,
                    padding: '6px 10px', flex: 1, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{layer}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono), monospace', color: 'var(--text-primary)' }}>
                      {data.score}
                    </div>
                  </div>
                ))}
                <div style={{
                  background: 'var(--bg-primary)', border: `1px solid ${decisionColors[txn.decision]}40`, borderRadius: 6,
                  padding: '6px 10px', flex: 1, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Final</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono), monospace', color: decisionColors[txn.decision] }}>
                    {txn.score}
                  </div>
                </div>
              </div>

              {/* Reasons */}
              {txn.reasons?.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 0',
                  borderBottom: i < txn.reasons.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                    background: r.layer === 'rule' ? 'var(--risk-high)' : r.layer === 'statistical' ? 'var(--risk-medium)' : 'var(--accent-burgundy)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{r.factor}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 1 }}>{r.description}</div>
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono), monospace',
                    color: r.contribution > 70 ? 'var(--risk-high)' : r.contribution > 40 ? 'var(--risk-medium)' : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}>
                    {r.contribution}
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 8, display: 'flex', gap: 8, fontSize: 10, color: '#4B5563' }}>
                <span>Latency: {txn.latencyMs === 0 ? '<1' : txn.latencyMs}ms</span>
                <span>·</span>
                <span>Velocity: {txn.velocityCount} txns/10min</span>
                <span>·</span>
                <span>{txn.modelVersion}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { transactions, kpis, addTransaction, addToQueue, isLive, toggleLive } = useStore();
  const [latestTxn, setLatestTxn] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const newTxnIds = useRef(new Set());

  const scoreAndAddTransaction = useCallback(async (txn) => {
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txn),
      });
      const result = await res.json();
      const enriched = { ...txn, ...result };
      newTxnIds.current.add(txn.id);
      addTransaction(enriched);
      setLatestTxn(enriched);
      if (enriched.decision === 'REVIEW') addToQueue(enriched);
      setTimeout(() => newTxnIds.current.delete(txn.id), 3000);
    } catch (e) {
      console.error('Scoring error:', e);
    }
  }, [addTransaction, addToQueue]);

  // Seed with initial transactions
  useEffect(() => {
    const seed = async () => {
      setIsLoading(true);
      for (let i = 0; i < 15; i++) {
        await scoreAndAddTransaction(generateTransaction());
        await new Promise(r => setTimeout(r, 60));
      }
      setIsLoading(false);
    };
    seed();
  }, [scoreAndAddTransaction]);

  // Live feed loop
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      scoreAndAddTransaction(generateTransaction());
    }, 2500 + Math.random() * 1500);
    return () => clearInterval(interval);
  }, [isLive, scoreAndAddTransaction]);

  // Chart data — last 40 transactions' risk scores
  const chartData = transactions.slice(0, 40).reverse().map((t, i) => ({
    i,
    score: t.score,
    decision: t.decision,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display), serif', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Live Operations Dashboard
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Real-time transaction scoring · Ensemble AI · Sub-10ms decisions
        </p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="grid-cols-2 md:grid-cols-4">
        <KpiCard
          title="Transactions Today"
          value={kpis.totalToday}
          subtitle="Since midnight"
          icon={Activity}
          glowColor="var(--accent-burgundy)"
        />
        <KpiCard
          title="Fraud Blocked"
          value={kpis.fraudBlocked}
          prefix="₹"
          subtitle={`${kpis.blockedCount || 0} transactions blocked`}
          icon={Shield}
          glowColor="#EF4444"
          decimals={0}
        />
        <KpiCard
          title="False Positive Rate"
          value={kpis.falsePositiveRate || 0}
          suffix="%"
          subtitle="Legit txns incorrectly flagged"
          icon={AlertTriangle}
          glowColor="#F59E0B"
          decimals={1}
        />
        <KpiCard
          title="Avg Decision Latency"
          value={kpis.avgLatency || 0}
          suffix="ms"
          subtitle="JS edge inference, no cold start"
          icon={Clock}
          glowColor="#22C55E"
          decimals={1}
        />
      </div>

      {/* Main content: feed + gauge */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }} className="grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* Live feed */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Feed header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div className={isLive ? 'live-dot' : ''} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isLive ? '#22C55E' : '#F59E0B', 
              boxShadow: isLive ? '0 0 8px #22C55E' : 'none',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {isLive ? 'Live Transaction Feed' : 'Feed Paused'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>{transactions.length} scored</span>
              <button
                onClick={toggleLive}
                style={{
                  background: isLive ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                  border: `1px solid ${isLive ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
                  borderRadius: 6,
                  padding: '4px 8px',
                  color: isLive ? '#F59E0B' : '#22C55E',
                  display: 'flex', alignItems: 'center', gap: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 10,
                }}
              >
                {isLive ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Resume</>}
              </button>
            </span>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 90px 80px 28px',
            gap: 12, padding: '8px 12px',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            {['Transaction', 'Amount', 'Score', 'Decision', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, color: '#4B5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 1 ? 'right' : i === 2 ? 'center' : 'left' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ maxHeight: 420, overflowY: 'auto', padding: '4px 8px' }}>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: '10px 4px', display: 'flex', gap: 12 }}>
                  <SkeletonLoader height={14} />
                </div>
              ))
            ) : (
              <AnimatePresence initial={false}>
                {transactions.slice(0, 50).map((txn) => (
                  <LiveFeedRow key={txn.id} txn={txn} isNew={newTxnIds.current.has(txn.id)} />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right panel: gauge + trend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Score gauge */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: '20px 16px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Radial glow */}
            <div style={{
              position: 'absolute',
              top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 160, height: 160,
              background: `radial-gradient(circle, ${
                !latestTxn ? 'var(--accent-burgundy-glow)' :
                latestTxn.decision === 'BLOCK' ? 'rgba(255,59,59,0.15)' :
                latestTxn.decision === 'REVIEW' ? 'rgba(232,163,61,0.12)' :
                'rgba(34,197,94,0.1)'
              } 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Latest Transaction
            </div>

            {latestTxn ? (
              <>
                <ScoreGauge score={latestTxn.score || 0} size={200} />
                <div style={{ marginTop: 12 }}>
                  <RiskBadge decision={latestTxn.decision} size="lg" />
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {latestTxn.merchant}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono), monospace' }}>
                  ₹{latestTxn.amount?.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>
                  {latestTxn.latencyMs === 0 ? '<1' : latestTxn.latencyMs}ms · {latestTxn.modelVersion}
                </div>
              </>
            ) : (
              <div style={{ padding: '40px 0' }}>
                <SkeletonLoader height={120} rounded={100} />
              </div>
            )}
          </div>

          {/* Trend sparkline */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Risk Score Trend
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -30 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6D001A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6D001A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: 11 }}
                  formatter={(v) => [`${v}`, 'Risk Score']}
                  labelFormatter={() => ''}
                />
                <Area
                  type="monotone" dataKey="score"
                  stroke="#6D001A" fill="url(#scoreGrad)"
                  strokeWidth={1.5} dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
