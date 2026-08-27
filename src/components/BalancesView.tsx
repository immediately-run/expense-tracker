import { computeBalances, simplifyDebts } from '../lib/balances';
import { formatMoney } from '../lib/money';
import type { Ledger } from '../hooks/useLedger';
import MonthPicker from './MonthPicker';

interface Props {
  ledger: Ledger;
  onOpenSettings: () => void;
}

function BalancesView({ ledger, onOpenSettings }: Props) {
  const { txs, currency, month, setMonth, mode, login } = ledger;
  const balances = computeBalances(txs, currency);
  const settlements = simplifyDebts(balances);
  const sharedCount = txs.filter((t) => t.splitWith.length > 0 && t.currency === currency).length;
  const sharedTotal = txs.filter((t) => t.splitWith.length > 0 && t.currency === currency).reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <MonthPicker month={month} onChange={setMonth} />
      {mode === 'private' && (
        <p className="muted" style={{ marginBottom: 12 }}>
          You are in your private ledger. Balances still work for expenses you mark as split;{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onOpenSettings}>share a household</button>{' '}
          so the people you live with can add their own.
        </p>
      )}
      {balances.length === 0 ? (
        <div className="empty">
          <b>Nothing split this month.</b>
          Tap an expense and pick who it is split with — equal shares, the payer included.
        </div>
      ) : (
        <>
          <div className="panel">
            <h3 className="sub">Who paid what</h3>
            <p className="muted small" style={{ marginBottom: 8 }}>
              {sharedCount} shared {sharedCount === 1 ? 'expense' : 'expenses'}, {formatMoney(sharedTotal, currency)} in total.
            </p>
            <div className="list">
              {balances.map((b) => (
                <div className="li" key={b.name}>
                  <span className="n">
                    {b.name}
                    {b.name === login && <span className="muted small"> (you)</span>}
                    <small>paid {formatMoney(b.paid, currency)} · share {formatMoney(b.share, currency)}</small>
                  </span>
                  <span className={`v ${b.net > 0 ? 'pos' : b.net < 0 ? 'neg' : ''}`}>
                    {b.net > 0 ? '+' : ''}{formatMoney(b.net, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <h3 className="sub">Settle up</h3>
            {settlements.length === 0 ? (
              <p className="muted">All square — nobody owes anything.</p>
            ) : (
              settlements.map((s, i) => (
                <div className="settle" key={i}>
                  <span className="who">{s.from}</span>
                  <span className="arrow">→</span>
                  <span className="who">{s.to}</span>
                  <span className="amt">{formatMoney(s.amount, currency)}</span>
                </div>
              ))
            )}
            <p className="muted small" style={{ marginTop: 10 }}>
              Fewest transfers that clear every balance. Record a settlement as a normal expense in “Other” if you want it in the ledger.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default BalancesView;
