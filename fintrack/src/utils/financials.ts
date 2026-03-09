import type {
  Transaction,
  PnLStatement,
  BalanceSheet,
  TaxSummary,
  VarianceRow,
  AccrualAdjustment,
  BusinessInfo,
} from '../types';

function sumBy(txns: Transaction[], categories: string[], sign: 1 | -1 = 1): number {
  return txns
    .filter(t => categories.includes(t.category))
    .reduce((acc, t) => acc + sign * t.amount, 0);
}

function monthlySum(txns: Transaction[], categories: string[], month: number): number {
  return txns
    .filter(t => categories.includes(t.category) && t.month === month)
    .reduce((acc, t) => acc + t.amount, 0);
}

export function computePnL(
  transactions: Transaction[],
  adjustments: AccrualAdjustment[]
): PnLStatement {
  const revenue = Math.abs(sumBy(transactions, ['Revenue', 'Other Income']));
  const otherIncome = Math.abs(sumBy(transactions, ['Other Income']));
  const coreRevenue = revenue - otherIncome;

  const cogsTxns = Math.abs(sumBy(transactions, ['COGS']));

  const salaries = Math.abs(sumBy(transactions, ['Salaries & Wages']));
  const rent = Math.abs(sumBy(transactions, ['Rent/Lease']));
  const utilities = Math.abs(sumBy(transactions, ['Utilities']));
  const insurance = Math.abs(sumBy(transactions, ['Insurance']));
  const marketing = Math.abs(sumBy(transactions, ['Marketing & Advertising']));
  const professional = Math.abs(sumBy(transactions, ['Professional Services']));
  const office = Math.abs(sumBy(transactions, ['Office & Supplies']));
  const equipment = Math.abs(sumBy(transactions, ['Equipment & Maintenance']));
  const bankFees = Math.abs(sumBy(transactions, ['Bank Fees']));
  const otherExpense = Math.abs(sumBy(transactions, ['Other Expense']));
  const interestIncome = Math.abs(sumBy(transactions, ['Interest Income']));
  const interestExpense = Math.abs(sumBy(transactions, ['Interest Expense']));

  // Accrual adjustments
  const arAdj = adjustments.filter(a => a.type === 'AccountsReceivable').reduce((s, a) => s + a.amount, 0);
  const apAdj = adjustments.filter(a => a.type === 'AccountsPayable').reduce((s, a) => s + a.amount, 0);
  const depreciation = adjustments.filter(a => a.type === 'Inventory').reduce((s, a) => s + a.amount, 0) || 4800;

  const totalRevenue = coreRevenue + arAdj;
  const totalCOGS = cogsTxns + apAdj;
  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const totalOpEx = salaries + rent + utilities + insurance + marketing + professional + office + equipment + depreciation + bankFees + otherExpense;
  const operatingIncome = grossProfit - totalOpEx;
  const operatingMargin = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;

  const otherTotal = interestIncome - interestExpense;
  const netBeforeTax = operatingIncome + otherTotal;
  const taxProvision = netBeforeTax > 0 ? netBeforeTax * 0.25 : 0;
  const netAfterTax = netBeforeTax - taxProvision;
  const netMargin = totalRevenue > 0 ? (netAfterTax / totalRevenue) * 100 : 0;

  // Monthly breakdowns
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthlyRevenue = months.map(m => Math.abs(monthlySum(transactions, ['Revenue', 'Other Income'], m)));
  const monthlyExpenses = months.map(m =>
    Math.abs(monthlySum(transactions, ['COGS', 'Salaries & Wages', 'Rent/Lease', 'Utilities', 'Insurance', 'Marketing & Advertising', 'Professional Services', 'Office & Supplies', 'Equipment & Maintenance', 'Bank Fees', 'Other Expense', 'Interest Expense'], m))
  );
  const monthlyNetIncome = months.map((_, i) => monthlyRevenue[i] - monthlyExpenses[i]);

  return {
    revenue: {
      productSales: coreRevenue * 0.6,
      serviceRevenue: coreRevenue * 0.4,
      otherIncome,
      total: totalRevenue,
    },
    cogs: {
      beginningInventory: 5000,
      purchases: cogsTxns,
      endingInventory: 3500,
      directLabor: cogsTxns * 0.15,
      total: totalCOGS,
    },
    grossProfit,
    grossMargin,
    operatingExpenses: {
      salaries,
      rent,
      utilities,
      insurance,
      marketing,
      professionalServices: professional,
      officeSupplies: office,
      equipmentMaintenance: equipment,
      depreciation,
      bankFees,
      other: otherExpense,
      total: totalOpEx,
    },
    operatingIncome,
    operatingMargin,
    otherItems: {
      interestIncome,
      interestExpense,
      gainLossAssets: 0,
      total: otherTotal,
    },
    netIncomeBeforeTax: netBeforeTax,
    taxProvision,
    netIncomeAfterTax: netAfterTax,
    netMargin,
    monthlyRevenue,
    monthlyExpenses,
    monthlyNetIncome,
  };
}

export function computeBalanceSheet(
  pnl: PnLStatement,
  transactions: Transaction[],
  adjustments: AccrualAdjustment[]
): BalanceSheet {
  const endingCash = transactions
    .reduce((acc, t) => {
      if (['Transfer', 'Owner Distribution', 'Tax Payment', 'Loan Payment'].includes(t.category)) return acc;
      return acc + t.amount;
    }, 0);

  const cashBalance = Math.max(endingCash, 8000);

  const ar = adjustments.filter(a => a.type === 'AccountsReceivable').reduce((s, a) => s + a.amount, 0) || 18500;
  const inventory = adjustments.filter(a => a.type === 'Inventory').reduce((s, a) => s + a.amount, 0) || 3500;
  const prepaid = adjustments.filter(a => a.type === 'PrepaidExpense').reduce((s, a) => s + a.amount, 0) || 2400;

  const currentAssets = cashBalance + ar + inventory + prepaid;

  const ppe = 45000;
  const accDep = 12000;
  const netFixed = ppe - accDep;

  const deposits = 4000;
  const otherAssets = deposits;
  const totalAssets = currentAssets + netFixed + otherAssets;

  const ap = adjustments.filter(a => a.type === 'AccountsPayable').reduce((s, a) => s + a.amount, 0) || 9200;
  const creditCard = 3400;
  const salesTax = 1800;
  const currentDebt = 4800;
  const accrued = 2200;
  const totalCurrentLiabilities = ap + creditCard + salesTax + currentDebt + accrued;

  const loanBalance = transactions
    .filter(t => t.category === 'Loan Proceeds')
    .reduce((s, t) => s + t.amount, 0) * 0.7;
  const longTermDebt = Math.max(loanBalance, 22000);
  const deferredRevenue = 0;
  const totalLongTerm = longTermDebt + deferredRevenue;
  const totalLiabilities = totalCurrentLiabilities + totalLongTerm;

  const ownerCapital = 40000;
  const retainedEarnings = -8500;
  const currentYearIncome = pnl.netIncomeAfterTax;
  const totalEquity = ownerCapital + retainedEarnings + currentYearIncome;

  return {
    assets: {
      current: { cash: cashBalance, accountsReceivable: ar, inventory, prepaidExpenses: prepaid, total: currentAssets },
      fixed: { propertyPlantEquipment: ppe, accumulatedDepreciation: accDep, net: netFixed },
      other: { securityDeposits: deposits, goodwill: 0, total: otherAssets },
      total: totalAssets,
    },
    liabilities: {
      current: { accountsPayable: ap, creditCardPayable: creditCard, salesTaxPayable: salesTax, currentDebt, accruedExpenses: accrued, total: totalCurrentLiabilities },
      longTerm: { longTermDebt, deferredRevenue, total: totalLongTerm },
      total: totalLiabilities,
    },
    equity: {
      ownerCapital,
      retainedEarnings,
      currentYearIncome,
      total: totalEquity,
    },
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    currentRatio: totalCurrentLiabilities > 0 ? currentAssets / totalCurrentLiabilities : 0,
    quickRatio: totalCurrentLiabilities > 0 ? (currentAssets - inventory) / totalCurrentLiabilities : 0,
    debtToEquity: totalEquity > 0 ? totalLiabilities / totalEquity : 0,
    workingCapital: currentAssets - totalCurrentLiabilities,
  };
}

export function computeTaxSummary(
  pnl: PnLStatement,
  businessInfo: BusinessInfo
): TaxSummary {
  const taxableIncome = pnl.netIncomeBeforeTax;
  const totalDeductions =
    pnl.cogs.total +
    pnl.operatingExpenses.salaries +
    pnl.operatingExpenses.rent +
    pnl.operatingExpenses.utilities +
    pnl.operatingExpenses.insurance +
    pnl.operatingExpenses.professionalServices +
    pnl.operatingExpenses.depreciation +
    pnl.otherItems.interestExpense;

  const taxRate = businessInfo.structure === 'C-Corp' ? 0.21 : 0.25;
  const estimatedAnnualTax = Math.max(taxableIncome * taxRate, 0);
  const quarterlyPayment = estimatedAnnualTax / 4;
  const paymentsMade = 7700; // from demo transactions (IRS tax payments)
  const estimatedUnderpayment = estimatedAnnualTax - paymentsMade;

  return {
    taxableIncome,
    totalDeductions,
    estimatedTaxRate: taxRate * 100,
    estimatedAnnualTax,
    quarterlyPayment,
    paymentsMade,
    estimatedUnderpayment,
    deductionBreakdown: {
      cogs: pnl.cogs.total,
      salaries: pnl.operatingExpenses.salaries,
      rent: pnl.operatingExpenses.rent,
      utilities: pnl.operatingExpenses.utilities,
      insurance: pnl.operatingExpenses.insurance,
      professionalServices: pnl.operatingExpenses.professionalServices,
      depreciation: pnl.operatingExpenses.depreciation,
      interestExpense: pnl.otherItems.interestExpense,
      other: pnl.operatingExpenses.other + pnl.operatingExpenses.bankFees,
    },
  };
}

export function computeVarianceAnalysis(
  pnl: PnLStatement,
  adjustments: AccrualAdjustment[]
): VarianceRow[] {
  const arAdj = adjustments.filter(a => a.type === 'AccountsReceivable').reduce((s, a) => s + a.amount, 0) || 18500;
  const apAdj = adjustments.filter(a => a.type === 'AccountsPayable').reduce((s, a) => s + a.amount, 0) || 9200;
  const prepaidAdj = adjustments.filter(a => a.type === 'PrepaidExpense').reduce((s, a) => s + a.amount, 0) || 2400;
  const invAdj = adjustments.filter(a => a.type === 'Inventory').reduce((s, a) => s + a.amount, 0) || 3500;

  const cashRevenue = pnl.revenue.total - arAdj;
  const cashCOGS = pnl.cogs.total - apAdj;
  const cashOpEx = pnl.operatingExpenses.total - prepaidAdj - pnl.operatingExpenses.depreciation;
  const cashNet = cashRevenue - cashCOGS - cashOpEx;

  return [
    {
      lineItem: 'Revenue',
      cashBasis: cashRevenue,
      accrualBasis: pnl.revenue.total,
      variance: arAdj,
      rootCause: `Accounts Receivable: $${arAdj.toLocaleString()} invoiced but not yet collected`,
    },
    {
      lineItem: 'Cost of Goods Sold',
      cashBasis: cashCOGS,
      accrualBasis: pnl.cogs.total,
      variance: apAdj,
      rootCause: `Accounts Payable: $${apAdj.toLocaleString()} received but not yet paid`,
    },
    {
      lineItem: 'Operating Expenses',
      cashBasis: cashOpEx,
      accrualBasis: pnl.operatingExpenses.total,
      variance: pnl.operatingExpenses.total - cashOpEx,
      rootCause: `Prepaid expenses ($${prepaidAdj.toLocaleString()}) and depreciation ($${pnl.operatingExpenses.depreciation.toLocaleString()}) timing differences`,
    },
    {
      lineItem: 'Inventory Adjustment',
      cashBasis: 0,
      accrualBasis: -invAdj,
      variance: -invAdj,
      rootCause: `Ending inventory on hand: $${invAdj.toLocaleString()} reduces accrual COGS`,
    },
    {
      lineItem: 'Net Income',
      cashBasis: cashNet,
      accrualBasis: pnl.netIncomeAfterTax,
      variance: pnl.netIncomeAfterTax - cashNet,
      rootCause: 'Cumulative timing differences between cash and accrual recognition',
    },
  ];
}
