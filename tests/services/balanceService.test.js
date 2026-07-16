const {
  calculateBalances,
  simplifyDebts,
} = require('../../src/services/balanceService');

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
      const settlements = [];

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

      // Alice is sorted first alphabetically, so Alice takes the extra 1 cent share (334)
      // Alice balance: +1000 (as payer) - 334 (share) = +666
      // Bob balance: -333
      // Charlie balance: -333
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
        Alice: 1000, // Paid 1000, not in splitBetween
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
          shares: { Alice: 2, Bob: 1, Charlie: 1 }, // Total 4 parts: Alice 2000, Bob 1000, Charlie 1000
        },
      ];

      const balances = calculateBalances(expenses, [], members);

      expect(balances).toEqual({
        Alice: 2000, // +4000 - 2000
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
        Alice: 1000, // Was +2000, received 1000 settlement (-1000) -> +1000
        Bob: 0, // Was -1000, paid 1000 settlement (+1000) -> 0
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
      // Alice is owed 1000, Bob net 0, Charlie owes 1000
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

      // Step 1: Charlie (4000) pays Alice (5000) -> 4000. Alice left with 1000 credit.
      // Step 2: David (3000) pays Alice remaining (1000) -> 1000. David left with 2000 debt.
      // Step 3: David (2000) pays Bob (2000) -> 2000.
      expect(transactions).toEqual([
        { from: 'Charlie', to: 'Alice', amount: 4000 },
        { from: 'David', to: 'Alice', amount: 1000 },
        { from: 'David', to: 'Bob', amount: 2000 },
      ]);

      // Verification: Total transferred must equal total positive balances
      const totalTransferred = transactions.reduce((sum, t) => sum + t.amount, 0);
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

      // Alphabetical sorting breaks ties: Charlie (-1000) pays Alice (+1000), David (-1000) pays Bob (+1000)
      expect(transactions).toEqual([
        { from: 'Charlie', to: 'Alice', amount: 1000 },
        { from: 'David', to: 'Bob', amount: 1000 },
      ]);
    });
  });
});
