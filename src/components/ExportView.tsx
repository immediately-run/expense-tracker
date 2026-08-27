import { useEffect, useMemo, useRef, useState } from 'react';
import { toCsv } from '../lib/csv';
import type { Ledger } from '../hooks/useLedger';
import Icon from './Icon';
import MonthPicker from './MonthPicker';

interface Props {
  ledger: Ledger;
}

function ExportView({ ledger }: Props) {
  const { txs, month, setMonth } = ledger;
  const csv = useMemo(() => toCsv(txs), [txs]);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // A blob URL for the download link; revoked when the CSV changes.
  const url = useMemo(() => {
    try {
      return URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    } catch {
      return null;
    }
  }, [csv]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(csv);
      setCopied('ok');
    } catch {
      areaRef.current?.focus();
      areaRef.current?.select();
      setCopied('fail');
    }
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div className="export">
      <MonthPicker month={month} onChange={setMonth} />
      <p className="muted">
        {txs.length} {txs.length === 1 ? 'row' : 'rows'} · columns: date, amount, currency, category, note, paid by, split with, id.
      </p>
      <div className="actions">
        <a className={`btn btn-primary ${url ? '' : 'disabled'}`} href={url ?? '#'} download={`expenses-${month}.csv`} aria-disabled={!url}>
          <Icon name="download" size={16} />
          Download CSV
        </a>
        <button type="button" className="btn btn-ghost" onClick={copy}>
          <Icon name={copied === 'ok' ? 'check' : 'copy'} size={16} />
          {copied === 'ok' ? 'Copied' : 'Copy to clipboard'}
        </button>
      </div>
      <p className="muted small">
        Downloads can be blocked inside the immediately.run sandbox. If nothing happens, use copy — or select the text below and copy it by hand.
        {copied === 'fail' && ' Clipboard access was refused; the text is selected for you.'}
      </p>
      <textarea ref={areaRef} className="textarea" readOnly value={csv} aria-label="CSV export" onFocus={(e) => e.target.select()} />
    </div>
  );
}

export default ExportView;
