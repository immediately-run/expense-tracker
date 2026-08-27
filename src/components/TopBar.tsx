import Icon from './Icon';
import ThemeSwitch from './ThemeSwitch';

interface Props {
  mode: 'private' | 'shared';
  householdName: string | null;
  readOnly: boolean;
  onOpenSettings: () => void;
}

function TopBar({ mode, householdName, readOnly, onOpenSettings }: Props) {
  const shared = mode === 'shared';
  return (
    <header className="topbar">
      <div className="logo">
        <span className="mark" aria-hidden="true" />
        Expenses
      </div>
      <div className="spacer" />
      <button
        type="button"
        className={`storebadge ${shared ? 'shared' : ''}`}
        onClick={onOpenSettings}
        title={shared ? 'Shared household — tap for settings' : 'Private ledger — tap to share'}
      >
        <span className="dot" />
        <span className="name">{shared ? householdName || 'Household' : 'Private'}</span>
        {readOnly && <span className="ro">ro</span>}
      </button>
      <ThemeSwitch />
      <button type="button" className="iconbtn" aria-label="Settings" onClick={onOpenSettings}>
        <Icon name="settings" />
      </button>
    </header>
  );
}

export default TopBar;
