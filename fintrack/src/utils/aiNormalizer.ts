import type { Transaction, AccountCategory } from '../types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001'; // Fast + cheap for batch normalization
const BATCH_SIZE = 40; // transactions per API call

interface AiResult {
  description: string;
  category: AccountCategory;
  confidence: number;
}

const SYSTEM_PROMPT = `You are a CPA assistant helping categorize bank statement transactions for financial reporting.

For each transaction, return:
1. A clean human-readable description (remove technical ACH codes like "DES:", "ID:", "INDN:", "CO ID:", "PPD", "WEB", "CCD"; normalize vendor names to proper title case)
2. The best matching accounting category
3. Your confidence (0–100)

Valid categories (use exactly as written):
Revenue, COGS, Salaries & Wages, Rent/Lease, Utilities, Insurance, Marketing & Advertising,
Professional Services, Office & Supplies, Equipment & Maintenance, Bank Fees, Interest Income,
Interest Expense, Tax Payment, Owner Distribution, Owner Contribution, Loan Proceeds,
Loan Payment, Transfer, Other Income, Other Expense

Rules:
- Positive amounts = income/deposits; negative amounts = expenses/withdrawals
- Check payments → use payee context for category, or "Other Expense" if unknown
- Payroll/salary deposits → "Salaries & Wages" (if deposit), "Revenue" only if clearly customer payment
- "Zelle Transfer - [name]" = outbound payment → "Transfer" (NEVER Revenue)
- "Zelle Received - [name]" = inbound payment → "Revenue"
- Tax authority payments (IRS, state comptroller, EFTPS) → "Tax Payment"
- Return ONLY a JSON array, no markdown fences, no extra text
- Array length MUST equal the number of input transactions, in the same order`;

async function callClaudeAPI(apiKey: string, transactions: Transaction[]): Promise<AiResult[]> {
  const input = transactions.map((t, i) => ({
    i,
    date: t.date,
    amount: t.amount,
    raw: t.bankDescription,
  }));

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Normalize and categorize these ${transactions.length} bank transactions. Return a JSON array of {"description","category","confidence"} objects:\n\n${JSON.stringify(input, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? '';

  // Strip any accidental markdown fences
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed: AiResult[] = JSON.parse(cleaned);

  if (!Array.isArray(parsed) || parsed.length !== transactions.length) {
    throw new Error(`AI returned ${parsed.length} results for ${transactions.length} transactions`);
  }

  return parsed;
}

export async function normalizeWithAI(
  transactions: Transaction[],
  apiKey: string,
  onProgress?: (done: number, total: number) => void,
): Promise<Transaction[]> {
  const result: Transaction[] = [...transactions];
  const total = transactions.length;
  let done = 0;

  for (let start = 0; start < total; start += BATCH_SIZE) {
    const batch = transactions.slice(start, start + BATCH_SIZE);
    const aiResults = await callClaudeAPI(apiKey, batch);

    for (let j = 0; j < batch.length; j++) {
      const idx = start + j;
      const ai = aiResults[j];
      if (ai) {
        result[idx] = {
          ...result[idx],
          description: ai.description || result[idx].description,
          category: ai.category || result[idx].category,
          confidence: Math.min(100, Math.max(0, ai.confidence ?? result[idx].confidence)),
        };
      }
    }

    done += batch.length;
    onProgress?.(done, total);
  }

  return result;
}
