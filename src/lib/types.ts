// Shared record shapes. Money is always an integer in minor units (cents, fillér,
// yen …) plus an ISO 4217 code — never a float.

export interface Transaction {
  id: string;
  /** Minor units, positive. */
  amount: number;
  /** ISO 4217 code, e.g. `EUR`. */
  currency: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  category: string;
  /** Payee or free-form note. */
  note: string;
  /** Login (or name) of whoever paid. */
  paidBy: string;
  /** Other people sharing the cost equally with the payer. Empty = not split. */
  splitWith: string[];
  /** Set on generated sample rows so "Clear sample data" can find them. */
  sample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CategoriesFile {
  version: 1;
  categories: string[];
}

export interface MembersFile {
  version: 1;
  members: string[];
}

/** `<private>/config.json` — per-user preferences and the remembered household. */
export interface Config {
  version: 1;
  currency: string;
  spaceId?: string;
  spaceName?: string;
  seeded?: boolean;
}

/** category → monthly budget in minor units. */
export type Budgets = Record<string, number>;

/** `<private>/budgets.json` — budgets are personal, kept per store. */
export interface BudgetsFile {
  version: 1;
  byStore: Record<string, Budgets>;
}
