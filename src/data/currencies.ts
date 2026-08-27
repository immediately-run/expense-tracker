export interface CurrencyInfo {
  code: string;
  name: string;
  /** Minor-unit digits used for entry and display. */
  decimals: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US dollar', decimals: 2 },
  { code: 'EUR', name: 'Euro', decimals: 2 },
  { code: 'GBP', name: 'Pound sterling', decimals: 2 },
  { code: 'HUF', name: 'Hungarian forint', decimals: 0 },
  { code: 'CHF', name: 'Swiss franc', decimals: 2 },
  { code: 'JPY', name: 'Japanese yen', decimals: 0 },
  { code: 'CAD', name: 'Canadian dollar', decimals: 2 },
  { code: 'AUD', name: 'Australian dollar', decimals: 2 },
  { code: 'PLN', name: 'Polish zloty', decimals: 2 },
  { code: 'CZK', name: 'Czech koruna', decimals: 2 },
  { code: 'SEK', name: 'Swedish krona', decimals: 2 },
  { code: 'NOK', name: 'Norwegian krone', decimals: 2 },
  { code: 'DKK', name: 'Danish krone', decimals: 2 },
  { code: 'INR', name: 'Indian rupee', decimals: 2 },
];

export const DEFAULT_CURRENCY = 'EUR';
