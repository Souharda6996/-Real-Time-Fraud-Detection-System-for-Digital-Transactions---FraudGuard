/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0A0E1A',
        'bg-secondary': '#0F1524',
        'bg-tertiary': '#161D30',
        'border-subtle': '#232B42',
        'text-primary': '#F4F6FB',
        'text-secondary': '#8B93A8',
        'accent-sky': '#38BDF8',
        'accent-blue': '#3B82F6',
        'risk-safe': '#22C55E',
        'risk-medium': '#F59E0B',
        'risk-high': '#EF4444',
        'risk-critical': '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: 0, transform: 'translateY(-8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
