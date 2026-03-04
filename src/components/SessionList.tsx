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
    <div className="flex-1 overflow-y-auto">
      {sessions.map((session) => (
        <button
          key={session.session_id}
          onClick={() => onSelect(session)}
          className={`w-full text-left p-3 border-b border-gray-200 dark:border-gray-700 transition-colors ${
            selectedSessionId === session.session_id
              ? 'bg-blue-50 dark:bg-blue-900/30'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-mono text-gray-700 dark:text-gray-200 truncate max-w-[60%]">
              {session.session_id.slice(0, 12)}...
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(session.started_at)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {session.title || 'Untitled session'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {session.messages} msgs
            </span>
          </div>
          {session.workspace && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
              📁 {session.workspace}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
