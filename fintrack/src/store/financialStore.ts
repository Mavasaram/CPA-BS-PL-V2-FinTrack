import { create } from 'zustand';
import type {
  FinancialStore,
  AppStep,
  BusinessInfo,
  UploadedFile,
  Transaction,
  ProcessingStage,
  AccrualAdjustment,
} from '../types';
import { computePnL, computeBalanceSheet, computeTaxSummary, computeVarianceAnalysis } from '../utils/financials';
import { applyOverrides } from '../utils/categoryOverrides';

const DEFAULT_STAGES: ProcessingStage[] = [
  { label: 'Parsing PDFs', description: 'Extracting text and transaction data from uploaded statements', progress: 0, done: false },
  { label: 'Normalizing Transactions', description: 'Standardizing dates, amounts, and removing duplicates', progress: 0, done: false },
  { label: 'AI Categorization', description: 'Classifying each transaction by account type and category', progress: 0, done: false },
  { label: 'Accrual Adjustments', description: 'Applying accounts receivable, payable, and prepaid adjustments', progress: 0, done: false },
  { label: 'Computing Financials', description: 'Building P&L, Balance Sheet, and Tax Summary', progress: 0, done: false },
  { label: 'Reconciliation Check', description: 'Verifying balances and flagging discrepancies', progress: 0, done: false },
];

export const useFinancialStore = create<FinancialStore>((set, get) => ({
  step: 'onboarding',
  businessInfo: null,
  adjustments: [
    { id: '1', type: 'AccountsReceivable', description: 'Outstanding client invoices', amount: 18500, category: 'Revenue' },
    { id: '2', type: 'AccountsPayable', description: 'Unpaid vendor invoices', amount: 9200, category: 'COGS' },
    { id: '3', type: 'PrepaidExpense', description: 'Prepaid insurance (6 months)', amount: 2400, category: 'Insurance' },
    { id: '4', type: 'Inventory', description: 'Ending inventory count', amount: 3500, category: 'COGS' },
  ],

  uploadedFiles: [],
  processingStages: DEFAULT_STAGES.map(s => ({ ...s })),
  isProcessing: false,

  transactions: [],
  pnl: null,
  balanceSheet: null,
  taxSummary: null,
  varianceAnalysis: [],

  setStep: (step: AppStep) => set({ step }),

  setBusinessInfo: (info: BusinessInfo) => set({ businessInfo: info }),

  addFiles: (files: UploadedFile[]) =>
    set(state => ({ uploadedFiles: [...state.uploadedFiles, ...files] })),

  updateFileStatus: (id, status, extra = {}) =>
    set(state => ({
      uploadedFiles: state.uploadedFiles.map(f =>
        f.id === id ? { ...f, status, ...extra } : f
      ),
    })),

  setTransactions: (transactions: Transaction[]) => set({ transactions: applyOverrides(transactions) }),

  updateTransaction: (id, updates) =>
    set(state => ({
      transactions: state.transactions.map(t =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  setProcessing: (val: boolean) => set({ isProcessing: val }),

  setProcessingStages: (stages: ProcessingStage[]) => set({ processingStages: stages }),

  updateProcessingStage: (index, updates) =>
    set(state => ({
      processingStages: state.processingStages.map((s, i) =>
        i === index ? { ...s, ...updates } : s
      ),
    })),

  computeFinancials: () => {
    const { transactions, adjustments, businessInfo } = get();
    if (!businessInfo) return;

    const pnl = computePnL(transactions, adjustments);
    const balanceSheet = computeBalanceSheet(pnl, transactions, adjustments);
    const taxSummary = computeTaxSummary(pnl, businessInfo);
    const varianceAnalysis = computeVarianceAnalysis(pnl, adjustments);

    set({ pnl, balanceSheet, taxSummary, varianceAnalysis });
  },

  addAdjustment: (adj: AccrualAdjustment) =>
    set(state => ({ adjustments: [...state.adjustments, adj] })),

  removeAdjustment: (id: string) =>
    set(state => ({ adjustments: state.adjustments.filter(a => a.id !== id) })),

  reset: () =>
    set({
      step: 'onboarding',
      businessInfo: null,
      uploadedFiles: [],
      processingStages: DEFAULT_STAGES.map(s => ({ ...s })),
      isProcessing: false,
      transactions: [],
      pnl: null,
      balanceSheet: null,
      taxSummary: null,
      varianceAnalysis: [],
      adjustments: [
        { id: '1', type: 'AccountsReceivable', description: 'Outstanding client invoices', amount: 18500, category: 'Revenue' },
        { id: '2', type: 'AccountsPayable', description: 'Unpaid vendor invoices', amount: 9200, category: 'COGS' },
        { id: '3', type: 'PrepaidExpense', description: 'Prepaid insurance (6 months)', amount: 2400, category: 'Insurance' },
        { id: '4', type: 'Inventory', description: 'Ending inventory count', amount: 3500, category: 'COGS' },
      ],
    }),
}));
