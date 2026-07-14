// ============================================================================
// lib/redis.js
// Upstash Redis client wrapper — HTTP-based, Edge-runtime compatible.
//
// Free tier: 10,000 commands/day at upstash.com (no credit card, no trial).
// HTTP-based client: works in Vercel Edge Runtime (no persistent connection).
//
// Required env vars:
//   UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
//   UPSTASH_REDIS_REST_TOKEN=AXxx...
//
// If these are absent (e.g. local dev), falls back to an in-memory store.
// The fallback resets on cold starts — acceptable for development.
// ============================================================================

import { Redis } from '@upstash/redis';

// ─── Client singleton ────────────────────────────────────────────────────────

let _redis = null;
let _usingFallback = false;

function getRedisClient() {
  if (_redis) return _redis;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    _redis = new Redis({ url, token });
    return _redis;
  }

  // Fallback: in-memory (dev only — not shared across serverless invocations)
  _usingFallback = true;
  console.warn('[redis] Upstash env vars not set — using in-memory fallback (dev only).');
  return null;
}

// ─── In-memory fallback ──────────────────────────────────────────────────────
// Stored as module-level singletons. Resets on cold start — intentional for dev.

const _memoryStore = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Velocity: sliding window per sender
//
// Implementation: sorted set (ZSET) of timestamps with TTL-based cleanup.
// Key: fg:vel:{senderId}
// Members: timestamp (ms), Score: timestamp (ms) → enables range queries.
// Window: last 10 minutes.
//
// Commands used per call: ZADD + ZRANGEBYSCORE + ZREMRANGEBYSCORE = 3 commands.
// With 10k free commands/day → handles ~3,333 scored transactions/day.
// ─────────────────────────────────────────────────────────────────────────────

const VELOCITY_WINDOW_MS  = 10 * 60 * 1000; // 10 minutes
const VELOCITY_KEY_PREFIX = 'fg:vel:';
const VELOCITY_TTL_SEC    = 15 * 60;         // 15 min TTL on the key itself

/**
 * Record a new transaction timestamp and return the velocity count
 * (number of transactions by this sender in the last 10 minutes).
 *
 * @param {string} senderId  Hashed sender identifier
 * @returns {Promise<number>} Velocity count (including this transaction)
 */
export async function recordAndGetVelocity(senderId) {
  const now    = Date.now();
  const cutoff = now - VELOCITY_WINDOW_MS;
  const key    = `${VELOCITY_KEY_PREFIX}${senderId}`;

  const client = getRedisClient();

  if (!client) {
    // In-memory fallback
    const timestamps = (_memoryStore.get(key) || []).filter((ts) => ts > cutoff);
    timestamps.push(now);
    _memoryStore.set(key, timestamps);
    return timestamps.length;
  }

  // Pipeline: add current ts, remove old entries, count window
  const pipeline = client.pipeline();
  pipeline.zadd(key, { score: now, member: String(now) });
  pipeline.zremrangebyscore(key, 0, cutoff);
  pipeline.zcard(key);
  pipeline.expire(key, VELOCITY_TTL_SEC);

  const results = await pipeline.exec();
  return results[2] ?? 1; // zcard result
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting: sliding window per IP or API key
//
// Key: fg:rl:{identifier}
// Window: configurable via env vars.
// ─────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS  = parseInt(process.env.RATE_LIMIT_WINDOW_MS  || '60000');  // 1 minute
const RATE_LIMIT_MAX         = parseInt(process.env.RATE_LIMIT_MAX         || '30');    // 30 req/min
const RATE_LIMIT_KEY_PREFIX  = 'fg:rl:';

/**
 * Check and update rate limit for an identifier (IP or API key).
 *
 * @param {string} identifier  IP address or API key
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: number }>}
 */
export async function checkRateLimit(identifier) {
  const now    = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const key    = `${RATE_LIMIT_KEY_PREFIX}${identifier}`;
  const windowTtl = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) + 5;

  const client = getRedisClient();

  if (!client) {
    // In-memory fallback
    const reqs = (_memoryStore.get(key) || []).filter((ts) => ts > cutoff);
    reqs.push(now);
    _memoryStore.set(key, reqs);
    const count = reqs.length;
    return {
      allowed:   count <= RATE_LIMIT_MAX,
      remaining: Math.max(0, RATE_LIMIT_MAX - count),
      resetAt:   now + RATE_LIMIT_WINDOW_MS,
    };
  }

  const pipeline = client.pipeline();
  pipeline.zadd(key, { score: now, member: String(now) });
  pipeline.zremrangebyscore(key, 0, cutoff);
  pipeline.zcard(key);
  pipeline.expire(key, windowTtl);

  const results = await pipeline.exec();
  const count   = results[2] ?? 1;

  return {
    allowed:   count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - count),
    resetAt:   now + RATE_LIMIT_WINDOW_MS,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE broadcast: publish scored events to Redis list for SSE polling
//
// Key: fg:feed (Redis list, max 100 items, LPUSH + LTRIM)
// ─────────────────────────────────────────────────────────────────────────────

const FEED_KEY      = 'fg:feed';
const FEED_MAX_SIZE = 100;

/**
 * Push a scored transaction event to the live feed list.
 * The SSE endpoint reads from this list and streams to connected clients.
 *
 * @param {Object} event  Scored transaction result
 */
export async function publishToFeed(event) {
  const client = getRedisClient();
  const payload = JSON.stringify({ ...event, _feedTs: Date.now() });

  if (!client) {
    const list = _memoryStore.get(FEED_KEY) || [];
    list.unshift(payload);
    _memoryStore.set(FEED_KEY, list.slice(0, FEED_MAX_SIZE));
    return;
  }

  const pipeline = client.pipeline();
  pipeline.lpush(FEED_KEY, payload);
  pipeline.ltrim(FEED_KEY, 0, FEED_MAX_SIZE - 1);
  await pipeline.exec();
}

/**
 * Get the latest N events from the feed list.
 *
 * @param {number} count  Number of events to fetch (default: 20)
 * @returns {Promise<Object[]>}
 */
export async function getLatestFeedEvents(count = 20) {
  const client = getRedisClient();

  if (!client) {
    const list = _memoryStore.get(FEED_KEY) || [];
    return list.slice(0, count).map((s) => JSON.parse(s));
  }

  const items = await client.lrange(FEED_KEY, 0, count - 1);
  return (items || []).map((s) => JSON.parse(s));
}

/**
 * Get events added to the feed since a given timestamp.
 * Used by SSE endpoint to poll for new events.
 *
 * @param {number} since  Unix timestamp in ms
 * @returns {Promise<Object[]>}
 */
export async function getFeedEventsSince(since) {
  const all = await getLatestFeedEvents(50);
  return all.filter((e) => e._feedTs > since);
}

export function isUsingFallback() {
  return _usingFallback;
}
