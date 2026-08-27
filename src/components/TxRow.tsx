import { formatMoney } from '../lib/money';
import type { Transaction } from '../lib/types';

interface Props {
  tx: Transaction;
  currency: string;
  onOpen: (tx: Transaction) => void;
}

function TxRow({ tx, currency, onOpen }: Props) {
  const split = tx.splitWith.length > 0;
  return (
    <button type="button" className="txrow" onClick={() => onOpen(tx)}>
      <span className="catdot" aria-hidden="true" />
      <span className="main">
        <span className="title">{tx.note || tx.category}</span>
        <span className="meta">
          {tx.note ? `${tx.category} · ` : ''}
          {tx.paidBy}
          {split && <span className="split"> · split with {tx.splitWith.join(', ')}</span>}
        </span>
      </span>
      <span className={`amt ${tx.currency !== currency ? 'other' : ''}`}>{formatMoney(tx.amount, tx.currency)}</span>
    </button>
  );
}

export default TxRow;
