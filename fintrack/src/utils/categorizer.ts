import type { AccountCategory, TransactionType } from '../types';

interface CategoryRule {
  keywords: string[];
  category: AccountCategory;
  confidence: number;
}

const RULES: CategoryRule[] = [
  // Zelle direction-specific (must come BEFORE generic Revenue rule)
  { keywords: ['zelle transfer'], category: 'Transfer', confidence: 88 },
  { keywords: ['zelle received'], category: 'Revenue', confidence: 88 },
  // Revenue
  { keywords: ['invoice', 'payment received', 'deposit', 'sale', 'revenue', 'income', 'receivable', 'stripe', 'paypal', 'square', 'venmo received'], category: 'Revenue', confidence: 82 },
  // Salaries
  { keywords: ['payroll', 'salary', 'wage', 'adp', 'paychex', 'gusto', 'direct deposit', 'compensation'], category: 'Salaries & Wages', confidence: 88 },
  // Rent/Lease
  { keywords: ['rent', 'lease', 'landlord', 'property management', 'office space'], category: 'Rent/Lease', confidence: 90 },
  // Utilities
  { keywords: ['electric', 'electricity', 'pg&e', 'water', 'gas', 'internet', 'comcast', 'att', 'at&t', 'verizon', 'spectrum', 'utility', 'phone bill'], category: 'Utilities', confidence: 88 },
  // Insurance
  { keywords: ['insurance', 'hartford', 'liberty mutual', 'allstate', 'nationwide', 'hiscox', 'premium', 'coverage'], category: 'Insurance', confidence: 85 },
  // Marketing
  { keywords: ['google ads', 'facebook', 'meta ads', 'marketing', 'advertising', 'ad spend', 'mailchimp', 'hubspot', 'seo', 'social media'], category: 'Marketing & Advertising', confidence: 85 },
  // Professional Services
  { keywords: ['accounting', 'attorney', 'legal', 'consultant', 'cpa', 'bookkeeper', 'it services', 'contractor', 'freelance'], category: 'Professional Services', confidence: 80 },
  // Office & Supplies
  { keywords: ['amazon', 'staples', 'office depot', 'supplies', 'postage', 'shipping', 'fedex', 'ups', 'usps', 'printing'], category: 'Office & Supplies', confidence: 75 },
  // Equipment
  { keywords: ['equipment', 'repair', 'maintenance', 'hardware', 'tools', 'machinery', 'apple', 'microsoft', 'dell', 'hp'], category: 'Equipment & Maintenance', confidence: 75 },
  // Interest Income
  { keywords: ['interest paid', 'interest credit', 'interest earned', 'dividend'], category: 'Interest Income', confidence: 90 },
  // Interest Expense
  { keywords: ['interest charge', 'loan interest', 'finance charge', 'credit card interest'], category: 'Interest Expense', confidence: 88 },
  // Bank Fees
  { keywords: ['bank fee', 'service charge', 'monthly fee', 'wire fee', 'nsf', 'overdraft', 'maintenance fee'], category: 'Bank Fees', confidence: 92 },
  // Owner Distribution
  { keywords: ['owner draw', 'member distribution', 'shareholder distribution', 'owner withdrawal', 'personal'], category: 'Owner Distribution', confidence: 78 },
  // Owner Contribution
  { keywords: ['owner contribution', 'member contribution', 'capital contribution', 'owner deposit'], category: 'Owner Contribution', confidence: 78 },
  // Loan Proceeds
  { keywords: ['loan proceeds', 'loan deposit', 'sba loan', 'line of credit', 'credit advance', 'ppp loan', 'eidl'], category: 'Loan Proceeds', confidence: 85 },
  // Loan Payment
  { keywords: ['loan payment', 'mortgage', 'note payable', 'principal payment', 'debt payment'], category: 'Loan Payment', confidence: 85 },
  // Tax Payment
  { keywords: ['irs', 'tax payment', 'estimated tax', 'state tax', 'sales tax', 'payroll tax', 'eftps'], category: 'Tax Payment', confidence: 90 },
  // COGS
  { keywords: ['inventory', 'merchandise', 'materials', 'raw materials', 'cost of goods', 'supplier', 'vendor', 'wholesale'], category: 'COGS', confidence: 80 },
  // Transfer
  { keywords: ['transfer', 'sweep', 'internal', 'from account', 'to account'], category: 'Transfer', confidence: 75 },
];

export function categorize(description: string, amount: number, type: TransactionType): { category: AccountCategory; confidence: number } {
  const lower = description.toLowerCase();

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        // If it's a deposit/positive and category is expense, reduce confidence
        let conf = rule.confidence;
        const isExpenseCategory = !['Revenue', 'Interest Income', 'Owner Contribution', 'Loan Proceeds', 'Other Income'].includes(rule.category);
        if (amount > 0 && isExpenseCategory) conf = Math.max(conf - 20, 40);
        if (amount < 0 && rule.category === 'Revenue') conf = Math.max(conf - 20, 40);
        return { category: rule.category, confidence: conf };
      }
    }
  }

  // Fallback by transaction type and amount sign
  if (type === 'Fee') return { category: 'Bank Fees', confidence: 88 };
  if (type === 'Interest') {
    return amount > 0
      ? { category: 'Interest Income', confidence: 80 }
      : { category: 'Interest Expense', confidence: 80 };
  }
  if (type === 'Transfer') return { category: 'Transfer', confidence: 70 };
  if (amount > 0) return { category: 'Revenue', confidence: 55 };
  return { category: 'Other Expense', confidence: 45 };
}

export function detectTransactionType(description: string): TransactionType {
  const lower = description.toLowerCase();
  if (lower.includes('check') || lower.includes('ck #') || lower.match(/check\s*#?\s*\d+/)) return 'Check';
  if (lower.includes('ach') || lower.includes('direct deposit') || lower.includes('ach credit') || lower.includes('ach debit')) return 'ACH';
  if (lower.includes('pos') || lower.includes('purchase') || lower.includes('card') || lower.includes('visa') || lower.includes('mastercard')) return 'Card';
  if (lower.includes('fee') || lower.includes('service charge') || lower.includes('maintenance')) return 'Fee';
  if (lower.includes('interest')) return 'Interest';
  if (lower.includes('transfer') || lower.includes('wire')) return 'Transfer';
  if (lower.includes('deposit')) return 'Deposit';
  return 'Other';
}
