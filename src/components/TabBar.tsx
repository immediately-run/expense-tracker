import Icon from './Icon';
import type { IconName } from './Icon';

export type Tab = 'ledger' | 'overview' | 'balances' | 'export';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'ledger', label: 'Ledger', icon: 'list' },
  { id: 'overview', label: 'Overview', icon: 'chart' },
  { id: 'balances', label: 'Balances', icon: 'users' },
  { id: 'export', label: 'Export', icon: 'download' },
];

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

function TabBar({ active, onChange }: Props) {
  return (
    <nav className="tabs" aria-label="Screens">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={t.id === active ? 'active' : ''}
          onClick={() => onChange(t.id)}
          aria-current={t.id === active ? 'page' : undefined}
        >
          <Icon name={t.icon} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export default TabBar;
