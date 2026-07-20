import {
  calculateBalances,
  simplifyDebts,
} from '../../src/services/balanceService';

describe('balanceService', () => {
  describe('calculateBalances', () => {
    it('should calculate balances for equal split across all members', () => {
      const members = ['Alice', 'Bob', 'Charlie'];
      const expenses = [
        {
          paidBy: 'Alice',
          amount: 3000,
          splitBetween: ['Alice', 'Bob', 'Charlie'],
        },
      ];
      const settlements: Array<{ from: string; to: string; amount: number }> =
        [];

      const balances = calculateBalances(expenses, settlements, members);

      expect(balances).toEqual({
        Alice: 2000,
        Bob: -1000,
        Charlie: -1000,
      });

      // Verification: sum must be zero
      const total = Object.values(balances).reduce((sum, b) => sum + b, 0);
      expect(total).toBe(0);
    });

    it('should assign remainder cents deterministically (alphabetically)', () => {
      const members = ['Alice', 'Bob', 'Charlie'];
      const expenses = [
        {
          paidBy: 'Alice',
          amount: 1000, // 1000 / 3 = 333 remainder 1
          splitBetween: ['Alice', 'Bob', 'Charlie'],
        },
      ];

      const balances = calculateBalances(expenses, [], members);

      expect(balances).toEqual({
        Alice: 666,
        Bob: -333,
        Charlie: -333,
      });

      const total = Object.values(balances).reduce((sum, b) => sum + b, 0);
      expect(total).toBe(0);
    });

    it('should calculate balances when splitBetween is a subset of members', () => {
      const members = ['Alice', 'Bob', 'Charlie'];
      const expenses = [
        {
          paidBy: 'Alice',
          amount: 1000,
          splitBetween: ['Bob', 'Charlie'],
        },
      ];

      const balances = calculateBalances(expenses, [], members);

      expect(balances).toEqual({
        Alice: 1000,
        Bob: -500,
        Charlie: -500,
      });

      const total = Object.values(balances).reduce((sum, b) => sum + b, 0);
      expect(total).toBe(0);
    });

    it('should support custom split ratios/shares', () => {
      const members = ['Alice', 'Bob', 'Charlie'];
      const expenses = [
        {
          paidBy: 'Alice',
          amount: 4000,
          splitBetween: ['Alice', 'Bob', 'Charlie'],
          shares: { Alice: 2, Bob: 1, Charlie: 1 },
        },
      ];

      const balances = calculateBalances(expenses, [], members);

      expect(balances).toEqual({
        Alice: 2000,
        Bob: -1000,
        Charlie: -1000,
      });

      const total = Object.values(balances).reduce((sum, b) => sum + b, 0);
      expect(total).toBe(0);
    });

    it('should adjust balances with settlements', () => {
      const members = ['Alice', 'Bob', 'Charlie'];
      const expenses = [
        {
          paidBy: 'Alice',
          amount: 3000,
          splitBetween: ['Alice', 'Bob', 'Charlie'],
        },
      ];
      const settlements = [
        {
          from: 'Bob',
          to: 'Alice',
          amount: 1000,
        },
      ];

      const balances = calculateBalances(expenses, settlements, members);

      expect(balances).toEqual({
        Alice: 1000,
        Bob: 0,
        Charlie: -1000,
      });

      const total = Object.values(balances).reduce((sum, b) => sum + b, 0);
      expect(total).toBe(0);
    });

    it('should handle duplicate or multiple settlements correctly', () => {
      const members = ['Alice', 'Bob'];
      const expenses = [
        {
          paidBy: 'Alice',
          amount: 2000,
          splitBetween: ['Alice', 'Bob'],
        },
      ];
      const settlements = [
        { from: 'Bob', to: 'Alice', amount: 500 },
        { from: 'Bob', to: 'Alice', amount: 500 },
      ];

      const balances = calculateBalances(expenses, settlements, members);

      expect(balances).toEqual({
        Alice: 0,
        Bob: 0,
      });
    });

    it('should return all 0s for empty expenses and settlements', () => {
      const members = ['Alice', 'Bob'];
      const balances = calculateBalances([], [], members);

      expect(balances).toEqual({
        Alice: 0,
        Bob: 0,
      });
    });

    it('should dynamically include members not in the initial members array', () => {
      const members = ['Alice'];
      const expenses = [
        {
          paidBy: 'Alice',
          amount: 1000,
          splitBetween: ['Alice', 'David'],
        },
      ];

      const balances = calculateBalances(expenses, [], members);

      expect(balances).toEqual({
        Alice: 500,
        David: -500,
      });
    });

    it('should safely skip malformed or non-positive expenses and settlements', () => {
      const expenses = [
        { paidBy: '', amount: 1000 },
        { paidBy: 'Alice', amount: 0 },
        { paidBy: 'Alice', amount: 1000, splitBetween: [] },
      ];
      const settlements = [
        { from: '', to: 'Alice', amount: 500 },
        { from: 'Bob', to: 'Alice', amount: -100 },
      ];

      const balances = calculateBalances(expenses, settlements, []);
      expect(balances).toEqual({ Alice: 0 });
    });
  });

  describe('simplifyDebts', () => {
    it('should return empty list when all balances are zero', () => {
      const balances = { Alice: 0, Bob: 0, Charlie: 0 };
      const transactions = simplifyDebts(balances);
      expect(transactions).toEqual([]);
    });

    it('should exclude members with zero balance from transactions', () => {
      const balances = { Alice: 1000, Bob: -1000, Charlie: 0 };
      const transactions = simplifyDebts(balances);
      expect(transactions).toEqual([
        { from: 'Bob', to: 'Alice', amount: 1000 },
      ]);
    });

    it('should resolve a 3-person chain debt (A owes B, B owes C -> A owes C)', () => {
      const balances = { Alice: 1000, Bob: 0, Charlie: -1000 };
      const transactions = simplifyDebts(balances);
      expect(transactions).toEqual([
        { from: 'Charlie', to: 'Alice', amount: 1000 },
      ]);
    });

    it('should greedily simplify complex multi-person debts', () => {
      const balances = {
        Alice: 5000,
        Bob: 2000,
        Charlie: -4000,
        David: -3000,
      };

      const transactions = simplifyDebts(balances);

      expect(transactions).toEqual([
        { from: 'Charlie', to: 'Alice', amount: 4000 },
        { from: 'David', to: 'Alice', amount: 1000 },
        { from: 'David', to: 'Bob', amount: 2000 },
      ]);

      const totalTransferred = transactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );
      expect(totalTransferred).toBe(7000);
    });

    it('should handle tied amounts deterministically using member names', () => {
      const balances = {
        Alice: 1000,
        Bob: 1000,
        Charlie: -1000,
        David: -1000,
      };

      const transactions = simplifyDebts(balances);

      expect(transactions).toEqual([
        { from: 'Charlie', to: 'Alice', amount: 1000 },
        { from: 'David', to: 'Bob', amount: 1000 },
      ]);
    });
  });
});
