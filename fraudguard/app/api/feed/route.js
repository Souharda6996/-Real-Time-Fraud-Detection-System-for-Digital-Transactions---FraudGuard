// ============================================================================
// app/api/feed/route.js
// GET /api/feed — Server-Sent Events live transaction feed.
//
// Runtime: Edge (streaming response, no Node.js dependencies)
//
// Strategy: SSE endpoint that polls Upstash Redis for new scored transactions.
// Vercel Hobby plan supports streaming responses on Edge routes.
//
// Protocol:
//   - Client connects: GET /api/feed?since=<unix-ms>
//   - Server streams: "data: {JSON}\n\n" events
//   - Each event contains a scored transaction from publishToFeed()
//   - Connection stays open for up to 25s (Edge CPU limit)
//   - Client reconnects automatically (EventSource retry mechanism)
//
// Fallback: if SSE is unavailable, clients fall back to polling /api/feed
// with the `?poll=1` query param, which returns a JSON array immediately.
// ============================================================================

export const runtime = 'edge';

import { getLatestFeedEvents, getFeedEventsSince } from '../../../lib/redis.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const since = parseInt(searchParams.get('since') || '0');
  const isPoll = searchParams.get('poll') === '1';

  // ── Polling mode (fallback) ────────────────────────────────────────────────
  if (isPoll) {
    const events = since > 0
      ? await getFeedEventsSince(since)
      : await getLatestFeedEvents(20);

    return new Response(JSON.stringify({ events }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  // ── SSE streaming mode ────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      }

      // Send connection confirmation
      send({ type: 'connected', ts: Date.now() });

      let lastSeen = since || (Date.now() - 30000); // 30s lookback on first connect
      let isOpen = true;

      // Poll Redis every 2 seconds for new events
      // Edge max runtime ~25s → ~10 poll cycles before client must reconnect
      const MAX_DURATION_MS = 22000; // 22s to be safe under 25s Edge limit
      const startTime = Date.now();

      while (isOpen && Date.now() - startTime < MAX_DURATION_MS) {
        try {
          const newEvents = await getFeedEventsSince(lastSeen);
          
          if (newEvents.length > 0) {
            for (const event of newEvents.reverse()) {
              send({ type: 'transaction', data: event });
            }
            lastSeen = Math.max(...newEvents.map((e) => e._feedTs || 0));
          }
        } catch {
          // Redis error — send keepalive
        }

        // Send keepalive ping every cycle to prevent timeout
        send({ type: 'ping', ts: Date.now() });

        // Wait 2 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Signal client to reconnect
      send({ type: 'reconnect', lastSeen });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':                'text/event-stream',
      'Cache-Control':               'no-cache, no-store, must-revalidate',
      'Connection':                  'keep-alive',
      'X-Accel-Buffering':           'no', // Disable nginx buffering
      'Access-Control-Allow-Origin': '*',
    },
  });
}
