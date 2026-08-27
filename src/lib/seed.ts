import { decimalsOf } from './money';
import { toISODate } from './dates';
import type { Transaction } from './types';

// Deterministic PRNG so the sample ledger looks the same on every fresh store.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Template {
  category: string;
  note: string;
  min: number;
  max: number;
  split?: boolean;
}

const TEMPLATES: Template[] = [
  { category: 'Groceries', note: 'Supermarket', min: 18, max: 95, split: true },
  { category: 'Groceries', note: 'Farmers market', min: 9, max: 30, split: true },
  { category: 'Groceries', note: 'Bakery', min: 3, max: 12 },
  { category: 'Transport', note: 'Monthly transit pass', min: 30, max: 60 },
  { category: 'Transport', note: 'Fuel', min: 40, max: 75, split: true },
  { category: 'Eating out', note: 'Lunch', min: 8, max: 18 },
  { category: 'Eating out', note: 'Pizza night', min: 22, max: 48, split: true },
  { category: 'Eating out', note: 'Coffee', min: 2.5, max: 6 },
  { category: 'Utilities', note: 'Electricity', min: 45, max: 90, split: true },
  { category: 'Utilities', note: 'Internet', min: 25, max: 40, split: true },
  { category: 'Health', note: 'Pharmacy', min: 6, max: 30 },
  { category: 'Fun', note: 'Cinema', min: 10, max: 28, split: true },
  { category: 'Fun', note: 'Streaming', min: 8, max: 16 },
  { category: 'Household', note: 'Cleaning supplies', min: 8, max: 25, split: true },
  { category: 'Household', note: 'Hardware store', min: 12, max: 60 },
  { category: 'Other', note: 'Gift', min: 15, max: 50 },
];

/** Rough per-currency scale so sample amounts look plausible outside EUR/USD. */
const SCALE: Record<string, number> = { HUF: 380, JPY: 160, INR: 85, CZK: 24, SEK: 11, NOK: 11, DKK: 7, PLN: 4 };

/**
 * ~25 transactions over the last two months plus rent on the 1st of each,
 * a few of them split with a sample housemate so the Balances tab has data.
 */
export function makeSampleTransactions(currency: string, paidBy: string): Transaction[] {
  const rnd = mulberry32(20260827);
  const minor = (major: number) =>
    Math.round(major * (SCALE[currency] ?? 1) * 10 ** decimalsOf(currency));
  const now = Date.now();
  const out: Transaction[] = [];
  const mate = 'sam';

  // Deterministic ids: re-seeding (or a doubled boot effect) overwrites the same
  // files instead of duplicating rows.
  const push = (daysAgo: number, tpl: Template, split: boolean) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const amount = minor(tpl.min + rnd() * (tpl.max - tpl.min));
    out.push({
      id: `sample-${String(out.length).padStart(2, '0')}`,
      amount,
      currency,
      date: toISODate(d),
      category: tpl.category,
      note: tpl.note,
      paidBy: split && rnd() < 0.4 ? mate : paidBy,
      splitWith: split ? [paidBy === mate ? 'you' : mate] : [],
      sample: true,
      createdAt: now - daysAgo * 86400000,
      updatedAt: now - daysAgo * 86400000,
    });
  };

  for (let i = 0; i < 23; i++) {
    const tpl = TEMPLATES[Math.floor(rnd() * TEMPLATES.length)];
    push(Math.floor(rnd() * 58), tpl, !!tpl.split && rnd() < 0.5);
  }
  // Rent on the 1st of this month and last month.
  for (const back of [0, 1]) {
    const d = new Date();
    d.setMonth(d.getMonth() - back, 1);
    const daysAgo = Math.max(0, Math.round((now - d.getTime()) / 86400000));
    push(daysAgo, { category: 'Rent', note: 'Rent', min: 780, max: 780 }, true);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
