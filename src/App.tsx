// Root component — immediately.run renders the default export of THIS file.
// Global CSS is imported here (not in main.tsx) because immediately.run's
// runtime never loads main.tsx; anything the rendered tree needs must be
// reachable from App.tsx.
import './index.css';
import './App.css';
import { useState } from 'react';
import { useLedger } from './hooks/useLedger';
import type { Transaction } from './lib/types';
import BalancesView from './components/BalancesView';
import ExportView from './components/ExportView';
import LedgerView from './components/LedgerView';
import OverviewView from './components/OverviewView';
import SettingsDrawer from './components/SettingsDrawer';
import TabBar from './components/TabBar';
import type { Tab } from './components/TabBar';
import Toast from './components/Toast';
import TopBar from './components/TopBar';
import TxSheet from './components/TxSheet';

function App() {
  const ledger = useLedger();
  const [tab, setTab] = useState<Tab>('ledger');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const openSettings = () => setSettingsOpen(true);

  return (
    <div className="app">
      <TopBar mode={ledger.mode} householdName={ledger.householdName} readOnly={ledger.readOnly} onOpenSettings={openSettings} />
      <TabBar active={tab} onChange={setTab} />
      <main className="page">
        {ledger.bootError ? (
          <div className="boot">
            <b>Could not open the ledger.</b>
            <div className="err">{ledger.bootError}</div>
          </div>
        ) : !ledger.ready ? (
          <div className="boot">Opening your ledger…</div>
        ) : tab === 'ledger' ? (
          <LedgerView ledger={ledger} onOpenTx={setEditing} />
        ) : tab === 'overview' ? (
          <OverviewView ledger={ledger} />
        ) : tab === 'balances' ? (
          <BalancesView ledger={ledger} onOpenSettings={openSettings} />
        ) : (
          <ExportView ledger={ledger} />
        )}
      </main>
      {editing && (
        <TxSheet
          key={editing.id}
          tx={editing}
          categories={ledger.categories}
          people={ledger.people}
          readOnly={ledger.readOnly}
          onSave={(patch) => ledger.updateTx(editing, patch)}
          onDelete={() => ledger.removeTx(editing)}
          onClose={() => setEditing(null)}
        />
      )}
      {settingsOpen && <SettingsDrawer ledger={ledger} onClose={() => setSettingsOpen(false)} />}
      {ledger.notice && <Toast text={ledger.notice} onClose={ledger.dismissNotice} />}
    </div>
  );
}

export default App;
