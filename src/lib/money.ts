import { CURRENCIES } from '../data/currencies';

export const decimalsOf = (code: string): number =>
  CURRENCIES.find((c) => c.code === code)?.decimals ?? 2;

const scale = (code: string) => 10 ** decimalsOf(code);

/** Locale-aware currency string from minor units. Never throws. */
export function formatMoney(minor: number, currency: string): string {
  const d = decimalsOf(currency);
  const major = minor / scale(currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(major);
  } catch {
    return `${major.toFixed(d)} ${currency}`;
  }
}

/** Shorter form for axis / tile labels: drops the fraction above 100 major units. */
export function formatCompact(minor: number, currency: string): string {
  const major = Math.abs(minor) / scale(currency);
  if (major < 100) return formatMoney(minor, currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(minor / scale(currency));
  } catch {
    return `${Math.round(minor / scale(currency))} ${currency}`;
  }
}

/** Parse "12.50", "12,50", "1 234,5" → minor units. Null when not a positive amount. */
export function parseAmount(text: string, currency: string): number | null {
  let s = text.replace(/\s/g, '').replace(/[^\d.,]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: the later one is the decimal separator, the other is grouping.
    const dec = Math.max(lastComma, lastDot);
    s = s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1);
  } else if (lastComma >= 0) {
    const parts = s.split(',');
    // "1,234,567" → grouping; "12,5" → decimal.
    s = parts.length > 2 ? parts.join('') : parts.join('.');
  } else if (lastDot >= 0) {
    const parts = s.split('.');
    s = parts.length > 2 ? parts.join('') : s;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const minor = Math.round(n * scale(currency));
  return minor > 0 ? minor : null;
}

/** Minor units → plain decimal string for an input value ("12.50"). */
export const toMajorString = (minor: number, currency: string): string =>
  (minor / scale(currency)).toFixed(decimalsOf(currency));
