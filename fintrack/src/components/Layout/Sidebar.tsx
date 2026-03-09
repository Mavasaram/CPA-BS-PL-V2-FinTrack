import { LayoutDashboard, TrendingUp, Scale, FileText, List, Settings2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'pnl', label: 'P&L Statement', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'balance-sheet', label: 'Balance Sheet', icon: <Scale className="w-4 h-4" /> },
  { id: 'tax-summary', label: 'Tax Summary', icon: <FileText className="w-4 h-4" /> },
  { id: 'transactions', label: 'Transactions', icon: <List className="w-4 h-4" /> },
  { id: 'adjustments', label: 'Adjustments', icon: <Settings2 className="w-4 h-4" /> },
];

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: Props) {
  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 py-4 hidden lg:flex flex-col">
      <nav className="space-y-1 px-3">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
              ${activeTab === item.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'}
            `}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
