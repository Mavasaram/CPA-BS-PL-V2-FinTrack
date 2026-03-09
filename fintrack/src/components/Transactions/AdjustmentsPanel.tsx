import { useState } from 'react';
import { Plus, Trash2, Settings2, RefreshCw } from 'lucide-react';
import { useFinancialStore } from '../../store/financialStore';
import type { AccrualAdjustment } from '../../types';

const ADJUSTMENT_TYPES: AccrualAdjustment['type'][] = [
  'AccountsReceivable', 'AccountsPayable', 'PrepaidExpense', 'AccruedExpense', 'DeferredRevenue', 'Inventory',
];

const TYPE_LABELS: Record<AccrualAdjustment['type'], string> = {
  AccountsReceivable: 'Accounts Receivable',
  AccountsPayable: 'Accounts Payable',
  PrepaidExpense: 'Prepaid Expense',
  AccruedExpense: 'Accrued Expense',
  DeferredRevenue: 'Deferred Revenue',
  Inventory: 'Inventory',
};

const TYPE_DESCRIPTIONS: Record<AccrualAdjustment['type'], string> = {
  AccountsReceivable: 'Revenue earned but not yet collected (increases accrual revenue)',
  AccountsPayable: 'Expenses incurred but not yet paid (increases accrual COGS/expenses)',
  PrepaidExpense: 'Prepaid costs that will be expensed over time',
  AccruedExpense: 'Expenses incurred but not yet recorded in the bank',
  DeferredRevenue: 'Cash received for future services (reduces current revenue)',
  Inventory: 'Ending inventory on hand (reduces COGS under accrual)',
};

export default function AdjustmentsPanel() {
  const { adjustments, addAdjustment, removeAdjustment, computeFinancials } = useFinancialStore();

  const [newAdj, setNewAdj] = useState<Partial<AccrualAdjustment>>({
    type: 'AccountsReceivable',
    amount: 0,
    description: '',
  });

  const handleAdd = () => {
    if (!newAdj.description?.trim() || !newAdj.amount) return;
    addAdjustment({
      id: crypto.randomUUID(),
      type: newAdj.type!,
      description: newAdj.description!,
      amount: newAdj.amount!,
      category: 'Revenue',
    });
    setNewAdj({ type: 'AccountsReceivable', amount: 0, description: '' });
    computeFinancials();
  };

  const handleRemove = (id: string) => {
    removeAdjustment(id);
    computeFinancials();
  };

  const inputCls = 'bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-slate-400" />
          Accrual Adjustments
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Add accounts receivable, payable, prepaid, and inventory adjustments to convert from cash to accrual basis.
        </p>
      </div>

      {/* Existing adjustments */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-slate-800/50 border-b border-slate-700 px-5 py-3">
          <span className="text-slate-300 font-semibold text-sm">Current Adjustments ({adjustments.length})</span>
        </div>
        <div className="divide-y divide-slate-800">
          {adjustments.map(adj => (
            <div key={adj.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                    {TYPE_LABELS[adj.type]}
                  </span>
                </div>
                <div className="text-slate-300 text-sm truncate">{adj.description}</div>
                <div className="text-slate-500 text-xs mt-0.5">{TYPE_DESCRIPTIONS[adj.type]}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-white font-semibold font-mono">
                  ${adj.amount.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => handleRemove(adj.id)}
                className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {adjustments.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-sm">No adjustments added yet.</div>
          )}
        </div>
      </div>

      {/* Add new adjustment */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          Add Adjustment
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1.5 font-medium">Adjustment Type</label>
            <select
              className={inputCls + ' w-full'}
              value={newAdj.type}
              onChange={e => setNewAdj(a => ({ ...a, type: e.target.value as AccrualAdjustment['type'] }))}
            >
              {ADJUSTMENT_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            {newAdj.type && (
              <p className="text-slate-500 text-xs mt-1">{TYPE_DESCRIPTIONS[newAdj.type]}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5 font-medium">Amount ($)</label>
            <input
              type="number"
              placeholder="e.g. 15000"
              className={inputCls + ' w-full'}
              value={newAdj.amount || ''}
              onChange={e => setNewAdj(a => ({ ...a, amount: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-400 text-xs mb-1.5 font-medium">Description</label>
            <input
              type="text"
              placeholder="e.g. Outstanding client invoices as of Dec 31"
              className={inputCls + ' w-full'}
              value={newAdj.description}
              onChange={e => setNewAdj(a => ({ ...a, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleAdd}
            disabled={!newAdj.description?.trim() || !newAdj.amount}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Adjustment
          </button>
          <button
            onClick={computeFinancials}
            className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recalculate Financials
          </button>
        </div>
      </div>

      {/* Reference guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3 text-sm">Adjustment Reference Guide</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ADJUSTMENT_TYPES.map(type => (
            <div key={type} className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-blue-300 text-xs font-semibold mb-1">{TYPE_LABELS[type]}</div>
              <div className="text-slate-500 text-xs">{TYPE_DESCRIPTIONS[type]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
