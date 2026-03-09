// ─── Business Entity ────────────────────────────────────────────────────────

export type BusinessStructure =
  | 'LLC'
  | 'S-Corp'
  | 'C-Corp'
  | 'Sole Proprietorship'
  | 'Partnership';

export interface BusinessInfo {
  name: string;
  structure: BusinessStructure;
  taxYear: number;
  state: string;
  ein?: string;
  fiscalYearEnd: string; // MM-DD
  accountingBasis: 'Accrual' | 'Cash' | 'Both';
}

// ─── Transactions ────────────────────────────────────────────────────────────

export type TransactionType =
  | 'Deposit'
  | 'Check'
  | 'ACH'
  | 'Card'
  | 'Fee'
  | 'Interest'
  | 'Transfer'
  | 'Other';

export type AccountCategory =
  | 'Revenue'
  | 'COGS'
  | 'Salaries & Wages'
  | 'Rent/Lease'
  | 'Utilities'
  | 'Insurance'
  | 'Marketing & Advertising'
  | 'Professional Services'
  | 'Office & Supplies'
  | 'Equipment & Maintenance'
  | 'Interest Expense'
  | 'Interest Income'
  | 'Bank Fees'
  | 'Owner Distribution'
  | 'Owner Contribution'
  | 'Loan Proceeds'
  | 'Loan Payment'
  | 'Tax Payment'
  | 'Transfer'
  | 'Other Income'
  | 'Other Expense'
  | 'Uncategorized';

export interface Transaction {
  id: string;
  date: string; // ISO date string
  description: string;
  amount: number; // positive = credit, negative = debit
  type: TransactionType;
  category: AccountCategory;
  confidence: number; // 0-100
  sourceFile: string;
  month: number; // 1-12
  year: number;
  bankDescription: string; // raw text from bank statement
  notes?: string;
  flagged?: boolean;
}

// ─── Accrual Adjustments ─────────────────────────────────────────────────────

export interface AccrualAdjustment {
  id: string;
  type:
    | 'AccountsReceivable'
    | 'AccountsPayable'
    | 'PrepaidExpense'
    | 'AccruedExpense'
    | 'DeferredRevenue'
    | 'Inventory';
  description: string;
  amount: number;
  category: AccountCategory;
}

// ─── P&L ─────────────────────────────────────────────────────────────────────

export interface PnLLineItem {
  label: string;
  amount: number;
  subItems?: PnLLineItem[];
  isTotal?: boolean;
  isSubtotal?: boolean;
  isNegative?: boolean;
  indent?: number;
}

export interface PnLStatement {
  revenue: {
    productSales: number;
    serviceRevenue: number;
    otherIncome: number;
    total: number;
  };
  cogs: {
    beginningInventory: number;
    purchases: number;
    endingInventory: number;
    directLabor: number;
    total: number;
  };
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: {
    salaries: number;
    rent: number;
    utilities: number;
    insurance: number;
    marketing: number;
    professionalServices: number;
    officeSupplies: number;
    equipmentMaintenance: number;
    depreciation: number;
    bankFees: number;
    other: number;
    total: number;
  };
  operatingIncome: number;
  operatingMargin: number;
  otherItems: {
    interestIncome: number;
    interestExpense: number;
    gainLossAssets: number;
    total: number;
  };
  netIncomeBeforeTax: number;
  taxProvision: number;
  netIncomeAfterTax: number;
  netMargin: number;
  monthlyRevenue: number[]; // 12 months
  monthlyExpenses: number[]; // 12 months
  monthlyNetIncome: number[]; // 12 months
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export interface BalanceSheet {
  assets: {
    current: {
      cash: number;
      accountsReceivable: number;
      inventory: number;
      prepaidExpenses: number;
      total: number;
    };
    fixed: {
      propertyPlantEquipment: number;
      accumulatedDepreciation: number;
      net: number;
    };
    other: {
      securityDeposits: number;
      goodwill: number;
      total: number;
    };
    total: number;
  };
  liabilities: {
    current: {
      accountsPayable: number;
      creditCardPayable: number;
      salesTaxPayable: number;
      currentDebt: number;
      accruedExpenses: number;
      total: number;
    };
    longTerm: {
      longTermDebt: number;
      deferredRevenue: number;
      total: number;
    };
    total: number;
  };
  equity: {
    ownerCapital: number;
    retainedEarnings: number;
    currentYearIncome: number;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  // Ratios
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  workingCapital: number;
}

// ─── Tax Summary ─────────────────────────────────────────────────────────────

export interface TaxSummary {
  taxableIncome: number;
  totalDeductions: number;
  estimatedTaxRate: number;
  estimatedAnnualTax: number;
  quarterlyPayment: number;
  paymentsMade: number;
  estimatedUnderpayment: number;
  deductionBreakdown: {
    cogs: number;
    salaries: number;
    rent: number;
    utilities: number;
    insurance: number;
    professionalServices: number;
    depreciation: number;
    interestExpense: number;
    other: number;
  };
}

// ─── Variance Analysis ───────────────────────────────────────────────────────

export interface VarianceRow {
  lineItem: string;
  cashBasis: number;
  accrualBasis: number;
  variance: number;
  rootCause: string;
}

// ─── Application State ───────────────────────────────────────────────────────

export type AppStep =
  | 'onboarding'
  | 'upload'
  | 'processing'
  | 'review'
  | 'dashboard';

export interface ProcessingStage {
  label: string;
  description: string;
  progress: number; // 0-100
  done: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  transactionCount?: number;
  errorMessage?: string;
}

export interface FinancialStore {
  // Onboarding
  step: AppStep;
  businessInfo: BusinessInfo | null;
  adjustments: AccrualAdjustment[];

  // Files
  uploadedFiles: UploadedFile[];

  // Processing
  processingStages: ProcessingStage[];
  isProcessing: boolean;

  // Computed financials
  transactions: Transaction[];
  pnl: PnLStatement | null;
  balanceSheet: BalanceSheet | null;
  taxSummary: TaxSummary | null;
  varianceAnalysis: VarianceRow[];

  // Actions
  setStep: (step: AppStep) => void;
  setBusinessInfo: (info: BusinessInfo) => void;
  addFiles: (files: UploadedFile[]) => void;
  updateFileStatus: (id: string, status: UploadedFile['status'], extra?: Partial<UploadedFile>) => void;
  setTransactions: (txns: Transaction[]) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  setProcessing: (val: boolean) => void;
  setProcessingStages: (stages: ProcessingStage[]) => void;
  updateProcessingStage: (index: number, updates: Partial<ProcessingStage>) => void;
  computeFinancials: () => void;
  addAdjustment: (adj: AccrualAdjustment) => void;
  removeAdjustment: (id: string) => void;
  reset: () => void;
}
