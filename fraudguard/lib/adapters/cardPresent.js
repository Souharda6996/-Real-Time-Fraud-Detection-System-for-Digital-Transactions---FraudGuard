// ============================================================================
// lib/adapters/cardPresent.js
//
// Adapter: Card-Present (CP) POS / EMV / contactless → TransactionEvent
//
// Covers physical point-of-sale transactions where the card is physically
// present: chip + PIN, contactless NFC, magnetic swipe (deprecated).
//
// Key difference from CNP: location is usually the POS terminal's fixed
// coordinates, not the device IP. isNewLocation is determined by whether
// the terminal's location cluster is new for this cardholder.
// ============================================================================

import { hashIdentifier } from '../crypto.js';
import { TransactionEventSchema } from '../schema/transactionEvent.js';
import { randomUUID } from 'crypto';

/**
 * @typedef {Object} CardPresentPayload
 * @property {string}  txnId              Acquirer transaction ID
 * @property {string}  maskedPan          Masked PAN (e.g. "**** **** **** 1234")
 * @property {string}  bin                First 6 digits (BIN/IIN)
 * @property {string}  terminalId         POS terminal ID (TID)
 * @property {string}  merchantId         Merchant ID (MID)
 * @property {string}  merchantName       Merchant display name
 * @property {string}  mcc                Merchant Category Code
 * @property {'CHIP_PIN'|'CHIP_NO_PIN'|'CONTACTLESS'|'SWIPE'} entryMode
 * @property {boolean} pinVerified        True if PIN was successfully verified
 * @property {number}  amountMinorUnit    Amount in minor currency unit
 * @property {string}  currency           ISO 4217
 * @property {string}  initiatedAt        ISO 8601 timestamp
 * @property {number}  [terminalLat]      POS terminal latitude
 * @property {number}  [terminalLng]      POS terminal longitude
 * @property {boolean} [isNewLocation]    True if terminal cluster is new for card
 * @property {number}  [balanceAfter]     Remaining credit limit (major unit)
 * @property {number}  [accountAgeDays]
 * @property {number}  [avg30dAmount]
 * @property {string}  [ipCountry]        Country of issuer, not IP (since it's POS)
 */

/**
 * Convert a card-present POS payload to a canonical TransactionEvent.
 * For card-present, isNewDevice is always false (the card itself is the device).
 *
 * @param {CardPresentPayload} raw
 * @returns {Promise<import('../schema/transactionEvent.js').TransactionEvent>}
 */
export async function fromCardPresent(raw) {
  const last4 = raw.maskedPan.replace(/[\s*]/g, '').slice(-4);
  const panToken = `${raw.bin}****${last4}`;

  const [senderId, receiverId] = await Promise.all([
    hashIdentifier(panToken),
    hashIdentifier(`${raw.merchantId}:${raw.terminalId}`),
  ]);

  const event = {
    eventId: raw.txnId || randomUUID(),
    timestamp: raw.initiatedAt,
    amount: raw.amountMinorUnit / 100,
    currency: raw.currency.toUpperCase(),
    rail: 'CARD_PRESENT',
    sender: {
      id: senderId,
      accountAgeDays: raw.accountAgeDays,
      avgTxnAmount30d: raw.avg30dAmount,
    },
    receiver: {
      id: receiverId,
      isNewPayee: false, // POS terminals rarely indicate new merchant per-card
    },
    device: {
      // Card-present: no browser fingerprint; entry mode is the "device"
      fingerprint: raw.entryMode,
      isNewDevice: false, // Physical card is always "known"
      ipCountry: raw.ipCountry,
    },
    location: {
      lat: raw.terminalLat,
      lng: raw.terminalLng,
      isNewLocation: raw.isNewLocation ?? false,
    },
    balanceAfter: raw.balanceAfter,
    metadata: {
      bin: raw.bin,
      mcc: raw.mcc,
      merchantName: raw.merchantName,
      terminalId: raw.terminalId,
      entryMode: raw.entryMode,
      pinVerified: raw.pinVerified,
    },
  };

  return TransactionEventSchema.parse(event);
}

// ─── Sample payloads ─────────────────────────────────────────────────────────

/**
 * Normal card-present: ₹850 grocery purchase, chip + PIN, known location.
 */
export const SAMPLE_CP_PAYLOAD = {
  txnId: '2a1b0c9d-8e7f-4a5b-8c3d-2e1f0a9b8c7d',
  maskedPan: '**** **** **** 7891',
  bin: '453201',
  terminalId: 'TID_BIG_BASKET_BLR_0042',
  merchantId: 'MID_BIG_BASKET_7391',
  merchantName: 'BigBasket Retail Pvt Ltd',
  mcc: '5411', // Grocery stores
  entryMode: 'CHIP_PIN',
  pinVerified: true,
  amountMinorUnit: 85000, // ₹850
  currency: 'INR',
  initiatedAt: '2024-11-15T19:22:00+05:30',
  terminalLat: 12.9352,
  terminalLng: 77.6245,
  isNewLocation: false,
  balanceAfter: 38500,
  accountAgeDays: 1450,
  avg30dAmount: 920,
  ipCountry: 'IN',
};

/**
 * High-risk card-present: ₹18,000 at a jewellery store in a new city, swipe mode.
 * (Swipe = no chip = potentially a skimmed card clone)
 */
export const SAMPLE_CP_HIGH_RISK_PAYLOAD = {
  txnId: '9f8e7d6c-5b4a-4c2b-9d0e-9f8e7d6c5b4a',
  maskedPan: '**** **** **** 7891',
  bin: '453201',
  terminalId: 'TID_GOLD_PALACE_DEL_0001',
  merchantId: 'MID_GOLD_PALACE_9912',
  merchantName: 'Gold Palace Jewellers',
  mcc: '5094', // Jewelry — high-value target
  entryMode: 'SWIPE', // No chip — red flag
  pinVerified: false,
  amountMinorUnit: 1800000, // ₹18,000
  currency: 'INR',
  initiatedAt: '2024-11-15T22:45:00+05:30',
  terminalLat: 28.7041,
  terminalLng: 77.1025,
  isNewLocation: true,
  balanceAfter: 2100,
  accountAgeDays: 1450,
  avg30dAmount: 920,
  ipCountry: 'IN',
};
