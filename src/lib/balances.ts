import type { Transaction } from './types';

export interface PersonBalance {
  name: string;
  /** What this person paid on shared purchases. */
  paid: number;
  /** This person's share of all shared purchases. */
  share: number;
  /** paid − share: positive means others owe them. */
  net: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/**
 * Equal-split balances over the shared rows (those with `splitWith`) in one
 * currency. The payer is always a participant; integer remainders of the split
 * land on the payer so the shares always sum to the amount.
 */
export function computeBalances(txs: Transaction[], currency: string): PersonBalance[] {
  const people = new Map<string, PersonBalance>();
  const get = (name: string) => {
    let p = people.get(name);
    if (!p) {
      p = { name, paid: 0, share: 0, net: 0 };
      people.set(name, p);
    }
    return p;
  };
  for (const t of txs) {
    if (t.currency !== currency || t.splitWith.length === 0) continue;
    const participants = [...new Set([t.paidBy, ...t.splitWith])];
    const n = participants.length;
    const base = Math.floor(t.amount / n);
    const remainder = t.amount - base * n;
    get(t.paidBy).paid += t.amount;
    for (const name of participants) {
      get(name).share += base + (name === t.paidBy ? remainder : 0);
    }
  }
  return [...people.values()]
    .map((p) => ({ ...p, net: p.paid - p.share }))
    .sort((a, b) => b.net - a.net);
}

/** Greedy creditor/debtor matching — the usual "simplified debts" list. */
export function simplifyDebts(balances: PersonBalance[]): Settlement[] {
  const creditors = balances.filter((b) => b.net > 0).map((b) => ({ name: b.name, left: b.net }));
  const debtors = balances.filter((b) => b.net < 0).map((b) => ({ name: b.name, left: -b.net }));
  creditors.sort((a, b) => b.left - a.left);
  debtors.sort((a, b) => b.left - a.left);
  const out: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].left, debtors[j].left);
    if (amount > 0) out.push({ from: debtors[j].name, to: creditors[i].name, amount });
    creditors[i].left -= amount;
    debtors[j].left -= amount;
    if (creditors[i].left === 0) i++;
    if (debtors[j].left === 0) j++;
  }
  return out;
}
