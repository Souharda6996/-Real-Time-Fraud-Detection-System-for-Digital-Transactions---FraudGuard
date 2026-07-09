'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Pre-configured entity graph data
const NODES = [
  // Cluster A: Mule ring (fraudulent)
  { id: 'u1', label: 'Rohan B.', type: 'user', x: 180, y: 120, risk: 'high', detail: 'Account age: 45 days · 8 txns in 2h' },
  { id: 'u2', label: 'Unknown-7x4', type: 'user', x: 90, y: 200, risk: 'critical', detail: 'No KYC · 3 flagged locations' },
  { id: 'u3', label: 'User-8821', type: 'user', x: 260, y: 210, risk: 'high', detail: 'Device shared with u1' },
  { id: 'd1', label: 'Device #A9F2', type: 'device', x: 170, y: 270, risk: 'high', detail: 'Seen on 3 different accounts' },
  { id: 'ip1', label: 'TOR Exit Node', type: 'ip', x: 110, y: 330, risk: 'critical', detail: 'Known anonymizer · 47 fraud reports' },

  // Cluster B: Normal users
  { id: 'u4', label: 'Rahul M.', type: 'user', x: 520, y: 100, risk: 'low', detail: 'Account age: 820 days · Normal activity' },
  { id: 'u5', label: 'Priya S.', type: 'user', x: 620, y: 180, risk: 'low', detail: 'High-value but consistent pattern' },
  { id: 'd2', label: 'iPhone #F8A1', type: 'device', x: 570, y: 260, risk: 'low', detail: 'Consistent single-user device' },
  { id: 'ip2', label: 'BLR-ISP-Cluster', type: 'ip', x: 540, y: 350, risk: 'low', detail: 'Residential Bengaluru IP range' },

  // Borderline
  { id: 'u6', label: 'Arjun K.', type: 'user', x: 360, y: 150, risk: 'medium', detail: 'Recent device change · Delhi → Mumbai' },
  { id: 'd3', label: 'New Android', type: 'device', x: 400, y: 270, risk: 'medium', detail: 'First seen 2 days ago' },
];

const EDGES = [
  { from: 'u1', to: 'd1', label: 'shares device' },
  { from: 'u2', to: 'd1', label: 'shares device' },
  { from: 'u3', to: 'd1', label: 'shares device' },
  { from: 'u2', to: 'ip1', label: 'same IP' },
  { from: 'u1', to: 'ip1', label: 'same IP' },
  { from: 'u4', to: 'd2', label: 'owns device' },
  { from: 'u5', to: 'd2', label: 'shares device' },
  { from: 'u4', to: 'ip2', label: 'home IP' },
  { from: 'u5', to: 'ip2', label: 'home IP' },
  { from: 'u6', to: 'd3', label: 'new device' },
  { from: 'u6', to: 'ip2', label: 'IP range' },
];

const NODE_COLORS = {
  low: { fill: '#22C55E', border: 'rgba(34,197,94,0.5)', glow: '#22C55E' },
  medium: { fill: '#F59E0B', border: 'rgba(245,158,11,0.5)', glow: '#F59E0B' },
  high: { fill: '#EF4444', border: 'rgba(239,68,68,0.5)', glow: '#EF4444' },
  critical: { fill: '#DC2626', border: 'rgba(220,38,38,0.8)', glow: '#DC2626' },
};

const NODE_SHAPES = {
  user: 'circle',
  device: 'rect',
  ip: 'diamond',
};

const NODE_ICONS = { user: '👤', device: '📱', ip: '🌐' };

export default function NetworkPage() {
  const [selected, setSelected] = useState(null);
  const [highlightCluster, setHighlightCluster] = useState('fraud');

  const fraudNodeIds = new Set(['u1', 'u2', 'u3', 'd1', 'ip1']);
  const selectedNode = NODES.find(n => n.id === selected);

  const isHighlighted = (nodeId) => {
    if (!highlightCluster) return true;
    if (highlightCluster === 'fraud') return fraudNodeIds.has(nodeId);
    return true;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F4F6FB', marginBottom: 4 }}>
            Entity Relationship Graph
          </h1>
          <p style={{ fontSize: 13, color: '#8B93A8' }}>
            Visualises shared devices, IPs, and accounts — surfaces mule rings and account takeover patterns.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: 'fraud', label: '🔴 Highlight Fraud Ring', color: '#EF4444' },
            { id: null, label: 'Show All', color: '#8B93A8' },
          ].map(btn => (
            <button
              key={String(btn.id)}
              onClick={() => setHighlightCluster(btn.id)}
              style={{
                background: highlightCluster === btn.id ? 'rgba(56,189,248,0.1)' : 'transparent',
                border: `1px solid ${highlightCluster === btn.id ? '#38BDF8' : '#232B42'}`,
                borderRadius: 8, padding: '7px 14px',
                color: highlightCluster === btn.id ? '#38BDF8' : '#8B93A8',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, alignItems: 'start' }}>
        {/* Graph canvas */}
        <div style={{
          background: '#0F1524', border: '1px solid #232B42', borderRadius: 12, overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Fraud ring label */}
          <div style={{
            position: 'absolute', top: 16, left: 16, zIndex: 10,
            background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#EF4444', fontWeight: 600,
          }}>
            ⚠ Mule Ring Detected — Cluster A
          </div>

          <svg width="100%" viewBox="0 0 700 440" style={{ display: 'block' }}>
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#161D30" strokeWidth="0.5" />
              </pattern>
              {/* Glow filters */}
              <filter id="glowRed"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="glowBlue"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <rect width="700" height="440" fill="url(#grid)" />

            {/* Fraud cluster background */}
            <ellipse cx="175" cy="230" rx="130" ry="135"
              fill="rgba(220,38,38,0.04)" stroke="rgba(220,38,38,0.15)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="85" y="385" fill="rgba(220,38,38,0.5)" fontSize="10" fontFamily="JetBrains Mono">CLUSTER A — FRAUD RING</text>

            {/* Normal cluster background */}
            <ellipse cx="575" cy="225" rx="100" ry="120"
              fill="rgba(34,197,94,0.03)" stroke="rgba(34,197,94,0.1)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="510" y="370" fill="rgba(34,197,94,0.4)" fontSize="10" fontFamily="JetBrains Mono">CLUSTER B — NORMAL</text>

            {/* Edges */}
            {EDGES.map((edge, i) => {
              const from = NODES.find(n => n.id === edge.from);
              const to = NODES.find(n => n.id === edge.to);
              if (!from || !to) return null;
              const isFraudEdge = fraudNodeIds.has(edge.from) && fraudNodeIds.has(edge.to);
              const opacity = highlightCluster === 'fraud'
                ? (isFraudEdge ? 1 : 0.15)
                : 0.5;
              return (
                <g key={i}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isFraudEdge ? '#EF4444' : '#232B42'}
                    strokeWidth={isFraudEdge ? 1.5 : 1}
                    strokeOpacity={opacity}
                    strokeDasharray={isFraudEdge ? 'none' : '3 4'}
                  />
                  <text
                    x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 4}
                    fill="#4B5563" fontSize="9" textAnchor="middle" fontFamily="Inter"
                    opacity={opacity}
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {NODES.map((node) => {
              const c = NODE_COLORS[node.risk];
              const isSelected = selected === node.id;
              const dimmed = highlightCluster === 'fraud' && !fraudNodeIds.has(node.id);
              return (
                <motion.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: dimmed ? 0.3 : 1 }}
                  transition={{ delay: NODES.indexOf(node) * 0.05, type: 'spring', stiffness: 300 }}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(isSelected ? null : node.id)}
                  whileHover={{ scale: 1.15 }}
                >
                  {node.type === 'user' ? (
                    <circle
                      cx={node.x} cy={node.y} r={isSelected ? 22 : 18}
                      fill={`${c.fill}20`} stroke={c.fill}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter={node.risk === 'critical' || node.risk === 'high' ? 'url(#glowRed)' : undefined}
                    />
                  ) : node.type === 'device' ? (
                    <rect
                      x={node.x - 16} y={node.y - 12} width={32} height={24}
                      rx={4} fill={`${c.fill}20`} stroke={c.fill}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                  ) : (
                    <polygon
                      points={`${node.x},${node.y-18} ${node.x+18},${node.y} ${node.x},${node.y+18} ${node.x-18},${node.y}`}
                      fill={`${c.fill}20`} stroke={c.fill}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                  )}
                  <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#F4F6FB" fontSize="11" fontFamily="Inter">
                    {NODE_ICONS[node.type]}
                  </text>
                  <text x={node.x} y={node.y + 30} textAnchor="middle" fill="#8B93A8" fontSize="10" fontFamily="Inter">
                    {node.label}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* Detail panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Legend */}
          <div style={{ background: '#0F1524', border: '1px solid #232B42', borderRadius: 10, padding: '14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8B93A8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Legend</div>
            {[
              { shape: '●', label: 'User Account', color: '#8B93A8' },
              { shape: '■', label: 'Device', color: '#8B93A8' },
              { shape: '◆', label: 'IP Cluster', color: '#8B93A8' },
            ].map(({ shape, label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12, color: '#8B93A8' }}>
                <span style={{ color }}>{shape}</span> {label}
              </div>
            ))}
            <div style={{ borderTop: '1px solid #1A2035', marginTop: 8, paddingTop: 8 }}>
              {[
                { color: '#22C55E', label: 'Low risk' },
                { color: '#F59E0B', label: 'Medium risk' },
                { color: '#EF4444', label: 'High risk' },
                { color: '#DC2626', label: 'Critical / Blacklisted' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11, color: '#8B93A8' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} /> {label}
                </div>
              ))}
            </div>
          </div>

          {/* Selected node detail */}
          {selectedNode ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: '#0F1524', border: '1px solid #232B42', borderRadius: 10, padding: '14px' }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8B93A8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Node Detail
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#F4F6FB', marginBottom: 4 }}>
                {NODE_ICONS[selectedNode.type]} {selectedNode.label}
              </div>
              <div style={{
                display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 5, marginBottom: 10,
                background: `${NODE_COLORS[selectedNode.risk].fill}18`,
                color: NODE_COLORS[selectedNode.risk].fill,
                border: `1px solid ${NODE_COLORS[selectedNode.risk].border}`,
                fontWeight: 600,
              }}>
                {selectedNode.risk.toUpperCase()} RISK
              </div>
              <p style={{ fontSize: 12, color: '#8B93A8', lineHeight: 1.5 }}>{selectedNode.detail}</p>
              <div style={{ marginTop: 10, fontSize: 11, color: '#4B5563' }}>
                Connected edges: {EDGES.filter(e => e.from === selectedNode.id || e.to === selectedNode.id).length}
              </div>
            </motion.div>
          ) : (
            <div style={{
              background: '#0F1524', border: '1px dashed #232B42', borderRadius: 10, padding: '20px',
              textAlign: 'center', fontSize: 12, color: '#4B5563',
            }}>
              Click a node to see details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
