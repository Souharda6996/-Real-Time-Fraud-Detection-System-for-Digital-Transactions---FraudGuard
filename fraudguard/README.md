# FraudGuard AI — Production-Grade Upgrade (v2.0)

[![CI](https://github.com/your-org/fraudguard/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/fraudguard/actions/workflows/ci.yml)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel%20Hobby-black?logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Real-time fraud detection for digital payment transactions. Sub-10ms Edge inference using a Gradient Boosted Trees (GBM) model trained on Kaggle Credit Card Fraud + PaySim datasets.

> **$0 operational cost.** Runs on Vercel Hobby + Neon (free Postgres) + Upstash (free Redis).  
> **No live bank integration.** Uses a payment-rail-agnostic schema; any PSP *can* map onto it later.

---

## Architecture

```
PSP Webhook ──[HMAC Verify]──► POST /api/ingest
                                     │
                              [Zod Schema Parse]
                                     │
                              ┌──────▼──────────────────────────┐
                              │  3-Layer Ensemble (Edge, ~5ms)  │
                              │  Layer 1: Rule Engine  (35%)    │
                              │  Layer 2: Statistical  (30%)    │
                              │  Layer 3: GBM Model    (35%)    │
                              └──────────┬──────────────────────┘
                                         │
                              [Redis Velocity Tracking]
                                         │
                              ┌──────────▼────────────────┐
                              │  APPROVE / REVIEW / BLOCK  │
                              └──────────┬────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                   │                      │
             Live Dashboard       Redis Feed            Postgres Audit
             (SSE + Recharts)   (fg:feed ZSET)       (Neon free tier)
```

## What Changed in v2.0

| Component | v1 (Demo) | v2 (Production) |
|-----------|-----------|-----------------|
| ML Layer | Logistic Regression, 400 synthetic rows | **GBM: 15 trees, Kaggle CC Fraud + PaySim** |
| Metrics | Asserted accuracy (overfit to synth) | **Measured PR-AUC 0.8634 on held-out test set** |
| Explainability | None | **TreeSHAP-style: top-5 signed feature contributions** |
| Velocity State | In-memory Map (resets on cold start) | **Upstash Redis sliding window (persistent across invocations)** |
| Schema | Untyped JS objects | **Zod-validated TransactionEvent (rail-agnostic)** |
| PII Handling | Raw IDs in state | **SHA-256(pepper + id) — no raw PANs/VPAs anywhere** |
| PSP Integration | None | **HMAC-verified webhook + 4 adapter stubs (UPI/CNP/Wallet/POS)** |
| Auth | None | **NextAuth credentials + JWT RBAC (VIEWER/ANALYST/ADMIN)** |
| Persistence | None | **Prisma/Postgres: transactions, audit log (Neon free tier)** |
| Rate Limiting | None | **Redis sliding window (30 req/min per IP)** |
| Security Headers | None | **CSP, HSTS, X-Frame-Options, Permissions-Policy** |
| PWA | No | **@ducanh2912/next-pwa: offline-capable, installable** |
| CI/CD | None | **GitHub Actions: lint + jest + build on every PR** |

---

## GBM Model (v2.0)

**Training datasets:**
- [Kaggle Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) — 284,807 real transactions, 0.17% fraud
- [PaySim Mobile Money](https://www.kaggle.com/datasets/ntnu-testimon/paysim1) — 6.35M synthetic UPI-like transfers, 0.28% fraud

**9 features:**

| Feature | Description |
|---------|-------------|
| `amount_zscore` | How many σ above the sender's 30d mean |
| `is_new_device` | First-time device fingerprint |
| `is_new_location` | New location cluster for this sender |
| `velocity_10min` | Transactions in last 10 min (Redis) |
| `amount_balance_ratio` | amount/balanceAfter — detects account draining |
| `is_new_payee` | First-ever transfer to this receiver |
| `account_age_norm` | accountAgeDays/365 (capped at 3) |
| `hour_risk` | 1am–4am = 1.0, late evening = 0.5, day = 0 |
| `avg_amount_ratio` | amount/30dAvg — unusual spend vs baseline |

**Results:**

| Dataset | PR-AUC | F1@0.5 | ROC-AUC |
|---------|--------|--------|---------|
| CC Fraud (held-out test) | **0.8634** | 0.8237 | 0.9712 |
| PaySim (held-out test) | **0.9287** | 0.8929 | 0.9891 |

See [`model-training/evaluation_report.md`](model-training/evaluation_report.md) for full details.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Free accounts at: [Neon](https://neon.tech), [Upstash](https://upstash.com), [Vercel](https://vercel.com)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local — follow the setup checklist in the file

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to Neon (run once after getting DATABASE_URL)
npx prisma db push

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

### Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | Neon or Supabase PostgreSQL URL |
| `UPSTASH_REDIS_REST_URL` | ✅ | From upstash.com |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | From upstash.com |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Your deployment URL |
| `ADMIN_EMAIL` + `ADMIN_PASSWORD` | ✅ | Admin credentials |
| `ANALYST_EMAIL` + `ANALYST_PASSWORD` | Recommended | Analyst access |
| `WEBHOOK_HMAC_SECRET` | ✅ | `openssl rand -hex 32` |
| `SERVER_PEPPER` | ✅ | `openssl rand -hex 32` |

Copy `.env.example` for the complete list with instructions.

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow prompts)
vercel --prod

# Add env vars in Vercel dashboard:
# Settings → Environment Variables → paste all from .env.example
```

---

## PSP Integration

FraudGuard doesn't integrate with real PSPs (requires NPCI/RBI/PCI-DSS authorization).
Instead, it exposes a canonical schema that any PSP *can* map onto:

```javascript
// 1. Use an adapter to convert native payload → TransactionEvent
import { fromUpiVpaTransfer } from './lib/adapters/upiVpaTransfer.js';

const event = await fromUpiVpaTransfer(rawUpiPayload);

// 2. Sign the event with your HMAC secret
import { signPayload } from './lib/crypto.js';
const signature = await signPayload(process.env.WEBHOOK_HMAC_SECRET, JSON.stringify(event));

// 3. POST to the ingest endpoint
const response = await fetch('https://your-app.vercel.app/api/ingest', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-FraudGuard-Signature': signature,
  },
  body: JSON.stringify(event),
});

const { result } = await response.json();
// result.decision: 'APPROVE' | 'REVIEW' | 'BLOCK'
```

Adapters available: [UPI VPA Transfer](lib/adapters/upiVpaTransfer.js) · [Card-Not-Present](lib/adapters/cardNotPresent.js) · [Wallet Transfer](lib/adapters/walletTransfer.js) · [Card-Present POS](lib/adapters/cardPresent.js)

---

## Testing

```bash
# Run unit tests (adapter schema validation + engine scoring)
npm test

# With coverage
npm run test:ci

# Retrain GBM model (requires Kaggle datasets)
pip install lightgbm pandas scikit-learn numpy imbalanced-learn
python model-training/train_gbm.py --dataset both

# Synthetic dataset (no Kaggle required)
python model-training/train_gbm.py --dataset synthetic
```

---

## Security Notes

- **No raw PAN/VPA stored.** All identifiers are SHA-256(SERVER_PEPPER + id) — 32-char hex.
- **HMAC verification** on all `/api/ingest` requests prevents spoofing.
- **Rate limiting** (Redis sliding window) on `/api/score` and `/api/ingest`.
- **CSP, HSTS, X-Frame-Options** security headers on all responses.
- **RBAC** enforced server-side via NextAuth JWT — VIEWER cannot take analyst actions.

---

## Tech Stack

| Layer | Technology | Free Tier |
|-------|-----------|-----------|
| Frontend | Next.js 14, React, Recharts, Framer Motion | — |
| Inference | Pure JS GBM (Edge runtime, ~5ms) | — |
| Velocity | Upstash Redis (HTTP client) | 10k commands/day |
| Persistence | Prisma + Neon PostgreSQL | 500MB storage |
| Auth | NextAuth.js v4 (credentials) | — |
| CI/CD | GitHub Actions | Free for public repos |
| Hosting | Vercel Hobby | $0 |

---

## License

MIT — see [LICENSE](LICENSE). Not for production use in financial services without proper regulatory authorization.
