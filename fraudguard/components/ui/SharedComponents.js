'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

export function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, className = '' }) {
  const spring = useSpring(value, { stiffness: 200, damping: 30 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
    const unsub = spring.on('change', v => {
      setDisplay(decimals > 0 ? v.toFixed(decimals) : Math.round(v));
    });
    return unsub;
  }, [value, decimals, spring]);

  return (
    <span className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}

export function KpiCard({ title, value, prefix = '', suffix = '', subtitle, icon: Icon, trend, decimals = 0, glowColor }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial glow behind icon */}
      {glowColor && (
        <div style={{
          position: 'absolute',
          top: 0, right: 0,
          width: 80, height: 80,
          background: `radial-gradient(circle at 70% 20%, ${glowColor}20 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#8B93A8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            background: glowColor ? `${glowColor}18` : 'rgba(109,0,26,0.1)',
            border: `1px solid ${glowColor ? `${glowColor}30` : 'rgba(109,0,26,0.2)'}`,
            borderRadius: 8,
            padding: 8,
          }}>
            <Icon size={16} color={glowColor || 'var(--accent-burgundy)'} />
          </div>
        )}
      </div>
      
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#F4F6FB', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
          <AnimatedNumber value={typeof value === 'number' ? value : 0} prefix={prefix} suffix={suffix} decimals={decimals} />
        </div>
        {subtitle && (
          <p style={{ fontSize: 12, color: '#8B93A8', marginTop: 6 }}>{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}

export function RiskBadge({ decision, size = 'sm' }) {
  const styles = {
    APPROVE: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
    REVIEW:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    BLOCK:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  };
  const s = styles[decision] || styles.APPROVE;
  const fontSize = size === 'lg' ? 13 : 11;
  const padding = size === 'lg' ? '6px 14px' : '3px 10px';

  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 6,
      fontSize,
      fontWeight: 600,
      padding,
      fontFamily: 'JetBrains Mono, monospace',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {decision}
    </span>
  );
}

export function ScoreGauge({ score, size = 200 }) {
  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = size * 0.065;
  
  // Single source of truth for all gauge geometry
  const START_ANGLE = 180; // gauge starts at 180° (left)
  const END_ANGLE = 0;     // ends at 0° (right)
  const SWEEP = START_ANGLE - END_ANGLE; // 180
  
  function polarToCartesian(cx, cy, radius, angleDeg) {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy - radius * Math.sin(angleRad), // negative because SVG y-axis is flipped
    };
  }
  
  const start = polarToCartesian(cx, cy, radius, START_ANGLE);
  const end = polarToCartesian(cx, cy, radius, END_ANGLE);
  const trackPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
  
  const normalizedScore = Math.min(100, Math.max(0, score));

  const getColor = (s) => {
    if (s >= 75) return '#EF4444';
    if (s >= 40) return '#F59E0B';
    return '#22C55E';
  };

  const color = getColor(normalizedScore);

  const springScore = useSpring(normalizedScore, { stiffness: 150, damping: 25 });
  const [displayScore, setDisplayScore] = useState(normalizedScore);
  
  useEffect(() => {
    springScore.set(normalizedScore);
    const unsub = springScore.on('change', v => setDisplayScore(Math.round(v)));
    return unsub;
  }, [normalizedScore, springScore]);

  // Derive ALL animated properties from the single springScore
  const animatedScoreAngle = useTransform(springScore, s => START_ANGLE - (s / 100) * SWEEP);
  
  const animatedScorePath = useTransform(animatedScoreAngle, angle => {
    // If score is 0, start and end points match exactly; some browsers won't render the linecap
    // We offset angle VERY slightly (0.01 deg) to ensure a 0-score dot/cap still renders cleanly.
    const safeAngle = (START_ANGLE - angle) < 0.01 ? START_ANGLE - 0.01 : angle;
    const endPt = polarToCartesian(cx, cy, radius, safeAngle);
    const largeArc = (START_ANGLE - safeAngle) > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`;
  });
  
  const dotX = useTransform(animatedScoreAngle, angle => polarToCartesian(cx, cy, radius, angle).x);
  const dotY = useTransform(animatedScoreAngle, angle => polarToCartesian(cx, cy, radius, angle).y);

  return (
    <div style={{ position: 'relative', width: size, height: size * 0.6, margin: '0 auto' }}>
      <svg width={size} height={size * 0.65} style={{ overflow: 'visible' }}>
        {/* Track */}
        <path d={trackPath} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} strokeLinecap="round" />
        
        {/* Score arc */}
        <motion.path
          d={animatedScorePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
        
        {/* Score needle dot */}
        <motion.circle
          cx={dotX}
          cy={dotY}
          r={strokeWidth * 0.7}
          fill={color}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      {/* Center score text */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: size * 0.18,
          fontWeight: 800,
          color,
          fontFamily: 'JetBrains Mono, monospace',
          lineHeight: 1,
        }}>
          {displayScore}
        </div>
        <div style={{ fontSize: size * 0.07, color: '#8B93A8', marginTop: 2 }}>Risk Score</div>
      </div>
    </div>
  );
}

export function SkeletonLoader({ width = '100%', height = 16, rounded = 8, className = '' }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width,
        height,
        background: 'var(--border-subtle)',
        borderRadius: rounded,
      }}
      className={className}
    />
  );
}

export function ExportButton({ data, filename = 'export.csv' }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      if (!data || data.length === 0) return;
      
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const val = row[header];
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || !data || data.length === 0}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-primary)',
        padding: '6px 12px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        cursor: (isExporting || !data || data.length === 0) ? 'not-allowed' : 'pointer',
        opacity: (isExporting || !data || data.length === 0) ? 0.5 : 1,
        transition: 'all 0.2s',
      }}
      onMouseOver={(e) => {
        if (!isExporting && data && data.length > 0) {
          e.currentTarget.style.background = 'var(--bg-tertiary)';
          e.currentTarget.style.borderColor = 'var(--accent-burgundy)';
        }
      }}
      onMouseOut={(e) => {
        if (!isExporting && data && data.length > 0) {
          e.currentTarget.style.background = 'var(--bg-tertiary)';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
        }
      }}
    >
      <Download size={14} />
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}
