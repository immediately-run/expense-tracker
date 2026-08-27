import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { parseAmount } from '../lib/money';
import CategoryChips from './CategoryChips';
import Icon from './Icon';

interface Props {
  categories: string[];
  currency: string;
  disabled?: boolean;
  onAdd: (amount: number, category: string, note: string) => Promise<boolean>;
}

/** One-thumb entry: amount → category chip → optional note → add. Category sticks between adds. */
function QuickAdd({ categories, currency, disabled, onAdd }: Props) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0] ?? 'Other');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const cat = categories.includes(category) ? category : categories[0] ?? 'Other';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const minor = parseAmount(amount, currency);
    if (!minor) {
      setError('Enter an amount like 12.50');
      amountRef.current?.focus();
      return;
    }
    setSaving(true);
    const ok = await onAdd(minor, cat, note);
    setSaving(false);
    if (ok) {
      setAmount('');
      setNote('');
      setError(null);
      amountRef.current?.focus();
    }
  };

  return (
    <form className="quickadd" onSubmit={submit}>
      <div className="row">
        <span className="cur">{currency}</span>
        <input
          ref={amountRef}
          className="input amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          aria-label="Amount"
          value={amount}
          disabled={disabled}
          onChange={(e) => {
            setAmount(e.target.value);
            if (error) setError(null);
          }}
        />
      </div>
      <CategoryChips options={categories} value={cat} onToggle={setCategory} />
      <div className="row">
        <input
          className="input note grow"
          placeholder="Payee or note (optional)"
          aria-label="Payee or note"
          value={note}
          disabled={disabled}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="submit" className="btn btn-primary add" disabled={disabled || saving}>
          <Icon name="plus" size={16} />
          Add
        </button>
      </div>
      {error && <div className="err">{error}</div>}
    </form>
  );
}

export default QuickAdd;
