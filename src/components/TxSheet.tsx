import { useState } from 'react';
import type { FormEvent } from 'react';
import { CURRENCIES } from '../data/currencies';
import { parseAmount, toMajorString } from '../lib/money';
import type { Transaction } from '../lib/types';
import CategoryChips from './CategoryChips';
import Sheet from './Sheet';

interface Props {
  tx: Transaction;
  categories: string[];
  people: string[];
  readOnly: boolean;
  onSave: (patch: Partial<Transaction>) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onClose: () => void;
}

/** Tap-to-edit sheet for one transaction. */
function TxSheet({ tx, categories, people, readOnly, onSave, onDelete, onClose }: Props) {
  const [amount, setAmount] = useState(toMajorString(tx.amount, tx.currency));
  const [currency, setCurrency] = useState(tx.currency);
  const [date, setDate] = useState(tx.date);
  const [category, setCategory] = useState(tx.category);
  const [note, setNote] = useState(tx.note);
  const [paidBy, setPaidBy] = useState(tx.paidBy);
  const [splitWith, setSplitWith] = useState<string[]>(tx.splitWith);
  const [extra, setExtra] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const chipPeople = [...new Set([...people, ...splitWith])].filter((p) => p !== paidBy.trim());
  const cats = categories.includes(category) ? categories : [...categories, category];

  const toggle = (name: string) =>
    setSplitWith((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));

  const addExtra = () => {
    const n = extra.trim();
    if (n && !splitWith.includes(n)) setSplitWith((s) => [...s, n]);
    setExtra('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const minor = parseAmount(amount, currency);
    if (!minor) {
      setError('Enter a positive amount');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Pick a date');
      return;
    }
    setBusy(true);
    const ok = await onSave({
      amount: minor,
      currency,
      date,
      category,
      note: note.trim(),
      paidBy: paidBy.trim() || tx.paidBy,
      splitWith: splitWith.filter((n) => n !== paidBy.trim()),
    });
    setBusy(false);
    if (ok) onClose();
  };

  const del = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    const ok = await onDelete();
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Sheet title={readOnly ? 'Expense' : 'Edit expense'} onClose={onClose}>
      <form onSubmit={submit}>
        <fieldset disabled={readOnly || busy} style={{ border: 0, minWidth: 0 }}>
          <div className="row">
            <div className="field grow">
              <label htmlFor="tx-amount">Amount</label>
              <input id="tx-amount" className="input mono" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label htmlFor="tx-cur">Currency</label>
              <select id="tx-cur" className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {!CURRENCIES.some((c) => c.code === currency) && <option value={currency}>{currency}</option>}
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="tx-date">Date</label>
            <input id="tx-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Category</label>
            <CategoryChips options={cats} value={category} onToggle={setCategory} wrap />
          </div>
          <div className="field">
            <label htmlFor="tx-note">Payee or note</label>
            <input id="tx-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supermarket" />
          </div>
          <div className="field">
            <label htmlFor="tx-paidby">Paid by</label>
            <input id="tx-paidby" className="input" list="tx-people" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} />
            <datalist id="tx-people">
              {people.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label>Split equally with</label>
            {chipPeople.length > 0 ? (
              <CategoryChips options={chipPeople} value={splitWith} onToggle={toggle} wrap />
            ) : (
              <span className="muted small">Add household members in settings, or type a name below.</span>
            )}
            <div className="row" style={{ marginTop: 6 }}>
              <input
                className="input grow"
                placeholder="Another name"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addExtra();
                  }
                }}
              />
              <button type="button" className="btn btn-ghost" onClick={addExtra} disabled={!extra.trim()}>
                Add
              </button>
            </div>
            {splitWith.length > 0 && (
              <span className="muted small">
                {splitWith.length + 1} ways: each share is {toMajorString(Math.floor((parseAmount(amount, currency) ?? 0) / (splitWith.length + 1)), currency)} {currency}
              </span>
            )}
          </div>
          {error && <div className="quickadd-err" style={{ color: 'var(--over)', fontFamily: 'var(--mono)', fontSize: 12 }}>{error}</div>}
        </fieldset>
        {!readOnly && (
          <div className="foot">
            <button type="button" className="btn btn-danger" onClick={del} disabled={busy}>
              {confirm ? 'Really delete' : 'Delete'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save
            </button>
          </div>
        )}
      </form>
    </Sheet>
  );
}

export default TxSheet;
