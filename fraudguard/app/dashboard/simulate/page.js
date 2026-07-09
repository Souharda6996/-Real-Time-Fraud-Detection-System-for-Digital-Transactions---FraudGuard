'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, User, MapPin, Smartphone, Clock, DollarSign, ChevronRight, RefreshCw } from 'lucide-react';
import { RiskBadge, ScoreGauge, SkeletonLoader } from '../../../components/ui/SharedComponents.js';
import { useStore } from '../../../store/useStore.js';
import { PERSONAS, PERSONA_LIST } from '../../../lib/personas.js';

// Preset demo scenarios (ported from demo_script.py)
const SCENARIOS = [
  {
    id: 'good_customer',
    label: '✅ The Good Customer',
    description: 'Normal everyday transaction — should APPROVE',
    persona: 'rahul_bengaluru',
    amount: 450,
    location: 'Bengaluru',
    device: 'Android',
    category: 'Food Delivery',
    isNewDevice: false,
    isNewLocation: false,
    hour: 13,
  },
  {
    id: 'ml_catch',
    label: '🚨 The ML Catch',
    description: 'High-value + flagged location — should BLOCK',
    persona: 'rohan_kolkata',
    amount: 48000,
    location: 'TOR_EXIT_NODE',
    device: 'Unknown Device',
    category: 'International',
    isNewDevice: true,
    isNewLocation: true,
    hour: 3,
  },
  {
    id: 'borderline',
    label: '⚠️ Borderline Case',
    description: 'New device + elevated amount — should REVIEW',
    persona: 'arjun_delhi',
    amount: 8500,
    location: 'Mumbai',
    device: 'iPhone',
    category: 'Crypto Exchange',
    isNewDevice: true,
    isNewLocation: true,
    hour: 22,
  },
];

const LOCATIONS = [
  'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Lagos', 'TOR_EXIT_NODE', 'Unknown Foreign'
];

const DEVICES = ['Android', 'iPhone', 'Desktop Chrome', 'Desktop Firefox', 'Unknown Device'];

const CATEGORIES = [
  'Food Delivery', 'E-Commerce', 'Transport', 'UPI Transfer',
  'Entertainment', 'Grocery & Retail', 'Wallet Top-Up', 'Crypto Exchange', 'International', 'POS Terminal'
];

function FactorBar({ factor, contribution, description, layer }) {
  const layerColors = { rule: '#EF4444', statistical: '#F59E0B', model: '#38BDF8' };
  const color = layerColors[layer] || '#8B93A8';

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#F4F6FB' }}>{factor}</span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 4,
            background: `${color}18`, color, fontWeight: 500,
          }}>
            {layer}
          </span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color }}>
          {contribution}
        </span>
      </div>
      {/* Bar */}
      <div style={{ height: 4, background: '#232B42', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${contribution}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          style={{ height: '100%', background: color, borderRadius: 2 }}
        />
      </div>
      <p style={{ fontSize: 11, color: '#8B93A8', lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

export default function SimulatePage() {
  const { addTransaction, addToQueue, addToast } = useStore();

  const [form, setForm] = useState({
    persona: 'rahul_bengaluru',
    amount: 1200,
    location: 'Bengaluru',
    device: 'Android',
    category: 'Food Delivery',
    isNewDevice: false,
    isNewLocation: false,
    hour: new Date().getHours(),
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const persona = PERSONAS[form.persona] || PERSONAS.rahul_bengaluru;

  const applyScenario = (scenario) => {
    setForm({
      persona: scenario.persona,
      amount: scenario.amount,
      location: scenario.location,
      device: scenario.device,
      category: scenario.category,
      isNewDevice: scenario.isNewDevice,
      isNewLocation: scenario.isNewLocation,
      hour: scenario.hour,
    });
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const txn = {
      id: `TXN-SIM-${Date.now().toString(36).toUpperCase()}`,
      userId: form.persona,
      userName: persona.name,
      amount: parseFloat(form.amount),
      currency: '₹',
      merchant: `${form.category} Merchant`,
      category: form.category,
      location: form.location,
      device: form.device,
      isNewDevice: form.isNewDevice,
      isNewLocation: form.isNewLocation,
      hour: parseInt(form.hour),
      timestamp: new Date().toISOString(),
      accountBalance: persona.accountBalance,
      personaAvgSpend: persona.avgSpend,
      personaStdSpend: persona.stdSpend || 500,
      personaHomeCity: persona.homeCity,
    };

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txn),
      });
      const data = await res.json();
      const enriched = { ...txn, ...data };
      setResult(enriched);
      addTransaction(enriched);
      if (enriched.decision === 'REVIEW') addToQueue(enriched);
      addToast(
        `${enriched.decision}: Score ${enriched.score} · ${enriched.latencyMs}ms`,
        enriched.decision === 'BLOCK' ? 'error' : enriched.decision === 'REVIEW' ? 'warning' : 'success'
      );
    } catch (err) {
      addToast('Scoring engine error — check console', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: '#161D30',
    border: '1px solid #232B42',
    color: '#F4F6FB',
    borderRadius: 8,
    padding: '9px 12px',
    width: '100%',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  };

  const labelStyle = { fontSize: 11, color: '#8B93A8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, display: 'block' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F4F6FB', marginBottom: 4 }}>
          Simulate a Transaction
        </h1>
        <p style={{ fontSize: 13, color: '#8B93A8' }}>
          Test the ensemble scoring engine with custom inputs — see exactly which signals fire and why.
        </p>
      </div>

      {/* Preset scenarios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }} className="grid-cols-1 md:grid-cols-3">
        {SCENARIOS.map(s => (
          <motion.button
            key={s.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => applyScenario(s)}
            style={{
              background: '#0F1524',
              border: '1px solid #232B42',
              borderRadius: 10,
              padding: '12px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#38BDF8'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#232B42'}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F4F6FB', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#8B93A8' }}>{s.description}</div>
          </motion.button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }} className="grid-cols-1 lg:grid-cols-2">
        {/* Form */}
        <div style={{
          background: '#0F1524',
          border: '1px solid #232B42',
          borderRadius: 12,
          padding: '20px',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#F4F6FB', marginBottom: 18 }}>
            Transaction Parameters
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Persona */}
            <div>
              <label style={labelStyle}>User Persona</label>
              <select
                value={form.persona}
                onChange={e => setForm(f => ({ ...f, persona: e.target.value }))}
                style={inputStyle}
              >
                {PERSONA_LIST.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Avg ₹{p.avgSpend.toLocaleString()} · {p.homeCity}
                  </option>
                ))}
              </select>
              {/* Persona info */}
              <div style={{
                marginTop: 6, padding: '8px 10px',
                background: '#161D30', border: '1px solid #1A2035', borderRadius: 6,
                fontSize: 11, color: '#8B93A8', display: 'flex', gap: 12, flexWrap: 'wrap',
              }}>
                <span>💳 Balance: ₹{persona.accountBalance?.toLocaleString()}</span>
                <span>📍 {persona.homeCity}</span>
                <span>📱 {persona.commonDevice}</span>
                <span style={{
                  color: persona.riskProfile === 'high' ? '#EF4444' : persona.riskProfile === 'medium' ? '#F59E0B' : '#22C55E',
                  fontWeight: 600,
                }}>
                  ● {persona.riskProfile?.toUpperCase()} profile
                </span>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label style={labelStyle}>Amount (₹)</label>
              <input
                type="number"
                min="1"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={inputStyle}
                required
              />
              {persona.avgSpend > 0 && (
                <div style={{ fontSize: 11, color: '#8B93A8', marginTop: 4 }}>
                  User avg: ₹{persona.avgSpend.toLocaleString()} ·
                  <span style={{ color: form.amount > persona.avgSpend * 3 ? '#EF4444' : '#8B93A8' }}>
                    {' '}{form.amount > 0 ? ((form.amount / persona.avgSpend)).toFixed(1) : 0}x avg
                  </span>
                </div>
              )}
            </div>

            {/* Location + Device */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Location</label>
                <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle}>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Device</label>
                <select value={form.device} onChange={e => setForm(f => ({ ...f, device: e.target.value }))} style={inputStyle}>
                  {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>Merchant Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Hour */}
            <div>
              <label style={labelStyle}>Hour of Day: {form.hour}:00 {form.hour >= 22 || form.hour <= 4 ? '🌙 (late night)' : '☀️'}</label>
              <input
                type="range" min="0" max="23" value={form.hour}
                onChange={e => setForm(f => ({ ...f, hour: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: '#38BDF8', cursor: 'pointer' }}
              />
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { key: 'isNewDevice', label: 'New/Unknown Device' },
                { key: 'isNewLocation', label: 'New Location' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div
                    onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                    style={{
                      width: 38, height: 20, borderRadius: 10, position: 'relative',
                      background: form[key] ? '#38BDF8' : '#232B42',
                      cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: form[key] ? 20 : 3,
                      width: 14, height: 14, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: form[key] ? '#F4F6FB' : '#8B93A8' }}>{label}</span>
                </label>
              ))}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              style={{
                background: loading ? '#232B42' : 'linear-gradient(135deg, #38BDF8, #3B82F6)',
                border: 'none', borderRadius: 8, padding: '12px',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 4,
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Scoring...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Score Transaction
                  <ChevronRight size={16} />
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Result panel */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {/* Decision card */}
              <div style={{
                background: '#0F1524', border: '1px solid #232B42', borderRadius: 12,
                padding: '20px', textAlign: 'center', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 200, height: 200,
                  background: `radial-gradient(circle, ${
                    result.decision === 'BLOCK' ? 'rgba(220,38,38,0.15)' :
                    result.decision === 'REVIEW' ? 'rgba(245,158,11,0.12)' :
                    'rgba(34,197,94,0.1)'
                  } 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
                <ScoreGauge score={result.score} size={180} />
                <div style={{ marginTop: 14 }}>
                  <RiskBadge decision={result.decision} size="lg" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontSize: 11, color: '#8B93A8' }}>
                  <span>⚡ {result.latencyMs}ms</span>
                  <span>📡 {result.modelVersion}</span>
                  <span>🔄 Velocity: {result.velocityCount}</span>
                </div>
              </div>

              {/* Layer breakdown */}
              <div style={{ background: '#0F1524', border: '1px solid #232B42', borderRadius: 12, padding: '16px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8B93A8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Ensemble Score Breakdown
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {result.layers && [
                    { label: 'Rule Engine', key: 'rule', color: '#EF4444' },
                    { label: 'Statistical', key: 'statistical', color: '#F59E0B' },
                    { label: 'ML Model', key: 'model', color: '#38BDF8' },
                  ].map(({ label, key, color }) => (
                    <div key={key} style={{
                      background: '#161D30', border: `1px solid ${color}25`, borderRadius: 8,
                      padding: '10px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: '#8B93A8', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>
                        {result.layers[key]?.score ?? '—'}
                      </div>
                      <div style={{ fontSize: 9, color: '#4B5563', marginTop: 2 }}>
                        ×{key === 'rule' ? '0.4' : '0.3'} weight
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feature contributions */}
                <div style={{ borderTop: '1px solid #1A2035', paddingTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#8B93A8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                    Signal Explanations
                  </div>
                  {result.reasons?.map((r, i) => (
                    <FactorBar key={i} {...r} />
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: '#0F1524', border: '1px dashed #232B42', borderRadius: 12,
                padding: '60px 20px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}
            >
              <Zap size={36} color="#232B42" />
              <div style={{ fontSize: 14, color: '#4B5563', fontWeight: 500 }}>
                Pick a scenario or fill the form
              </div>
              <div style={{ fontSize: 12, color: '#2D3748' }}>
                Results appear here with full explainability breakdown
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
