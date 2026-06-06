/**
 * mockData.js
 * Centralised mock data for TribePlan V1.
 * Represents a hardcoded "Family Trip to Bali" sample trip.
 */

export const TRIP = {
  id: 'trip-001',
  title: 'Family Trip to Bali 🌴',
  destination: 'Bali, Indonesia',
  startDate: '2026-07-10',
  endDate: '2026-07-17',
  members: ['Mum', 'Dad', 'Aisyah', 'Irfan', 'Nenek'],
}

// ── Timeline ─────────────────────────────────────────────────
export const TIMELINE_ITEMS = [
  {
    id: 'tl-1',
    day: 1,
    date: '2026-07-10',
    time: '14:00',
    title: 'Check-in at The Layar Villa',
    location: 'Jl. Drupadi, Seminyak, Bali',
    note: 'Early check-in confirmed. Pool villa – bring swimsuits!',
    category: 'accommodation',
  },
  {
    id: 'tl-2',
    day: 1,
    date: '2026-07-10',
    time: '19:00',
    title: 'Welcome Dinner at Sardine Restaurant',
    location: 'Jl. Petitenget No. 21, Seminyak',
    note: 'Reservation under "Razak Family". Dressy-casual attire.',
    category: 'food',
  },
  {
    id: 'tl-3',
    day: 2,
    date: '2026-07-11',
    time: '08:00',
    title: 'Sunrise at Tegallalang Rice Terraces',
    location: 'Tegallalang, Gianyar, Bali',
    note: 'Leave villa by 07:00. Bring camera & comfortable shoes.',
    category: 'activity',
  },
  {
    id: 'tl-4',
    day: 2,
    date: '2026-07-11',
    time: '13:00',
    title: 'Lunch at Locavore',
    location: 'Jl. Dewi Sita No.10, Ubud',
    note: 'Vegetarian-friendly tasting menu available.',
    category: 'food',
  },
  {
    id: 'tl-5',
    day: 3,
    date: '2026-07-12',
    time: '09:00',
    title: 'Tanah Lot Temple Tour',
    location: 'Beraban, Kediri, Tabanan, Bali',
    note: 'Dress modestly – sarongs provided at entrance.',
    category: 'culture',
  },
  {
    id: 'tl-6',
    day: 3,
    date: '2026-07-12',
    time: '16:00',
    title: 'Kuta Beach Sunset',
    location: 'Kuta Beach, Badung, Bali',
    note: 'Grab coconuts from the beach vendors.',
    category: 'leisure',
  },
]

// ── Idea Bucket ───────────────────────────────────────────────
export const IDEA_ITEMS = [
  {
    id: 'idea-1',
    title: 'Visit the Secret Waterfall (Nungnung)',
    description: 'About 1.5 hrs from Seminyak. 500+ steps down – worth it!',
    addedBy: 'Aisyah',
    upvotes: 3,
    upvotedBy: ['Mum', 'Dad', 'Irfan'],
  },
  {
    id: 'idea-2',
    title: 'Morning Yoga at Fivelements',
    description: 'Riverside eco-retreat in Ubud. Open to all levels.',
    addedBy: 'Mum',
    upvotes: 2,
    upvotedBy: ['Nenek', 'Aisyah'],
  },
  {
    id: 'idea-3',
    title: 'Cooking Class – Balinese Cuisine',
    description: 'Learn to make nasi goreng, satay & black rice pudding.',
    addedBy: 'Dad',
    upvotes: 4,
    upvotedBy: ['Mum', 'Aisyah', 'Irfan', 'Nenek'],
  },
  {
    id: 'idea-4',
    title: 'Bali Swing at Alas Harum',
    description: 'The famous jungle swing with rice terrace views.',
    addedBy: 'Irfan',
    upvotes: 1,
    upvotedBy: ['Aisyah'],
  },
]

// ── Expenses ─────────────────────────────────────────────────
export const EXPENSE_ITEMS = [
  {
    id: 'exp-1',
    description: 'Villa Deposit (3 nights)',
    amount: 1500,
    currency: 'USD',
    paidBy: 'Dad',
    splitAmong: ['Mum', 'Dad', 'Aisyah', 'Irfan', 'Nenek'],
    date: '2026-06-01',
    category: 'accommodation',
  },
  {
    id: 'exp-2',
    description: 'Welcome Dinner – Sardine',
    amount: 320,
    currency: 'USD',
    paidBy: 'Mum',
    splitAmong: ['Mum', 'Dad', 'Aisyah', 'Irfan', 'Nenek'],
    date: '2026-07-10',
    category: 'food',
  },
  {
    id: 'exp-3',
    description: 'Tanah Lot entrance tickets',
    amount: 75,
    currency: 'USD',
    paidBy: 'Aisyah',
    splitAmong: ['Mum', 'Dad', 'Aisyah', 'Irfan', 'Nenek'],
    date: '2026-07-12',
    category: 'activity',
  },
  {
    id: 'exp-4',
    description: 'Grab rides (Day 2)',
    amount: 40,
    currency: 'USD',
    paidBy: 'Irfan',
    splitAmong: ['Aisyah', 'Irfan'],
    date: '2026-07-11',
    category: 'transport',
  },
]
