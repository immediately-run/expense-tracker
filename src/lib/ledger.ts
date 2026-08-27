// File layout on top of a Store:
//   <store>/tx/<YYYY-MM>/<txId>.json   one transaction per file (safe for many writers)
//   <store>/categories.json            rarely edited → last-write-wins is acceptable
//   <store>/members.json               household member names for split chips (LWW)
//   <private>/config.json              currency + remembered household space
//   <private>/budgets.json             personal budgets, keyed per store
import { DEFAULT_CATEGORIES } from '../data/categories';
import { DEFAULT_CURRENCY } from '../data/currencies';
import { ensureDir, listFiles, readJson, removeFile, writeJson } from './store';
import type { Store } from './store';
import type {
  Budgets,
  BudgetsFile,
  CategoriesFile,
  Config,
  MembersFile,
  Transaction,
} from './types';

export const txRoot = (store: Store) => `${store.root}/tx`;
export const txDir = (store: Store, ym: string) => `${txRoot(store)}/${ym}`;
const txPath = (store: Store, tx: Pick<Transaction, 'id' | 'date'>) =>
  `${txDir(store, tx.date.slice(0, 7))}/${tx.id}.json`;

/** Stable key for per-store private data (budgets). */
export const storeKey = (store: Store): string =>
  store.spaceId ? `space:${store.spaceId}` : 'private';

const isTransaction = (v: unknown): v is Transaction => {
  if (!v || typeof v !== 'object') return false;
  const t = v as Partial<Transaction>;
  return (
    typeof t.id === 'string' &&
    typeof t.amount === 'number' &&
    typeof t.currency === 'string' &&
    typeof t.date === 'string' &&
    typeof t.category === 'string'
  );
};

/** Normalise older / hand-edited files so the UI never sees a missing field. */
const normalise = (t: Transaction): Transaction => ({
  ...t,
  note: t.note ?? '',
  paidBy: t.paidBy || 'someone',
  splitWith: Array.isArray(t.splitWith) ? t.splitWith.filter(Boolean) : [],
  createdAt: t.createdAt ?? 0,
  updatedAt: t.updatedAt ?? t.createdAt ?? 0,
});

export const sortTx = (a: Transaction, b: Transaction) =>
  b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

export async function loadMonth(store: Store, ym: string): Promise<Transaction[]> {
  const dir = txDir(store, ym);
  const names = await listFiles(dir, '.json');
  const rows = await Promise.all(
    names.map((n) => readJson<unknown>(`${dir}/${n}`, null)),
  );
  return rows.filter(isTransaction).map(normalise).sort(sortTx);
}

/** Months that have a directory under `tx/`, newest first. */
export async function listMonths(store: Store): Promise<string[]> {
  const names = await listFiles(txRoot(store));
  return names.filter((n) => /^\d{4}-\d{2}$/.test(n)).sort().reverse();
}

export async function saveTx(store: Store, tx: Transaction): Promise<void> {
  await writeJson(txPath(store, tx), tx);
}

/** Save many rows at once (seeding). The month directories are created first,
 *  one at a time, so 25 concurrent creates never race their own `mkdir`. */
export async function saveTxBatch(store: Store, rows: Transaction[]): Promise<void> {
  for (const ym of new Set(rows.map((t) => t.date.slice(0, 7)))) await ensureDir(txDir(store, ym));
  await Promise.all(rows.map((t) => saveTx(store, t)));
}

export async function deleteTx(store: Store, tx: Pick<Transaction, 'id' | 'date'>): Promise<void> {
  await removeFile(txPath(store, tx));
}

export async function loadCategories(store: Store): Promise<string[]> {
  const f = await readJson<CategoriesFile | null>(`${store.root}/categories.json`, null);
  const cats = f?.categories?.filter((c) => typeof c === 'string' && c.trim());
  return cats && cats.length ? cats : DEFAULT_CATEGORIES;
}

export async function saveCategories(store: Store, categories: string[]): Promise<void> {
  const file: CategoriesFile = { version: 1, categories };
  await writeJson(`${store.root}/categories.json`, file);
}

export async function loadMembers(store: Store): Promise<string[]> {
  const f = await readJson<MembersFile | null>(`${store.root}/members.json`, null);
  return f?.members?.filter((m) => typeof m === 'string' && m.trim()) ?? [];
}

export async function saveMembers(store: Store, members: string[]): Promise<void> {
  const file: MembersFile = { version: 1, members };
  await writeJson(`${store.root}/members.json`, file);
}

export const DEFAULT_CONFIG: Config = { version: 1, currency: DEFAULT_CURRENCY };

export async function loadConfig(priv: Store): Promise<Config> {
  const c = await readJson<Partial<Config>>(`${priv.root}/config.json`, {});
  return { ...DEFAULT_CONFIG, ...c, version: 1 };
}

export async function saveConfig(priv: Store, config: Config): Promise<void> {
  await writeJson(`${priv.root}/config.json`, config);
}

async function loadBudgetsFile(priv: Store): Promise<BudgetsFile> {
  const f = await readJson<Partial<BudgetsFile>>(`${priv.root}/budgets.json`, {});
  return { version: 1, byStore: f.byStore ?? {} };
}

export async function loadBudgets(priv: Store, key: string): Promise<Budgets> {
  return (await loadBudgetsFile(priv)).byStore[key] ?? {};
}

export async function saveBudgets(priv: Store, key: string, budgets: Budgets): Promise<void> {
  const f = await loadBudgetsFile(priv);
  f.byStore[key] = budgets;
  await writeJson(`${priv.root}/budgets.json`, f);
}
