'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Zap, Clock, Share2, BarChart2,
  Shield, Wifi
} from 'lucide-react';
import ToastContainer from '../../components/ui/ToastContainer.js';
import { useStore } from '../../store/useStore.js';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Live Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/simulate', label: 'Simulate', icon: Zap },
  { href: '/dashboard/queue', label: 'Review Queue', icon: Clock },
  { href: '/dashboard/network', label: 'Entity Graph', icon: Share2 },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
];

function SidebarNav({ onClose }) {
  const pathname = usePathname();
  const threshold = useStore(s => s.threshold);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '24px 16px',
      gap: 4,
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 28 }} onClick={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #38BDF8, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(56,189,248,0.3)',
          }}>
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F4F6FB', lineHeight: 1 }}>FraudGuard</div>
            <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 500, letterSpacing: '0.08em' }}>AI PLATFORM</div>
          </div>
        </div>
      </Link>

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }} onClick={onClose}>
              <motion.div
                whileHover={{ x: 2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: isActive ? 'rgba(56,189,248,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
                  color: isActive ? '#38BDF8' : '#8B93A8',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={16} />
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}>{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    style={{
                      marginLeft: 'auto',
                      width: 4, height: 4,
                      borderRadius: '50%',
                      background: '#38BDF8',
                      boxShadow: '0 0 6px #38BDF8',
                    }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div style={{
        padding: '12px',
        background: '#161D30',
        border: '1px solid #232B42',
        borderRadius: 10,
        fontSize: 11,
        color: '#8B93A8',
        lineHeight: 1.6,
      }}>
        <div style={{ color: '#38BDF8', fontWeight: 600, marginBottom: 4 }}>Model v1.2</div>
        <div>Edge Region: BOM1</div>
        <div>Accuracy: 94.2%</div>
        <div>Threshold: {threshold}</div>
        <div style={{ marginTop: 4, color: '#4B5563', fontSize: 10 }}>JS Inference · No Python Runtime</div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const isLive = useStore(s => s.isLive);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0E1A' }}>
      {/* Desktop sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: '#0F1524',
        borderRight: '1px solid #232B42',
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }} className="hidden md:flex">
        <SidebarNav />
      </aside>

      {/* Main content */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Top bar */}
        <header style={{
          padding: '12px 24px',
          background: '#0F1524',
          borderBottom: '1px solid #232B42',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          {/* Live status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: isLive ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${isLive ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
            borderRadius: 20,
            padding: '4px 12px',
          }}>
            <div className={isLive ? "live-dot" : ""} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isLive ? '#22C55E' : '#F59E0B',
              boxShadow: isLive ? '0 0 6px #22C55E' : 'none',
            }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: isLive ? '#22C55E' : '#F59E0B', letterSpacing: '0.05em' }}>
              {isLive ? 'LIVE' : 'PAUSED'}
            </span>
            <span style={{ fontSize: 11, color: '#8B93A8' }}>
              · Model v1.2 · Edge: BOM1
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Right info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wifi size={14} color="#38BDF8" />
            <span style={{ fontSize: 11, color: '#8B93A8' }}>Sub-10ms inference</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '24px', overflowX: 'hidden' }}>
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav style={{
          background: '#0F1524',
          borderTop: '1px solid #232B42',
          padding: '8px 0',
          display: 'flex',
          justifyContent: 'space-around',
        }} className="md:hidden">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none', flex: 1 }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '4px 0', color: '#8B93A8',
              }}>
                <Icon size={18} />
                <span style={{ fontSize: 9, fontWeight: 500 }}>{label.split(' ')[0]}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <ToastContainer />
    </div>
  );
}
