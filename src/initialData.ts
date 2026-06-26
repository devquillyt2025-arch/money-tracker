import { Entry, Bill, Goal } from './types';

export const DEFAULT_CATEGORIES = [
  'Food & Grocery',
  'Shopping',
  'Travel',
  'Bills & Subscription',
  'Investment',
  'Miscellaneous',
  'Borrowed',
  'App Loan'
];

export const INITIAL_GOAL: Goal = {
  name: "Index Reserve Accumulation",
  targetAmount: 500000,
  currentAmount: 315000
};

export const INITIAL_BILLS: Bill[] = [
  {
    id: "bill-1",
    name: "Terminal API Premium",
    billingDay: 5,
    cycle: 'monthly',
    amount: 1450,
    paid: true,
    category: "Bills & Subscription"
  },
  {
    id: "bill-2",
    name: "Fiber Optic Lease",
    billingDay: 12,
    cycle: 'monthly',
    amount: 2499,
    paid: true,
    category: "Bills & Subscription"
  },
  {
    id: "bill-3",
    name: "AWS Cloud Sandbox",
    billingDay: 18,
    cycle: 'monthly',
    amount: 8750,
    paid: false,
    category: "Bills & Subscription"
  },
  {
    id: "bill-4",
    name: "Bloomberg Terminal Lite",
    billingDay: 28,
    cycle: 'monthly',
    amount: 12000,
    paid: false,
    category: "Bills & Subscription"
  }
];

export const INITIAL_ENTRIES: Entry[] = [
  // --- JUNE 2026 (Current Month) ---
  {
    id: "e-june-1",
    name: "Monthly Base Salary",
    category: "Miscellaneous",
    amount: 185000,
    type: "income",
    date: "2026-06-01"
  },
  {
    id: "e-june-2",
    name: "Nifty 50 Index SIP",
    category: "Investment",
    amount: 35000,
    type: "expense",
    date: "2026-06-02"
  },
  {
    id: "e-june-3",
    name: "Supermarket Weekly Provisions",
    category: "Food & Grocery",
    amount: 8450,
    type: "expense",
    date: "2026-06-04"
  },
  {
    id: "e-june-4",
    name: "Terminal API Premium",
    category: "Bills & Subscription",
    amount: 1450,
    type: "expense",
    date: "2026-06-05"
  },
  {
    id: "e-june-5",
    name: "Mechanical Keyboard - Split",
    category: "Shopping",
    amount: 14800,
    type: "expense",
    date: "2026-06-08"
  },
  {
    id: "e-june-6",
    name: "Fiber Optic Lease",
    category: "Bills & Subscription",
    amount: 2499,
    type: "expense",
    date: "2026-06-12"
  },
  {
    id: "e-june-7",
    name: "Weekly Gourmet Provisions",
    category: "Food & Grocery",
    amount: 6200,
    type: "expense",
    date: "2026-06-14"
  },
  {
    id: "e-june-8",
    name: "Weekend Getaway (Alibaug)",
    category: "Travel",
    amount: 18900,
    type: "expense",
    date: "2026-06-15"
  },
  {
    id: "e-june-9",
    name: "Consulting Retainer Pay",
    category: "Miscellaneous",
    amount: 45000,
    type: "income",
    date: "2026-06-16"
  },
  {
    id: "e-june-10",
    name: "Arbitrage Trade Profit",
    category: "Investment",
    amount: 12500,
    type: "income",
    date: "2026-06-20"
  },
  {
    id: "e-june-11",
    name: "Airport Ride Premium",
    category: "Travel",
    amount: 2200,
    type: "expense",
    date: "2026-06-22"
  },
  {
    id: "e-june-12",
    name: "Espresso Beans & Accessories",
    category: "Food & Grocery",
    amount: 3500,
    type: "expense",
    date: "2026-06-24"
  },

  // --- MAY 2026 ---
  {
    id: "e-may-1",
    name: "Monthly Base Salary",
    category: "Miscellaneous",
    amount: 185000,
    type: "income",
    date: "2026-05-01"
  },
  {
    id: "e-may-2",
    name: "Nifty 50 Index SIP",
    category: "Investment",
    amount: 35000,
    type: "expense",
    date: "2026-05-02"
  },
  {
    id: "e-may-3",
    name: "AWS Cloud Bill",
    category: "Bills & Subscription",
    amount: 9200,
    type: "expense",
    date: "2026-05-05"
  },
  {
    id: "e-may-4",
    name: "Provisions & Fine Dining",
    category: "Food & Grocery",
    amount: 16500,
    type: "expense",
    date: "2026-05-10"
  },
  {
    id: "e-may-5",
    name: "Tech Hardware Upgrade",
    category: "Shopping",
    amount: 24000,
    type: "expense",
    date: "2026-05-15"
  },
  {
    id: "e-may-6",
    name: "Flight to Bengaluru",
    category: "Travel",
    amount: 12500,
    type: "expense",
    date: "2026-05-20"
  },
  {
    id: "e-may-7",
    name: "Consulting Retainer Pay",
    category: "Miscellaneous",
    amount: 45000,
    type: "income",
    date: "2026-05-20"
  },

  // --- APRIL 2026 ---
  {
    id: "e-apr-1",
    name: "Monthly Base Salary",
    category: "Miscellaneous",
    amount: 185000,
    type: "income",
    date: "2026-04-01"
  },
  {
    id: "e-apr-2",
    name: "Nifty 50 Index SIP",
    category: "Investment",
    amount: 35000,
    type: "expense",
    date: "2026-04-02"
  },
  {
    id: "e-apr-3",
    name: "Gourmet Catering Party",
    category: "Food & Grocery",
    amount: 22000,
    type: "expense",
    date: "2026-04-12"
  },
  {
    id: "e-apr-4",
    name: "Premium Leather Messenger Bag",
    category: "Shopping",
    amount: 11200,
    type: "expense",
    date: "2026-04-18"
  },
  {
    id: "e-apr-5",
    name: "Consulting Retainer Pay",
    category: "Miscellaneous",
    amount: 45000,
    type: "income",
    date: "2026-04-20"
  },
  {
    id: "e-apr-6",
    name: "Cab Services & Fuel",
    category: "Travel",
    amount: 6400,
    type: "expense",
    date: "2026-04-25"
  },

  // --- MARCH 2026 ---
  {
    id: "e-mar-1",
    name: "Monthly Base Salary",
    category: "Miscellaneous",
    amount: 185000,
    type: "income",
    date: "2026-03-01"
  },
  {
    id: "e-mar-2",
    name: "Nifty 50 Index SIP",
    category: "Investment",
    amount: 35000,
    type: "expense",
    date: "2026-03-02"
  },
  {
    id: "e-mar-3",
    name: "Resort Stay",
    category: "Travel",
    amount: 24500,
    type: "expense",
    date: "2026-03-10"
  },
  {
    id: "e-mar-4",
    name: "Grocery Stock",
    category: "Food & Grocery",
    amount: 9800,
    type: "expense",
    date: "2026-03-14"
  },
  {
    id: "e-mar-5",
    name: "Consulting Retainer Pay",
    category: "Miscellaneous",
    amount: 45000,
    type: "income",
    date: "2026-03-20"
  },
  {
    id: "e-mar-6",
    name: "Digital Artwork Purchase",
    category: "Shopping",
    amount: 15000,
    type: "expense",
    date: "2026-03-28"
  },

  // --- FEBRUARY 2026 ---
  {
    id: "e-feb-1",
    name: "Monthly Base Salary",
    category: "Miscellaneous",
    amount: 185000,
    type: "income",
    date: "2026-02-01"
  },
  {
    id: "e-feb-2",
    name: "Nifty 50 Index SIP",
    category: "Investment",
    amount: 35000,
    type: "expense",
    date: "2026-02-02"
  },
  {
    id: "e-feb-3",
    name: "Grocery Outflow",
    category: "Food & Grocery",
    amount: 11200,
    type: "expense",
    date: "2026-02-08"
  },
  {
    id: "e-feb-4",
    name: "Noise-Cancelling Headphones",
    category: "Shopping",
    amount: 29900,
    type: "expense",
    date: "2026-02-14"
  },
  {
    id: "e-feb-5",
    name: "Consulting Retainer Pay",
    category: "Miscellaneous",
    amount: 45000,
    type: "income",
    date: "2026-02-20"
  },
  {
    id: "e-feb-6",
    name: "Subway & Transit Pass",
    category: "Travel",
    amount: 3200,
    type: "expense",
    date: "2026-02-25"
  },

  // --- JANUARY 2026 ---
  {
    id: "e-jan-1",
    name: "Monthly Base Salary",
    category: "Miscellaneous",
    amount: 185000,
    type: "income",
    date: "2026-01-01"
  },
  {
    id: "e-jan-2",
    name: "Nifty 50 Index SIP",
    category: "Investment",
    amount: 35000,
    type: "expense",
    date: "2026-01-02"
  },
  {
    id: "e-jan-3",
    name: "Organic Foods Purchase",
    category: "Food & Grocery",
    amount: 14200,
    type: "expense",
    date: "2026-01-06"
  },
  {
    id: "e-jan-4",
    name: "New Desk Chair",
    category: "Shopping",
    amount: 18500,
    type: "expense",
    date: "2026-01-12"
  },
  {
    id: "e-jan-5",
    name: "Consulting Retainer Pay",
    category: "Miscellaneous",
    amount: 45000,
    type: "income",
    date: "2026-01-20"
  },
  {
    id: "e-jan-6",
    name: "Intercity Train Tickets",
    category: "Travel",
    amount: 4500,
    type: "expense",
    date: "2026-01-22"
  },
  {
    id: "e-jan-7",
    name: "Bonus Dividend payouts",
    category: "Investment",
    amount: 28000,
    type: "income",
    date: "2026-01-26"
  }
];

export const INITIAL_INVESTMENTS_BALANCE = 820000;
