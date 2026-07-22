import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GroupList } from '../components/GroupList';

describe('GroupList Component', () => {
  const mockGroup = {
    _id: '66bc1f77bcf86cd799439011',
    name: 'Munich Apartment',
    members: ['Alice', 'Bob', 'Charlie'],
  };

  it('renders group name, ID, and member badges when currentGroup is provided', () => {
    render(
      <GroupList
        currentGroup={mockGroup}
        onCreateGroup={vi.fn()}
        onSelectGroupId={vi.fn()}
      />
    );

    expect(screen.getByText('Munich Apartment')).toBeInTheDocument();
    expect(screen.getByText('66bc1f77bcf86cd799439011')).toBeInTheDocument();
    expect(screen.getByText(/3 members/i)).toBeInTheDocument();
  });

  it('toggles new group creation form and submits data', async () => {
    const handleCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <GroupList
        currentGroup={null}
        onCreateGroup={handleCreate}
        onSelectGroupId={vi.fn()}
      />
    );

    expect(screen.getByText('No Active Group')).toBeInTheDocument();

    // Click "+ New Group" button
    fireEvent.click(screen.getByRole('button', { name: /\+ New Group/i }));

    // Verify form is visible
    expect(screen.getByTestId('create-group-form')).toBeInTheDocument();

    // Fill in inputs
    fireEvent.change(screen.getByLabelText(/Group Name/i), {
      target: { value: 'Road Trip 2026' },
    });
    fireEvent.change(screen.getByLabelText(/Members/i), {
      target: { value: 'Dave, Emma, Frank' },
    });

    // Submit form within act
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Create Group$/i }));
    });

    expect(handleCreate).toHaveBeenCalledWith('Road Trip 2026', [
      'Dave',
      'Emma',
      'Frank',
    ]);
  });
});
