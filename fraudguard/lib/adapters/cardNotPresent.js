// ============================================================================
// lib/adapters/cardNotPresent.js
//
// Adapter: Card-Not-Present (CNP) transaction → TransactionEvent
//
// CNP covers e-commerce, in-app payments, MOTO, and recurring/subscription
// transactions. The PSP provides BIN, masked PAN, 3DS authentication result,
// merchant category code (MCC), and optional device fingerprint.
//
// PAN handling: Only the last 4 digits of a masked PAN are used to derive
// the sender ID (hashed). Raw PANs are never touched by this adapter.
// ============================================================================

import { hashIdentifier } from '../crypto.js';
import { TransactionEventSchema } from '../schema/transactionEvent.js';
import { randomUUID } from 'crypto';

/**
 * @typedef {Object} CnpPayload
 * @property {string}  txnId            PSP transaction ID
 * @property {string}  maskedPan        Masked PAN (e.g. "4111 1111 **** 1234")
 * @property {string}  bin              First 6 digits (BIN/IIN)
 * @property {string}  cardholderName   Name on card (for logging only — not stored)
 * @property {string}  merchantId       Merchant ID
 * @property {string}  merchantName     Merchant display name
 * @property {string}  mcc              Merchant Category Code (ISO 18245)
 * @property {number}  amountMinorUnit  Amount in minor currency unit (cents / paise)
 * @property {string}  currency         ISO 4217 code
 * @property {string}  initiatedAt      ISO 8601 timestamp
 * @property {'Y'|'N'|'A'|'U'} threeDsResult  3DS authentication result
 * @property {string}  [deviceFingerprint] Browser/device fingerprint
 * @property {boolean} [isNewDevice]
 * @property {string}  [ipCountry]
 * @property {boolean} [isNewLocation]
 * @property {boolean} [isNewMerchant]  True if cardholder has never paid this merchant
 * @property {number}  [balanceAfter]   Remaining credit limit (if card issuer provides)
 * @property {number}  [accountAgeDays] Card account age
 * @property {number}  [avg30dAmount]   30-day average transaction for this card
 * @property {number}  [lat]
 * @property {number}  [lng]
 */

/**
 * Convert a card-not-present payload to a canonical TransactionEvent.
 *
 * @param {CnpPayload} raw
 * @returns {Promise<import('../schema/transactionEvent.js').TransactionEvent>}
 */
export async function fromCardNotPresent(raw) {
  // Derive a sender ID from BIN + last-4 digits (never full PAN)
  const last4 = raw.maskedPan.replace(/\s/g, '').slice(-4);
  const panToken = `${raw.bin}****${last4}`;

  const [senderId, receiverId] = await Promise.all([
    hashIdentifier(panToken),
    hashIdentifier(raw.merchantId),
  ]);

  const event = {
    eventId: raw.txnId || randomUUID(),
    timestamp: raw.initiatedAt,
    amount: raw.amountMinorUnit / 100, // cents/paise → major unit
    currency: raw.currency.toUpperCase(),
    rail: 'CARD_NOT_PRESENT',
    sender: {
      id: senderId,
      accountAgeDays: raw.accountAgeDays,
      avgTxnAmount30d: raw.avg30dAmount,
    },
    receiver: {
      id: receiverId,
      isNewPayee: raw.isNewMerchant ?? false,
    },
    device: {
      fingerprint: raw.deviceFingerprint,
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
      bin: raw.bin,
      mcc: raw.mcc,
      merchantName: raw.merchantName,
      threeDsResult: raw.threeDsResult,
      // maskedPan intentionally omitted from metadata
    },
  };

  return TransactionEventSchema.parse(event);
}

// ─── Sample payloads ─────────────────────────────────────────────────────────

/**
 * Normal CNP transaction — ₹2,400 at an online retailer, 3DS passed.
 */
export const SAMPLE_CNP_PAYLOAD = {
  txnId: '7d3a9f12-4e8b-4c2a-9b1d-8e7f6a5c4b3e',
  maskedPan: '4111 1111 **** 5432',
  bin: '411111',
  cardholderName: 'Priya Sharma',
  merchantId: 'MCHT_AMAZON_IN_7842',
  merchantName: 'Amazon India',
  mcc: '5999',
  amountMinorUnit: 240000, // ₹2,400
  currency: 'INR',
  initiatedAt: '2024-11-15T14:32:00+05:30',
  threeDsResult: 'Y',
  deviceFingerprint: 'fp_chrome_desktop_9a8b7c',
  isNewDevice: false,
  ipCountry: 'IN',
  isNewLocation: false,
  isNewMerchant: false,
  balanceAfter: 47600,
  accountAgeDays: 890,
  avg30dAmount: 1800,
  lat: 19.076,
  lng: 72.877,
};

/**
 * High-risk CNP — large amount, new device, 3DS failed, foreign IP.
 */
export const SAMPLE_CNP_HIGH_RISK_PAYLOAD = {
  txnId: '9e4b2c1a-7f3d-4a8e-b6c5-2d1f9e8a7b6c',
  maskedPan: '4111 1111 **** 5432',
  bin: '411111',
  cardholderName: 'Priya Sharma',
  merchantId: 'MCHT_UNKNOWN_OFFSHORE_991',
  merchantName: 'Unknown Digital Services',
  mcc: '7995', // Gambling — high-risk MCC
  amountMinorUnit: 4500000, // ₹45,000
  currency: 'INR',
  initiatedAt: '2024-11-15T03:12:00+05:30',
  threeDsResult: 'N', // 3DS failed
  deviceFingerprint: 'fp_unknown_browser',
  isNewDevice: true,
  ipCountry: 'RU',
  isNewLocation: true,
  isNewMerchant: true,
  balanceAfter: 2100,
  accountAgeDays: 890,
  avg30dAmount: 1800,
  lat: 55.755,
  lng: 37.617,
};
