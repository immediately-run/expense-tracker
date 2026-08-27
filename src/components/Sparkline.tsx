import { formatCompact, formatMoney } from '../lib/money';
import { shortMonthLabel } from '../lib/dates';

interface Point {
  month: string;
  total: number;
  loaded: boolean;
}

interface Props {
  points: Point[];
  currency: string;
  activeMonth: string;
}

const W = 300;
const H = 80;
const PAD = 8;

/** Six months of totals as one 2px line with an 8px marker on the selected month. */
function Sparkline({ points, currency, activeMonth }: Props) {
  const max = Math.max(1, ...points.map((p) => p.total));
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const x = (i: number) => PAD + i * step;
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const line = points.map((p, i) => `${x(i)},${y(p.total)}`).join(' ');
  const area = `${x(0)},${H - PAD} ${line} ${x(points.length - 1)},${H - PAD}`;
  const activeIdx = points.findIndex((p) => p.month === activeMonth);

  return (
    <div>
      <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Monthly totals, last six months">
        <defs>
          <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent-2)" stopOpacity="0.32" />
            <stop offset="1" stopColor="var(--accent-2)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <polygon points={area} fill="url(#sparkfill)" />
        <polyline points={line} fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <g key={p.month}>
            <title>{`${shortMonthLabel(p.month)}: ${p.loaded ? formatMoney(p.total, currency) : 'loading'}`}</title>
            <rect x={x(i) - step / 2} y="0" width={step || W} height={H} fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(p.total)}
              r={i === activeIdx ? 4.5 : 2.5}
              fill={i === activeIdx ? 'var(--accent)' : 'var(--accent-2)'}
              stroke="var(--panel)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      <div className="sparklabels">
        {points.map((p) => (
          <span key={p.month} className={p.month === activeMonth ? 'now' : ''}>
            {shortMonthLabel(p.month)}
            <br />
            {p.loaded ? formatCompact(p.total, currency) : '…'}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Sparkline;
