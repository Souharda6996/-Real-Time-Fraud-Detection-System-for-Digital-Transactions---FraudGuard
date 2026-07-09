# FraudGuard AI — Real-Time Fraud Detection Platform

> **Enterprise-grade fraud detection demo built for placement interviews.** ML model trained offline in Python, inference runs as pure JavaScript serverless functions — every transaction scored in single-digit milliseconds with full explainability.

---

## One-Line Pitch

_"Most student fraud projects call a slow Python Flask backend. FraudGuard AI trains its model offline in scikit-learn, exports weights to JSON, and runs inference inside JavaScript serverless/edge functions — so every decision happens in sub-10ms with no cold start, the same zero-disruption philosophy Forter and Sift use in production."_

---

## Architecture

```
Transaction Input
      │
      ▼
┌─────────────────────────────────────────────────────┐
│              /api/score  (Next.js Serverless)        │
│                                                     │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────┐ │
│  │ Rule Engine  │  │ Statistical     │  │ JS     │ │
│  │ (hard rules) │  │ Anomaly Layer   │  │ Model  │ │
│  │ ×0.4 weight  │  │ (z-score/vel.)  │  │ ×0.3   │ │
│  │              │  │ ×0.3 weight     │  │        │ │
│  └──────┬───────┘  └────────┬────────┘  └───┬────┘ │
│         └──────────────┬────┘               │       │
│                        ▼                    │       │
│              Weighted Ensemble Score ◄──────┘       │
│              (0–39 APPROVE, 40–74 REVIEW, 75+ BLOCK)│
│                                                     │
│  Returns: { score, decision, latencyMs, reasons[] } │
└─────────────────────────────────────────────────────┘
      │
      ▼
Zustand Store → Live Dashboard UI → Analyst Review Queue

Python (offline training only — NOT deployed):
  scikit-learn LogisticRegression → model_weights.json → /lib/fraudEngine.js
```

**No Python runtime in production. No cold start. Pure JavaScript serverless.**

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — product pitch, live transaction preview |
| `/dashboard` | Live operations dashboard — real-time feed, KPI cards, score gauge |
| `/dashboard/simulate` | Manual scoring — pick a persona, enter params, see full explainability |
| `/dashboard/queue` | Analyst review queue — Approve / Decline / Escalate |
| `/dashboard/network` | Entity relationship graph — surfaces mule rings |
| `/dashboard/analytics` | Precision/recall slider, volume charts, fraud donut |

---

## Quick Start (Local Dev)

```bash
cd fraudguard
npm install
npm run dev
```

Then open **http://localhost:3000**

---

## Deploy to Vercel

```bash
# Option 1: CLI
npm install -g vercel
vercel deploy

# Option 2: GitHub import
# Push to GitHub → import repo at vercel.com → zero config needed
```

**Zero environment variables required.** The base demo works out of the box.

---

## How the ML Works

### Training (Python — offline, not deployed)

```bash
pip install scikit-learn numpy
python fraudguard/model-training/train_model.py
```

This trains a `LogisticRegression` on 400 synthetic transactions with features:
- `amount_zscore` — how far this amount deviates from the user's average (σ)
- `hour_risk` — transaction hour risk (late night = higher)
- `is_new_device` — unrecognised device flag
- `is_new_location` — transaction outside home city
- `velocity_10min` — transactions in last 10 minutes (normalised)
- `amount_balance_ratio` — amount as fraction of account balance

Exports to `fraudguard/lib/model_weights.json`.

### Inference (JavaScript — deployed on Vercel Edge)

```js
// ~10 lines. This is the entire "ML serving layer".
const dot = features.reduce((sum, feat, i) => sum + feat * weights[i], 0);
const probability = sigmoid(dot + intercept);
```

No ML library. No Python. Runs anywhere JavaScript runs.

---

## Interview Talking Points

1. **Architecture**: "Trained offline in scikit-learn, deployed as JS serverless — sub-10ms, no cold start. Same philosophy as Forter's zero-disruption decisioning."
2. **Ensemble**: "Three-layer weighted ensemble — rules + statistical deviation + logistic regression — with human-readable reason codes per decision. Mirrors Hawk AI and Feedzai."
3. **Human-in-the-loop**: "Medium-risk transactions go to an analyst review queue — fraud ops is humans-plus-AI, not full automation. Mirrors FICO Falcon."
4. **Business tradeoff**: "Precision/recall threshold slider shows the business tradeoff — most student projects just report a single accuracy number and miss this."
5. **Scale story**: "At true enterprise scale, the stream would come through Kafka, rule engine in Flink, features from a feature store. This demo simulates that decision logic serverlessly."

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) — JavaScript only
- **Styling**: Tailwind CSS + custom CSS variables (dark fintech palette)
- **Animation**: Framer Motion (score gauges, feed entries, number count-ups)
- **Charts**: Recharts (precision/recall, volume, donut)
- **State**: Zustand (ring buffer, review queue, KPIs)
- **Icons**: lucide-react
- **Fonts**: Inter + JetBrains Mono

---

## Live Demo

🔗 **[Deploy link — add after `vercel deploy`]**

---

*Built as a portfolio demo. Inspired by patterns from Stripe Radar, Sift, Feedzai, Forter, FICO Falcon, and Hawk AI. Not affiliated with any of these companies.*
