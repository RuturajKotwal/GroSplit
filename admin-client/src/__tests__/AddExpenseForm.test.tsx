import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AddExpenseForm } from '../components/AddExpenseForm';

describe('AddExpenseForm Component', () => {
  const members = ['Alice', 'Bob', 'Charlie'];

  it('validates required fields and shows error when submitted empty', async () => {
    const handleAdd = vi.fn();
    render(<AddExpenseForm members={members} onAddExpense={handleAdd} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Record Expense/i }));
    });

    expect(screen.getByTestId('form-error')).toHaveTextContent(
      'Please select a payer'
    );
    expect(handleAdd).not.toHaveBeenCalled();
  });

  it('submits valid expense payload with calculated cents', async () => {
    const handleAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddExpenseForm members={members} onAddExpense={handleAdd} />);

    // Select payer
    fireEvent.change(screen.getByTestId('payer-select'), {
      target: { value: 'Alice' },
    });

    // Enter amount (€25.50 -> 2550 cents)
    fireEvent.change(screen.getByTestId('amount-input'), {
      target: { value: '25.50' },
    });

    // Enter description
    fireEvent.change(screen.getByTestId('description-input'), {
      target: { value: 'Dinner' },
    });

    // Select participants (Select All checkbox)
    fireEvent.click(screen.getByLabelText(/Select All/i));

    // Submit form within act
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Record Expense/i }));
    });

    expect(handleAdd).toHaveBeenCalledWith({
      paidBy: 'Alice',
      amount: 2550,
      description: 'Dinner',
      splitBetween: ['Alice', 'Bob', 'Charlie'],
    });
  });
});
