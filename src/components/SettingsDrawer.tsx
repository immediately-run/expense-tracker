import { useState } from 'react';
import { CURRENCIES } from '../data/currencies';
import { parseAmount, toMajorString } from '../lib/money';
import type { Ledger } from '../hooks/useLedger';
import Sheet from './Sheet';

interface Props {
  ledger: Ledger;
  onClose: () => void;
}

function SettingsDrawer({ ledger, onClose }: Props) {
  const {
    mode, householdName, readOnly, busy, currency, categories, members, budgets, authStatus, store,
  } = ledger;
  const [newCat, setNewCat] = useState('');
  const [newMember, setNewMember] = useState('');
  const [newName, setNewName] = useState('');
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({});

  const budgetValue = (c: string) =>
    budgetDraft[c] ?? (budgets[c] !== undefined ? toMajorString(budgets[c], currency) : '');

  const commitBudget = (c: string) => {
    const raw = budgetDraft[c];
    if (raw === undefined) return;
    void ledger.setBudget(c, raw.trim() ? parseAmount(raw, currency) : null);
    setBudgetDraft((d) => {
      const n = { ...d };
      delete n[c];
      return n;
    });
  };

  const isDev = store?.kind === 'dev';

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="settings">
        <section className="household">
          <h3 className="sub">Household</h3>
          <div className="status">
            <span className={`storebadge ${mode === 'shared' ? 'shared' : ''}`} style={{ cursor: 'default', maxWidth: 'none' }}>
              <span className="dot" />
              <span className="name">{mode === 'shared' ? householdName || 'Shared space' : 'Private ledger'}</span>
              {readOnly && <span className="ro">ro</span>}
            </span>
          </div>
          {mode === 'shared' ? (
            <>
              <p className="hint">
                Invite people to this space from the platform's Spaces UI — the app cannot invite anyone itself. Their expenses appear here within a few seconds.
              </p>
              <div className="row wrap">
                <button type="button" className="btn btn-ghost" onClick={() => void ledger.openHousehold()} disabled={busy}>
                  Open another…
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void ledger.leaveHousehold()} disabled={busy}>
                  Back to private
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="hint">
                Share expenses with the people you live with: create a shared space, or open one you already have access to. Then invite them from the platform's Spaces UI.
                {authStatus === 'signed-out' && ' Sign in first.'}
              </p>
              <div className="row">
                <input className="input grow" placeholder="Household name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !newName.trim()}
                  onClick={() => void ledger.createHousehold(newName.trim())}
                >
                  Create
                </button>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => void ledger.openHousehold()} disabled={busy}>
                  Open shared household…
                </button>
              </div>
              {isDev && <p className="hint">Local dev: both buttons switch to a second folder under devfs-playground.</p>}
            </>
          )}
        </section>

        {!ledger.hasHostLogin && (
          <section>
            <h3 className="sub">Your name</h3>
            <p className="hint">Used as “who paid” on your expenses and on the Balances tab. Pick the same name your household knows you by.</p>
            <input
              className="input"
              placeholder="me"
              aria-label="Your name"
              value={nameDraft ?? ledger.displayName}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                if (nameDraft !== null && nameDraft.trim() !== ledger.displayName) void ledger.setDisplayName(nameDraft);
                setNameDraft(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </section>
        )}

        <section>
          <h3 className="sub">Currency</h3>
          <p className="hint">Default for new expenses. Totals and budgets are shown in this currency; other currencies are listed separately.</p>
          <select className="select" value={currency} onChange={(e) => void ledger.setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h3 className="sub">Categories and budgets</h3>
          <p className="hint">Monthly budget per category, in {currency}. Leave blank for none.</p>
          <div className="editlist">
            {categories.map((c) => (
              <div className="item" key={c}>
                <span className="n">{c}</span>
                <span className="b">
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="budget"
                    aria-label={`Budget for ${c}`}
                    value={budgetValue(c)}
                    onChange={(e) => setBudgetDraft((d) => ({ ...d, [c]: e.target.value }))}
                    onBlur={() => commitBudget(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                  />
                </span>
                <button
                  type="button"
                  className="x"
                  aria-label={`Remove ${c}`}
                  disabled={readOnly || categories.length <= 1}
                  onClick={() => void ledger.setCategories(categories.filter((x) => x !== c))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <input
              className="input grow"
              placeholder="New category"
              value={newCat}
              disabled={readOnly}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCat.trim()) {
                  void ledger.setCategories([...categories, newCat.trim()]);
                  setNewCat('');
                }
              }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              disabled={readOnly || !newCat.trim()}
              onClick={() => {
                void ledger.setCategories([...categories, newCat.trim()]);
                setNewCat('');
              }}
            >
              Add
            </button>
          </div>
        </section>

        <section>
          <h3 className="sub">Household members</h3>
          <p className="hint">Names offered as “split with” chips. Members of a shared space are suggested automatically when the host allows it.</p>
          {members.length > 0 && (
            <div className="editlist">
              {members.map((m) => (
                <div className="item" key={m}>
                  <span className="n">{m}</span>
                  <button type="button" className="x" aria-label={`Remove ${m}`} disabled={readOnly} onClick={() => void ledger.setMembers(members.filter((x) => x !== m))}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            <input
              className="input grow"
              placeholder="Name or login"
              value={newMember}
              disabled={readOnly}
              onChange={(e) => setNewMember(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newMember.trim()) {
                  void ledger.setMembers([...members, newMember.trim()]);
                  setNewMember('');
                }
              }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              disabled={readOnly || !newMember.trim()}
              onClick={() => {
                void ledger.setMembers([...members, newMember.trim()]);
                setNewMember('');
              }}
            >
              Add
            </button>
          </div>
        </section>

        <section>
          <h3 className="sub">Sample data</h3>
          <p className="hint">A fresh private ledger comes with two months of made-up expenses so every screen has something to show.</p>
          <div className="row wrap">
            <button type="button" className="btn btn-ghost" disabled={busy || readOnly} onClick={() => void ledger.clearSampleData()}>
              Clear sample data
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy || readOnly} onClick={() => void ledger.restoreSampleData()}>
              Add sample data
            </button>
          </div>
        </section>

        <section>
          <h3 className="sub">About</h3>
          <p className="hint">
            Every expense is one JSON file under <code className="mono">tx/&lt;month&gt;/</code> in the store; budgets and the remembered household live in your private settings folder. Signed in as <b>{ledger.login}</b>.
          </p>
        </section>
      </div>
    </Sheet>
  );
}

export default SettingsDrawer;
