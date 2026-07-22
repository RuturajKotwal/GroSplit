import React, { useState } from 'react';

interface AddExpenseFormProps {
  members: string[];
  onAddExpense: (expense: {
    paidBy: string;
    amount: number;
    description: string;
    splitBetween: string[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export const AddExpenseForm: React.FC<AddExpenseFormProps> = ({
  members,
  onAddExpense,
  isLoading = false,
}) => {
  const [paidBy, setPaidBy] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);

  // Toggle participant
  const toggleParticipant = (member: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member]
    );
  };

  // Select all participants
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedParticipants([...members]);
    } else {
      setSelectedParticipants([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = parseFloat(amount);
    if (!paidBy) {
      setError('Please select a payer');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }
    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    try {
      await onAddExpense({
        paidBy,
        description: description.trim(),
        amount: Math.round(price * 100),
        splitBetween: selectedParticipants,
      });

      // Reset form
      setDescription('');
      setAmount('');
      setPaidBy('');
      setSelectedParticipants([]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form
      className="add-expense-form"
      onSubmit={handleSubmit}
      data-testid="add-expense-form"
    >
      <h3>Add New Expense</h3>
      {error && (
        <p className="error-banner" data-testid="form-error">
          {error}
        </p>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="payer">Payer (Who paid?)</label>
          <select
            id="payer"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            data-testid="payer-select"
          >
            <option value="">Select Payer</option>
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount (€)</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            data-testid="amount-input"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <input
          id="description"
          type="text"
          placeholder="e.g. Weekly Groceries"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          data-testid="description-input"
        />
      </div>

      <div className="form-group">
        <label>Split Between</label>
        <div className="select-all-row">
          <label>
            <input
              type="checkbox"
              checked={
                members.length > 0 &&
                selectedParticipants.length === members.length
              }
              onChange={handleSelectAll}
            />{' '}
            Select All
          </label>
        </div>
        <div
          className="participants-checkboxes"
          data-testid="participants-checkboxes"
        >
          {members.map((member) => (
            <label key={member} className="checkbox-label">
              <input
                type="checkbox"
                value={member}
                checked={selectedParticipants.includes(member)}
                onChange={() => toggleParticipant(member)}
              />
              {member}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        Record Expense
      </button>
    </form>
  );
};
