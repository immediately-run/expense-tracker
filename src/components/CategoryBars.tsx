import { formatCompact, formatMoney } from '../lib/money';
import type { CategoryTotal } from '../lib/stats';
import type { Budgets } from '../lib/types';

interface Props {
  rows: CategoryTotal[];
  budgets: Budgets;
  currency: string;
}

/**
 * One thin bar per category, single hue (identity is the label, not the colour).
 * A budget draws as a marker; spending past it turns the bar into the status colour.
 */
function CategoryBars({ rows, budgets, currency }: Props) {
  const byCat = new Map(rows.map((r) => [r.category, r]));
  const names = [...new Set([...rows.map((r) => r.category), ...Object.keys(budgets)])];
  const max = Math.max(1, ...names.map((n) => Math.max(byCat.get(n)?.total ?? 0, budgets[n] ?? 0)));
  if (names.length === 0) return <p className="muted">Nothing spent this month yet.</p>;

  return (
    <div className="catbars">
      {names.map((name) => {
        const spent = byCat.get(name)?.total ?? 0;
        const budget = budgets[name];
        const over = budget !== undefined && spent > budget;
        const pct = (spent / max) * 100;
        const bpct = budget !== undefined ? (budget / max) * 100 : null;
        const title = budget !== undefined
          ? `${name}: ${formatMoney(spent, currency)} of ${formatMoney(budget, currency)} budget`
          : `${name}: ${formatMoney(spent, currency)}`;
        return (
          <div className="catbar" key={name}>
            <div className="lbl">
              {name}
              {budget !== undefined && (
                <small className={over ? 'over' : ''}>
                  {over ? `over by ${formatCompact(spent - budget, currency)}` : `${Math.round((spent / budget) * 100)}% of ${formatCompact(budget, currency)}`}
                </small>
              )}
            </div>
            <div>
              <svg viewBox="0 0 100 14" preserveAspectRatio="none" role="img" aria-label={title}>
                <title>{title}</title>
                <rect x="0" y="3" width="100" height="8" rx="2" fill="var(--panel-2)" stroke="var(--line)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
                {spent > 0 && (
                  <rect x="0" y="3" width={Math.max(pct, 0.8)} height="8" rx="2" fill={over ? 'var(--over)' : 'var(--accent-2)'} />
                )}
                {bpct !== null && (
                  <rect x={Math.min(bpct, 99.4)} y="0" width="0.6" height="14" fill="var(--ink)" />
                )}
              </svg>
              <div className={`val ${over ? 'over' : ''}`}>{formatMoney(spent, currency)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CategoryBars;
