import { toMajorString } from './money';
import type { Transaction } from './types';

const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export const CSV_HEADER = ['date', 'amount', 'currency', 'category', 'note', 'paid_by', 'split_with', 'id'];

/** RFC 4180-ish CSV, oldest row first, amounts as plain decimals. */
export function toCsv(txs: Transaction[]): string {
  const rows = [...txs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const lines = [CSV_HEADER.join(',')];
  for (const t of rows) {
    lines.push(
      [
        t.date,
        toMajorString(t.amount, t.currency),
        t.currency,
        t.category,
        t.note,
        t.paidBy,
        t.splitWith.join('; '),
        t.id,
      ]
        .map(quote)
        .join(','),
    );
  }
  return lines.join('\n') + '\n';
}
