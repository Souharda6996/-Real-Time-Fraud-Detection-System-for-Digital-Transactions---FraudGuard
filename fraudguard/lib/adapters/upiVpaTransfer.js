// ============================================================================
// lib/adapters/upiVpaTransfer.js
//
// Adapter: UPI VPA P2P / P2M transfer → TransactionEvent
//
// Shows how a real GPay / PhonePe / BHIM webhook payload would map to the
// canonical schema. The engine doesn't know or care about UPI — it always
// sees a TransactionEvent.
//
// IMPORTANT: This adapter hashes VPAs using hashIdentifier() before populating
// sender.id and receiver.id — raw VPAs never reach the scoring engine or DB.
//
// Integration note: A real PSP integration would:
//   1. Receive a webhook at POST /api/ingest
//   2. Verify HMAC signature (see ingest route)
//   3. Call fromUpiVpaTransfer(rawPayload)
//   4. Pass the returned TransactionEvent to scoreTransaction()
// ============================================================================

import { hashIdentifier } from '../crypto.js';
import { TransactionEventSchema } from '../schema/transactionEvent.js';
import { randomUUID } from 'crypto';

/**
 * Raw payload shape from a UPI PSP webhook.
 * Fields match the NPCI UPI 2.0 notification spec (simplified).
 *
 * @typedef {Object} UpiVpaPayload
 * @property {string}  upiRefId         UPI reference number (12 digits)
 * @property {string}  txnId            PSP internal transaction ID
 * @property {string}  payerVpa         Payer's VPA (e.g. "user@upi")
 * @property {string}  payeeVpa         Payee's VPA (e.g. "merchant@upi")
 * @property {number}  amountPaise      Amount in paise (1 INR = 100 paise)
 * @property {string}  currency         Always "INR" for UPI
 * @property {string}  initiatedAt      ISO 8601 timestamp
 * @property {string}  [deviceId]       Hashed device ID from PSP SDK
 * @property {boolean} [isNewDevice]    PSP-determined new-device flag
 * @property {boolean} [isNewPayee]     True if payerVpa → payeeVpa never seen before
 * @property {string}  [ipCountry]      IP-based country code
 * @property {boolean} [isNewLocation]  True if location cluster is new for this payer
 * @property {number}  [balanceAfter]   Balance after debit (INR), if PSP sends it
 * @property {number}  [payerAccountAge] Payer's account age with PSP in days
 * @property {number}  [payer30dAvgTxn] Payer's 30-day average transaction amount (INR)
 * @property {number}  [lat]
 * @property {number}  [lng]
 */

/**
 * Convert a UPI VPA transfer webhook payload to a canonical TransactionEvent.
 * VPAs are hashed before use — never stored raw.
 *
 * @param {UpiVpaPayload} raw
 * @returns {Promise<import('../schema/transactionEvent.js').TransactionEvent>}
 */
export async function fromUpiVpaTransfer(raw) {
  const [senderId, receiverId] = await Promise.all([
    hashIdentifier(raw.payerVpa),
    hashIdentifier(raw.payeeVpa),
  ]);

  const event = {
    eventId: raw.txnId || randomUUID(),
    timestamp: raw.initiatedAt,
    amount: raw.amountPaise / 100, // paise → INR
    currency: 'INR',
    rail: 'UPI',
    sender: {
      id: senderId,
      accountAgeDays: raw.payerAccountAge,
      avgTxnAmount30d: raw.payer30dAvgTxn,
    },
    receiver: {
      id: receiverId,
      isNewPayee: raw.isNewPayee ?? false,
    },
    device: {
      fingerprint: raw.deviceId,
      isNewDevice: raw.isNewDevice ?? false,
      ipCountry: raw.ipCountry,
    },
    location: {
      lat: raw.lat,
      lng: raw.lng,
      isNewLocation: raw.isNewLocation ?? false,
    },
    balanceAfter: raw.balanceAfter,
    metadata: {
      upiRefId: raw.upiRefId,
      // payerVpa intentionally omitted from metadata — never store raw VPA
    },
  };

  return TransactionEventSchema.parse(event);
}

// ─── Sample payload (realistic demo data) ────────────────────────────────────

/**
 * Realistic sample UPI VPA payload — use this to test fromUpiVpaTransfer().
 * Represents a ₹8,500 transfer from a known user to a new payee at 2am.
 */
export const SAMPLE_UPI_PAYLOAD = {
  upiRefId: '405718923641',
  txnId: '550e8400-e29b-41d4-a716-446655440000',
  payerVpa: 'rahul.mehta@okicici',
  payeeVpa: 'merchant123@paytm',
  amountPaise: 850000, // ₹8,500
  currency: 'INR',
  initiatedAt: '2024-11-15T02:17:33+05:30',
  deviceId: 'fp_a3f8b2c1d9e4f7a6',
  isNewDevice: false,
  isNewPayee: true,
  ipCountry: 'IN',
  isNewLocation: false,
  balanceAfter: 3200,
  payerAccountAge: 287,
  payer30dAvgTxn: 1240,
  lat: 12.9716,
  lng: 77.5946,
};

/**
 * Sample showing a high-risk UPI payload (new device + new location + flagged country).
 */
export const SAMPLE_UPI_HIGH_RISK_PAYLOAD = {
  upiRefId: '405718999999',
  txnId: '660e8400-e29b-41d4-a716-446655449999',
  payerVpa: 'victim.user@okhdfc',
  payeeVpa: 'mule123@upi',
  amountPaise: 4500000, // ₹45,000
  currency: 'INR',
  initiatedAt: '2024-11-15T03:45:00+05:30',
  deviceId: 'fp_unknown_device',
  isNewDevice: true,
  isNewPayee: true,
  ipCountry: 'NG', // Nigeria — unusual for domestic UPI
  isNewLocation: true,
  balanceAfter: 500,
  payerAccountAge: 1120,
  payer30dAvgTxn: 2400,
  lat: 6.5244,
  lng: 3.3792,
};
