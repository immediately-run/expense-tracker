import type { Transaction } from './types';

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

export interface PayeeTotal {
  payee: string;
  total: number;
  count: number;
}

export interface DayGroup {
  date: string;
  txs: Transaction[];
  total: number;
}

const inCurrency = (txs: Transaction[], currency: string) =>
  txs.filter((t) => t.currency === currency);

/** Sum of everything in `currency` (other currencies are reported separately). */
export function totalOf(txs: Transaction[], currency: string): number {
  return inCurrency(txs, currency).reduce((s, t) => s + t.amount, 0);
}

/** Totals per currency other than the display one — shown as a footnote. */
export function otherCurrencyTotals(txs: Transaction[], currency: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of txs) {
    if (t.currency === currency) continue;
    out[t.currency] = (out[t.currency] ?? 0) + t.amount;
  }
  return out;
}

export function byCategory(txs: Transaction[], currency: string): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const t of inCurrency(txs, currency)) {
    const row = map.get(t.category) ?? { category: t.category, total: 0, count: 0 };
    row.total += t.amount;
    row.count += 1;
    map.set(t.category, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function topPayees(txs: Transaction[], currency: string, n = 5): PayeeTotal[] {
  const map = new Map<string, PayeeTotal>();
  for (const t of inCurrency(txs, currency)) {
    const key = t.note.trim().toLowerCase();
    if (!key) continue;
    const row = map.get(key) ?? { payee: t.note.trim(), total: 0, count: 0 };
    row.total += t.amount;
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, n);
}

/** Newest day first; rows inside keep their (already sorted) order. */
export function groupByDay(txs: Transaction[], currency: string): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const t of txs) {
    const g = map.get(t.date) ?? { date: t.date, txs: [], total: 0 };
    g.txs.push(t);
    if (t.currency === currency) g.total += t.amount;
    map.set(t.date, g);
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}
