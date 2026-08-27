import { useEffect } from 'react';
import { currentMonth, daysInMonth, lastMonths, shiftMonth, todayISO } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { byCategory, otherCurrencyTotals, topPayees, totalOf } from '../lib/stats';
import type { Ledger } from '../hooks/useLedger';
import CategoryBars from './CategoryBars';
import MonthPicker from './MonthPicker';
import Sparkline from './Sparkline';

interface Props {
  ledger: Ledger;
}

function OverviewView({ ledger }: Props) {
  const { txs, currency, month, setMonth, cache, ensureMonths, budgets } = ledger;
  const months = lastMonths(6, month);
  const prev = shiftMonth(month, -1);

  useEffect(() => {
    ensureMonths(months);
    // months derives from month; ensureMonths is stable per store/cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, ensureMonths]);

  const total = totalOf(txs, currency);
  const prevTotal = cache[prev] ? totalOf(cache[prev], currency) : null;
  const delta = prevTotal !== null && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
  const elapsed = month === currentMonth() ? Number(todayISO().slice(8, 10)) : daysInMonth(month);
  const perDay = elapsed > 0 ? Math.round(total / elapsed) : 0;
  const cats = byCategory(txs, currency);
  const payees = topPayees(txs, currency, 6);
  const others = otherCurrencyTotals(txs, currency);
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);

  const points = months.map((m) => ({
    month: m,
    total: cache[m] ? totalOf(cache[m], currency) : 0,
    loaded: cache[m] !== undefined,
  }));

  return (
    <div>
      <MonthPicker month={month} onChange={setMonth} />
      <div className="tiles">
        <div className="tile">
          <div className="k">Spent</div>
          <div className="v">{formatMoney(total, currency)}</div>
          {Object.keys(others).length > 0 && (
            <div className="d">+ {Object.entries(others).map(([c, v]) => formatMoney(v, c)).join(', ')}</div>
          )}
          {totalBudget > 0 && Object.keys(others).length === 0 && (
            <div className={`d ${total > totalBudget ? 'up' : ''}`}>of {formatMoney(totalBudget, currency)} budgeted</div>
          )}
        </div>
        <div className="tile">
          <div className="k">vs last month</div>
          <div className="v">{delta === null ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta)}%`}</div>
          <div className={`d ${delta === null ? '' : delta > 0 ? 'up' : 'down'}`}>
            {prevTotal === null ? 'loading…' : `${formatMoney(prevTotal, currency)} before`}
          </div>
        </div>
        <div className="tile">
          <div className="k">Per day</div>
          <div className="v">{formatMoney(perDay, currency)}</div>
          <div className="d">over {elapsed} days</div>
        </div>
        <div className="tile">
          <div className="k">Expenses</div>
          <div className="v">{txs.length}</div>
          <div className="d">{cats.length} categories</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="sub">By category</h3>
        <CategoryBars rows={cats} budgets={budgets} currency={currency} />
        {Object.keys(budgets).length === 0 && (
          <p className="muted small" style={{ marginTop: 10 }}>Set monthly budgets in settings to see progress here.</p>
        )}
      </div>

      <div className="panel">
        <h3 className="sub">Last six months</h3>
        <Sparkline points={points} currency={currency} activeMonth={month} />
      </div>

      <div className="panel">
        <h3 className="sub">Top payees</h3>
        {payees.length === 0 ? (
          <p className="muted">Add a payee or note to your expenses to see who gets your money.</p>
        ) : (
          <div className="list">
            {payees.map((p) => (
              <div className="li" key={p.payee}>
                <span className="n">
                  {p.payee}
                  <small>{p.count} {p.count === 1 ? 'expense' : 'expenses'}</small>
                </span>
                <span className="v">{formatMoney(p.total, currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OverviewView;
