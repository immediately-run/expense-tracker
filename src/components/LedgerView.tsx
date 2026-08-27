import { formatMoney } from '../lib/money';
import { dayLabel } from '../lib/dates';
import { groupByDay, otherCurrencyTotals, totalOf } from '../lib/stats';
import type { Ledger } from '../hooks/useLedger';
import type { Transaction } from '../lib/types';
import MonthPicker from './MonthPicker';
import QuickAdd from './QuickAdd';
import TxRow from './TxRow';

interface Props {
  ledger: Ledger;
  onOpenTx: (tx: Transaction) => void;
}

function LedgerView({ ledger, onOpenTx }: Props) {
  const { txs, currency, month, setMonth, categories, readOnly, monthLoading } = ledger;
  const groups = groupByDay(txs, currency);
  const total = totalOf(txs, currency);
  const others = otherCurrencyTotals(txs, currency);

  return (
    <div>
      <MonthPicker month={month} onChange={setMonth} />
      {!readOnly && (
        <QuickAdd
          categories={categories}
          currency={currency}
          onAdd={(amount, category, note) => ledger.addTx({ amount, category, note })}
        />
      )}
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="muted">
          {txs.length} {txs.length === 1 ? 'expense' : 'expenses'}
        </span>
        <span className="mono" style={{ fontWeight: 700 }}>
          {formatMoney(total, currency)}
          {Object.keys(others).length > 0 && (
            <span className="muted small"> + {Object.entries(others).map(([c, v]) => formatMoney(v, c)).join(', ')}</span>
          )}
        </span>
      </div>
      {groups.length === 0 && (
        <div className="empty">
          <b>{monthLoading ? 'Loading…' : 'No expenses this month.'}</b>
          {!monthLoading && (readOnly ? 'Nothing was recorded yet.' : 'Type an amount above and tap Add.')}
        </div>
      )}
      {groups.map((g) => (
        <section className="daygroup" key={g.date}>
          <div className="dayhead">
            <span>{dayLabel(g.date)}</span>
            <span>{formatMoney(g.total, currency)}</span>
          </div>
          <div className="txlist">
            {g.txs.map((tx) => (
              <TxRow key={tx.id} tx={tx} currency={currency} onOpen={onOpenTx} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default LedgerView;
