'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useStore } from '../../store/useStore.js';

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: { border: '#22C55E', bg: 'rgba(34,197,94,0.1)', icon: '#22C55E' },
  warning: { border: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: '#F59E0B' },
  error:   { border: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: '#EF4444' },
  info:    { border: '#38BDF8', bg: 'rgba(56,189,248,0.1)', icon: '#38BDF8' },
};

function Toast({ toast }) {
  const Icon = ICONS[toast.type] || Info;
  const c = COLORS[toast.type] || COLORS.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        background: '#0F1524',
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.border}`,
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 280,
        maxWidth: 360,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <Icon size={16} color={c.icon} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#F4F6FB', flex: 1 }}>{toast.message}</span>
    </motion.div>
  );
}

export default function ToastContainer() {
  const toasts = useStore(s => s.toasts);

  return (
    <div className="toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <Toast key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
