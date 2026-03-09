import { Download, TrendingUp } from 'lucide-react';
import { useFinancialStore } from '../../store/financialStore';
import { exportPnLPDF } from '../../utils/pdfExport';

function fmt(n: number, showSign = false) {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (showSign && n < 0) return `($${s})`;
  return n < 0 ? `($${s})` : `$${s}`;
}

interface RowProps {
  label?: string;
  value?: number;
  isTotal?: boolean;
  isHeader?: boolean;
  isSubtotal?: boolean;
  indent?: number;
  pct?: number;
  highlight?: 'positive' | 'negative' | 'neutral';
  separator?: boolean;
}

function Row({ label, value, isTotal, isHeader, isSubtotal, indent = 0, pct, highlight, separator }: RowProps) {
  if (separator) return <tr><td colSpan={3} className="py-1"><div className="border-b border-slate-800" /></td></tr>;

  const labelClass = isHeader
    ? 'text-blue-400 font-bold text-xs uppercase tracking-wider py-2'
    : isTotal
    ? 'text-white font-bold'
    : isSubtotal
    ? 'text-slate-200 font-semibold'
    : 'text-slate-400';

  const rowBg = isTotal ? 'bg-blue-500/10' : isSubtotal ? 'bg-slate-800/30' : '';

  const valueColor = highlight === 'positive' ? 'text-emerald-400' :
    highlight === 'negative' ? 'text-red-400' :
    isTotal ? 'text-white font-bold' :
    'text-slate-200';

  return (
    <tr className={`${rowBg} group`}>
      <td className={`py-2 pr-4 ${labelClass}`} style={{ paddingLeft: `${(indent + 1) * 12}px` }}>
        {label}
      </td>
      <td className="py-2 text-right text-slate-500 text-sm w-24">
        {pct !== undefined ? `${pct.toFixed(1)}%` : ''}
      </td>
      <td className={`py-2 text-right font-mono text-sm w-36 ${valueColor}`}>
        {value !== undefined ? fmt(value) : ''}
      </td>
    </tr>
  );
}

export default function PnLStatement() {
  const { pnl, businessInfo } = useFinancialStore();
  if (!pnl || !businessInfo) return null;

  const rev = pnl.revenue.total;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            Profit & Loss Statement
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {businessInfo.name} · For the Year Ended December 31, {businessInfo.taxYear} · Accrual Basis
          </p>
        </div>
        <button
          onClick={() => exportPnLPDF(pnl, businessInfo)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Statement table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-slate-300 font-semibold text-sm">Account</span>
          <div className="flex gap-8">
            <span className="text-slate-500 text-xs w-24 text-right">% of Rev</span>
            <span className="text-slate-500 text-xs w-36 text-right">Amount</span>
          </div>
        </div>

        <div className="px-6">
          <table className="w-full">
            <tbody>
              {/* REVENUE */}
              <Row label="REVENUE" isHeader />
              <Row label="Product Sales" value={pnl.revenue.productSales} indent={1} pct={rev > 0 ? (pnl.revenue.productSales / rev) * 100 : 0} />
              <Row label="Service Revenue" value={pnl.revenue.serviceRevenue} indent={1} pct={rev > 0 ? (pnl.revenue.serviceRevenue / rev) * 100 : 0} />
              <Row label="Other Income" value={pnl.revenue.otherIncome} indent={1} pct={rev > 0 ? (pnl.revenue.otherIncome / rev) * 100 : 0} />
              <Row label="TOTAL REVENUE" value={pnl.revenue.total} isTotal pct={100} />
              <Row separator />

              {/* COGS */}
              <Row label="COST OF GOODS SOLD" isHeader />
              <Row label="Beginning Inventory" value={pnl.cogs.beginningInventory} indent={1} />
              <Row label="Purchases" value={pnl.cogs.purchases} indent={1} />
              <Row label="Less: Ending Inventory" value={-pnl.cogs.endingInventory} indent={1} />
              <Row label="Direct Labor" value={pnl.cogs.directLabor} indent={1} />
              <Row label="TOTAL COST OF GOODS SOLD" value={pnl.cogs.total} isTotal pct={rev > 0 ? (pnl.cogs.total / rev) * 100 : 0} />
              <Row separator />

              {/* GROSS PROFIT */}
              <Row
                label="GROSS PROFIT"
                value={pnl.grossProfit}
                isTotal
                pct={pnl.grossMargin}
                highlight={pnl.grossProfit >= 0 ? 'positive' : 'negative'}
              />
              <Row separator />

              {/* OPERATING EXPENSES */}
              <Row label="OPERATING EXPENSES" isHeader />
              <Row label="Salaries & Wages" value={pnl.operatingExpenses.salaries} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.salaries / rev) * 100 : 0} />
              <Row label="Rent/Lease" value={pnl.operatingExpenses.rent} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.rent / rev) * 100 : 0} />
              <Row label="Utilities" value={pnl.operatingExpenses.utilities} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.utilities / rev) * 100 : 0} />
              <Row label="Insurance" value={pnl.operatingExpenses.insurance} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.insurance / rev) * 100 : 0} />
              <Row label="Marketing & Advertising" value={pnl.operatingExpenses.marketing} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.marketing / rev) * 100 : 0} />
              <Row label="Professional Services" value={pnl.operatingExpenses.professionalServices} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.professionalServices / rev) * 100 : 0} />
              <Row label="Office & Supplies" value={pnl.operatingExpenses.officeSupplies} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.officeSupplies / rev) * 100 : 0} />
              <Row label="Equipment & Maintenance" value={pnl.operatingExpenses.equipmentMaintenance} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.equipmentMaintenance / rev) * 100 : 0} />
              <Row label="Depreciation" value={pnl.operatingExpenses.depreciation} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.depreciation / rev) * 100 : 0} />
              <Row label="Bank Fees" value={pnl.operatingExpenses.bankFees} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.bankFees / rev) * 100 : 0} />
              <Row label="Other Operating" value={pnl.operatingExpenses.other} indent={1} pct={rev > 0 ? (pnl.operatingExpenses.other / rev) * 100 : 0} />
              <Row label="TOTAL OPERATING EXPENSES" value={pnl.operatingExpenses.total} isTotal pct={rev > 0 ? (pnl.operatingExpenses.total / rev) * 100 : 0} />
              <Row separator />

              {/* OPERATING INCOME */}
              <Row
                label="OPERATING INCOME"
                value={pnl.operatingIncome}
                isTotal
                pct={pnl.operatingMargin}
                highlight={pnl.operatingIncome >= 0 ? 'positive' : 'negative'}
              />
              <Row separator />

              {/* OTHER */}
              <Row label="OTHER INCOME / (EXPENSE)" isHeader />
              <Row label="Interest Income" value={pnl.otherItems.interestIncome} indent={1} />
              <Row label="Interest Expense" value={-pnl.otherItems.interestExpense} indent={1} />
              <Row separator />

              {/* NET INCOME */}
              <Row label="NET INCOME (BEFORE TAX)" value={pnl.netIncomeBeforeTax} isTotal highlight={pnl.netIncomeBeforeTax >= 0 ? 'positive' : 'negative'} />
              <Row label="Tax Provision (25%)" value={-pnl.taxProvision} indent={1} />
              <Row
                label="NET INCOME (AFTER TAX)"
                value={pnl.netIncomeAfterTax}
                isTotal
                pct={pnl.netMargin}
                highlight={pnl.netIncomeAfterTax >= 0 ? 'positive' : 'negative'}
              />
            </tbody>
          </table>
        </div>

        {/* Key metrics footer */}
        <div className="bg-slate-800/40 border-t border-slate-700 px-6 py-4 grid grid-cols-3 gap-4">
          {[
            { label: 'Gross Margin', value: `${pnl.grossMargin.toFixed(1)}%`, good: pnl.grossMargin > 40 },
            { label: 'Operating Margin', value: `${pnl.operatingMargin.toFixed(1)}%`, good: pnl.operatingMargin > 10 },
            { label: 'Net Margin', value: `${pnl.netMargin.toFixed(1)}%`, good: pnl.netMargin > 5 },
          ].map(m => (
            <div key={m.label} className="text-center">
              <div className={`text-xl font-bold ${m.good ? 'text-emerald-400' : 'text-amber-400'}`}>{m.value}</div>
              <div className="text-slate-500 text-xs mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
