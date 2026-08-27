import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@immediately-run/sdk/auth';
import { getSpaceMembers } from '@immediately-run/sdk/mounts';
import { DEFAULT_CATEGORIES } from '../data/categories';
import {
  DEFAULT_CONFIG,
  deleteTx,
  loadBudgets,
  loadCategories,
  loadConfig,
  loadMembers,
  loadMonth,
  saveBudgets,
  saveCategories,
  saveConfig,
  saveMembers,
  saveTx,
  storeKey,
  txDir,
} from '../lib/ledger';
import { currentMonth, lastMonths, monthKey } from '../lib/dates';
import { makeSampleTransactions } from '../lib/seed';
import {
  createSharedStore,
  newId,
  openPrivateStore,
  openRememberedSpace,
  pickSharedStore,
  pollDir,
} from '../lib/store';
import type { Store } from '../lib/store';
import type { Budgets, Config, Transaction } from '../lib/types';

export type LedgerMode = 'private' | 'shared';

export interface NewTx {
  amount: number;
  currency?: string;
  date?: string;
  category: string;
  note?: string;
  paidBy?: string;
  splitWith?: string[];
}

const errCode = (e: unknown): string | undefined =>
  e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : undefined;

const errMessage = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : 'Something went wrong';

/**
 * All ledger state and actions. One instance at the app root; screens get what
 * they need via props. Persistence is the `fs` module through `lib/store.ts`.
 */
export function useLedger() {
  const auth = useAuth();
  const login = auth.user?.login || 'me';

  const [priv, setPriv] = useState<Store | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [categories, setCategoriesState] = useState<string[]>(DEFAULT_CATEGORIES);
  const [members, setMembersState] = useState<string[]>([]);
  const [spaceMembers, setSpaceMembers] = useState<{ spaceId: string; logins: string[] }>({ spaceId: '', logins: [] });
  const [budgets, setBudgetsState] = useState<Budgets>({});
  const [month, setMonth] = useState(currentMonth());
  const [cache, setCache] = useState<Record<string, Transaction[]>>({});
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inflight = useRef(new Set<string>());
  const storeRef = useRef<Store | null>(null);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  const mode: LedgerMode = store?.spaceId ? 'shared' : 'private';
  const readOnly = store?.mode === 'ro';
  const currency = config.currency;

  // ── loading ────────────────────────────────────────────────────────────────
  const reloadMonth = useCallback(async (s: Store, ym: string) => {
    const key = `${s.root}|${ym}`;
    if (inflight.current.has(key)) return;
    inflight.current.add(key);
    try {
      const txs = await loadMonth(s, ym);
      if (storeRef.current === s) setCache((prev) => ({ ...prev, [ym]: txs }));
    } finally {
      inflight.current.delete(key);
    }
  }, []);

  const loadStoreMeta = useCallback(async (s: Store, p: Store) => {
    const [cats, mems, buds] = await Promise.all([
      loadCategories(s),
      loadMembers(s),
      loadBudgets(p, storeKey(s)),
    ]);
    setCategoriesState(cats);
    setMembersState(mems);
    setBudgetsState(buds);
  }, []);


  // Boot: private store first, then the remembered household (no prompt), then seed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await openPrivateStore('data');
        let cfg = await loadConfig(p);
        let active: Store = p;
        let warn: string | null = null;
        if (cfg.spaceId) {
          const s = await openRememberedSpace(cfg.spaceId);
          if (s) active = s;
          else {
            warn = 'Your household space is no longer available — showing the private ledger.';
            cfg = { ...cfg, spaceId: undefined, spaceName: undefined };
            await saveConfig(p, cfg);
          }
        }
        if (cancelled) return;
        setPriv(p);
        setConfig(cfg);
        await loadStoreMeta(active, p);
        setStore(active);
        setNotice(warn);
        setReady(true);
      } catch (e) {
        if (!cancelled) setBootError(errMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // Boot exactly once; the login only affects sample-data attribution.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // First run of a private store: seed sample data once auth has settled, so the
  // rows are attributed to the real login (there is no host under `vite dev`, so
  // fall back after a moment). The seed is idempotent — `seeded` is written first
  // and the ids are deterministic — so it is never cancelled, only never started
  // twice (StrictMode doubles the effect).
  const seedStarted = useRef(false);
  useEffect(() => {
    if (!ready || !priv || store !== priv || config.seeded) return;
    const seed = async () => {
      if (seedStarted.current) return;
      seedStarted.current = true;
      const next: Config = { ...config, seeded: true };
      setConfig(next);
      try {
        await saveConfig(priv, next);
        const existing = await loadMonth(priv, currentMonth());
        if (existing.length > 0) return;
        const rows = makeSampleTransactions(next.currency, auth.user?.login || 'me');
        await Promise.all(rows.map((t) => saveTx(priv, t)));
        setCache({});
      } catch (e) {
        setNotice(`Sample data failed: ${errMessage(e)}`);
      }
    };
    const timer = setTimeout(() => void seed(), auth.status === 'unknown' ? 1500 : 0);
    return () => clearTimeout(timer);
  }, [ready, priv, store, config, auth.status, auth.user]);

  // Load the visible month whenever it (or the store) changes.
  useEffect(() => {
    if (store && cache[month] === undefined) void reloadMonth(store, month);
  }, [store, month, cache, reloadMonth]);

  // Shared spaces get no remote watch events: poll the month directory.
  useEffect(() => {
    if (!store || mode !== 'shared') return;
    const stop = pollDir(txDir(store, month), () => void reloadMonth(store, month), 3000);
    return stop;
  }, [store, mode, month, reloadMonth]);

  // Best-effort: suggest the space's members as split chips.
  useEffect(() => {
    if (!store?.spaceId || store.kind !== 'space') return;
    const spaceId = store.spaceId;
    let cancelled = false;
    getSpaceMembers(spaceId)
      .then((ms) => {
        if (!cancelled) setSpaceMembers({ spaceId, logins: ms.map((m) => m.login ?? '').filter(Boolean) });
      })
      .catch(() => {
        /* capability may be absent — chips still come from members.json */
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const spaceLogins = useMemo(
    () => (store?.spaceId && spaceMembers.spaceId === store.spaceId ? spaceMembers.logins : []),
    [store, spaceMembers],
  );
  const txs = useMemo(() => cache[month] ?? [], [cache, month]);
  const monthLoading = store !== null && cache[month] === undefined;

  /** Every name that can appear in a split: members file, space logins, seen in rows, me. */
  const people = useMemo(() => {
    const set = new Set<string>([login, ...members, ...spaceLogins]);
    for (const t of txs) {
      set.add(t.paidBy);
      t.splitWith.forEach((n) => set.add(n));
    }
    set.delete('');
    return [...set];
  }, [login, members, spaceLogins, txs]);

  const ensureMonths = useCallback(
    (yms: string[]) => {
      if (!store) return;
      for (const ym of yms) if (cache[ym] === undefined) void reloadMonth(store, ym);
    },
    [store, cache, reloadMonth],
  );

  const refresh = useCallback(() => {
    if (store) void reloadMonth(store, month);
  }, [store, month, reloadMonth]);

  // ── transactions ───────────────────────────────────────────────────────────
  const guard = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      if (!store) return false;
      if (readOnly) {
        setNotice('This household is read-only for you.');
        return false;
      }
      try {
        await fn();
        return true;
      } catch (e) {
        setNotice(`${label} failed: ${errMessage(e)}`);
        return false;
      }
    },
    [store, readOnly],
  );

  const addTx = useCallback(
    async (input: NewTx) => {
      if (!store) return false;
      const now = Date.now();
      const tx: Transaction = {
        id: newId(),
        amount: input.amount,
        currency: input.currency ?? currency,
        date: input.date ?? new Date().toISOString().slice(0, 10),
        category: input.category,
        note: (input.note ?? '').trim(),
        paidBy: input.paidBy?.trim() || login,
        splitWith: (input.splitWith ?? []).map((s) => s.trim()).filter(Boolean),
        createdAt: now,
        updatedAt: now,
      };
      return guard('Adding', async () => {
        await saveTx(store, tx);
        const ym = monthKey(tx.date);
        setCache((prev) => ({ ...prev, [ym]: [tx, ...(prev[ym] ?? [])] }));
      });
    },
    [store, currency, login, guard],
  );

  const updateTx = useCallback(
    async (prevTx: Transaction, patch: Partial<Transaction>) => {
      if (!store) return false;
      const next: Transaction = { ...prevTx, ...patch, id: prevTx.id, updatedAt: Date.now() };
      return guard('Saving', async () => {
        await saveTx(store, next);
        const oldYm = monthKey(prevTx.date);
        const newYm = monthKey(next.date);
        if (oldYm !== newYm) await deleteTx(store, prevTx);
        setCache((prev) => {
          const out = { ...prev };
          out[oldYm] = (out[oldYm] ?? []).filter((t) => t.id !== prevTx.id);
          if (out[newYm] !== undefined || oldYm === newYm) {
            out[newYm] = [next, ...(out[newYm] ?? []).filter((t) => t.id !== next.id)];
          }
          return out;
        });
      });
    },
    [store, guard],
  );

  const removeTx = useCallback(
    async (tx: Transaction) => {
      if (!store) return false;
      return guard('Deleting', async () => {
        await deleteTx(store, tx);
        const ym = monthKey(tx.date);
        setCache((prev) => ({ ...prev, [ym]: (prev[ym] ?? []).filter((t) => t.id !== tx.id) }));
      });
    },
    [store, guard],
  );

  // ── settings ───────────────────────────────────────────────────────────────
  const setCurrency = useCallback(
    async (code: string) => {
      if (!priv) return;
      const next = { ...config, currency: code };
      setConfig(next);
      await saveConfig(priv, next).catch((e) => setNotice(errMessage(e)));
    },
    [priv, config],
  );

  const setCategories = useCallback(
    async (cats: string[]) => {
      if (!store) return;
      const clean = [...new Set(cats.map((c) => c.trim()).filter(Boolean))];
      setCategoriesState(clean);
      await guard('Saving categories', () => saveCategories(store, clean));
    },
    [store, guard],
  );

  const setMembers = useCallback(
    async (names: string[]) => {
      if (!store) return;
      const clean = [...new Set(names.map((c) => c.trim()).filter(Boolean))];
      setMembersState(clean);
      await guard('Saving members', () => saveMembers(store, clean));
    },
    [store, guard],
  );

  const setBudget = useCallback(
    async (category: string, minor: number | null) => {
      if (!priv || !store) return;
      const next = { ...budgets };
      if (minor && minor > 0) next[category] = minor;
      else delete next[category];
      setBudgetsState(next);
      await saveBudgets(priv, storeKey(store), next).catch((e) => setNotice(errMessage(e)));
    },
    [priv, store, budgets],
  );

  // ── household (shared space) ───────────────────────────────────────────────
  const switchTo = useCallback(
    async (s: Store) => {
      if (!priv) return;
      const next: Config = { ...config, spaceId: s.spaceId, spaceName: s.name };
      if (!s.spaceId) {
        delete next.spaceId;
        delete next.spaceName;
      }
      await loadStoreMeta(s, priv);
      setCache({});
      setStore(s);
      setConfig(next);
      await saveConfig(priv, next).catch((e) => setNotice(errMessage(e)));
    },
    [priv, config, loadStoreMeta],
  );

  const runSpaceAction = useCallback(
    async (fn: () => Promise<Store>, doneMsg: string) => {
      setBusy(true);
      try {
        const s = await fn();
        await switchTo(s);
        setNotice(doneMsg);
      } catch (e) {
        const code = errCode(e);
        if (code === 'cancelled') setNotice(null);
        else if (code === 'auth-required') setNotice('Sign in to share a household.');
        else if (code === 'forbidden') setNotice('This app is not allowed to open spaces here.');
        else setNotice(errMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [switchTo],
  );

  const createHousehold = useCallback(
    (name: string) =>
      runSpaceAction(
        async () => {
          const s = await createSharedStore(name);
          return { ...s, name: s.name ?? name };
        },
        `Household "${name}" created.`,
      ),
    [runSpaceAction],
  );

  const openHousehold = useCallback(
    () => runSpaceAction(() => pickSharedStore(), 'Household opened.'),
    [runSpaceAction],
  );

  const leaveHousehold = useCallback(async () => {
    if (!priv) return;
    await switchTo(priv);
    setNotice('Back to your private ledger.');
  }, [priv, switchTo]);

  // ── sample data ────────────────────────────────────────────────────────────
  const clearSampleData = useCallback(async () => {
    if (!store) return;
    setBusy(true);
    try {
      const months = lastMonths(4, currentMonth());
      let n = 0;
      for (const ym of months) {
        const rows = await loadMonth(store, ym);
        for (const t of rows) {
          if (t.sample) {
            await deleteTx(store, t);
            n++;
          }
        }
      }
      setCache({});
      setNotice(n ? `Removed ${n} sample transactions.` : 'No sample data found.');
    } catch (e) {
      setNotice(errMessage(e));
    } finally {
      setBusy(false);
    }
  }, [store]);

  const restoreSampleData = useCallback(async () => {
    if (!store) return;
    await guard('Adding sample data', async () => {
      const rows = makeSampleTransactions(currency, login);
      await Promise.all(rows.map((t) => saveTx(store, t)));
      setCache({});
      setNotice(`Added ${rows.length} sample transactions.`);
    });
  }, [store, currency, login, guard]);

  return {
    ready,
    bootError,
    notice,
    dismissNotice: () => setNotice(null),
    busy,
    login,
    authStatus: auth.status,
    store,
    mode,
    readOnly,
    householdName: config.spaceName ?? store?.name ?? null,
    currency,
    categories,
    members,
    people,
    budgets,
    month,
    setMonth,
    txs,
    monthLoading,
    cache,
    ensureMonths,
    refresh,
    addTx,
    updateTx,
    removeTx,
    setCurrency,
    setCategories,
    setMembers,
    setBudget,
    createHousehold,
    openHousehold,
    leaveHousehold,
    clearSampleData,
    restoreSampleData,
  };
}

export type Ledger = ReturnType<typeof useLedger>;
