'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertOctagon, Clock, Shield, TrendingUp, Inbox } from 'lucide-react';
import { RiskBadge, ExportButton } from '../../../components/ui/SharedComponents.js';
import { useStore } from '../../../store/useStore.js';

const RESOLUTION_BUTTONS = [
  {
    action: 'APPROVE',
    label: 'Approve',
    icon: CheckCircle,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.3)',
    description: 'Mark as legitimate — release transaction',
  },
  {
    action: 'DECLINE',
    label: 'Decline',
    icon: XCircle,
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
    description: 'Confirmed fraud — block and log',
  },
  {
    action: 'ESCALATE',
    label: 'Escalate',
    icon: AlertOctagon,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    description: 'Needs senior analyst review',
  },
];

function QueueItem({ txn }) {
  const { resolveQueueItem, addToast } = useStore();
  const [resolving, setResolving] = useState(null);

  const handleResolve = (action) => {
    setResolving(action);
    setTimeout(() => {
      resolveQueueItem(txn.id, action);
      addToast(
        `${txn.id.slice(-8)} — ${action}${action === 'DECLINE' ? ' (fraud confirmed)' : ''}`,
        action === 'APPROVE' ? 'success' : action === 'DECLINE' ? 'error' : 'warning'
      );
    }, 400);
  };

  const timeSince = () => {
    const diff = Date.now() - new Date(txn.timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: resolving ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: '#0F1524',
        border: '1px solid #232B42',
        borderLeft: '3px solid #F59E0B',
        borderRadius: 10,
        padding: '16px',
        marginBottom: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#38BDF8' }}>
              {txn.id}
            </span>
            <RiskBadge decision={txn.decision} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#F4F6FB' }}>
            {txn.merchant} — ₹{txn.amount?.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: '#8B93A8' }}>
            <span>👤 {txn.userName}</span>
            <span>📍 {txn.location}</span>
            <span>📱 {txn.device}</span>
            <span>🕐 {timeSince()}</span>
          </div>
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 28, fontWeight: 800,
          color: '#F59E0B',
          lineHeight: 1,
        }}>
          {txn.score}
        </div>
      </div>

      {/* Top reason */}
      {txn.reasons?.[0] && (
        <div style={{
          background: '#161D30', border: '1px solid #1A2035',
          borderRadius: 6, padding: '8px 10px', marginBottom: 12,
          fontSize: 11, color: '#8B93A8',
        }}>
          <span style={{ color: '#F4F6FB', fontWeight: 600 }}>⚠ {txn.reasons[0].factor}: </span>
          {txn.reasons[0].description}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {RESOLUTION_BUTTONS.map(({ action, label, icon: Icon, color, bg, border }) => (
          <motion.button
            key={action}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleResolve(action)}
            disabled={!!resolving}
            style={{
              flex: 1, background: resolving === action ? bg : 'transparent',
              border: `1px solid ${border}`, borderRadius: 7,
              padding: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              color, fontSize: 12, fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            <Icon size={13} />
            {label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default function QueuePage() {
  const { reviewQueue, analystStats } = useStore();

  const accuracy = analystStats.total > 0
    ? Math.round((analystStats.correct / analystStats.total) * 100)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F4F6FB', marginBottom: 4 }}>
            Analyst Review Queue
          </h1>
          <p style={{ fontSize: 13, color: '#8B93A8' }}>
            Medium-risk transactions flagged for human review — approve, decline, or escalate.
          </p>
        </div>
        <div style={{
          background: '#0F1524', border: '1px solid #232B42', borderRadius: 10,
          padding: '10px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: '#8B93A8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Queue</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B', fontFamily: 'JetBrains Mono, monospace' }}>
            {reviewQueue.length}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Reviewed', value: analystStats.total, icon: Shield, color: '#38BDF8' },
          { label: 'Fraud Confirmed', value: analystStats.resolved.filter(r => r.resolution === 'DECLINE').length, icon: XCircle, color: '#EF4444' },
          { label: 'Analyst Accuracy', value: accuracy !== null ? `${accuracy}%` : '—', icon: TrendingUp, color: '#22C55E' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: '#0F1524', border: '1px solid #232B42',
            borderRadius: 10, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 8, padding: 8 }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#8B93A8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F4F6FB', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Queue items */}
      <div>
        <AnimatePresence mode="popLayout">
          {reviewQueue.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: '#0F1524', border: '1px dashed #232B42', borderRadius: 12,
                padding: '60px 20px', textAlign: 'center',
              }}
            >
              <Inbox size={40} color="#232B42" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, color: '#4B5563', fontWeight: 500 }}>Queue is clear</div>
              <div style={{ fontSize: 12, color: '#2D3748', marginTop: 4 }}>
                No pending items — all medium-risk transactions have been reviewed.
              </div>
            </motion.div>
          ) : (
            reviewQueue.map(txn => <QueueItem key={txn.id} txn={txn} />)
          )}
        </AnimatePresence>
      </div>

      {/* Resolution history */}
      {analystStats.resolved.length > 0 && (
        <div style={{ background: '#0F1524', border: '1px solid #232B42', borderRadius: 12, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8B93A8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Recent Resolutions
            </div>
            <ExportButton data={analystStats.resolved} filename="resolved_queue.csv" />
          </div>
          {analystStats.resolved.slice(0, 8).map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 0',
              borderBottom: i < 7 ? '1px solid #1A2035' : 'none',
              fontSize: 12,
            }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#38BDF8', fontSize: 11 }}>
                {r.txnId?.slice(-10)}
              </span>
              <span style={{ color: '#8B93A8' }}>₹{r.amount?.toLocaleString('en-IN')}</span>
              <span style={{
                color: r.resolution === 'APPROVE' ? '#22C55E' : r.resolution === 'DECLINE' ? '#EF4444' : '#F59E0B',
                fontWeight: 600,
              }}>
                {r.resolution}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
