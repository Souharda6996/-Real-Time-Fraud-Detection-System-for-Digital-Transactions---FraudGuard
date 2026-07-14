// ============================================================================
// lib/adapters/walletTransfer.js
//
// Adapter: Wallet-to-wallet / wallet-to-bank transfer → TransactionEvent
//
// Covers transfers within and between digital wallet providers:
// PhonePe Wallet, Paytm Wallet, Amazon Pay, MobiKwik, etc.
//
// Also handles wallet-to-bank (IMPS/NEFT debit from wallet balance).
// ============================================================================

import { hashIdentifier } from '../crypto.js';
import { TransactionEventSchema } from '../schema/transactionEvent.js';
import { randomUUID } from 'crypto';

/**
 * @typedef {Object} WalletTransferPayload
 * @property {string}  txnId              PSP transaction ID
 * @property {string}  walletProvider     e.g. "PHONEPE", "PAYTM", "AMAZONPAY"
 * @property {string}  senderWalletId     Opaque wallet user ID (PSP internal)
 * @property {string}  receiverWalletId   Receiver wallet ID or bank account token
 * @property {'WALLET_TO_WALLET'|'WALLET_TO_BANK'|'WALLET_TO_UPI'} transferType
 * @property {number}  amountPaise        Amount in paise
 * @property {string}  currency           ISO 4217 (typically "INR")
 * @property {string}  initiatedAt        ISO 8601 timestamp
 * @property {boolean} [isNewRecipient]   True if sender never sent to this recipient
 * @property {string}  [deviceId]         Hashed device identifier
 * @property {boolean} [isNewDevice]
 * @property {string}  [ipCountry]
 * @property {boolean} [isNewLocation]
 * @property {number}  [walletBalanceAfter] Remaining wallet balance after transfer (paise)
 * @property {number}  [senderAccountAge]  Days since wallet account creation
 * @property {number}  [sender30dAvgTxn]   30-day average wallet transaction (INR)
 * @property {number}  [lat]
 * @property {number}  [lng]
 */

/**
 * Convert a wallet transfer payload to a canonical TransactionEvent.
 *
 * @param {WalletTransferPayload} raw
 * @returns {Promise<import('../schema/transactionEvent.js').TransactionEvent>}
 */
export async function fromWalletTransfer(raw) {
  const [senderId, receiverId] = await Promise.all([
    hashIdentifier(`${raw.walletProvider}:${raw.senderWalletId}`),
    hashIdentifier(`${raw.walletProvider}:${raw.receiverWalletId}`),
  ]);

  const event = {
    eventId: raw.txnId || randomUUID(),
    timestamp: raw.initiatedAt,
    amount: raw.amountPaise / 100,
    currency: raw.currency?.toUpperCase() || 'INR',
    rail: 'WALLET',
    sender: {
      id: senderId,
      accountAgeDays: raw.senderAccountAge,
      avgTxnAmount30d: raw.sender30dAvgTxn,
    },
    receiver: {
      id: receiverId,
      isNewPayee: raw.isNewRecipient ?? false,
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
    balanceAfter: raw.walletBalanceAfter != null
      ? raw.walletBalanceAfter / 100
      : undefined,
    metadata: {
      walletProvider: raw.walletProvider,
      transferType: raw.transferType,
    },
  };

  return TransactionEventSchema.parse(event);
}

// ─── Sample payloads ─────────────────────────────────────────────────────────

/**
 * Normal wallet top-up transfer — ₹500 PhonePe wallet-to-wallet.
 */
export const SAMPLE_WALLET_PAYLOAD = {
  txnId: '3f9e2c1b-8a7d-4b6c-a5e4-3c2b1a9d8e7f',
  walletProvider: 'PHONEPE',
  senderWalletId: 'user_7a8b9c0d1e2f',
  receiverWalletId: 'user_1a2b3c4d5e6f',
  transferType: 'WALLET_TO_WALLET',
  amountPaise: 50000, // ₹500
  currency: 'INR',
  initiatedAt: '2024-11-15T11:45:00+05:30',
  isNewRecipient: false,
  deviceId: 'dp_phonepe_app_android_12',
  isNewDevice: false,
  ipCountry: 'IN',
  isNewLocation: false,
  walletBalanceAfter: 230000, // ₹2,300
  senderAccountAge: 542,
  sender30dAvgTxn: 680,
  lat: 28.6139,
  lng: 77.209,
};

/**
 * High-risk wallet transfer — ₹24,000 to a new recipient from a new device.
 */
export const SAMPLE_WALLET_HIGH_RISK_PAYLOAD = {
  txnId: '9a8b7c6d-5e4f-4a2b-9c0d-9e8f7a6b5c4d',
  walletProvider: 'PAYTM',
  senderWalletId: 'user_victim_acct_9x8y7z',
  receiverWalletId: 'user_mule_1a2b3c',
  transferType: 'WALLET_TO_BANK',
  amountPaise: 2400000, // ₹24,000
  currency: 'INR',
  initiatedAt: '2024-11-15T02:33:00+05:30',
  isNewRecipient: true,
  deviceId: 'dp_unknown_device_xx',
  isNewDevice: true,
  ipCountry: 'IN',
  isNewLocation: true,
  walletBalanceAfter: 50000, // ₹500 left — nearly drained
  senderAccountAge: 1200,
  sender30dAvgTxn: 890,
  lat: 22.5726,
  lng: 88.3639,
};
