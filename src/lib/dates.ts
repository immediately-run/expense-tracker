const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as `YYYY-MM-DD`. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayISO = (): string => toISODate(new Date());

/** `YYYY-MM` of an ISO date. */
export const monthKey = (iso: string): string => iso.slice(0, 7);

export const currentMonth = (): string => monthKey(todayISO());

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Ascending list of the `n` months ending at `endYm` (inclusive). */
export function lastMonths(n: number, endYm: string): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(endYm, -i));
  return out;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function shortMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** "Today", "Yesterday", else "Wed 26 Aug". */
export function dayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Today';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (iso === toISODate(y)) return 'Yesterday';
  const [yy, mm, dd] = iso.split('-').map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
