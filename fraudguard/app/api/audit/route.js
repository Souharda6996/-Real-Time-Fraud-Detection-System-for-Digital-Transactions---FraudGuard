// ============================================================================
// app/api/audit/route.js
// POST /api/audit — Record analyst decision on a REVIEW transaction.
//
// Runtime: Node.js (Prisma requires Node.js — cannot use Edge here)
//
// Auth: ANALYST or ADMIN role required.
//
// Body: { transactionId, action: 'APPROVE'|'DECLINE'|'ESCALATE', notes? }
// Response: { success: true, auditId }
// ============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, ROLES } from '../../../lib/auth.js';
import { writeAuditLog, isDatabaseAvailable } from '../../../lib/db.js';
import { z } from 'zod';

const AuditRequestSchema = z.object({
  transactionId:    z.string().uuid(),
  action:           z.enum(['APPROVE', 'DECLINE', 'ESCALATE']),
  notes:            z.string().max(500).optional(),
  scoreAtDecision:  z.number().int().min(0).max(100),
  decisionAtReview: z.enum(['APPROVE', 'REVIEW', 'BLOCK']),
});

export async function POST(request) {
  try {
    // Require ANALYST or ADMIN role
    const session = await requireAuth([ROLES.ANALYST, ROLES.ADMIN]);

    const body = await request.json();
    const parsed = AuditRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid audit request', details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) },
        { status: 400 }
      );
    }

    const { transactionId, action, notes, scoreAtDecision, decisionAtReview } = parsed.data;

    if (!isDatabaseAvailable()) {
      // Graceful degradation — log to console in dev without DB
      console.log('[audit] DB not available. Would have logged:', {
        transactionId,
        analystEmail: session.user.email,
        action,
        notes,
      });
      return NextResponse.json({
        success: true,
        auditId: `dev-${Date.now()}`,
        warning: 'DATABASE_URL not set — audit log not persisted.',
      });
    }

    await writeAuditLog({
      transactionId,
      analystId:    session.user.id,
      analystEmail: session.user.email,
      action,
      notes,
      scoreAtDecision,
      decisionAtReview,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err; // Auth rejection
    console.error('[audit]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/audit — Fetch audit log for a transaction (ANALYST+)
export async function GET(request) {
  try {
    await requireAuth([ROLES.ANALYST, ROLES.ADMIN]);

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId required' }, { status: 400 });
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ auditLogs: [], warning: 'DATABASE_URL not set.' });
    }

    const { getDb } = await import('../../../lib/db.js');
    const db = await getDb();
    if (!db) return NextResponse.json({ auditLogs: [] });

    const logs = await db.auditLog.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ auditLogs: logs });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
