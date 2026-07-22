import React, { useState } from 'react';
import { GroupData } from '../api/client';

interface GroupListProps {
  currentGroup: GroupData | null;
  onCreateGroup: (name: string, members: string[]) => Promise<void>;
  onSelectGroupId: (id: string) => void;
  isLoading?: boolean;
}

export const GroupList: React.FC<GroupListProps> = ({
  currentGroup,
  onCreateGroup,
  onSelectGroupId,
  isLoading = false,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [membersInput, setMembersInput] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const members = membersInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    if (members.length === 0) {
      setError('Please provide at least one member (comma-separated)');
      return;
    }

    try {
      await onCreateGroup(name.trim(), members);
      setName('');
      setMembersInput('');
      setShowCreate(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupId.trim()) {
      onSelectGroupId(lookupId.trim());
      setLookupId('');
    }
  };

  return (
    <div className="group-list-card" data-testid="group-list-card">
      <div className="group-header">
        <div>
          <h2>{currentGroup ? currentGroup.name : 'No Active Group'}</h2>
          {currentGroup && (
            <p className="group-meta">
              <span>
                ID: <code>{currentGroup._id}</code>
              </span>
              <span className="members-badge">
                {currentGroup.members.length} members (
                {currentGroup.members.join(', ')})
              </span>
            </p>
          )}
        </div>
        <div className="group-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowCreate(!showCreate)}
            disabled={isLoading}
          >
            {showCreate ? 'Cancel' : '+ New Group'}
          </button>
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreateSubmit}
          className="create-group-form"
          data-testid="create-group-form"
        >
          <h3>Create New Group</h3>
          {error && <p className="error-banner">{error}</p>}
          <div className="form-group">
            <label htmlFor="groupName">Group Name</label>
            <input
              id="groupName"
              type="text"
              placeholder="e.g. Ski Trip 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="groupMembers">Members (comma-separated)</label>
            <input
              id="groupMembers"
              type="text"
              placeholder="e.g. Alice, Bob, Charlie"
              value={membersInput}
              onChange={(e) => setMembersInput(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            Create Group
          </button>
        </form>
      )}

      <form onSubmit={handleLookupSubmit} className="lookup-form">
        <input
          type="text"
          placeholder="Lookup group by ID..."
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-outline"
          disabled={isLoading || !lookupId.trim()}
        >
          Load
        </button>
      </form>
    </div>
  );
};
