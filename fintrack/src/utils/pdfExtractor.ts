import type { Transaction, AccountCategory } from '../types';
import { categorize, detectTransactionType } from './categorizer';

let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  }
  return pdfjsLib;
}

// ── Coordinate-based text line reconstruction ────────────────────────────────

interface RawItem { text: string; x: number; y: number; page: number }
interface TextLine { text: string; y: number; page: number }

async function extractLinesFromPDF(file: File): Promise<TextLine[]> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const allItems: RawItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        const t = item.transform as number[];
        allItems.push({ text: item.str, x: t[4], y: t[5], page: pageNum });
      }
    }
  }

  // Group items into visual lines by (page, rounded-y)
  // Y_TOLERANCE: text items on the same line are within ~2 PDF units of each other
  const Y_TOLERANCE = 2;
  const lineMap = new Map<string, { items: Array<{ text: string; x: number }>; y: number; page: number }>();

  for (const item of allItems) {
    const ySnap = Math.round(item.y / Y_TOLERANCE);
    const key = `${item.page}-${ySnap}`;
    if (!lineMap.has(key)) lineMap.set(key, { items: [], y: item.y, page: item.page });
    lineMap.get(key)!.items.push({ text: item.text, x: item.x });
  }

  const lines: TextLine[] = [];
  for (const group of lineMap.values()) {
    const sorted = group.items.sort((a, b) => a.x - b.x);
    const text = sorted.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
    if (text) lines.push({ text, y: group.y, page: group.page });
  }

  // Sort: page asc, y desc (higher y = closer to top in PDF coordinate space)
  lines.sort((a, b) => a.page !== b.page ? a.page - b.page : b.y - a.y);
  return lines;
}

// ── Parsing helpers ──────────────────────────────────────────────────────────

function parseMoney(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseDate(dateStr: string, defaultYear: number): Date | null {
  const parts = dateStr.split('/');
  if (parts.length === 2) {
    const d = new Date(`${parts[0]}/${parts[1]}/${defaultYear}`);
    return isNaN(d.getTime()) ? null : d;
  }
  if (parts.length === 3) {
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000; // "24" → 2024, "25" → 2025
    const d = new Date(`${parts[0]}/${parts[1]}/${year}`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Lines to skip (section headers, totals, boilerplate)
const SKIP_RE = [
  /^(date\s+description)/i,
  /^(check\s+no\.?\s+description)/i,
  /^total\s+(deposits|withdrawals|other|checks|service|additions|subtractions|atm|card|electronic|fees)/i,
  /^(deposits\s+and\s+other\s+additions)/i,
  /^(withdrawals\s+and\s+other\s+subtractions)/i,
  /^other\s+subtractions/i,
  /^account\s+(summary|number)/i,
  /^(beginning|ending)\s+balance/i,
  /^page\s+\d/i,
  /^continued\s+on/i,
  /^important\s+information/i,
  /^bank\s+deposit\s+accounts/i,
  /^how\s+to\s+(contact|avoid)/i,
  /^deposit\s+agreement/i,
  /^electronic\s+transfers/i,
  /^reporting\s+other/i,
  /^direct\s+deposits/i,
  /^braille\s+and\s+large/i,
  /^\u00a9\s*\d{4}/,            // © 2025
  /^pull:\s/i,
  /^your\s+(adv|account|checking|savings|monthly)/i,
  /^for\s+(december|january|february|march|april|may|june|july|august|september|october|november)/i,
  // Chase-specific boilerplate
  /^\*start\*/i,
  /^\*end\*/i,
  /^atm\s+(&|and)\s+debit\s+card\s+summary/i,
  /^(philmon|jobin)\s+\w+\s+card\s+\d/i,
  /^checking\s+summary/i,
  /^chase\s+business/i,
  /^if\s+you\s+(meet|see|have|fail)/i,
  /^maintain\s+a\s+linked/i,
  /^meet\s+chase/i,
  /^for\s+complete\s+details/i,
  /^\$(2,000|0\.00)/,
  /^you\s+can\s+(also|use)/i,
  /^excess\s+transaction/i,
  /^after\s+\d+,?\s+excess/i,
  /^paper\s+checks\s+written/i,
  /^deposits\s+and\s+withdrawals\s+made/i,
  /^monthly\s+service\s+fee\s*$/i,
  /^in\s+case\s+of\s+errors/i,
  /^for\s+(personal|business)\s+accounts/i,
  /^call\s+us\s+at\s+1-/i,
  /^jpmorgan\s+chase\s+bank/i,
  /^(web\s+site|service\s+center|para\s+espanol|international\s+calls)/i,
];

function shouldSkip(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 3) return true;
  return SKIP_RE.some(r => r.test(t));
}

// ── Section-aware sign detection (for Chase: all amounts positive in PDF) ────

// When a section header is detected, set multiplier for subsequent amounts
const CREDIT_SECTION_RE = /^deposits?\s+and\s+additions/i;          // Chase deposits
const DEBIT_SECTION_RES = [
  /^checks?\s+paid/i,
  /^atm\s+(&|and)\s+debit\s+card\s+withdrawals/i,
  /^electronic\s+withdrawals?/i,
  /^fees\s*$/i,
];
// Stop parsing transactions at these sections (Daily Ending Balance = end of transactions)
// Note: ATM & Debit Card Summary is mid-statement (card breakdown), not a stop — it's in SKIP_RE
const STOP_SECTION_RES = [
  /^daily\s+ending\s+balance/i,
];

// Chase check-paid line: "487 ^ 01/02 $545.00" or "490 * ^ 01/03 480.20"
const CHECK_LINE_RE = /^(\d{3,5})\s*[\*\^\s]+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+\$?([\d,]+\.\d{2})\s*$/;

// ── Transaction line parser ──────────────────────────────────────────────────

// Date at start: MM/DD (Chase) or MM/DD/YY or MM/DD/YYYY (BofA, others)
const DATE_START = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+([\s\S]*)/;
// Amount at end: optional minus + optional $ + digits + . + 2 decimals
const AMOUNT_END = /\s([-]?\$?[\d,]+\.\d{2})\s*$/;

function parseTransactionsFromLines(lines: TextLine[], sourceFile: string, defaultYear: number): Transaction[] {
  const transactions: Transaction[] = [];

  // sectionSign: 0  = use raw amount sign from text (BofA — amounts are pre-signed)
  //             +1  = deposits section (Chase — all amounts positive in PDF text)
  //             -1  = checks/ATM/electronic/fees section (Chase)
  let sectionSign = 0;
  let stopParsing = false;

  let pendingDate: string | null = null;
  let pendingDescParts: string[] = [];
  let pendingAmount: number | null = null;

  const applySign = (rawAmt: number): number =>
    sectionSign !== 0 ? Math.abs(rawAmt) * sectionSign : rawAmt;

  const flush = () => {
    if (!pendingDate || pendingDescParts.length === 0 || pendingAmount === null) {
      pendingDate = null; pendingDescParts = []; pendingAmount = null;
      return;
    }
    const dateObj = parseDate(pendingDate, defaultYear);
    if (!dateObj || Math.abs(pendingAmount) < 0.01) {
      pendingDate = null; pendingDescParts = []; pendingAmount = null;
      return;
    }
    const bankDescription = pendingDescParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!bankDescription || bankDescription.length < 2) {
      pendingDate = null; pendingDescParts = []; pendingAmount = null;
      return;
    }
    const normalizedDesc = normalizeDescription(bankDescription);
    const type = detectTransactionType(normalizedDesc + ' ' + bankDescription);
    const { category, confidence } = categorize(normalizedDesc + ' ' + bankDescription, pendingAmount, type);
    transactions.push({
      id: crypto.randomUUID(),
      date: dateObj.toISOString().split('T')[0],
      bankDescription,
      description: normalizedDesc,
      amount: pendingAmount,
      type, category, confidence, sourceFile,
      month: dateObj.getMonth() + 1,
      year: dateObj.getFullYear(),
    });
    pendingDate = null; pendingDescParts = []; pendingAmount = null;
  };

  for (const line of lines) {
    if (stopParsing) break;

    const text = line.text.trim();
    if (!text || text.length < 3) continue;

    // ── Stop-section detection ───────────────────────────────────────────────
    if (STOP_SECTION_RES.some(r => r.test(text))) {
      flush();
      stopParsing = true;
      break;
    }

    // ── Section-header detection → sets sign context for Chase-style PDFs ────
    if (CREDIT_SECTION_RE.test(text)) { flush(); sectionSign = +1; continue; }
    if (DEBIT_SECTION_RES.some(r => r.test(text))) { flush(); sectionSign = -1; continue; }

    // ── Skip boilerplate ─────────────────────────────────────────────────────
    if (shouldSkip(text)) continue;

    // ── Chase check-paid line: "487 ^ 01/02 $545.00" ────────────────────────
    const checkMatch = text.match(CHECK_LINE_RE);
    if (checkMatch && sectionSign === -1) {
      flush();
      const [, checkNo, dateStr, amtStr] = checkMatch;
      const dateObj = parseDate(dateStr, defaultYear);
      const rawAmt = parseMoney(amtStr);
      if (dateObj && rawAmt && rawAmt > 0.01) {
        const bankDescription = `Check #${checkNo}`;
        const type = 'Check' as const;
        const amt = applySign(rawAmt);
        const { category, confidence } = categorize(bankDescription, amt, type);
        transactions.push({
          id: crypto.randomUUID(),
          date: dateObj.toISOString().split('T')[0],
          bankDescription,
          description: bankDescription,
          amount: amt,
          type, category, confidence, sourceFile,
          month: dateObj.getMonth() + 1,
          year: dateObj.getFullYear(),
        });
      }
      continue;
    }

    // ── Regular transaction line (date at start) ─────────────────────────────
    const dateMatch = text.match(DATE_START);
    if (dateMatch) {
      flush();
      pendingDate = dateMatch[1];
      const rest = dateMatch[2].trim();

      const amountMatch = rest.match(AMOUNT_END);
      if (amountMatch) {
        const rawAmt = parseMoney(amountMatch[1]);
        pendingAmount = rawAmt !== null ? applySign(rawAmt) : null;
        const desc = rest.slice(0, rest.lastIndexOf(amountMatch[0])).trim();
        if (desc) pendingDescParts.push(desc);
      } else if (rest) {
        pendingDescParts.push(rest);
      }
    } else if (pendingDate !== null) {
      // Continuation line
      const amountMatch = text.match(AMOUNT_END);
      if (amountMatch) {
        const rawAmt = parseMoney(amountMatch[1]);
        pendingAmount = rawAmt !== null ? applySign(rawAmt) : null;
        const desc = text.slice(0, text.lastIndexOf(amountMatch[0])).trim();
        if (desc) pendingDescParts.push(desc);
      } else {
        pendingDescParts.push(text);
      }
    }
  }
  flush();
  return transactions;
}

// ── Description normalizer ───────────────────────────────────────────────────

function toTitle(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// Well-known company/pattern normalizations for BofA and other banks
const KNOWN: Array<{ pattern: RegExp; normalized: string }> = [
  { pattern: /^IBM\b/i,                                  normalized: 'IBM - Payroll' },
  { pattern: /^ADP\b/i,                                  normalized: 'ADP - Payroll' },
  { pattern: /^PAYCHEX/i,                                normalized: 'Paychex - Payroll' },
  { pattern: /^GUSTO/i,                                  normalized: 'Gusto - Payroll' },
  { pattern: /^STRIPE/i,                                 normalized: 'Stripe - Payment Deposit' },
  { pattern: /^SQUARE/i,                                 normalized: 'Square - Payment Deposit' },
  { pattern: /^PAYPAL/i,                                 normalized: 'PayPal - Payment Deposit' },
  { pattern: /^DISCOVER\s*BANK.*PREARRANGE/i,            normalized: 'Discover Bank - Credit Card Payment' },
  { pattern: /^DISCOVER\s*BANK.*NET.MOBILE/i,            normalized: 'Discover Bank - Credit Card Payment' },
  { pattern: /^DISCOVER\s*BANK/i,                        normalized: 'Discover Bank - Transfer' },
  { pattern: /^XOOM/i,                                   normalized: 'Xoom - International Money Transfer' },
  { pattern: /^AMZ_STORECRD|^AMAZON\s*STORE\s*CRD/i,    normalized: 'Amazon Store Card - Payment' },
  { pattern: /^AMAZON|^AMZN/i,                           normalized: 'Amazon - Purchase' },
  { pattern: /^CITI\s*AUTOPAY/i,                         normalized: 'Citi - Credit Card Payment' },
  { pattern: /^CHASE\s*CREDIT\s*CRD/i,                   normalized: 'Chase - Credit Card Payment' },
  { pattern: /^JPMORGAN\s*CHASE|^JP\s*MORGAN/i,          normalized: 'JPMorgan Chase - Transfer' },
  { pattern: /^BOFA\s*BILL\s*PAYMENT|^BANK\s*OF\s*AMERICA\s*CREDIT\s*CARD/i, normalized: 'Bank of America - Credit Card Payment' },
  { pattern: /^BOFA\b/i,                                 normalized: 'Bank of America - Bill Payment' },
  { pattern: /^BRAZORIA\s*COUNTY\s*MUD/i,                normalized: 'Brazoria County MUD - Water Utility' },
  { pattern: /^ROCKET\s*MONEY/i,                         normalized: 'Rocket Money - Subscription' },
  { pattern: /^NATIONWIDE/i,                             normalized: 'Nationwide - Insurance Payment' },
  { pattern: /^APPLECARD|^APPLE\s*CARD/i,                normalized: 'Apple Card - Credit Card Payment' },
  { pattern: /^BEST\s*BRAINS/i,                          normalized: 'Best Brains - Education' },
  { pattern: /^CPENERGY|^CP\s*ENERGY|^ENTEX/i,           normalized: 'CenterPoint Energy - Gas Utility' },
  { pattern: /^PROVIDENT\s*FUND/i,                       normalized: 'Provident Funding - Mortgage Payment' },
  { pattern: /^SYNCHRONY\s*BANK/i,                       normalized: 'Synchrony Bank - Credit Card Payment' },
  { pattern: /^HOME\s*DEPOT/i,                           normalized: 'Home Depot - Credit Card Payment' },
  { pattern: /^PG&E|^PACIFIC\s*GAS/i,                    normalized: 'PG&E - Electric Bill' },
  { pattern: /^AT&T|^ATT\b/i,                            normalized: 'AT&T - Business Internet' },
  { pattern: /^GOOGLE\s*(ADS|LLC)/i,                     normalized: 'Google Ads - Marketing' },
  { pattern: /^GOOGLE\s*\*?GSUITE/i,                     normalized: 'Google Workspace - Subscription' },
  { pattern: /^MICROSOFT/i,                              normalized: 'Microsoft - Software Subscription' },
  { pattern: /^QUICKBOOKS|^INTUIT/i,                     normalized: 'QuickBooks - Accounting Software' },
  { pattern: /^IRS\b|^EFTPS|^USATAXPYMT/i,              normalized: 'IRS - Tax Payment' },
  { pattern: /^SBA\s*LOAN/i,                             normalized: 'SBA - Loan Payment' },
  { pattern: /^HISCOX/i,                                 normalized: 'Hiscox - Business Insurance' },
];

function normalizeDescription(bankDesc: string): string {
  const trimmed = bankDesc.trim();

  // Zelle payment to [name]
  const zelleOut = trimmed.match(/^Zelle\s+payment\s+to\s+(.+?)(\s+Conf#.*)?$/i);
  if (zelleOut) return `Zelle Transfer - ${zelleOut[1].trim()}`;

  // Generic Zelle received
  const zelleIn = trimmed.match(/^Zelle\s+payment\s+from\s+(.+?)(\s+Conf#.*)?$/i);
  if (zelleIn) return `Zelle Received - ${zelleIn[1].trim()}`;

  // "X Bill Payment" patterns
  const billPay = trimmed.match(/^(.+?)\s+bill\s+payment\s*$/i);
  if (billPay) {
    const co = billPay[1].trim();
    return `${toTitle(co)} - Bill Payment`;
  }

  // Known company patterns
  for (const { pattern, normalized } of KNOWN) {
    if (pattern.test(trimmed)) return normalized;
  }

  // Generic ACH cleanup: strip boilerplate tokens, keep company name + DES type
  // Extract company (before DES:) and type (DES: value)
  const desMatch = trimmed.match(/^(.+?)\s+DES:([^\s]+)/i);
  if (desMatch) {
    const company = desMatch[1].trim().replace(/\s+/g, ' ');
    const desType = desMatch[2].replace(/_/g, ' ').replace(/\//g, '-');
    return `${toTitle(company)} - ${toTitle(desType)}`;
  }

  // Fallback: strip ACH ID tokens, title-case result
  const cleaned = trimmed
    .replace(/\s+DES:[^\s]+/gi, '')
    .replace(/\s+ID:[^\s]+/gi, '')
    .replace(/\s+INDN:[A-Za-z\s]+(?=\s+(CO|PPD|WEB|CCD|$))/gi, '')
    .replace(/\s+CO\s+ID:[^\s]+/gi, '')
    .replace(/\s+PMT\s+INFO:[^\s]+/gi, '')
    .replace(/\b(PPD|WEB|CCD|TEL|ARC|BOC)\b/gi, '')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length >= 3 ? toTitle(cleaned) : toTitle(trimmed);
}

// ── Deduplication ────────────────────────────────────────────────────────────

function deduplicate(txns: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  return txns.filter(t => {
    const key = `${t.date}|${t.bankDescription}|${t.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function extractTransactionsFromPDF(file: File, taxYear: number): Promise<Transaction[]> {
  const lines = await extractLinesFromPDF(file);
  const txns = parseTransactionsFromLines(lines, file.name, taxYear);
  return deduplicate(txns);
}

// ── Raw bank statement text → normalized description mapping ─────────────────

const BANK_TO_NORMALIZED: Array<{ raw: string; normalized: string }> = [
  { raw: 'ACH CREDIT INTUIT PYMT SOLN CONSULT PMT REF#4829301',        normalized: 'Client Invoice Payment - Consulting Services' },
  { raw: 'ACH CREDIT BILL.COM INVOICE PMT 4829-SVC',                   normalized: 'Client Invoice Payment - Consulting Services' },
  { raw: 'WIRE IN CLIENT PYMT INV#1042 REF 20250103MMQFMP4K',          normalized: 'Client Invoice Payment - Consulting Services' },
  { raw: 'ACH CREDIT STRIPE TRANSFER ST-A7X2P9Q1R3',                   normalized: 'Stripe Deposit - Online Sales' },
  { raw: 'STRIPE PAYOUT STRIPE ST-8Y3K1W5Z2M',                        normalized: 'Stripe Deposit - Online Sales' },
  { raw: 'ACH CREDIT STRIPE PAYMENTS ST-C4N7B2V6T9',                   normalized: 'Stripe Deposit - Online Sales' },
  { raw: 'INCOMING WIRE TRANSFER ORIGINATOR PROJECT MILESTONE PMT',    normalized: 'Wire Transfer - Project Milestone' },
  { raw: 'FED WIRE CREDIT VIA JPMORGAN CHASE/ACCT ENDING 4421',        normalized: 'Wire Transfer - Project Milestone' },
  { raw: 'WIRE TRANSFER CREDIT PROJECT PMT ACCT#9832-XX REF5591',      normalized: 'Wire Transfer - Project Milestone' },
  { raw: 'ACH CREDIT RETAINER FEE MONTHLY SVC AGREEMENT 2025',         normalized: 'ACH Credit - Monthly Retainer' },
  { raw: 'DIRECT DEP RETAINER PYMT REF#77-2025-0113',                  normalized: 'ACH Credit - Monthly Retainer' },
  { raw: 'ACH CREDIT MONTHLY RETAINER CONTRACT ID#4400-B',             normalized: 'ACH Credit - Monthly Retainer' },
  { raw: 'SQ *SQUARE INC PAYMENT 800-788-5188 CA REF#SQ-8812',         normalized: 'Square Payment - Service Revenue' },
  { raw: 'SQUARE INC DES:PAYMENT ID:20250108 CO:SQUARE INC',           normalized: 'Square Payment - Service Revenue' },
  { raw: 'ZELLE PAYMENT FROM ACCT ENDING 7841 REF#ZLL-2025-0107',      normalized: 'Zelle Received - Invoice #1042' },
  { raw: 'P2P CREDIT ZELLE INV 1042 CUSTOMER PMT',                     normalized: 'Zelle Received - Invoice #1042' },
  { raw: 'ADP TotalSource DES:PAYROLL ID:0102 CO:ADP LLC',             normalized: 'ADP Payroll - Direct Deposit' },
  { raw: 'ACH DEBIT ADP PAYROLL FEES ADP-TX 0123456789 CCD',           normalized: 'ADP Payroll - Direct Deposit' },
  { raw: 'ACH PMT ADP PAYROLL 012345-XXXXXX PAYROLL DEBIT',            normalized: 'ADP Payroll - Direct Deposit' },
  { raw: 'CHECK #1042 MAIN ST PROPERTIES LLC SUITE 200 RENT',          normalized: 'Office Lease - Main Street Suite 200' },
  { raw: 'ACH DEBIT MAIN ST PROP MGMT LEASE PMT STE200',               normalized: 'Office Lease - Main Street Suite 200' },
  { raw: 'CK 1042 OFFICE RENT MAIN STREET PROPERTIES',                 normalized: 'Office Lease - Main Street Suite 200' },
  { raw: 'PGE BILL PAYMENT PG&E DES:ELECTRIC ID:9900-2201',            normalized: 'PG&E Electric Bill' },
  { raw: 'ACH DEBIT PACIFIC GAS AND ELECTRIC 800-743-5000',            normalized: 'PG&E Electric Bill' },
  { raw: 'BILL PAY PGE ELECTRIC ACCT#5500-224-7891',                   normalized: 'PG&E Electric Bill' },
  { raw: 'AT&T DES:PAYMENT ID:288-555-0100 CO:AT&T',                   normalized: 'AT&T Business Internet' },
  { raw: 'ACH DEBIT ATT PAYMENT 800-288-2020 ACCT#288-555',            normalized: 'AT&T Business Internet' },
  { raw: 'BILL PAY AT&T BUSINESS ACCT#288-555-0100 001',               normalized: 'AT&T Business Internet' },
  { raw: 'ACH DEBIT HISCOX INSURANCE PREMIUM ACCT#HIX-8842211',        normalized: 'Hiscox Business Insurance Premium' },
  { raw: 'HISCOX INC DES:INS PREM ID:8842211 CO:HISCOX',              normalized: 'Hiscox Business Insurance Premium' },
  { raw: 'INSURANCE PREMIUM HISCOX USA POLICY#BOP-8842211',            normalized: 'Hiscox Business Insurance Premium' },
  { raw: 'GOOGLE *ADS1234567 CC CHARGE 650-253-0000 CA',               normalized: 'Google Ads - Marketing Campaign' },
  { raw: 'DEBIT GOOGLE ADS CAMPAIGN 1234-5678 GOOGLE.COM/ADS',         normalized: 'Google Ads - Marketing Campaign' },
  { raw: 'GOOGLE LLC DES:GOOGLE ADS ID:G-AD1234567',                   normalized: 'Google Ads - Marketing Campaign' },
  { raw: 'CHECK #2201 JOHNSON ACCOUNTING SVCS QUARTERLY REVIEW',       normalized: 'CPA Services - Quarterly Review' },
  { raw: 'ACH DEBIT JOHNSON CPA GROUP LLC Q1 REVIEW FEE',              normalized: 'CPA Services - Quarterly Review' },
  { raw: 'CK 2201 ACCOUNTING SERVICES QUARTERLY 2025',                 normalized: 'CPA Services - Quarterly Review' },
  { raw: 'AMZN MKTP US*9K3X8P2Q1 AMZN.COM/BILL WA',                   normalized: 'Amazon Business - Office Supplies' },
  { raw: 'AMAZON BUSINESS PURCHASE AMZN.COM/BILL 866-216-1072',        normalized: 'Amazon Business - Office Supplies' },
  { raw: 'AMAZON.COM*AB7C2D4E5 AMAZON.COM/BILL WA SUPPLIES',           normalized: 'Amazon Business - Office Supplies' },
  { raw: 'MONTHLY SERVICE FEE BUSINESS CHECKING ACCOUNT',              normalized: 'Bank Monthly Service Fee' },
  { raw: 'SERVICE CHARGE BUSINESS ANALYSIS FEE PER AGREEMENT',         normalized: 'Bank Monthly Service Fee' },
  { raw: 'MONTHLY MAINT FEE BUS CHK ACCT#0000XXXX1234',                normalized: 'Bank Monthly Service Fee' },
  { raw: 'ACH DEBIT SBA LOAN SVCS SBA PYMT LOAN#7-123456-001',         normalized: 'SBA Loan Payment' },
  { raw: 'SBA LOAN PAYMENT DES:SBA PMT ID:7123456 CO:SBA',             normalized: 'SBA Loan Payment' },
  { raw: 'LOAN PAYMENT SBA LOAN#7-123456 PRIN+INT MONTHLY PMT',        normalized: 'SBA Loan Payment' },
  { raw: 'CHECK #3301 WHOLESALE DISTRIBUTORS INC INV#WD-44921',        normalized: 'Wholesale Supplier - Inventory Purchase' },
  { raw: 'ACH DEBIT WHOLESALE SUPPLY CO INV#44921 NET30',              normalized: 'Wholesale Supplier - Inventory Purchase' },
  { raw: 'ACH DEBIT INDUSTRIAL SUPPLY CO RAW MATL INV#9812',           normalized: 'Raw Materials - Manufacturing Supplies' },
  { raw: 'CHECK #4102 RAW MATERIALS SUPPLIER INV#IS-9812',             normalized: 'Raw Materials - Manufacturing Supplies' },
  { raw: 'ACH DEBIT EFTPS USATAXPYMT IRS USA TAX PMT Q4',              normalized: 'IRS Estimated Tax Payment Q4' },
  { raw: 'IRS EFTPS DES:USATAXPYMT ID:2025Q4 CO:IRS USA',             normalized: 'IRS Estimated Tax Payment Q4' },
  { raw: 'ELECTRONIC FED TAX PMT EFTPS Q4 ESTIMATE 2025',              normalized: 'IRS Estimated Tax Payment Q4' },
  { raw: 'ACH DEBIT EFTPS USATAXPYMT IRS USA TAX PMT Q1',              normalized: 'IRS Estimated Tax Payment Q1' },
  { raw: 'IRS EFTPS DES:USATAXPYMT ID:2025Q1 CO:IRS USA',             normalized: 'IRS Estimated Tax Payment Q1' },
  { raw: 'ELECTRONIC FED TAX PMT EFTPS Q1 ESTIMATE 2025',              normalized: 'IRS Estimated Tax Payment Q1' },
];

const RAW_BY_NORMALIZED = BANK_TO_NORMALIZED.reduce<Record<string, string[]>>((acc, { raw, normalized }) => {
  if (!acc[normalized]) acc[normalized] = [];
  acc[normalized].push(raw);
  return acc;
}, {});

function pickRaw(normalized: string): string {
  const pool = RAW_BY_NORMALIZED[normalized];
  if (pool && pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  return normalized.toUpperCase().replace(/-/g, ' ').slice(0, 55);
}

// ── Demo transaction generator ───────────────────────────────────────────────

export function generateDemoTransactions(taxYear: number, businessName: string): Transaction[] {
  const transactions: Transaction[] = [];

  const revenueItems = [
    'Client Invoice Payment - Consulting Services',
    'Stripe Deposit - Online Sales',
    'Wire Transfer - Project Milestone',
    'ACH Credit - Monthly Retainer',
    'Square Payment - Service Revenue',
    'Zelle Received - Invoice #1042',
  ];

  const expenseItems: Array<{ desc: string; amt: number; cat: AccountCategory }> = [
    { desc: 'ADP Payroll - Direct Deposit',          amt: -8500,  cat: 'Salaries & Wages' },
    { desc: 'Office Lease - Main Street Suite 200',  amt: -3200,  cat: 'Rent/Lease' },
    { desc: 'PG&E Electric Bill',                    amt: -420,   cat: 'Utilities' },
    { desc: 'AT&T Business Internet',                amt: -180,   cat: 'Utilities' },
    { desc: 'Hiscox Business Insurance Premium',     amt: -310,   cat: 'Insurance' },
    { desc: 'Google Ads - Marketing Campaign',       amt: -650,   cat: 'Marketing & Advertising' },
    { desc: 'CPA Services - Quarterly Review',       amt: -900,   cat: 'Professional Services' },
    { desc: 'Amazon Business - Office Supplies',     amt: -245,   cat: 'Office & Supplies' },
    { desc: 'Bank Monthly Service Fee',              amt: -35,    cat: 'Bank Fees' },
    { desc: 'SBA Loan Payment',                      amt: -1200,  cat: 'Loan Payment' },
  ];

  for (let month = 1; month <= 12; month++) {
    const revenueCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < revenueCount; i++) {
      const amount = parseFloat((8000 + Math.random() * 15000).toFixed(2));
      const day = 1 + Math.floor(Math.random() * 28);
      const date = `${taxYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const description = revenueItems[Math.floor(Math.random() * revenueItems.length)];
      transactions.push({
        id: crypto.randomUUID(), date,
        bankDescription: pickRaw(description),
        description,
        amount, type: 'Deposit', category: 'Revenue', confidence: 85,
        sourceFile: `statement_${String(month).padStart(2, '0')}_${taxYear}.pdf`,
        month, year: taxYear,
      });
    }

    for (const item of expenseItems) {
      const amount = parseFloat((item.amt * (1 + (Math.random() * 0.1 - 0.05))).toFixed(2));
      const day = 1 + Math.floor(Math.random() * 28);
      const date = `${taxYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      transactions.push({
        id: crypto.randomUUID(), date,
        bankDescription: pickRaw(item.desc),
        description: item.desc,
        amount, type: 'ACH', category: item.cat, confidence: 90,
        sourceFile: `statement_${String(month).padStart(2, '0')}_${taxYear}.pdf`,
        month, year: taxYear,
      });
    }
  }

  const oneTime: Array<Omit<Transaction, 'id'>> = [
    {
      date: `${taxYear}-03-15`, description: 'Wholesale Supplier - Inventory Purchase',
      bankDescription: 'CHECK #3301 WHOLESALE DISTRIBUTORS INC INV#WD-44921',
      amount: -12500, type: 'Check', category: 'COGS', confidence: 88,
      sourceFile: `statement_03_${taxYear}.pdf`, month: 3, year: taxYear,
    },
    {
      date: `${taxYear}-09-08`, description: 'Raw Materials - Manufacturing Supplies',
      bankDescription: 'ACH DEBIT INDUSTRIAL SUPPLY CO RAW MATL INV#9812',
      amount: -8900, type: 'ACH', category: 'COGS', confidence: 85,
      sourceFile: `statement_09_${taxYear}.pdf`, month: 9, year: taxYear,
    },
    {
      date: `${taxYear}-01-02`, description: 'IRS Estimated Tax Payment Q4',
      bankDescription: 'ACH DEBIT EFTPS USATAXPYMT IRS USA TAX PMT Q4',
      amount: -3500, type: 'ACH', category: 'Tax Payment', confidence: 95,
      sourceFile: `statement_01_${taxYear}.pdf`, month: 1, year: taxYear,
    },
    {
      date: `${taxYear}-04-15`, description: 'IRS Estimated Tax Payment Q1',
      bankDescription: 'ACH DEBIT EFTPS USATAXPYMT IRS USA TAX PMT Q1',
      amount: -4200, type: 'ACH', category: 'Tax Payment', confidence: 95,
      sourceFile: `statement_04_${taxYear}.pdf`, month: 4, year: taxYear,
    },
    {
      date: `${taxYear}-06-10`,
      description: `Owner Draw - ${businessName}`,
      bankDescription: `TRANSFER OUT OWNER DRAW ${businessName.toUpperCase().slice(0, 18)} REF#OWN-${taxYear}-0610`,
      amount: -5000, type: 'Transfer', category: 'Owner Distribution', confidence: 88,
      sourceFile: `statement_06_${taxYear}.pdf`, month: 6, year: taxYear,
    },
  ];
  oneTime.forEach(t => transactions.push({ id: crypto.randomUUID(), ...t }));

  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}
