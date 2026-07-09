// ============================================================================
// personas.js
// Stable behavioral baselines for 8 synthetic users.
// Each persona has a defined spending pattern, home city, and device type.
// Fraud is detected as deviation from THIS person's normal — not global rules.
// ============================================================================

export const PERSONAS = {
  rahul_bengaluru: {
    id: 'rahul_bengaluru',
    name: 'Rahul M.',
    avgSpend: 1240,
    stdSpend: 380,
    homeCity: 'Bengaluru',
    commonDevice: 'Android',
    commonMerchants: ['Swiggy', 'Zomato', 'Amazon', 'Flipkart', 'BMTC'],
    accountBalance: 42000,
    riskProfile: 'low',
    joinedDaysAgo: 820,
  },
  priya_mumbai: {
    id: 'priya_mumbai',
    name: 'Priya S.',
    avgSpend: 4800,
    stdSpend: 1600,
    homeCity: 'Mumbai',
    commonDevice: 'iPhone',
    commonMerchants: ['Nykaa', 'Myntra', 'BookMyShow', 'Uber', 'Zomato Gold'],
    accountBalance: 185000,
    riskProfile: 'low',
    joinedDaysAgo: 1240,
  },
  arjun_delhi: {
    id: 'arjun_delhi',
    name: 'Arjun K.',
    avgSpend: 2100,
    stdSpend: 950,
    homeCity: 'Delhi',
    commonDevice: 'Android',
    commonMerchants: ['Paytm', 'Ola', 'IRCTC', 'PVR Cinemas', 'BigBasket'],
    accountBalance: 67000,
    riskProfile: 'medium',
    joinedDaysAgo: 340,
  },
  sneha_hyderabad: {
    id: 'sneha_hyderabad',
    name: 'Sneha R.',
    avgSpend: 890,
    stdSpend: 220,
    homeCity: 'Hyderabad',
    commonDevice: 'Android',
    commonMerchants: ['Swiggy', 'PhonePe', 'Amazon', 'Meesho'],
    accountBalance: 28000,
    riskProfile: 'low',
    joinedDaysAgo: 560,
  },
  vikram_chennai: {
    id: 'vikram_chennai',
    name: 'Vikram P.',
    avgSpend: 3200,
    stdSpend: 1100,
    homeCity: 'Chennai',
    commonDevice: 'iPhone',
    commonMerchants: ['Myntra', 'Amazon', 'Uber Eats', 'BookMyShow', 'Reliance Fresh'],
    accountBalance: 94000,
    riskProfile: 'low',
    joinedDaysAgo: 1890,
  },
  ananya_pune: {
    id: 'ananya_pune',
    name: 'Ananya D.',
    avgSpend: 1680,
    stdSpend: 520,
    homeCity: 'Pune',
    commonDevice: 'Android',
    commonMerchants: ['Zomato', 'Ola', 'PhonePe', 'Meesho', 'Flipkart'],
    accountBalance: 51000,
    riskProfile: 'low',
    joinedDaysAgo: 270,
  },
  rohan_kolkata: {
    id: 'rohan_kolkata',
    name: 'Rohan B.',
    avgSpend: 780,
    stdSpend: 300,
    homeCity: 'Kolkata',
    commonDevice: 'Android',
    commonMerchants: ['Swiggy', 'Rapido', 'IRCTC', 'Tata CLiQ'],
    accountBalance: 19500,
    riskProfile: 'high',
    joinedDaysAgo: 45,
  },
  unknown_user: {
    id: 'unknown_user',
    name: 'Unknown / New',
    avgSpend: 0,
    stdSpend: 0,
    homeCity: 'Unknown',
    commonDevice: 'Unknown',
    commonMerchants: [],
    accountBalance: 5000,
    riskProfile: 'high',
    joinedDaysAgo: 0,
  },
};

export const PERSONA_LIST = Object.values(PERSONAS);

export function getPersona(id) {
  return PERSONAS[id] || PERSONAS.unknown_user;
}
