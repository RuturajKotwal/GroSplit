import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GroupDetail } from '../components/GroupDetail';

describe('GroupDetail Component', () => {
  const mockExpenses = [
    {
      _id: 'exp1',
      groupId: 'g1',
      paidBy: 'Alice',
      amount: 3000,
      description: 'Groceries',
      date: '2026-08-16T12:00:00Z',
      splitBetween: ['Alice', 'Bob'],
    },
  ];

  const mockBalances = {
    Alice: 1500,
    Bob: -1500,
    Charlie: 0,
  };

  it('renders color-coded net balances for all members', () => {
    render(<GroupDetail expenses={mockExpenses} balances={mockBalances} />);

    // Alice should have +€15.00 (owed)
    const aliceCard = screen.getByTestId('balance-card-Alice');
    expect(aliceCard).toHaveClass('creditor');
    expect(aliceCard).toHaveTextContent('+€15.00 (owed)');

    // Bob should have -€15.00 (owes)
    const bobCard = screen.getByTestId('balance-card-Bob');
    expect(bobCard).toHaveClass('debtor');
    expect(bobCard).toHaveTextContent('-€15.00 (owes)');

    // Charlie should be settled
    const charlieCard = screen.getByTestId('balance-card-Charlie');
    expect(charlieCard).toHaveClass('settled');
    expect(charlieCard).toHaveTextContent('€0.00 (settled)');
  });

  it('renders recorded expenses list with formatted euro amount and details', () => {
    render(<GroupDetail expenses={mockExpenses} balances={mockBalances} />);

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('€30.00')).toBeInTheDocument();
    expect(screen.getByText(/Paid by/i)).toHaveTextContent('Alice');
    expect(screen.getByText(/Split: \[Alice, Bob\]/i)).toBeInTheDocument();
  });
});
