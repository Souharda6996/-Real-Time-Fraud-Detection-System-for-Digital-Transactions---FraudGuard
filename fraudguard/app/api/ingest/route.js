// ============================================================================
// app/api/ingest/route.js
// POST /api/ingest — HMAC-verified external transaction ingestion endpoint.
//
// Runtime: Edge (HMAC verification uses Web Crypto, no Node.js APIs needed)
//
// This endpoint is how a real PSP integration would submit transactions.
// It validates the HMAC signature on X-FraudGuard-Signature header,
// validates the payload against the canonical TransactionEvent zod schema,
// scores the transaction, and returns the result.
//
// Authentication: HMAC-SHA256 on the raw request body using WEBHOOK_HMAC_SECRET.
// Documentation: See docs at the bottom of this file for PSP integration guide.
//
// Example cURL:
//   BODY='{"eventId":"...","rail":"UPI",...}'
//   SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)
//   curl -X POST /api/ingest \
//     -H "Content-Type: application/json" \
//     -H "X-FraudGuard-Signature: $SIG" \
//     -d "$BODY"
// ============================================================================

export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { parseTransactionEventOrThrow } from '../../../lib/schema/transactionEvent.js';
import { verifyHmac } from '../../../lib/crypto.js';
import { scoreTransaction } from '../../../lib/fraudEngine.js';
import { recordAndGetVelocity, checkRateLimit, publishToFeed } from '../../../lib/redis.js';

const HMAC_SECRET = process.env.WEBHOOK_HMAC_SECRET;

export async function POST(request) {
  const start = performance.now();

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimit = await checkRateLimit(`ingest:${ip}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ── HMAC Signature Verification ───────────────────────────────────────────
  const signature = request.headers.get('x-fraudguard-signature') || '';

  if (!HMAC_SECRET) {
    // If no secret is configured, log a warning but allow in dev
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Webhook HMAC secret not configured' },
        { status: 500 }
      );
    }
    console.warn('[ingest] WEBHOOK_HMAC_SECRET not set — HMAC verification skipped (dev only).');
  }

  // Read raw body for HMAC verification (must read as text, not JSON)
  const rawBody = await request.text();

  if (HMAC_SECRET && !signature) {
    return NextResponse.json(
      { error: 'Missing X-FraudGuard-Signature header. See integration docs.' },
      { status: 401 }
    );
  }

  if (HMAC_SECRET && signature) {
    const isValid = await verifyHmac(HMAC_SECRET, rawBody, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid HMAC signature. Check your WEBHOOK_HMAC_SECRET.' },
        { status: 401 }
      );
    }
  }

  // ── Parse and validate payload ────────────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let event;
  try {
    event = parseTransactionEventOrThrow(payload);
  } catch (zodErr) {
    const errors = zodErr.issues?.map((i) => `${i.path.join('.')}: ${i.message}`) || [zodErr.message];
    return NextResponse.json(
      { error: 'Invalid TransactionEvent schema', details: errors },
      { status: 400 }
    );
  }

  // ── Velocity tracking + scoring ───────────────────────────────────────────
  const velocity = await recordAndGetVelocity(event.sender.id);
  const result   = scoreTransaction(event, velocity);

  const latencyMs = +(performance.now() - start).toFixed(1);
  result.latencyMs     = latencyMs;
  result.velocityCount = velocity;
  result.txnId         = event.eventId;

  // ── Publish to live feed ──────────────────────────────────────────────────
  publishToFeed({
    ...result,
    txnId:     event.eventId,
    amount:    event.amount,
    currency:  event.currency,
    rail:      event.rail,
    timestamp: event.timestamp,
    senderDisplay: event.sender.id.slice(0, 8) + '…',
    source:    'webhook',
  }).catch(() => {});

  // ── Persist to DB (async, non-blocking) ───────────────────────────────────
  // Note: Prisma runs in Node.js runtime. We use a fire-and-forget fetch to
  // the internal persist endpoint to avoid importing Node.js modules in Edge.
  try {
    const persistUrl = new URL('/api/transactions/persist', request.url);
    fetch(persistUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal': 'true' },
      body: JSON.stringify({ event, result, isSimulated: false }),
    }).catch(() => {});
  } catch {}

  return NextResponse.json({
    success: true,
    eventId: event.eventId,
    result,
  });
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * PSP Integration Guide — How to wire FraudGuard to a real payment system
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. Generate a shared secret:
 *    openssl rand -hex 32 → add to WEBHOOK_HMAC_SECRET in Vercel env vars.
 *    Share this secret securely with your PSP or internal payment service.
 *
 * 2. In your PSP/payment service, convert the native payload to TransactionEvent
 *    using one of the adapters in /lib/adapters/:
 *    - lib/adapters/upiVpaTransfer.js  → for UPI
 *    - lib/adapters/cardNotPresent.js  → for e-commerce card payments
 *    - lib/adapters/walletTransfer.js  → for wallet transfers
 *    - lib/adapters/cardPresent.js     → for POS/EMV
 *
 * 3. Sign the JSON-serialized TransactionEvent with HMAC-SHA256:
 *    signature = HMAC-SHA256(secret, JSON.stringify(event))
 *    Send as: X-FraudGuard-Signature: <hex-signature>
 *
 * 4. POST to https://your-app.vercel.app/api/ingest with:
 *    Content-Type: application/json
 *    X-FraudGuard-Signature: <signature>
 *    Body: <JSON-serialized TransactionEvent>
 *
 * 5. Parse the response:
 *    { success: true, eventId: "...", result: { score, decision, reasons, ... } }
 *    If decision === 'BLOCK': deny the transaction.
 *    If decision === 'REVIEW': flag for analyst review queue.
 *    If decision === 'APPROVE': proceed with payment.
 */
