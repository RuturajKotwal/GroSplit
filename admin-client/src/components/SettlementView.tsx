import React, { useState } from 'react';
import { SettlementData } from '../api/client';

interface SettlementViewProps {
  members: string[];
  suggestedSettlements: SettlementData[];
  onRecordSettlement: (
    from: string,
    to: string,
    amount: number
  ) => Promise<void>;
  isLoading?: boolean;
}

export const SettlementView: React.FC<SettlementViewProps> = ({
  members,
  suggestedSettlements,
  onRecordSettlement,
  isLoading = false,
}) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = parseFloat(amount);
    if (!from || !to) {
      setError('Please select both payer and recipient');
      return;
    }
    if (from === to) {
      setError('Payer and recipient cannot be the same person');
      return;
    }
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid positive repayment amount');
      return;
    }

    try {
      await onRecordSettlement(from, to, Math.round(price * 100));
      setFrom('');
      setTo('');
      setAmount('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="settlement-view-container" data-testid="settlement-view">
      <div className="suggested-section">
        <h3>Suggested Debt Simplifications</h3>
        {suggestedSettlements.length === 0 ? (
          <p className="empty-text">
            All debts are settled! No repayments needed.
          </p>
        ) : (
          <ul className="settlements-list" data-testid="suggested-list">
            {suggestedSettlements.map((tx, index) => {
              const euroAmount = (tx.amount / 100).toFixed(2);
              return (
                <li
                  key={index}
                  className="settlement-item"
                  data-testid={`suggested-item-${index}`}
                >
                  <span className="tx-from">
                    <strong>{tx.from}</strong>
                  </span>
                  <span className="tx-arrow">pays &rarr;</span>
                  <span className="tx-to">
                    <strong>{tx.to}</strong>
                  </span>
                  <span className="tx-amount">€{euroAmount}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="record-settlement-form"
        data-testid="settlement-form"
      >
        <h3>Record a Repayment</h3>
        {error && <p className="error-banner">{error}</p>}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="settleFrom">From (Payer)</label>
            <select
              id="settleFrom"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              data-testid="settle-from"
            >
              <option value="">Select</option>
              {members.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="settleTo">To (Recipient)</label>
            <select
              id="settleTo"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              data-testid="settle-to"
            >
              <option value="">Select</option>
              {members.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="settleAmount">Amount (€)</label>
            <input
              id="settleAmount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="settle-amount"
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          Record Settlement
        </button>
      </form>
    </div>
  );
};
