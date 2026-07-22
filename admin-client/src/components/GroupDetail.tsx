import React from 'react';
import { ExpenseData } from '../api/client';

interface GroupDetailProps {
  expenses: ExpenseData[];
  balances: Record<string, number>;
  isLoading?: boolean;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({
  expenses,
  balances,
  isLoading = false,
}) => {
  return (
    <div
      className="group-detail-container"
      data-testid="group-detail-container"
    >
      <div className="balances-section">
        <h3>Net Balances</h3>
        {isLoading ? (
          <p className="loading-text">Calculating balances...</p>
        ) : Object.keys(balances).length === 0 ? (
          <p className="empty-text">No balances computed.</p>
        ) : (
          <div className="balances-grid" data-testid="balances-grid">
            {Object.entries(balances).map(([member, balanceCents]) => {
              const euroAmount = (Math.abs(balanceCents) / 100).toFixed(2);
              const isCreditor = balanceCents > 0;
              const isDebtor = balanceCents < 0;

              return (
                <div
                  key={member}
                  className={`balance-card ${
                    isCreditor ? 'creditor' : isDebtor ? 'debtor' : 'settled'
                  }`}
                  data-testid={`balance-card-${member}`}
                >
                  <span className="balance-member">{member}</span>
                  <span className="balance-amount">
                    {isCreditor && `+€${euroAmount} (owed)`}
                    {isDebtor && `-€${euroAmount} (owes)`}
                    {!isCreditor && !isDebtor && '€0.00 (settled)'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="expenses-section">
        <h3>Recorded Expenses ({expenses.length})</h3>
        {isLoading ? (
          <p className="loading-text">Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p className="empty-text">No expenses recorded yet.</p>
        ) : (
          <ul className="expenses-list" data-testid="expenses-list">
            {expenses.map((expense) => {
              const euroPrice = (expense.amount / 100).toFixed(2);
              return (
                <li
                  key={expense._id}
                  className="expense-item"
                  data-testid={`expense-item-${expense._id}`}
                >
                  <div className="expense-main">
                    <span className="expense-desc">{expense.description}</span>
                    <span className="expense-amount">€{euroPrice}</span>
                  </div>
                  <div className="expense-sub">
                    <span>
                      Paid by <strong>{expense.paidBy}</strong>
                    </span>
                    <span>Split: [{expense.splitBetween.join(', ')}]</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
