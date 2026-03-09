import { useState, useEffect } from 'react';
import { Building2, ChevronRight, DollarSign, MapPin, Hash, Calendar } from 'lucide-react';
import { useFinancialStore } from '../../store/financialStore';
import type { BusinessStructure, BusinessInfo } from '../../types';

const STRUCTURES: BusinessStructure[] = ['LLC', 'S-Corp', 'C-Corp', 'Sole Proprietorship', 'Partnership'];
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const THIS_YEAR = new Date().getFullYear();

// ── Defined OUTSIDE the parent so React never recreates these as new types ──

function inputCls(err?: string) {
  return `w-full bg-slate-800 border ${err ? 'border-red-500' : 'border-slate-700'} text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-500`;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const { setBusinessInfo, setStep } = useFinancialStore();
  const resetStore = useFinancialStore.getState().reset;

  // Always wipe previous client's data when landing on this page
  useEffect(() => { resetStore(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [form, setForm] = useState<Partial<BusinessInfo>>({
    taxYear: THIS_YEAR - 1,
    structure: 'LLC',
    state: 'CA',
    accountingBasis: 'Accrual',
    fiscalYearEnd: '12-31',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = 'Business name is required';
    if (!form.structure) errs.structure = 'Business structure is required';
    if (!form.taxYear) errs.taxYear = 'Tax year is required';
    if (!form.state) errs.state = 'State is required';
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setBusinessInfo(form as BusinessInfo);
    setStep('upload');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-emerald-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-xl shadow-blue-500/30 mb-5">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Financial Analysis &<br />
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Tax Reporting
            </span>
          </h1>
          <p className="text-slate-400 text-base max-w-lg mx-auto">
            Transform your bank statements into GAAP-compliant P&L statements, Balance Sheets,
            and comprehensive tax reporting summaries — automatically.
          </p>
        </div>

        {/* Features strip */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: '📊', text: 'P&L & Balance Sheet' },
            { icon: '🤖', text: 'AI Categorization' },
            { icon: '📋', text: 'Tax Summary PDF' },
          ].map(f => (
            <div key={f.text} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-slate-300 text-xs font-medium">{f.text}</div>
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-semibold text-lg">Business Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Legal Business Name *" error={errors.name}>
                <input
                  type="text"
                  placeholder="e.g. Acme Consulting LLC"
                  className={inputCls(errors.name)}
                  value={form.name ?? ''}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Business Structure *" error={errors.structure}>
              <select
                className={inputCls(errors.structure)}
                value={form.structure}
                onChange={e => setForm(f => ({ ...f, structure: e.target.value as BusinessStructure }))}
              >
                {STRUCTURES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Tax Year *" error={errors.taxYear}>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  className={`${inputCls(errors.taxYear)} pl-9`}
                  value={form.taxYear}
                  onChange={e => setForm(f => ({ ...f, taxYear: parseInt(e.target.value) }))}
                >
                  {[THIS_YEAR - 1, THIS_YEAR - 2, THIS_YEAR - 3].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="State of Operation *" error={errors.state}>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  className={`${inputCls(errors.state)} pl-9`}
                  value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                >
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </Field>

            <Field label="Accounting Basis">
              <select
                className={inputCls()}
                value={form.accountingBasis}
                onChange={e => setForm(f => ({ ...f, accountingBasis: e.target.value as BusinessInfo['accountingBasis'] }))}
              >
                <option value="Accrual">Accrual (GAAP — recommended)</option>
                <option value="Cash">Cash Basis</option>
                <option value="Both">Both (Comparison)</option>
              </select>
            </Field>

            <Field label="EIN (optional)">
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="XX-XXXXXXX"
                  className={`${inputCls()} pl-9`}
                  value={form.ein ?? ''}
                  onChange={e => setForm(f => ({ ...f, ein: e.target.value }))}
                />
              </div>
            </Field>
          </div>

          {/* Structure-specific note */}
          {form.structure && (
            <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-blue-300 text-xs">
                {form.structure === 'LLC' || form.structure === 'S-Corp' || form.structure === 'Partnership'
                  ? `✓ ${form.structure}: Pass-through entity — income flows to owner's personal tax return`
                  : form.structure === 'C-Corp'
                  ? '✓ C-Corp: Subject to corporate income tax (21% federal rate). Separate from owner.'
                  : '✓ Sole Proprietorship: Income reported on Schedule C. Self-employment tax applies.'}
              </p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 group"
          >
            Continue to Upload
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          All data is processed locally in your browser — nothing is sent to external servers
        </p>
      </div>
    </div>
  );
}
