// ============================================================================
// app/api/score/route.js
// POST /api/score — Main fraud scoring endpoint.
//
// Runtime: Edge (fast, no cold start, Upstash Redis is HTTP-based)
//
// Request: TransactionEvent object (canonical schema) or legacy txn format
// Response: { score, decision, reasons, latencyMs, layers, features, ... }
//
// Security:
//   - Zod validation on inbound payload (rejects malformed with 400)
//   - Rate limiting per source IP using Upstash Redis sliding window
//   - Velocity tracking per sender (Redis sliding window, 10 min)
//   - Client-supplied risk fields are never trusted (always recomputed)
// ============================================================================

export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { scoreTransaction } from '../../../lib/fraudEngine.js';
import { recordAndGetVelocity, checkRateLimit, publishToFeed } from '../../../lib/redis.js';
import { parseTransactionEvent } from '../../../lib/schema/transactionEvent.js';
import { hashIdentifier } from '../../../lib/crypto.js';

export async function POST(request) {
  const start = performance.now();

  // ── Rate limiting by IP ────────────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const rateLimit = await checkRateLimit(`ip:${ip}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.', resetAt: rateLimit.resetAt },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     String(30),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(Math.ceil(rateLimit.resetAt / 1000)),
          'Retry-After':           String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // ── Parse request body ─────────────────────────────────────────────────────
  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // ── Determine if this is a canonical TransactionEvent or legacy format ─────
  let txn = rawBody;
  let senderId;

  const isCanonical = rawBody.eventId && rawBody.rail && rawBody.sender;

  if (isCanonical) {
    // Validate canonical schema — reject malformed payloads with clear errors
    const parsed = parseTransactionEvent(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid TransactionEvent', details: parsed.errors },
        { status: 400 }
      );
    }
    txn = parsed.data;
    senderId = txn.sender.id;
  } else {
    // Legacy simulator format — minimal validation
    if (!rawBody.userId || rawBody.amount == null) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, amount' },
        { status: 400 }
      );
    }
    // Hash the legacy userId for velocity tracking
    senderId = await hashIdentifier(rawBody.userId);
    txn = rawBody;
  }

  // ── Velocity tracking (Upstash Redis sliding window) ──────────────────────
  const velocity = await recordAndGetVelocity(senderId);

  // ── Score the transaction ─────────────────────────────────────────────────
  const result = scoreTransaction(txn, velocity);

  result.velocityCount = velocity;
  result.txnId         = txn.eventId || txn.id;
  result.latencyMs     = +(performance.now() - start).toFixed(1);
  result.rateLimit     = {
    remaining: rateLimit.remaining,
    resetAt:   rateLimit.resetAt,
  };

  // ── Publish to live feed (async, non-blocking) ────────────────────────────
  // Don't await — fire and forget so it doesn't add latency to the response
  publishToFeed({
    ...result,
    txnId:     txn.eventId || txn.id,
    amount:    txn.amount,
    currency:  txn.currency || 'INR',
    rail:      txn.rail || 'OTHER',
    timestamp: txn.timestamp || new Date().toISOString(),
    // Sender ID (already hashed) for display
    senderDisplay: senderId.slice(0, 8) + '…',
  }).catch(() => {}); // Silently ignore Redis errors on feed broadcast

  return NextResponse.json(result, {
    headers: {
      'X-RateLimit-Limit':     String(30),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset':     String(Math.ceil(rateLimit.resetAt / 1000)),
    },
  });
}
