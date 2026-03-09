import { BarChart3, FileText, Download, RefreshCw } from 'lucide-react';
import { useFinancialStore } from '../../store/financialStore';
import { exportPnLPDF, exportBalanceSheetPDF, exportTaxSummaryPDF } from '../../utils/pdfExport';

export default function Header() {
  const { businessInfo, step, pnl, balanceSheet, taxSummary, varianceAnalysis, reset } = useFinancialStore();

  const canExport = step === 'dashboard' && pnl && balanceSheet && taxSummary && businessInfo;

  const handleExportAll = () => {
    if (!canExport) return;
    exportPnLPDF(pnl!, businessInfo!);
    setTimeout(() => exportBalanceSheetPDF(balanceSheet!, businessInfo!), 500);
    setTimeout(() => exportTaxSummaryPDF(taxSummary!, pnl!, balanceSheet!, businessInfo!, varianceAnalysis), 1000);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">FinTrack Pro</div>
            <div className="text-slate-400 text-xs leading-tight">Financial Analysis & Tax Reporting</div>
          </div>
        </div>

        {/* Center: business info */}
        {businessInfo && (
          <div className="hidden md:flex items-center gap-2 bg-slate-800/60 rounded-lg px-4 py-2">
            <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-white text-sm font-medium">{businessInfo.name}</span>
            <span className="text-slate-500 text-sm">·</span>
            <span className="text-slate-400 text-sm">Tax Year {businessInfo.taxYear}</span>
            <span className="text-slate-500 text-sm">·</span>
            <span className="text-blue-400 text-xs font-medium bg-blue-500/10 px-2 py-0.5 rounded">
              {businessInfo.structure}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canExport && (
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
            >
              <Download className="w-4 h-4" />
              Export PDFs
            </button>
          )}
          {step !== 'onboarding' && (
            <button
              onClick={reset}
              className="flex items-center gap-2 text-slate-400 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">New Analysis</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
