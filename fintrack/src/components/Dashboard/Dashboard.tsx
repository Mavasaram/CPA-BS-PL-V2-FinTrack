import { TrendingUp, TrendingDown, DollarSign, BarChart3, Scale, FileText, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useFinancialStore } from '../../store/financialStore';
import type { DrilldownFilter } from '../../types';

const DRILLDOWN_CONFIGS: Record<string, DrilldownFilter> = {
  revenue: {
    label: 'Total Revenue',
    categories: ['Revenue', 'Other Income'],
  },
  netIncome: {
    label: 'Net Income',
    categories: [
      'Revenue', 'Other Income', 'Interest Income', 'Interest Expense',
      'COGS', 'Salaries & Wages', 'Rent/Lease', 'Utilities', 'Insurance',
      'Marketing & Advertising', 'Professional Services', 'Office & Supplies',
      'Equipment & Maintenance', 'Bank Fees', 'Other Expense', 'Uncategorized',
    ],
  },
  assets: {
    label: 'Total Assets',
    categories: null,
  },
  taxLiability: {
    label: 'Est. Tax Liability',
    categories: ['Revenue', 'Other Income', 'Interest Income'],
  },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtFull(n: number) {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n < 0 ? `($${s})` : `$${s}`;
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
  onClick?: () => void;
}

function KpiCard({ label, value, sub, icon, trend, color, onClick }: KpiCardProps) {
  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden transition-colors
        ${onClick ? 'cursor-pointer hover:border-slate-600 hover:bg-slate-800/50 group' : ''}`}
      onClick={onClick}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 ${color}`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} bg-opacity-20`}>
          {icon}
        </div>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-slate-400 text-sm">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      {onClick && (
        <ExternalLink className="absolute bottom-3 right-3 w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-medium">{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

interface DashboardProps {
  onDrilldown: (f: DrilldownFilter) => void;
}

export default function Dashboard({ onDrilldown }: DashboardProps) {
  const { pnl, balanceSheet, taxSummary, transactions, businessInfo } = useFinancialStore();

  if (!pnl || !balanceSheet || !taxSummary || !businessInfo) return null;

  const monthlyData = MONTHS.map((month, i) => ({
    month,
    Revenue: pnl.monthlyRevenue[i],
    Expenses: pnl.monthlyExpenses[i],
    'Net Income': pnl.monthlyNetIncome[i],
  }));

  const categoryData = [
    { name: 'Salaries', value: pnl.operatingExpenses.salaries },
    { name: 'COGS', value: pnl.cogs.total },
    { name: 'Rent', value: pnl.operatingExpenses.rent },
    { name: 'Marketing', value: pnl.operatingExpenses.marketing },
    { name: 'Prof. Svcs', value: pnl.operatingExpenses.professionalServices },
    { name: 'Other', value: pnl.operatingExpenses.other + pnl.operatingExpenses.utilities + pnl.operatingExpenses.insurance },
  ].sort((a, b) => b.value - a.value);

  const flaggedCount = transactions.filter(t => t.confidence < 70 || t.flagged).length;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Financial Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">
          {businessInfo.name} · Tax Year {businessInfo.taxYear} · {businessInfo.structure} · Accrual Basis
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={fmt(pnl.revenue.total)}
          sub={`Gross margin: ${pnl.grossMargin.toFixed(1)}%`}
          icon={<DollarSign className="w-5 h-5 text-blue-400" />}
          color="bg-blue-500"
          trend="up"
          onClick={() => onDrilldown(DRILLDOWN_CONFIGS.revenue)}
        />
        <KpiCard
          label="Net Income"
          value={fmt(pnl.netIncomeAfterTax)}
          sub={`Net margin: ${pnl.netMargin.toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          color="bg-emerald-500"
          trend={pnl.netIncomeAfterTax > 0 ? 'up' : 'down'}
          onClick={() => onDrilldown(DRILLDOWN_CONFIGS.netIncome)}
        />
        <KpiCard
          label="Total Assets"
          value={fmt(balanceSheet.assets.total)}
          sub={`Working capital: ${fmt(balanceSheet.workingCapital)}`}
          icon={<Scale className="w-5 h-5 text-violet-400" />}
          color="bg-violet-500"
          onClick={() => onDrilldown(DRILLDOWN_CONFIGS.assets)}
        />
        <KpiCard
          label="Est. Tax Liability"
          value={fmt(taxSummary.estimatedAnnualTax)}
          sub={`${taxSummary.estimatedTaxRate.toFixed(0)}% effective rate`}
          icon={<FileText className="w-5 h-5 text-amber-400" />}
          color="bg-amber-500"
          trend="neutral"
          onClick={() => onDrilldown(DRILLDOWN_CONFIGS.taxLiability)}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expenses trend */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">12-Month Revenue & Expense Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#expGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly net income bars */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Monthly Net Income</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="Net Income"
              radius={[4, 4, 0, 0]}
              fill="#10b981"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key ratios + flags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liquidity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Liquidity Ratios</h3>
          <div className="space-y-3">
            {[
              { label: 'Current Ratio', value: balanceSheet.currentRatio.toFixed(2), good: balanceSheet.currentRatio >= 1.5, bench: '> 1.5' },
              { label: 'Quick Ratio', value: balanceSheet.quickRatio.toFixed(2), good: balanceSheet.quickRatio >= 1.0, bench: '> 1.0' },
              { label: 'Debt-to-Equity', value: balanceSheet.debtToEquity.toFixed(2), good: balanceSheet.debtToEquity <= 2.0, bench: '< 2.0' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div>
                  <div className="text-slate-300 text-sm">{r.label}</div>
                  <div className="text-slate-500 text-xs">Benchmark: {r.bench}</div>
                </div>
                <div className={`text-lg font-bold ${r.good ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {r.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* P&L summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">P&L at a Glance</h3>
          <div className="space-y-2">
            {[
              { label: 'Total Revenue', value: pnl.revenue.total, accent: 'text-blue-400' },
              { label: 'Gross Profit', value: pnl.grossProfit, accent: 'text-slate-300' },
              { label: 'Operating Income', value: pnl.operatingIncome, accent: 'text-slate-300' },
              { label: 'Net Income (After Tax)', value: pnl.netIncomeAfterTax, accent: pnl.netIncomeAfterTax >= 0 ? 'text-emerald-400' : 'text-red-400' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-400 text-sm">{row.label}</span>
                <span className={`font-semibold text-sm ${row.accent}`}>{fmtFull(row.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Review Items</h3>
          <div className="space-y-3">
            {flaggedCount > 0 && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-amber-300 text-sm font-medium">{flaggedCount} Low-Confidence Transactions</div>
                  <div className="text-amber-400/70 text-xs mt-0.5">Review in Transactions tab</div>
                </div>
              </div>
            )}
            {balanceSheet.workingCapital < 0 && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-red-300 text-sm font-medium">Negative Working Capital</div>
                  <div className="text-red-400/70 text-xs mt-0.5">{fmtFull(balanceSheet.workingCapital)}</div>
                </div>
              </div>
            )}
            {taxSummary.estimatedUnderpayment > 0 && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-amber-300 text-sm font-medium">Estimated Tax Underpayment</div>
                  <div className="text-amber-400/70 text-xs mt-0.5">{fmtFull(taxSummary.estimatedUnderpayment)} owed</div>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <BarChart3 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-blue-300 text-sm font-medium">{transactions.length} Transactions Analyzed</div>
                <div className="text-blue-400/70 text-xs mt-0.5">Across {businessInfo.taxYear} fiscal year</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
