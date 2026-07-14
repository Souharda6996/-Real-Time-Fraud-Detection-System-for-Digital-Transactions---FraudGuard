// ============================================================================
// lib/db.js
// Prisma v7 Client singleton using Neon serverless HTTP adapter.
//
// Prisma v7 requires an explicit adapter — the traditional "url in schema.prisma"
// approach is deprecated. We use @prisma/adapter-neon which works over HTTP
// (no persistent WebSocket connection needed on Vercel serverless).
//
// IMPORTANT: Do NOT use this in Edge runtime routes.
// Only Node.js runtime routes (audit, history, auth) use Prisma.
// Edge routes use lib/redis.js directly.
//
// If DATABASE_URL is not set (local dev without Neon), all DB calls
// are silently skipped — the app functions without persistence.
// ============================================================================

let _db = null;

async function getDb() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) return null;

  try {
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaNeon } = await import('@prisma/adapter-neon');
    const { Pool } = await import('@neondatabase/serverless');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaNeon(pool);
    
    _db = new PrismaClient({ adapter });
    return _db;
  } catch (err) {
    console.error('[db] Failed to initialize Prisma client:', err.message);
    return null;
  }
}

/**
 * Check if the database is available (DATABASE_URL is set).
 */
export function isDatabaseAvailable() {
  return !!process.env.DATABASE_URL;
}

/**
 * Persist a scored transaction to Postgres.
 * Non-blocking — called after returning the score response.
 *
 * @param {Object} scored  Result from scoreTransaction()
 * @param {Object} txn     The original transaction object
 * @param {string} senderIdHash   Hashed sender ID
 * @param {string} receiverIdHash Hashed receiver ID
 * @param {boolean} isSimulated   True for simulator-generated transactions
 */
export async function persistTransaction(scored, txn, senderIdHash, receiverIdHash, isSimulated = false) {
  const db = await getDb();
  if (!db) return;
  
  try {
    await db.transaction.upsert({
      where: { eventId: txn.eventId || txn.id || `sim-${Date.now()}` },
      update: { score: scored.score, decision: scored.decision },
      create: {
        eventId:       txn.eventId || txn.id || `sim-${Date.now()}`,
        timestamp:     new Date(txn.timestamp || Date.now()),
        amount:        txn.amount,
        currency:      txn.currency || 'INR',
        rail:          txn.rail || 'OTHER',
        senderIdHash,
        receiverIdHash,
        score:         scored.score,
        decision:      scored.decision,
        ruleScore:     scored.layers?.rule?.score ?? 0,
        statScore:     scored.layers?.statistical?.score ?? 0,
        modelScore:    scored.layers?.model?.score ?? 0,
        modelProb:     scored.layers?.model?.probability ?? 0,
        latencyMs:     scored.latencyMs ?? 0,
        reasons:       scored.reasons ?? [],
        features:      scored.features ?? null,
        modelVersion:  scored.modelVersion ?? 'v2.0',
        isSimulated,
      },
    });
  } catch (err) {
    console.error('[db] Failed to persist transaction:', err.message);
  }
}

/**
 * Write an analyst audit log entry.
 */
export async function writeAuditLog({ transactionId, analystId, analystEmail, action, notes, scoreAtDecision, decisionAtReview }) {
  const db = await getDb();
  if (!db) return;

  await db.auditLog.create({
    data: {
      transactionId,
      analystId,
      analystEmail,
      action,
      notes,
      scoreAtDecision,
      decisionAtReview,
    },
  });
}

// Export getter for routes that need full Prisma access
export { getDb };
