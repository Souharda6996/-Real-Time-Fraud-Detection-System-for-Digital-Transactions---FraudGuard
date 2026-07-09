'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Shield, Zap, Brain, ArrowRight, Activity, Lock,
  CheckCircle, Users, Globe, Clock
} from 'lucide-react';

function AnimatedCounter({ end, prefix = '', suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <span>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
}

const FEATURES = [
  {
    icon: Brain,
    title: 'Ensemble AI Scoring',
    description: 'Three-layer weighted ensemble: hard business rules + statistical behavioral deviation + trained logistic regression. Every signal has a named contribution.',
    accent: '#38BDF8',
    tag: 'Mirrors Hawk AI',
  },
  {
    icon: Shield,
    title: 'Explainable Decisions',
    description: 'Every BLOCK and REVIEW comes with human-readable reason codes — "Amount is 8.2× this user\'s 30-day average" — not a black-box score. Compliance-ready by default.',
    accent: '#22C55E',
    tag: 'Mirrors Feedzai',
  },
  {
    icon: Zap,
    title: 'Sub-10ms Edge Inference',
    description: 'Model trained offline in Python (scikit-learn), weights exported to JSON, inference runs in pure JavaScript serverless functions. Zero cold-start. No Python runtime in production.',
    accent: '#F59E0B',
    tag: 'Mirrors Forter',
  },
];

const STATS = [
  { label: 'Transactions Scored', end: 2847293, prefix: '', suffix: '+', icon: Activity },
  { label: 'Fraud Prevented', end: 94, prefix: '₹', suffix: 'L+', icon: Shield },
  { label: 'Decision Latency', end: 8, prefix: '', suffix: 'ms avg', icon: Clock },
  { label: 'Model Accuracy', end: 94, prefix: '', suffix: '%', icon: CheckCircle },
];

const COMPANIES = ['Stripe Radar', 'Sift', 'Feedzai', 'Forter', 'FICO Falcon', 'Hawk AI'];

// Floating transaction card component
function FloatingTxnCard({ txn, style, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      style={{
        background: '#0F1524',
        border: `1px solid ${txn.decision === 'BLOCK' ? 'rgba(239,68,68,0.3)' : txn.decision === 'REVIEW' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.2)'}`,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 11,
        backdropFilter: 'blur(8px)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#38BDF8', fontSize: 10, marginBottom: 2 }}>{txn.id}</div>
          <div style={{ color: '#F4F6FB', fontWeight: 500 }}>{txn.merchant}</div>
          <div style={{ color: '#8B93A8', marginTop: 1 }}>₹{txn.amount.toLocaleString('en-IN')} · {txn.location}</div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 11,
          background: txn.decision === 'BLOCK' ? 'rgba(239,68,68,0.15)' : txn.decision === 'REVIEW' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
          color: txn.decision === 'BLOCK' ? '#EF4444' : txn.decision === 'REVIEW' ? '#F59E0B' : '#22C55E',
          fontFamily: 'JetBrains Mono, monospace',
          whiteSpace: 'nowrap',
        }}>
          {txn.decision}
        </div>
      </div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ height: 3, flex: 1, background: '#232B42', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${txn.score}%`, height: '100%', borderRadius: 2,
            background: txn.decision === 'BLOCK' ? '#EF4444' : txn.decision === 'REVIEW' ? '#F59E0B' : '#22C55E',
          }} />
        </div>
        <span style={{ color: '#8B93A8', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{txn.score}</span>
        <span style={{ color: '#4B5563', fontSize: 10 }}>{txn.latencyMs}ms</span>
      </div>
    </motion.div>
  );
}

const DEMO_TXNS = [
  { id: 'TXN-K4X9-A2F', merchant: 'Swiggy', amount: 380, location: 'Bengaluru', decision: 'APPROVE', score: 12, latencyMs: 4 },
  { id: 'TXN-9B2M-C7Q', merchant: 'Unknown Foreign', amount: 48000, location: 'TOR_EXIT_NODE', decision: 'BLOCK', score: 92, latencyMs: 7 },
  { id: 'TXN-F1R3-H8P', merchant: 'CoinDCX', amount: 8500, location: 'Mumbai', decision: 'REVIEW', score: 58, latencyMs: 5 },
  { id: 'TXN-L5K2-B3N', merchant: 'Amazon India', amount: 1240, location: 'Delhi', decision: 'APPROVE', score: 8, latencyMs: 3 },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0E1A', color: '#F4F6FB', overflowX: 'hidden' }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #232B42',
        padding: '14px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #38BDF8, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(56,189,248,0.3)',
          }}>
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#F4F6FB' }}>FraudGuard</span>
            <span style={{ fontSize: 12, color: '#38BDF8', marginLeft: 6, fontWeight: 500 }}>AI</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/simulate" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'transparent', border: '1px solid #232B42',
              borderRadius: 8, padding: '7px 16px',
              color: '#8B93A8', fontSize: 13, cursor: 'pointer',
            }}>
              Try Demo
            </button>
          </Link>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'linear-gradient(135deg, #38BDF8, #3B82F6)',
              border: 'none', borderRadius: 8, padding: '7px 18px',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Launch Dashboard →
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px 60px',
        position: 'relative',
        textAlign: 'center',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.25)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 28,
            fontSize: 12, color: '#38BDF8', fontWeight: 500,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} className="live-dot" />
          Live Scoring Engine · Edge Network · Zero Cold Start
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontSize: 'clamp(36px, 6vw, 68px)',
            fontWeight: 900,
            lineHeight: 1.05,
            marginBottom: 20,
            maxWidth: 800,
          }}
        >
          Real-time fraud decisions
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #38BDF8, #3B82F6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            in milliseconds, not minutes.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: 17, color: '#8B93A8', lineHeight: 1.7,
            maxWidth: 620, marginBottom: 36,
          }}
        >
          ML model trained offline in Python, inference runs as pure JavaScript serverless functions
          on Vercel&apos;s edge — every transaction scored in{' '}
          <span style={{ color: '#38BDF8', fontWeight: 600 }}>single-digit milliseconds</span>{' '}
          with full explainability. No cold start. No Python runtime.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 60 }}
        >
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'linear-gradient(135deg, #38BDF8, #3B82F6)',
                border: 'none', borderRadius: 10, padding: '13px 28px',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 0 24px rgba(56,189,248,0.25)',
              }}
            >
              Launch Live Demo <ArrowRight size={16} />
            </motion.button>
          </Link>
          <Link href="/dashboard/simulate" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'transparent',
                border: '1px solid #232B42', borderRadius: 10, padding: '13px 28px',
                color: '#F4F6FB', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Zap size={16} color="#38BDF8" /> Try the Scoring Engine
            </motion.button>
          </Link>
        </motion.div>

        {/* Floating transaction cards */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 10,
          }}>
            {DEMO_TXNS.map((txn, i) => (
              <FloatingTxnCard key={txn.id} txn={txn} style={{}} delay={0.4 + i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{
        borderTop: '1px solid #232B42',
        borderBottom: '1px solid #232B42',
        padding: '40px 40px',
        background: '#0F1524',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, maxWidth: 900, margin: '0 auto',
          textAlign: 'center',
        }}>
          {STATS.map(({ label, end, prefix, suffix, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div style={{ fontSize: 32, fontWeight: 800, color: '#F4F6FB', fontFamily: 'JetBrains Mono, monospace' }}>
                <AnimatedCounter end={end} prefix={prefix} suffix={suffix} />
              </div>
              <div style={{ fontSize: 12, color: '#8B93A8', marginTop: 4 }}>{label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
            Built like an enterprise product.
          </h2>
          <p style={{ fontSize: 15, color: '#8B93A8', maxWidth: 560, margin: '0 auto' }}>
            Every design decision maps to a real production fraud system — so you can speak to the architecture intelligently.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="grid-cols-1 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description, accent, tag }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{
                background: '#0F1524', border: '1px solid #232B42', borderRadius: 14, padding: '24px',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 120, height: 120,
                background: `radial-gradient(circle at 80% 20%, ${accent}12 0%, transparent 60%)`,
              }} />
              <div style={{
                width: 44, height: 44, borderRadius: 10, marginBottom: 16,
                background: `${accent}15`, border: `1px solid ${accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={accent} />
              </div>
              <div style={{
                display: 'inline-block', fontSize: 10, padding: '2px 8px', borderRadius: 4,
                background: `${accent}12`, color: accent, fontWeight: 600, marginBottom: 10,
                letterSpacing: '0.05em',
              }}>
                {tag}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#F4F6FB' }}>{title}</h3>
              <p style={{ fontSize: 13, color: '#8B93A8', lineHeight: 1.6 }}>{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Architecture diagram */}
      <section style={{ padding: '0 40px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          background: '#0F1524', border: '1px solid #232B42', borderRadius: 14, padding: '32px',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 30 }}>
            System Architecture
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'Incoming Transaction', color: '#38BDF8', icon: '💳' },
              { label: '→', color: '#4B5563', isArrow: true },
              { label: 'Rule Engine', color: '#EF4444', icon: '⚡' },
              { label: '+', color: '#4B5563', isArrow: true },
              { label: 'Statistical Layer', color: '#F59E0B', icon: '📊' },
              { label: '+', color: '#4B5563', isArrow: true },
              { label: 'JS Model Inference', color: '#38BDF8', icon: '🤖' },
              { label: '→', color: '#4B5563', isArrow: true },
              { label: 'Weighted Score', color: '#8B5CF6', icon: '🎯' },
              { label: '→', color: '#4B5563', isArrow: true },
              { label: 'Decision', color: '#22C55E', icon: '✅' },
            ].map((item, i) => (
              item.isArrow ? (
                <span key={i} style={{ fontSize: 20, color: item.color }}>{item.label}</span>
              ) : (
                <div key={i} style={{
                  background: '#161D30',
                  border: `1px solid ${item.color}30`,
                  borderRadius: 10, padding: '10px 16px',
                  textAlign: 'center',
                  minWidth: 100,
                }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>{item.label}</div>
                </div>
              )
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#4B5563', marginTop: 20 }}>
            No Python runtime in production · Pure JS serverless · Vercel Edge Network · Avg 8ms end-to-end
          </p>
        </div>
      </section>

      {/* Inspired by strip */}
      <section style={{
        borderTop: '1px solid #232B42', padding: '28px 40px',
        background: '#0F1524',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, color: '#4B5563', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Patterns inspired by
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {COMPANIES.map(c => (
            <span key={c} style={{ fontSize: 13, color: '#4B5563', fontWeight: 500 }}>{c}</span>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#2D3748', marginTop: 10 }}>
          Not affiliated with any of the above companies.
        </div>
      </section>

      {/* CTA section */}
      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 14 }}>
            Ready to explore the demo?
          </h2>
          <p style={{ fontSize: 15, color: '#8B93A8', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
            Score a real transaction, inspect the reason codes, and drag the precision/recall slider — all in under 2 minutes.
          </p>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: 'linear-gradient(135deg, #38BDF8, #3B82F6)',
                border: 'none', borderRadius: 12, padding: '15px 36px',
                color: '#fff', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10,
                boxShadow: '0 0 32px rgba(56,189,248,0.3)',
              }}
            >
              Launch FraudGuard Dashboard <ArrowRight size={18} />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      <style jsx global>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        .live-dot { animation: livePulse 1.8s ease-in-out infinite; }
        @media (max-width: 768px) {
          nav { padding: 14px 20px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
    </div>
  );
}
