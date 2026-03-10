import { useState } from 'react';
import { useFinancialStore } from './store/financialStore';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import OnboardingWizard from './components/Onboarding/OnboardingWizard';
import UploadZone from './components/Upload/UploadZone';
import ProcessingAnimation from './components/Loading/ProcessingAnimation';
import Dashboard from './components/Dashboard/Dashboard';
import PnLStatement from './components/PnL/PnLStatement';
import BalanceSheetView from './components/BalanceSheet/BalanceSheetView';
import TaxSummaryView from './components/TaxSummary/TaxSummaryView';
import TransactionList from './components/Transactions/TransactionList';
import AdjustmentsPanel from './components/Transactions/AdjustmentsPanel';

export default function App() {
  const { step, setStep, processingStages, setDrilldown } = useFinancialStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleProcessingComplete = () => {
    setStep('dashboard');
  };

  if (step === 'onboarding') return <OnboardingWizard />;
  if (step === 'upload') return <UploadZone />;
  if (step === 'processing') {
    return (
      <ProcessingAnimation
        stages={processingStages}
        onComplete={handleProcessingComplete}
      />
    );
  }

  // Dashboard view
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto">
          {/* Mobile tab bar */}
          <div className="lg:hidden border-b border-slate-800 bg-slate-900 px-4 py-2 flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'pnl', label: 'P&L' },
              { id: 'balance-sheet', label: 'Balance Sheet' },
              { id: 'tax-summary', label: 'Tax Summary' },
              { id: 'transactions', label: 'Transactions' },
              { id: 'adjustments', label: 'Adjustments' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'dashboard' && (
            <Dashboard
              onDrilldown={(f) => { setDrilldown(f); setActiveTab('transactions'); }}
            />
          )}
          {activeTab === 'pnl' && <PnLStatement />}
          {activeTab === 'balance-sheet' && <BalanceSheetView />}
          {activeTab === 'tax-summary' && <TaxSummaryView />}
          {activeTab === 'transactions' && <TransactionList />}
          {activeTab === 'adjustments' && <AdjustmentsPanel />}
        </main>
      </div>
    </div>
  );
}
