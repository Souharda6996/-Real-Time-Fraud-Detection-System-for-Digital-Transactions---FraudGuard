// ============================================================================
// /app/api/score/route.js
// Next.js App Router API Route — POST /api/score
// Calls fraudEngine.js, measures actual latency, returns full scoring result.
// Runs as a Vercel serverless function (no Python runtime needed).
// ============================================================================

import { NextResponse } from 'next/server';
import { scoreTransaction } from '../../../lib/fraudEngine.js';

// In-memory velocity store (per-user transaction count in last 10 min)
// Note: In a true production system this would be Redis / Upstash KV
const velocityStore = new Map();

function getVelocity(userId) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const cutoff = now - windowMs;

  const timestamps = (velocityStore.get(userId) || []).filter(ts => ts > cutoff);
  timestamps.push(now);
  velocityStore.set(userId, timestamps);
  return timestamps.length;
}

export async function POST(request) {
  try {
    const start = performance.now(); // start BEFORE parsing/scoring
    const txn = await request.json();

    // Validate required fields
    if (!txn.userId || !txn.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, amount' },
        { status: 400 }
      );
    }

    // Get velocity for this user
    const velocity = getVelocity(txn.userId);

    // Run the scoring engine (this is where the "ML" happens — pure JS)
    const result = scoreTransaction(txn, velocity);

    // Attach velocity to result for display
    result.velocityCount = velocity;
    result.txnId = txn.id;

    // Attach true measured latency
    result.latencyMs = +(performance.now() - start).toFixed(1);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/score]', err);
    return NextResponse.json(
      { error: 'Scoring engine error', detail: err.message },
      { status: 500 }
    );
  }
}
