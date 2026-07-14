// ============================================================================
// next.config.js
// Next.js configuration:
//   - Security headers (CSP, HSTS, X-Frame-Options, etc.)
//   - PWA (next-pwa / @ducanh2912/next-pwa)
//   - JSON import for gbm_model.json (static asset)
//   - server components external packages
// ============================================================================

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
});

// Security headers applied to every response
const securityHeaders = [
  // Content Security Policy — allows Next.js inline scripts + Recharts SVG
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires unsafe-eval for dev; lock down in prod with nonces
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.upstash.io https://*.upstash.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  // HTTP Strict Transport Security — 1 year, include subdomains
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Deny framing (clickjacking protection)
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Referrer policy — don't leak URL to third parties
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Permissions policy — deny unnecessary browser APIs
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Legacy XSS protection (belt-and-suspenders for older browsers)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Security headers on all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // next-auth compatibility with App Router
  experimental: {
    serverComponentsExternalPackages: ['next-auth', '@auth/core'],
  },

  // Webpack: allow JSON imports from lib/
  webpack(config) {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

module.exports = withPWA(nextConfig);
