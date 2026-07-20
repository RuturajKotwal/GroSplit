import {
  BalanceMap,
  ExpenseCalculationObject,
  SettlementCalculationObject,
  SimplifiedTransaction,
} from '../types';

/**
 * Core business logic for calculating group balances and simplifying debts.
 */

/**
 * Calculates net balances for each member in a group given expenses and settlements.
 *
 * @param expenses - List of expense objects
 * @param settlements - List of settlement objects
 * @param members - List of member names in the group
 * @returns Object mapping member name to net balance in cents (positive = owed money, negative = owes money)
 */
export function calculateBalances(
  expenses: ExpenseCalculationObject[] = [],
  settlements: SettlementCalculationObject[] = [],
  members: string[] = []
): BalanceMap {
  const balances: BalanceMap = {};

  // Initialize all members with 0 balance
  for (const member of members) {
    balances[member] = 0;
  }

  // Helper to ensure member exists in balances map
  const ensureMember = (member: string): void => {
    if (balances[member] === undefined) {
      balances[member] = 0;
    }
  };

  // Process expenses
  for (const expense of expenses) {
    const { paidBy, amount, splitBetween, shares, ratios } = expense;

    if (!paidBy || typeof amount !== 'number' || amount <= 0) {
      continue;
    }

    ensureMember(paidBy);

    // Default splitBetween to all known members if unassigned or empty
    const participants: string[] =
      Array.isArray(splitBetween) && splitBetween.length > 0
        ? splitBetween
        : [...members];

    if (participants.length === 0) {
      continue;
    }

    for (const member of participants) {
      ensureMember(member);
    }

    // Determine split weights
    const weightMap = shares || ratios;
    let weights: Record<string, number> = {};
    let totalWeight = 0;

    if (weightMap && typeof weightMap === 'object') {
      for (const m of participants) {
        const w = Number(weightMap[m]) > 0 ? Number(weightMap[m]) : 0;
        weights[m] = w;
        totalWeight += w;
      }
    }

    // Fallback to equal split if weights are invalid or not provided
    if (totalWeight <= 0) {
      weights = {};
      for (const m of participants) {
        weights[m] = 1;
      }
      totalWeight = participants.length;
    }

    // Calculate base shares in cents (using Math.floor)
    const participantShares: Record<string, number> = {};
    let totalAllocated = 0;

    for (const m of participants) {
      const share = Math.floor((amount * weights[m]) / totalWeight);
      participantShares[m] = share;
      totalAllocated += share;
    }

    // Distribute remainder cents deterministically (alphabetically sorted participant names)
    const remainder = amount - totalAllocated;
    if (remainder > 0) {
      const sortedParticipants = [...participants].sort();
      for (let i = 0; i < remainder; i++) {
        const recipient = sortedParticipants[i % sortedParticipants.length];
        participantShares[recipient] += 1;
      }
    }

    // Update balances: payer gets credited full amount
    balances[paidBy] += amount;

    // Each participant gets debited their share
    for (const m of participants) {
      balances[m] -= participantShares[m];
    }
  }

  // Process settlements
  for (const settlement of settlements) {
    const { from, to, amount } = settlement;

    if (!from || !to || typeof amount !== 'number' || amount <= 0) {
      continue;
    }

    ensureMember(from);
    ensureMember(to);

    // Paying off debt increases 'from' balance towards 0 / positive
    balances[from] += amount;
    // Receiving repayment decreases 'to' balance towards 0 / negative
    balances[to] -= amount;
  }

  return balances;
}

interface DebtorCreditorNode {
  member: string;
  amount: number;
}

/**
 * Simplifies net balances into a minimal list of debt settlement transactions.
 * Uses a greedy matching algorithm matching largest debtor to largest creditor.
 *
 * @param balances - Net balance per member in cents
 * @returns Minimal list of settlement transactions
 */
export function simplifyDebts(
  balances: BalanceMap = {}
): SimplifiedTransaction[] {
  const debtors: DebtorCreditorNode[] = [];
  const creditors: DebtorCreditorNode[] = [];

  for (const [member, balance] of Object.entries(balances)) {
    if (balance < 0) {
      debtors.push({ member, amount: -balance });
    } else if (balance > 0) {
      creditors.push({ member, amount: balance });
    }
  }

  // Sort debtors descending by debt amount (largest debt first), break ties alphabetically
  debtors.sort(
    (a, b) => b.amount - a.amount || a.member.localeCompare(b.member)
  );

  // Sort creditors descending by credit amount (largest credit first), break ties alphabetically
  creditors.sort(
    (a, b) => b.amount - a.amount || a.member.localeCompare(b.member)
  );

  const transactions: SimplifiedTransaction[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0) {
      transactions.push({
        from: debtor.member,
        to: creditor.member,
        amount: settleAmount,
      });

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;
    }

    if (debtor.amount === 0) {
      d++;
    }
    if (creditor.amount === 0) {
      c++;
    }
  }

  return transactions;
}
