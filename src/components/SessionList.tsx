import { useState, useMemo } from 'react';
import type { SessionSummary } from '../types';

interface SessionListProps {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelect: (session: SessionSummary) => void;
  loading: boolean;
}

export function SessionList({
  sessions,
  selectedSessionId,
  onSelect,
  loading,
}: SessionListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;

    const query = searchQuery.toLowerCase();
    return sessions.filter(session => {
      const titleMatch = session.title?.toLowerCase().includes(query);
      const workspaceMatch = session.workspace?.toLowerCase().includes(query);
      const idMatch = session.session_id.toLowerCase().includes(query);
      return titleMatch || workspaceMatch || idMatch;
    });
  }, [sessions, searchQuery]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No sessions found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, workspace, or ID..."
            className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 && searchQuery ? (
          <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 p-4">
            No sessions match your search
          </div>
        ) : (
          filteredSessions.map((session) => (
            <button
              key={session.session_id}
              onClick={() => onSelect(session)}
              className={`w-full text-left p-3 border-b border-gray-200 dark:border-gray-700 transition-colors ${
                selectedSessionId === session.session_id
                  ? 'bg-blue-50 dark:bg-blue-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="text-base font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                {session.title || 'Untitled session'}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span className="font-mono">{session.session_id.slice(0, 12)}...</span>
                <span>•</span>
                <span>{formatDate(session.started_at)}</span>
                <span>•</span>
                <span>{session.messages} msgs</span>
              </div>

              {session.workspace && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  📁 {session.workspace}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
