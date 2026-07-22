import React, { useEffect, useState } from 'react';
import {
  GroupData,
  ExpenseData,
  SettlementData,
  fetchGroup,
  createGroup,
  fetchExpenses,
  createExpense,
  fetchBalances,
  fetchSuggestedSettlements,
  createSettlement,
} from './api/client';
import { GroupList } from './components/GroupList';
import { GroupDetail } from './components/GroupDetail';
import { AddExpenseForm } from './components/AddExpenseForm';
import { SettlementView } from './components/SettlementView';

export const App: React.FC = () => {
  const [currentGroup, setCurrentGroup] = useState<GroupData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [suggestedSettlements, setSuggestedSettlements] = useState<
    SettlementData[]
  >([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'add-expense' | 'settlements'
  >('overview');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or fetch initial group
  useEffect(() => {
    const savedGroupId = localStorage.getItem('grosplit_admin_group_id');
    if (savedGroupId) {
      loadGroupData(savedGroupId);
    }
  }, []);

  const loadGroupData = async (groupId: string) => {
    setLoading(true);
    setError(null);
    try {
      const group = await fetchGroup(groupId);
      setCurrentGroup(group);
      localStorage.setItem('grosplit_admin_group_id', group._id);

      const [expData, balData, setResp] = await Promise.all([
        fetchExpenses(group._id).catch(() => []),
        fetchBalances(group._id).catch(() => ({
          groupId: group._id,
          balances: {},
        })),
        fetchSuggestedSettlements(group._id).catch(() => ({
          groupId: group._id,
          settlements: [],
        })),
      ]);

      setExpenses(expData);
      setBalances(balData.balances);
      setSuggestedSettlements(setResp.settlements);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (name: string, members: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const group = await createGroup(name, members);
      setCurrentGroup(group);
      localStorage.setItem('grosplit_admin_group_id', group._id);
      setExpenses([]);
      setBalances({});
      setSuggestedSettlements([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (expense: {
    paidBy: string;
    amount: number;
    description: string;
    splitBetween: string[];
  }) => {
    if (!currentGroup) return;
    setLoading(true);
    setError(null);
    try {
      await createExpense(currentGroup._id, expense);
      await loadGroupData(currentGroup._id);
      setActiveTab('overview');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordSettlement = async (
    from: string,
    to: string,
    amount: number
  ) => {
    if (!currentGroup) return;
    setLoading(true);
    setError(null);
    try {
      await createSettlement(currentGroup._id, { from, to, amount });
      await loadGroupData(currentGroup._id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-app">
      <header className="app-header">
        <div className="header-inner">
          <h1>GroSplit Admin Client</h1>
          <span className="badge-pill">React + TypeScript</span>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="alert-banner" data-testid="global-error">
            {error}
          </div>
        )}

        <GroupList
          currentGroup={currentGroup}
          onCreateGroup={handleCreateGroup}
          onSelectGroupId={loadGroupData}
          isLoading={loading}
        />

        {currentGroup && (
          <>
            <nav className="tab-navigation">
              <button
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
                data-testid="tab-overview"
              >
                Overview & Balances
              </button>
              <button
                className={`tab-btn ${activeTab === 'add-expense' ? 'active' : ''}`}
                onClick={() => setActiveTab('add-expense')}
                data-testid="tab-add-expense"
              >
                + Add Expense
              </button>
              <button
                className={`tab-btn ${activeTab === 'settlements' ? 'active' : ''}`}
                onClick={() => setActiveTab('settlements')}
                data-testid="tab-settlements"
              >
                Settlements & Repayments
              </button>
            </nav>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <GroupDetail
                  expenses={expenses}
                  balances={balances}
                  isLoading={loading}
                />
              )}
              {activeTab === 'add-expense' && (
                <AddExpenseForm
                  members={currentGroup.members}
                  onAddExpense={handleAddExpense}
                  isLoading={loading}
                />
              )}
              {activeTab === 'settlements' && (
                <SettlementView
                  members={currentGroup.members}
                  suggestedSettlements={suggestedSettlements}
                  onRecordSettlement={handleRecordSettlement}
                  isLoading={loading}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
