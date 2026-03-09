import { Download, Scale } from 'lucide-react';
import { useFinancialStore } from '../../store/financialStore';
import { exportBalanceSheetPDF } from '../../utils/pdfExport';

function fmt(n: number) {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n < 0 ? `($${s})` : `$${s}`;
}

interface RowProps {
  label?: string;
  value?: number;
  isTotal?: boolean;
  isHeader?: boolean;
  indent?: number;
  highlight?: 'positive' | 'negative';
  separator?: boolean;
}

function Row({ label, value, isTotal, isHeader, indent = 0, highlight, separator }: RowProps) {
  if (separator) return <tr><td colSpan={2} className="py-1"><div className="border-b border-slate-800" /></td></tr>;

  const labelClass = isHeader
    ? 'text-blue-400 font-bold text-xs uppercase tracking-wider py-2'
    : isTotal
    ? 'text-white font-bold'
    : 'text-slate-400';

  const rowBg = isTotal ? 'bg-blue-500/10' : '';

  const valueColor = highlight === 'positive' ? 'text-emerald-400 font-bold' :
    highlight === 'negative' ? 'text-red-400 font-bold' :
    isTotal ? 'text-white font-bold' :
    'text-slate-200';

  return (
    <tr className={`${rowBg}`}>
      <td className={`py-2 pr-4 ${labelClass}`} style={{ paddingLeft: `${(indent + 1) * 12}px` }}>
        {label}
      </td>
      <td className={`py-2 text-right font-mono text-sm w-36 ${valueColor}`}>
        {value !== undefined ? fmt(value) : ''}
      </td>
    </tr>
  );
}

function RatioCard({ label, value, benchmark, isGood }: { label: string; value: string; benchmark: string; isGood: boolean }) {
  return (
    <div className={`bg-slate-800/60 rounded-xl p-4 border ${isGood ? 'border-emerald-500/20' : 'border-amber-500/20'}`}>
      <div className={`text-2xl font-bold mb-1 ${isGood ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</div>
      <div className="text-slate-300 text-sm font-medium">{label}</div>
      <div className="text-slate-500 text-xs mt-0.5">Benchmark: {benchmark}</div>
      <div className={`text-xs mt-2 font-medium ${isGood ? 'text-emerald-400' : 'text-amber-400'}`}>
        {isGood ? '✓ Healthy' : '⚠ Below benchmark'}
      </div>
    </div>
  );
}

export default function BalanceSheetView() {
  const { balanceSheet, businessInfo } = useFinancialStore();
  if (!balanceSheet || !businessInfo) return null;

  const bs = balanceSheet;
  const isBalanced = Math.abs(bs.assets.total - bs.totalLiabilitiesAndEquity) < 1;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-violet-400" />
            Balance Sheet
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {businessInfo.name} · As of December 31, {businessInfo.taxYear} · Accrual Basis
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isBalanced ? (
            <span className="text-emerald-400 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              ✓ Balanced
            </span>
          ) : (
            <span className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1">
              ⚠ Out of Balance
            </span>
          )}
          <button
            onClick={() => exportBalanceSheetPDF(bs, businessInfo)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Two-column layout: Assets | Liabilities + Equity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ASSETS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-blue-600/20 border-b border-slate-700 px-5 py-3">
            <span className="text-blue-300 font-bold text-sm uppercase tracking-wide">Assets</span>
          </div>
          <div className="px-5">
            <table className="w-full">
              <tbody>
                <Row label="CURRENT ASSETS" isHeader />
                <Row label="Cash & Cash Equivalents" value={bs.assets.current.cash} indent={1} />
                <Row label="Accounts Receivable" value={bs.assets.current.accountsReceivable} indent={1} />
                <Row label="Inventory" value={bs.assets.current.inventory} indent={1} />
                <Row label="Prepaid Expenses" value={bs.assets.current.prepaidExpenses} indent={1} />
                <Row label="TOTAL CURRENT ASSETS" value={bs.assets.current.total} isTotal />
                <Row separator />

                <Row label="FIXED ASSETS" isHeader />
                <Row label="Property, Plant & Equipment" value={bs.assets.fixed.propertyPlantEquipment} indent={1} />
                <Row label="Less: Accumulated Depreciation" value={-bs.assets.fixed.accumulatedDepreciation} indent={1} />
                <Row label="NET FIXED ASSETS" value={bs.assets.fixed.net} isTotal />
                <Row separator />

                <Row label="OTHER ASSETS" isHeader />
                <Row label="Security Deposits" value={bs.assets.other.securityDeposits} indent={1} />
                <Row separator />

                <Row label="TOTAL ASSETS" value={bs.assets.total} isTotal highlight="positive" />
              </tbody>
            </table>
          </div>
        </div>

        {/* LIABILITIES + EQUITY */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-violet-600/20 border-b border-slate-700 px-5 py-3">
            <span className="text-violet-300 font-bold text-sm uppercase tracking-wide">Liabilities & Equity</span>
          </div>
          <div className="px-5">
            <table className="w-full">
              <tbody>
                <Row label="CURRENT LIABILITIES" isHeader />
                <Row label="Accounts Payable" value={bs.liabilities.current.accountsPayable} indent={1} />
                <Row label="Credit Card Payable" value={bs.liabilities.current.creditCardPayable} indent={1} />
                <Row label="Sales Tax Payable" value={bs.liabilities.current.salesTaxPayable} indent={1} />
                <Row label="Current Portion of Debt" value={bs.liabilities.current.currentDebt} indent={1} />
                <Row label="Accrued Expenses" value={bs.liabilities.current.accruedExpenses} indent={1} />
                <Row label="TOTAL CURRENT LIABILITIES" value={bs.liabilities.current.total} isTotal />
                <Row separator />

                <Row label="LONG-TERM LIABILITIES" isHeader />
                <Row label="Long-Term Debt" value={bs.liabilities.longTerm.longTermDebt} indent={1} />
                <Row label="TOTAL LIABILITIES" value={bs.liabilities.total} isTotal />
                <Row separator />

                <Row label="EQUITY" isHeader />
                <Row label="Owner/Member Capital" value={bs.equity.ownerCapital} indent={1} />
                <Row label="Retained Earnings (Prior Years)" value={bs.equity.retainedEarnings} indent={1} />
                <Row label="Current Year Net Income" value={bs.equity.currentYearIncome} indent={1} />
                <Row label="TOTAL EQUITY" value={bs.equity.total} isTotal />
                <Row separator />

                <Row label="TOTAL LIABILITIES + EQUITY" value={bs.totalLiabilitiesAndEquity} isTotal highlight="positive" />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ratios */}
      <div>
        <h3 className="text-white font-semibold mb-3">Key Financial Ratios</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <RatioCard label="Current Ratio" value={bs.currentRatio.toFixed(2)} benchmark="> 1.5" isGood={bs.currentRatio >= 1.5} />
          <RatioCard label="Quick Ratio" value={bs.quickRatio.toFixed(2)} benchmark="> 1.0" isGood={bs.quickRatio >= 1.0} />
          <RatioCard label="Debt-to-Equity" value={bs.debtToEquity.toFixed(2)} benchmark="< 2.0" isGood={bs.debtToEquity <= 2.0} />
          <RatioCard
            label="Working Capital"
            value={fmt(bs.workingCapital)}
            benchmark="Positive"
            isGood={bs.workingCapital > 0}
          />
        </div>
      </div>
    </div>
  );
}
