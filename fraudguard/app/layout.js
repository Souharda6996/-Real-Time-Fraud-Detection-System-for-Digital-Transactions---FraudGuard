import './globals.css';
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata = {
  title: 'FraudGuard AI — Real-Time Fraud Detection',
  description: 'Enterprise-grade real-time fraud detection with sub-10ms edge inference. Ensemble AI scoring, explainable decisions, and human-in-the-loop review workflow.',
  keywords: 'fraud detection, real-time, AI, machine learning, fintech, risk scoring',
  openGraph: {
    title: 'FraudGuard AI — Real-Time Fraud Detection',
    description: 'Enterprise-grade real-time fraud detection with sub-10ms edge inference.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛡️</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} font-sans bg-bg-primary text-text-primary antialiased`}>
        {children}
      </body>
    </html>
  );
}
