import type { AccountCategory, Transaction } from '../types';

const STORAGE_KEY = 'fintrack_category_overrides';

export function getOverrides(): Record<string, AccountCategory> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveOverride(description: string, category: AccountCategory): void {
  const overrides = getOverrides();
  // Exact match
  overrides[description] = category;
  // Prefix match: everything before " - " (e.g. "Zelle Transfer" from "Zelle Transfer - John")
  const separatorIdx = description.indexOf(' - ');
  if (separatorIdx > 0) {
    const prefix = description.slice(0, separatorIdx);
    overrides[prefix] = category;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // localStorage unavailable — silently skip
  }
}

export function applyOverrides(transactions: Transaction[]): Transaction[] {
  const overrides = getOverrides();
  if (Object.keys(overrides).length === 0) return transactions;

  return transactions.map(t => {
    // Exact match
    if (overrides[t.description] !== undefined) {
      return { ...t, category: overrides[t.description], confidence: 100 };
    }
    // Prefix match
    const separatorIdx = t.description.indexOf(' - ');
    if (separatorIdx > 0) {
      const prefix = t.description.slice(0, separatorIdx);
      if (overrides[prefix] !== undefined) {
        return { ...t, category: overrides[prefix], confidence: 100 };
      }
    }
    return t;
  });
}
