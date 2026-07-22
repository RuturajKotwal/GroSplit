export interface GroupData {
  _id: string;
  name: string;
  members: string[];
  createdAt?: string;
}

export interface ExpenseData {
  _id: string;
  groupId: string;
  paidBy: string;
  amount: number;
  description: string;
  date: string;
  splitBetween: string[];
}

export interface SettlementData {
  from: string;
  to: string;
  amount: number;
}

export interface BalanceResponse {
  groupId: string;
  balances: Record<string, number>;
}

export interface SuggestedSettlementsResponse {
  groupId: string;
  settlements: SettlementData[];
}

const DEFAULT_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/groups';
const API_KEY = import.meta.env.VITE_API_KEY || 'grosplit-dev-secret-key';

export async function fetchGroup(
  groupId: string,
  baseUrl = DEFAULT_BASE_URL
): Promise<GroupData> {
  const res = await fetch(`${baseUrl}/${groupId}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch group');
  }
  return res.json();
}

export async function createGroup(
  name: string,
  members: string[],
  baseUrl = DEFAULT_BASE_URL
): Promise<GroupData> {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ name, members }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create group');
  }
  return res.json();
}

export async function fetchExpenses(
  groupId: string,
  baseUrl = DEFAULT_BASE_URL
): Promise<ExpenseData[]> {
  const res = await fetch(`${baseUrl}/${groupId}/expenses`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch expenses');
  }
  return res.json();
}

export async function createExpense(
  groupId: string,
  expense: {
    paidBy: string;
    amount: number;
    description: string;
    splitBetween?: string[];
  },
  baseUrl = DEFAULT_BASE_URL
): Promise<ExpenseData> {
  const res = await fetch(`${baseUrl}/${groupId}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify(expense),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create expense');
  }
  return res.json();
}

export async function fetchBalances(
  groupId: string,
  baseUrl = DEFAULT_BASE_URL
): Promise<BalanceResponse> {
  const res = await fetch(`${baseUrl}/${groupId}/balances`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch balances');
  }
  return res.json();
}

export async function fetchSuggestedSettlements(
  groupId: string,
  baseUrl = DEFAULT_BASE_URL
): Promise<SuggestedSettlementsResponse> {
  const res = await fetch(`${baseUrl}/${groupId}/settlements/suggested`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch suggested settlements');
  }
  return res.json();
}

export async function createSettlement(
  groupId: string,
  settlement: {
    from: string;
    to: string;
    amount: number;
  },
  baseUrl = DEFAULT_BASE_URL
): Promise<SettlementData> {
  const res = await fetch(`${baseUrl}/${groupId}/settlements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify(settlement),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to record settlement');
  }
  return res.json();
}
