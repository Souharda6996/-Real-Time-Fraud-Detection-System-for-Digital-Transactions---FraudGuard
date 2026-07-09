// ============================================================================
// generateTransaction.js
// Deterministic-ish synthetic transaction generator.
// Produces realistic Indian-context transactions with built-in fraud patterns.
// ============================================================================

import { PERSONA_LIST } from './personas.js';

const MERCHANT_CATEGORIES = [
  { name: 'Food Delivery', merchants: ['Swiggy', 'Zomato', 'Blinkit', 'Dunzo'], avgAmount: 380, stdAmount: 180 },
  { name: 'E-Commerce', merchants: ['Amazon India', 'Flipkart', 'Myntra', 'Meesho', 'Tata CLiQ'], avgAmount: 1800, stdAmount: 900 },
  { name: 'Transport', merchants: ['Ola', 'Uber', 'Rapido', 'IRCTC', 'IndiGo'], avgAmount: 620, stdAmount: 440 },
  { name: 'UPI Transfer', merchants: ['PhonePe P2P', 'Google Pay', 'Paytm'], avgAmount: 2400, stdAmount: 1200 },
  { name: 'Entertainment', merchants: ['BookMyShow', 'PVR Cinemas', 'Hotstar', 'Netflix India'], avgAmount: 480, stdAmount: 220 },
  { name: 'Grocery & Retail', merchants: ['BigBasket', 'JioMart', 'Reliance Fresh', 'DMart'], avgAmount: 1100, stdAmount: 500 },
  { name: 'Wallet Top-Up', merchants: ['PhonePe Wallet', 'Paytm Wallet', 'Amazon Pay'], avgAmount: 2000, stdAmount: 800 },
  { name: 'Crypto Exchange', merchants: ['CoinDCX', 'WazirX', 'ZebPay'], avgAmount: 8500, stdAmount: 4500 },
  { name: 'International', merchants: ['Unknown Foreign Merchant', 'TOR Gateway', 'Offshore Transfer'], avgAmount: 18000, stdAmount: 9000 },
  { name: 'POS Terminal', merchants: ['Local Kirana POS', 'Petrol Station', 'Pharmacy POS'], avgAmount: 550, stdAmount: 300 },
];

const CITIES = [
  'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat',
];

const FLAGGED_LOCATIONS = ['Lagos', 'Pyongyang', 'TOR_EXIT_NODE', 'Unknown Foreign', 'Offshore'];

const DEVICES = ['Android', 'iPhone', 'Desktop Chrome', 'Desktop Firefox', 'Unknown Device'];

let _counter = 1;
let _seed = 42;

function seededRandom() {
  _seed = (_seed * 1664525 + 1013904223) & 0xffffffff;
  return ((_seed >>> 0) / 0xffffffff);
}

function gaussianRandom(mean, std) {
  // Box-Muller transform for normal distribution
  const u = Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(1, mean + std * z);
}

function generateTxnId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TXN-${ts}-${rand}`;
}

export function generateTransaction(forcedScenario = null) {
  const now = new Date();
  const hour = now.getHours();
  
  // Pick random persona, weighted towards low-risk (more normal transactions)
  const personaWeights = [3, 3, 2, 3, 3, 3, 1, 0.5]; // weights per PERSONA_LIST order
  const totalWeight = personaWeights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  let persona = PERSONA_LIST[0];
  for (let i = 0; i < PERSONA_LIST.length; i++) {
    r -= personaWeights[i];
    if (r <= 0) { persona = PERSONA_LIST[i]; break; }
  }

  // Determine if this is a fraudulent transaction (15% base rate)
  const fraudRoll = Math.random();
  let isFraudScenario = fraudRoll < 0.15;
  let fraudType = null;

  // Forced scenarios for demo
  if (forcedScenario === 'normal') { isFraudScenario = false; persona = PERSONA_LIST[0]; }
  if (forcedScenario === 'velocity') { isFraudScenario = true; fraudType = 'velocity'; }
  if (forcedScenario === 'ml_catch') { isFraudScenario = true; fraudType = 'high_amount_flagged'; persona = PERSONA_LIST[6]; }
  if (forcedScenario === 'impossible_travel') { isFraudScenario = true; fraudType = 'impossible_travel'; }

  let amount, location, device, merchant, category, isNewDevice, isNewLocation;

  if (isFraudScenario) {
    // Pick fraud type
    if (!fraudType) {
      const types = ['high_amount', 'flagged_location', 'high_amount_flagged', 'new_device_new_location'];
      fraudType = types[Math.floor(Math.random() * types.length)];
    }

    switch (fraudType) {
      case 'high_amount':
        amount = persona.avgSpend * (6 + Math.random() * 8);
        location = CITIES[Math.floor(Math.random() * CITIES.length)];
        device = Math.random() > 0.5 ? 'Unknown Device' : persona.commonDevice;
        category = MERCHANT_CATEGORIES[Math.floor(Math.random() * 3) + 6]; // Wallet/Crypto/Intl
        isNewDevice = device !== persona.commonDevice;
        isNewLocation = location !== persona.homeCity;
        break;
      case 'flagged_location':
        amount = gaussianRandom(persona.avgSpend * 1.5, persona.stdSpend);
        location = FLAGGED_LOCATIONS[Math.floor(Math.random() * FLAGGED_LOCATIONS.length)];
        device = 'Unknown Device';
        category = MERCHANT_CATEGORIES[8]; // International
        isNewDevice = true;
        isNewLocation = true;
        break;
      case 'high_amount_flagged':
        amount = persona.avgSpend * (8 + Math.random() * 12);
        location = FLAGGED_LOCATIONS[Math.floor(Math.random() * FLAGGED_LOCATIONS.length)];
        device = 'Unknown Device';
        category = MERCHANT_CATEGORIES[8];
        isNewDevice = true;
        isNewLocation = true;
        break;
      case 'new_device_new_location':
        amount = gaussianRandom(persona.avgSpend * 2.5, persona.stdSpend);
        location = CITIES.find(c => c !== persona.homeCity) || 'Delhi';
        device = DEVICES.find(d => d !== persona.commonDevice) || 'Unknown Device';
        category = MERCHANT_CATEGORIES[3]; // UPI
        isNewDevice = true;
        isNewLocation = true;
        break;
      default:
        amount = gaussianRandom(persona.avgSpend, persona.stdSpend);
        location = persona.homeCity;
        device = persona.commonDevice;
        category = MERCHANT_CATEGORIES[0];
        isNewDevice = false;
        isNewLocation = false;
    }
    merchant = category.merchants[Math.floor(Math.random() * category.merchants.length)];
  } else {
    // Normal transaction
    category = MERCHANT_CATEGORIES[Math.floor(Math.random() * (MERCHANT_CATEGORIES.length - 3))];
    amount = gaussianRandom(
      Math.min(category.avgAmount, persona.avgSpend * 1.2),
      category.stdAmount * 0.5
    );
    location = Math.random() > 0.1 ? persona.homeCity : CITIES[Math.floor(Math.random() * CITIES.length)];
    device = Math.random() > 0.05 ? persona.commonDevice : DEVICES[Math.floor(Math.random() * DEVICES.length)];
    merchant = category.merchants[Math.floor(Math.random() * category.merchants.length)];
    isNewDevice = device !== persona.commonDevice;
    isNewLocation = location !== persona.homeCity;
  }

  return {
    id: generateTxnId(),
    userId: persona.id,
    userName: persona.name,
    amount: Math.round(amount),
    currency: '₹',
    merchant,
    category: category.name,
    location,
    device,
    isNewDevice,
    isNewLocation,
    hour,
    timestamp: now.toISOString(),
    accountBalance: persona.accountBalance,
    personaAvgSpend: persona.avgSpend,
    personaStdSpend: persona.stdSpend || 500,
    personaHomeCity: persona.homeCity,
    _isFraudScenario: isFraudScenario,
    _fraudType: fraudType,
  };
}

// Generate a batch of historical transactions for initial state
export function generateHistoricalTransactions(count = 60) {
  const txns = [];
  for (let i = 0; i < count; i++) {
    txns.push(generateTransaction());
  }
  return txns;
}
