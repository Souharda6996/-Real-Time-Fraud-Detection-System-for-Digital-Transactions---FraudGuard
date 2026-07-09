// ============================================================================
// store/useStore.js
// Zustand global store — single source of truth for all dashboard state.
// Ring buffer of 200 transactions, review queue, KPIs, threshold.
// ============================================================================

import { create } from 'zustand';

const MAX_TRANSACTIONS = 200;
const INITIAL_THRESHOLD = 55; // default precision/recall balance point

export const useStore = create((set, get) => ({
  // ── Transaction history (ring buffer) ────────────────────────────────────
  transactions: [],
  
  addTransaction: (txn) => set((state) => {
    const updated = [txn, ...state.transactions].slice(0, MAX_TRANSACTIONS);
    
    // Update KPIs
    const today = new Date().toDateString();
    const todayTxns = updated.filter(t => new Date(t.timestamp).toDateString() === today);
    const blocked = todayTxns.filter(t => t.decision === 'BLOCK');
    const reviewed = todayTxns.filter(t => t.decision === 'REVIEW');
    const approved = todayTxns.filter(t => t.decision === 'APPROVE');
    
    const fraudBlocked = blocked.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // False positive rate: approved txns that had score > 30 (were somewhat suspicious but passed)
    const borderlineApproved = approved.filter(t => t.score > 25).length;
    const falsePositiveRate = todayTxns.length > 0
      ? Math.round((borderlineApproved / Math.max(todayTxns.length, 1)) * 100 * 10) / 10
      : 0;
    
    const avgLatency = updated.length > 0
      ? Math.round(updated.slice(0, 20).reduce((s, t) => s + (t.latencyMs || 5), 0) / Math.min(updated.length, 20) * 10) / 10
      : 0;

    return {
      transactions: updated,
      kpis: {
        totalToday: todayTxns.length,
        fraudBlocked,
        blockedCount: blocked.length,
        reviewCount: reviewed.length,
        falsePositiveRate,
        avgLatency,
      },
    };
  }),

  // ── Review queue ──────────────────────────────────────────────────────────
  reviewQueue: [],

  addToQueue: (txn) => set((state) => ({
    reviewQueue: [txn, ...state.reviewQueue].slice(0, 50),
  })),

  resolveQueueItem: (txnId, resolution) => set((state) => {
    const item = state.reviewQueue.find(t => t.id === txnId);
    const wasCorrect = resolution === 'DECLINE' || resolution === 'ESCALATE';
    
    return {
      reviewQueue: state.reviewQueue.filter(t => t.id !== txnId),
      analystStats: {
        ...state.analystStats,
        total: state.analystStats.total + 1,
        correct: state.analystStats.correct + (wasCorrect ? 1 : 0),
        resolved: [
          { txnId, resolution, timestamp: new Date().toISOString(), amount: item?.amount },
          ...state.analystStats.resolved,
        ].slice(0, 20),
      },
    };
  }),

  analystStats: {
    total: 0,
    correct: 0,
    resolved: [],
  },

  // ── KPIs ──────────────────────────────────────────────────────────────────
  kpis: {
    totalToday: 0,
    fraudBlocked: 0,
    blockedCount: 0,
    reviewCount: 0,
    falsePositiveRate: 2.3,
    avgLatency: 0,
  },

  // ── Threshold slider (precision/recall tradeoff) ──────────────────────────
  threshold: INITIAL_THRESHOLD,
  setThreshold: (val) => set({ threshold: val }),

  // ── Live feed state ───────────────────────────────────────────────────────
  isLive: true,
  toggleLive: () => set((state) => ({ isLive: !state.isLive })),

  // ── Selected transaction (for detail panel) ───────────────────────────────
  selectedTxn: null,
  setSelectedTxn: (txn) => set({ selectedTxn: txn }),

  // ── Toast notifications ───────────────────────────────────────────────────
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3500);
  },
}));
