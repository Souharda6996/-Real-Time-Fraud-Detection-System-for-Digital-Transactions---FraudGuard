'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useStore } from '../../../store/useStore.js';

// Generate precision/recall curve data
function generatePRCurve() {
  const data = [];
  for (let t = 0; t <= 100; t += 2) {
    // Sigmoid-shaped precision curve, linear-ish recall decay
    const precision = 100 - (100 / (1 + Math.exp((t - 50) * 0.08)));
    const recall = (100 / (1 + Math.exp(-(t - 30) * 0.07)));
    const f1 = precision > 0 && recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;
    data.push({ threshold: t, precision: Math.round(precision * 10) / 10, recall: Math.round(recall * 10) / 10, f1: Math.round(f1 * 10) / 10 });
  }
  return data;
}

const PR_CURVE = generatePRCurve();

const CATEGORY_COLORS = ['#EF4444', '#F59E0B', '#DC2626', '#8B5CF6', '#EC4899', 'var(--accent-burgundy)', '#22C55E', '#4B5563'];

const CUSTOM_TOOLTIP_STYLE = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text-primary)',
};

export default function AnalyticsPage() {
  const { transactions, threshold, setThreshold, kpis } = useStore();

  const dynamicFraudCategories = useMemo(() => {
    const blockedTxns = transactions.filter(t => t.decision === 'BLOCK');
    if (blockedTxns.length === 0) return [{ name: 'No Data', value: 100, color: '#4B5563' }];

    const counts = {};
    blockedTxns.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });

    const total = blockedTxns.length;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({
        name,
        value: Math.round((count / total) * 100),
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
      }));
  }, [transactions]);

  const prPoint = useMemo(() => {
    const idx = Math.round(threshold / 2);
    return PR_CURVE[Math.min(idx, PR_CURVE.length - 1)];
  }, [threshold]);

  // Volume chart — transactions per simulated time slot
  const volumeData = useMemo(() => {
    const slots = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      total: 0, fraud: 0, legitimate: 0,
    }));
    transactions.forEach(t => {
      const h = new Date(t.timestamp).getHours();
      slots[h].total++;
      if (t.decision === 'BLOCK') slots[h].fraud++;
      else slots[h].legitimate++;
    });
    return slots;
  }, [transactions]);

  const fraudCaught = prPoint ? Math.round((prPoint.recall / 100) * 100) : 0;
  const falsePositives = prPoint ? Math.round(((100 - prPoint.precision) / 100) * 30) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F4F6FB', marginBottom: 4 }}>
          Model Analytics
        </h1>
        <p style={{ fontSize: 13, color: '#8B93A8' }}>
          Precision/recall tradeoff, fraud distribution, and transaction volume analysis.
        </p>
      </div>

      {/* Live Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Scored', value: kpis.totalToday, color: 'var(--accent-burgundy)' },
          { label: 'Total Blocked', value: kpis.blockedCount, color: 'var(--risk-high)' },
          { label: 'Total Reviewed', value: kpis.reviewCount, color: 'var(--risk-medium)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12,
            padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'var(--font-mono), monospace' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Precision/Recall Threshold Slider */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#F4F6FB', marginBottom: 4 }}>
              Precision vs Recall — Threshold Tradeoff
            </h2>
            <p style={{ fontSize: 12, color: '#8B93A8' }}>
              Drag the slider to see how threshold changes the business tradeoff between catching more fraud vs annoying legitimate customers.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            {[
              { label: 'Fraud Caught', value: `${fraudCaught}%`, color: 'var(--risk-low)' },
              { label: 'False Positives', value: `~${falsePositives}/day`, color: 'var(--risk-high)' },
              { label: 'F1 Score', value: prPoint?.f1?.toFixed(1), color: 'var(--accent-burgundy)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 8,
                padding: '8px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'var(--font-mono), monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Threshold slider */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: 'var(--risk-low)' }}>← Catch More Fraud (more FP risk)</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono), monospace', fontWeight: 700 }}>
              Threshold: {threshold}
            </span>
            <span style={{ color: 'var(--accent-burgundy)' }}>Fewer False Positives →</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="range" min="10" max="90" value={threshold}
              onChange={e => setThreshold(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-burgundy)', cursor: 'pointer', height: 6 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#4B5563' }}>
            <span>10 (Aggressive)</span>
            <span>50 (Balanced)</span>
            <span>90 (Conservative)</span>
          </div>
        </div>

        {/* PR Curve chart */}
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={PR_CURVE} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="threshold" tick={{ fill: '#4B5563', fontSize: 10 }} label={{ value: 'Decision Threshold', position: 'bottom', fill: '#4B5563', fontSize: 11 }} />
            <YAxis tick={{ fill: '#4B5563', fontSize: 10 }} domain={[0, 100]} />
            <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v, n) => [`${v}%`, n]} />
            <Line type="monotone" dataKey="precision" stroke="var(--accent-burgundy)" strokeWidth={2} dot={false} name="Precision" />
            <Line type="monotone" dataKey="recall" stroke="var(--risk-low)" strokeWidth={2} dot={false} name="Recall" />
            <Line type="monotone" dataKey="f1" stroke="var(--risk-medium)" strokeWidth={1.5} dot={false} strokeDasharray="4 3" name="F1 Score" />
            {/* Threshold line */}
            <Line
              type="monotone"
              dataKey={() => null}
              stroke="transparent"
              dot={false}
            />
            <CartesianGrid vertical={false} horizontalPoints={[]} />
            {/* Reference line at current threshold */}
            {prPoint && (
              <>
                <line x1={`${threshold}%`} y1="0%" x2={`${threshold}%`} y2="100%" stroke="#F4F6FB20" strokeWidth={1} strokeDasharray="4 3" />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8, fontSize: 11 }}>
          {[{ color: 'var(--accent-burgundy)', label: 'Precision' }, { color: 'var(--risk-low)', label: 'Recall' }, { color: 'var(--risk-medium)', label: 'F1 Score' }].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
              <div style={{ width: 16, height: 2, background: color, borderRadius: 1 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: Volume + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }} className="grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* Transaction volume */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '20px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Transaction Volume by Hour
          </h2>
          <p style={{ fontSize: 12, color: '#8B93A8', marginBottom: 16 }}>
            Fraud spikes at night — typical card-not-present attack pattern.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={volumeData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="legitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-burgundy)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-burgundy)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--risk-high)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--risk-high)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="hour" tick={{ fill: '#4B5563', fontSize: 9 }} interval={3} />
              <YAxis tick={{ fill: '#4B5563', fontSize: 10 }} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="legitimate" stackId="1" stroke="var(--accent-burgundy)" fill="url(#legitGrad)" strokeWidth={1.5} name="Legitimate" />
              <Area type="monotone" dataKey="fraud" stackId="1" stroke="var(--risk-high)" fill="url(#fraudGrad)" strokeWidth={1.5} name="Fraud" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Fraud by category donut */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '20px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Fraud by Category
          </h2>
          <p style={{ fontSize: 12, color: '#8B93A8', marginBottom: 12 }}>Blocked transactions breakdown</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={dynamicFraudCategories}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {dynamicFraudCategories.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8, maxHeight: 120, overflowY: 'auto' }}>
            {dynamicFraudCategories.map(({ name, value, color }) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{name}</span>
                </div>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-mono), monospace' }}>{value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
