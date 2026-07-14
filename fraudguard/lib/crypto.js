// ============================================================================
// lib/crypto.js
// Identifier hashing + HMAC utilities.
//
// Uses the Web Crypto API (available in both Edge and Node.js runtimes).
// Never store raw PANs, VPAs, or account numbers — always hash first.
//
// Hashing scheme: SHA-256(server_pepper + ":" + identifier)
// → truncated to 32 hex chars for storage / display.
// ============================================================================

const SERVER_PEPPER = process.env.SERVER_PEPPER || 'dev-pepper-change-in-production';

/**
 * Hash a PII identifier (VPA, PAN, account number, etc.) before persisting.
 * Returns a 32-char hex string — safe to store, safe to display in logs.
 *
 * @param {string} identifier  Raw identifier (VPA, masked PAN, wallet ID, etc.)
 * @returns {Promise<string>}  32-character hex hash
 */
export async function hashIdentifier(identifier) {
  const input = `${SERVER_PEPPER}:${identifier}`;
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

/**
 * Verify an HMAC-SHA256 signature on a webhook payload.
 * Timing-safe comparison using Web Crypto.
 *
 * @param {string} secret        Shared HMAC secret (hex or utf-8)
 * @param {string} rawBody       Raw request body string
 * @param {string} signature     Hex signature from X-FraudGuard-Signature header
 * @returns {Promise<boolean>}
 */
export async function verifyHmac(secret, rawBody, signature) {
  try {
    const keyMaterial = new TextEncoder().encode(secret);
    const bodyBytes = new TextEncoder().encode(rawBody);

    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    // Compute expected signature
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyBytes);
    const expectedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Timing-safe comparison (lengths must match)
    if (expectedHex.length !== signature.length) return false;

    // Use constant-time comparison via verify
    const sigBytes = hexToBytes(signature);
    return await crypto.subtle.verify('HMAC', key, sigBytes, bodyBytes);
  } catch {
    return false;
  }
}

/**
 * Compute HMAC-SHA256 signature for a payload (used in tests / documentation).
 *
 * @param {string} secret
 * @param {string} payload
 * @returns {Promise<string>} hex signature
 */
export async function signPayload(secret, payload) {
  const keyMaterial = new TextEncoder().encode(secret);
  const bodyBytes = new TextEncoder().encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyBytes);
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
