import { useState, useMemo, useRef, useCallback } from 'react';
import { Search, Filter, AlertTriangle, ChevronDown } from 'lucide-react';
import { useFinancialStore } from '../../store/financialStore';
import type { AccountCategory, Transaction } from '../../types';

const CATEGORY_COLORS: Record<string, string> = {
  Revenue: 'bg-blue-500/20 text-blue-300',
  COGS: 'bg-orange-500/20 text-orange-300',
  'Salaries & Wages': 'bg-violet-500/20 text-violet-300',
  'Rent/Lease': 'bg-pink-500/20 text-pink-300',
  Utilities: 'bg-cyan-500/20 text-cyan-300',
  Insurance: 'bg-teal-500/20 text-teal-300',
  'Marketing & Advertising': 'bg-yellow-500/20 text-yellow-300',
  'Professional Services': 'bg-indigo-500/20 text-indigo-300',
  'Office & Supplies': 'bg-slate-500/20 text-slate-300',
  'Equipment & Maintenance': 'bg-amber-500/20 text-amber-300',
  'Bank Fees': 'bg-red-500/20 text-red-300',
  'Interest Income': 'bg-emerald-500/20 text-emerald-300',
  'Interest Expense': 'bg-red-500/20 text-red-300',
  'Owner Distribution': 'bg-slate-500/20 text-slate-400',
  'Tax Payment': 'bg-red-600/20 text-red-400',
  'Loan Payment': 'bg-orange-600/20 text-orange-400',
  Transfer: 'bg-slate-600/20 text-slate-400',
  Uncategorized: 'bg-gray-500/20 text-gray-400',
};

const MONTHS = ['All', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CATEGORIES: AccountCategory[] = [
  'Revenue', 'COGS', 'Salaries & Wages', 'Rent/Lease', 'Utilities', 'Insurance',
  'Marketing & Advertising', 'Professional Services', 'Office & Supplies', 'Equipment & Maintenance',
  'Interest Income', 'Interest Expense', 'Bank Fees', 'Owner Distribution', 'Tax Payment', 'Loan Payment', 'Transfer', 'Uncategorized',
];

// Default column widths in px
const DEFAULT_COL_WIDTHS = [100, 220, 200, 160, 110, 110, 130];
const COL_MIN = 60;

export default function TransactionList() {
  const { transactions, updateTransaction } = useFinancialStore();
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState(0); // 0 = all
  const [categoryFilter, setCategoryFilter] = useState<AccountCategory | 'All'>('All');
  const [showFlagged, setShowFlagged] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  // Resizable columns
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_COL_WIDTHS);
  const resizingCol = useRef<{ index: number; startX: number; startW: number } | null>(null);

  const onResizeStart = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    resizingCol.current = { index, startX: e.clientX, startW: colWidths[index] };

    const onMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return;
      const delta = ev.clientX - resizingCol.current.startX;
      const newW = Math.max(COL_MIN, resizingCol.current.startW + delta);
      setColWidths(prev => prev.map((w, i) => i === resizingCol.current!.index ? newW : w));
    };
    const onUp = () => {
      resizingCol.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [colWidths]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (monthFilter > 0 && t.month !== monthFilter) return false;
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (showFlagged && t.confidence >= 70 && !t.flagged) return false;
      return true;
    });
  }, [transactions, search, monthFilter, categoryFilter, showFlagged]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleCategoryChange = (t: Transaction, cat: AccountCategory) => {
    updateTransaction(t.id, { category: cat, confidence: 100 });
    setEditingId(null);
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Transactions</h2>
        <p className="text-slate-400 text-sm mt-1">{transactions.length} total transactions · {filtered.length} shown</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={monthFilter}
          onChange={e => { setMonthFilter(parseInt(e.target.value)); setPage(1); }}
        >
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>

        <select
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value as AccountCategory | 'All'); setPage(1); }}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          onClick={() => { setShowFlagged(!showFlagged); setPage(1); }}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-colors ${showFlagged ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
        >
          <Filter className="w-4 h-4" />
          Low Confidence
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed" style={{ minWidth: colWidths.reduce((a, b) => a + b, 0) }}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-700">
                {(['Date', 'Bank Description', 'Normalized Description', 'Category', 'Amount', 'Confidence', 'Source'] as const).map((label, i) => (
                  <th
                    key={label}
                    className="text-slate-400 text-xs font-medium py-3 px-4 relative select-none overflow-hidden"
                    style={{ textAlign: label === 'Amount' ? 'right' : label === 'Confidence' ? 'center' : 'left' }}
                  >
                    {label}
                    <span
                      onMouseDown={e => onResizeStart(e, i)}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group"
                    >
                      <span className="w-px h-4 bg-slate-600 group-hover:bg-blue-500 transition-colors" />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(t => (
                <tr key={t.id} className={`border-t border-slate-800 hover:bg-slate-800/30 transition-colors ${t.confidence < 70 || t.flagged ? 'bg-amber-500/5' : ''}`}>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="text-slate-400 text-sm font-mono">{t.date}</span>
                  </td>
                  {/* Raw bank description */}
                  <td className="py-2.5 px-4 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      {(t.confidence < 70 || t.flagged) && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      )}
                      <span
                        className="text-slate-500 text-xs font-mono truncate block"
                        title={t.bankDescription}
                      >{t.bankDescription}</span>
                    </div>
                  </td>
                  {/* Normalized description */}
                  <td className="py-2.5 px-4 overflow-hidden">
                    <span className="text-slate-200 text-sm truncate block" title={t.description}>{t.description}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    {editingId === t.id ? (
                      <select
                        autoFocus
                        className="bg-slate-700 border border-blue-500 text-white rounded text-xs px-2 py-1"
                        value={t.category}
                        onChange={e => handleCategoryChange(t, e.target.value as AccountCategory)}
                        onBlur={() => setEditingId(null)}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(t.id)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS[t.category] ?? 'bg-slate-500/20 text-slate-400'} hover:opacity-80 transition-opacity`}
                      >
                        {t.category}
                        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={`text-sm font-mono font-semibold ${t.amount >= 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {t.amount >= 0 ? '+' : ''}
                      ${Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${t.confidence >= 85 ? 'bg-emerald-500' : t.confidence >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${t.confidence}%` }}
                        />
                      </div>
                      <span className={`text-xs font-mono ${t.confidence >= 85 ? 'text-emerald-400' : t.confidence >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                        {t.confidence}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 overflow-hidden">
                    <span className="text-slate-500 text-xs truncate block">{t.sourceFile}</span>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">No transactions match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-800 px-4 py-3 flex items-center justify-between">
            <span className="text-slate-500 text-xs">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-slate-500 text-xs">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
