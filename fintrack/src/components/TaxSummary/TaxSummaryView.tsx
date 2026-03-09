import { Download, FileText, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { useFinancialStore } from '../../store/financialStore';
import { exportTaxSummaryPDF } from '../../utils/pdfExport';

function fmt(n: number) {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n < 0 ? `($${s})` : `$${s}`;
}

export default function TaxSummaryView() {
  const { taxSummary, pnl, balanceSheet, businessInfo, varianceAnalysis } = useFinancialStore();
  if (!taxSummary || !pnl || !balanceSheet || !businessInfo) return null;

  const handleExport = () => {
    exportTaxSummaryPDF(taxSummary, pnl, balanceSheet, businessInfo, varianceAnalysis);
  };

  const structureNote =
    businessInfo.structure === 'LLC' || businessInfo.structure === 'S-Corp' || businessInfo.structure === 'Partnership'
      ? { title: 'Pass-Through Entity', body: `Income flows to owner's personal tax return. Estimated quarterly payments required if estimated tax exceeds $1,000.` }
      : businessInfo.structure === 'C-Corp'
      ? { title: 'Corporate Entity (C-Corp)', body: `Subject to 21% federal corporate income tax. Distributions to shareholders may trigger additional tax.` }
      : { title: 'Sole Proprietorship', body: `Income reported on Schedule C (Form 1040). Self-employment tax applies to all net income. Home office deduction may apply.` };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-400" />
            Tax Reporting Summary
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {businessInfo.name} · Tax Year {businessInfo.taxYear} · {businessInfo.structure}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Quick reference metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(pnl.revenue.total), color: 'text-blue-400' },
          { label: 'Total Deductions', value: fmt(taxSummary.totalDeductions), color: 'text-slate-300' },
          { label: 'Taxable Income', value: fmt(taxSummary.taxableIncome), color: taxSummary.taxableIncome > 0 ? 'text-amber-400' : 'text-emerald-400' },
          { label: 'Est. Tax Liability', value: fmt(taxSummary.estimatedAnnualTax), color: 'text-red-400' },
        ].map(m => (
          <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`text-2xl font-bold mb-1 ${m.color}`}>{m.value}</div>
            <div className="text-slate-400 text-sm">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deduction Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-emerald-600/20 border-b border-slate-700 px-5 py-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 font-bold text-sm">Deduction Summary</span>
          </div>
          <div className="p-5 space-y-2">
            {[
              { label: 'Cost of Goods Sold', value: taxSummary.deductionBreakdown.cogs },
              { label: 'Salaries & Wages', value: taxSummary.deductionBreakdown.salaries },
              { label: 'Rent/Lease Payments', value: taxSummary.deductionBreakdown.rent },
              { label: 'Utilities & Occupancy', value: taxSummary.deductionBreakdown.utilities },
              { label: 'Insurance Premiums', value: taxSummary.deductionBreakdown.insurance },
              { label: 'Professional Services', value: taxSummary.deductionBreakdown.professionalServices },
              { label: 'Depreciation', value: taxSummary.deductionBreakdown.depreciation },
              { label: 'Interest Expense', value: taxSummary.deductionBreakdown.interestExpense },
              { label: 'Other Expenses', value: taxSummary.deductionBreakdown.other },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  <span className="text-slate-400 text-sm">{item.label}</span>
                </div>
                <span className="text-slate-200 font-mono text-sm">{fmt(item.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 bg-emerald-500/10 rounded-lg px-3 mt-2">
              <span className="text-emerald-300 font-bold text-sm">TOTAL DEDUCTIONS</span>
              <span className="text-emerald-300 font-bold font-mono">{fmt(taxSummary.totalDeductions)}</span>
            </div>
          </div>
        </div>

        {/* Tax Calculation + Estimated Payments */}
        <div className="space-y-4">
          {/* Tax calculation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Taxable Income Calculation
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Gross Revenue', value: pnl.revenue.total, indent: false },
                { label: 'Less: Cost of Goods Sold', value: -pnl.cogs.total, indent: true },
                { label: 'Gross Profit', value: pnl.grossProfit, indent: false, bold: true },
                { label: 'Less: Operating Deductions', value: -pnl.operatingExpenses.total, indent: true },
                { label: 'TAXABLE INCOME', value: taxSummary.taxableIncome, indent: false, highlight: true },
              ].map(row => (
                <div key={row.label} className={`flex items-center justify-between py-1.5 ${row.highlight ? 'bg-amber-500/10 rounded-lg px-3' : 'border-b border-slate-800/50 last:border-0'}`}>
                  <span className={`text-sm ${row.highlight ? 'text-amber-300 font-bold' : row.bold ? 'text-white font-semibold' : row.indent ? 'text-slate-500 pl-4' : 'text-slate-400'}`}>
                    {row.label}
                  </span>
                  <span className={`font-mono text-sm ${row.highlight ? 'text-amber-300 font-bold' : row.bold ? 'text-white font-semibold' : 'text-slate-300'}`}>
                    {fmt(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated payments */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Estimated Tax Payments</h3>
            <div className="space-y-3">
              {[
                { label: 'Effective Tax Rate', value: `${taxSummary.estimatedTaxRate.toFixed(0)}%` },
                { label: 'Estimated Annual Tax', value: fmt(taxSummary.estimatedAnnualTax) },
                { label: 'Quarterly Payment', value: fmt(taxSummary.quarterlyPayment) },
                { label: 'Payments Made YTD', value: fmt(taxSummary.paymentsMade) },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
                  <span className="text-slate-400 text-sm">{item.label}</span>
                  <span className="text-slate-200 font-mono text-sm">{item.value}</span>
                </div>
              ))}
              <div className={`flex items-center justify-between py-2 rounded-lg px-3 ${taxSummary.estimatedUnderpayment > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                <span className={`font-bold text-sm ${taxSummary.estimatedUnderpayment > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                  {taxSummary.estimatedUnderpayment > 0 ? 'Estimated Underpayment' : 'Estimated Overpayment'}
                </span>
                <span className={`font-bold font-mono text-sm ${taxSummary.estimatedUnderpayment > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                  {fmt(Math.abs(taxSummary.estimatedUnderpayment))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Variance Analysis */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="border-b border-slate-700 px-5 py-3">
          <h3 className="text-white font-semibold">Cash vs. Accrual Variance Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/50">
                <th className="text-left text-slate-400 text-xs font-medium py-3 px-5">Line Item</th>
                <th className="text-right text-slate-400 text-xs font-medium py-3 px-4">Cash Basis</th>
                <th className="text-right text-slate-400 text-xs font-medium py-3 px-4">Accrual Basis</th>
                <th className="text-right text-slate-400 text-xs font-medium py-3 px-4">Variance</th>
                <th className="text-left text-slate-400 text-xs font-medium py-3 px-4">Root Cause</th>
              </tr>
            </thead>
            <tbody>
              {varianceAnalysis.map((row, i) => (
                <tr key={i} className={`border-t border-slate-800 ${i === varianceAnalysis.length - 1 ? 'bg-blue-500/5' : ''}`}>
                  <td className={`py-3 px-5 text-sm ${i === varianceAnalysis.length - 1 ? 'text-white font-bold' : 'text-slate-300'}`}>
                    {row.lineItem}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-slate-400">{fmt(row.cashBasis)}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-slate-200">{fmt(row.accrualBasis)}</td>
                  <td className={`py-3 px-4 text-right font-mono text-sm font-semibold ${row.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {row.variance >= 0 ? '+' : ''}{fmt(row.variance)}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 max-w-xs">{row.rootCause}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Business structure + compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Structure implications */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            {structureNote.title}
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">{structureNote.body}</p>
        </div>

        {/* Next steps checklist */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Next Steps for Tax Filing
          </h3>
          <div className="space-y-2">
            {[
              'Reconcile estimated tax payments made vs. calculated liability',
              'Obtain fixed asset depreciation schedule from prior returns',
              'Confirm year-end inventory count and valuation method',
              'Resolve accounts payable and credit card payable with docs',
              'Review and approve all manual adjustments made',
              'Prepare supporting documentation for audit defense',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded border border-slate-600 flex-shrink-0 mt-0.5 flex items-center justify-center">
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </div>
                <span className="text-slate-400 text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <p className="text-amber-300/70 text-xs leading-relaxed">
          <strong className="text-amber-400">⚠ Limitation:</strong> This analysis is based solely on bank statement data provided. Additional adjustments may be required upon review of general ledger entries, fixed asset records, loan agreements, prior year tax returns, and credit card accounts. This report is for planning purposes only and does not constitute professional tax advice.
        </p>
      </div>
    </div>
  );
}
