import { useState } from 'react';
import type { SessionDetail, ProviderInfo, ConvertResult, ResumeExecResult } from '../types';

interface SessionDetailProps {
  session: SessionDetail | null;
  providers: ProviderInfo[];
  onConvert: (targetSlug: string) => Promise<ConvertResult | null>;
  onResume: (sessionId: string) => Promise<ResumeExecResult>;
}

const ROLE_COLORS: Record<string, string> = {
  user: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  assistant: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  tool: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  system: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
};

export function SessionDetail({
  session,
  providers,
  onConvert,
  onResume,
}: SessionDetailProps) {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState(false);

  // New resume-related state
  const [resuming, setResuming] = useState(false);
  const [resumeResult, setResumeResult] = useState<ResumeExecResult | null>(null);
  const [copiedResumeCmd, setCopiedResumeCmd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Select a session to view details
      </div>
    );
  }

  const installedProviders = providers.filter((p) => p.installed);
  const isClaudeCode = session.provider === 'claude-code';

  const handleConvert = async () => {
    if (!selectedTarget) return;
    setConverting(true);
    setResult(null);
    try {
      const res = await onConvert(selectedTarget);
      setResult(res);
    } finally {
      setConverting(false);
    }
  };

  const copyResumeCommand = async () => {
    // For convert result
    if (result?.resume_command) {
      await navigator.clipboard.writeText(result.resume_command);
      setCopiedResume(true);
      setTimeout(() => setCopiedResume(false), 2000);
    }
  };

  const copySessionId = async () => {
    if (session?.session_id) {
      await navigator.clipboard.writeText(session.session_id);
      setCopiedSessionId(true);
      setTimeout(() => setCopiedSessionId(false), 2000);
    }
  };

  const handleResume = async () => {
    if (!session) return;
    setResuming(true);
    setResumeResult(null);
    setError(null);
    try {
      const result = await onResume(session.session_id);
      setResumeResult(result);
      if (!result.success) {
        setError(result.error || 'Resume failed');
      }
    } catch (e) {
      setError(`Resume failed: ${e}`);
    } finally {
      setResuming(false);
    }
  };

  const copyDirectResumeCommand = async () => {
    const cmd = resumeResult?.command || result?.resume_command || '';
    if (cmd) {
      await navigator.clipboard.writeText(cmd);
      setCopiedResumeCmd(true);
      setTimeout(() => setCopiedResumeCmd(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Error display */}
      {error && (
        <div className="mx-4 mt-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-200 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Session Details
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">ID:</span>
            <span className="font-mono text-gray-700 dark:text-gray-200">
              {session.session_id.slice(0, 20)}...
            </span>
            <button
              onClick={copySessionId}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-xs transition-colors"
            >
              {copiedSessionId ? 'Copied!' : 'Copy ID'}
            </button>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Provider: </span>
            <span className="text-gray-700 dark:text-gray-200">
              {session.provider}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Messages: </span>
            <span className="text-gray-700 dark:text-gray-200">
              {session.messages}
            </span>
          </div>
          {session.model_name && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Model: </span>
              <span className="text-gray-700 dark:text-gray-200">
                {session.model_name}
              </span>
            </div>
          )}
          {session.workspace && (
            <div className="col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Workspace: </span>
              <span className="text-gray-700 dark:text-gray-200 truncate block">
                {session.workspace}
              </span>
            </div>
          )}
        </div>

        {/* Convert controls */}
        <div className="mt-4">
          {/* Resume Actions */}
          {isClaudeCode ? (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    📌 Resume in Terminal
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    This will open a new terminal window with this session
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResume}
                    disabled={resuming}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  >
                    {resuming ? 'Starting...' : '🚀 Resume'}
                  </button>
                  <button
                    onClick={copyDirectResumeCommand}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                  >
                    {copiedResumeCmd ? 'Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Direct Resume */}
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      📌 Direct Resume (as {session.provider})
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      Resume without converting format
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResume}
                      disabled={resuming}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                    >
                      {resuming ? 'Starting...' : '🚀 Resume'}
                    </button>
                    <button
                      onClick={copyResumeCommand}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                    >
                      {copiedResumeCmd ? 'Copied!' : '📋 Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Or convert */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  🔄 Or convert to another provider first:
                </p>
              </div>
            </div>
          )}

          {/* Resume execution result feedback */}
          {resumeResult && (
            <div
              className={`mt-3 p-3 rounded-lg ${
                resumeResult.success
                  ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
              }`}
            >
              {resumeResult.success ? (
                <p className="text-green-700 dark:text-green-300 text-sm">
                  ✓ Terminal started with command: {resumeResult.command}
                </p>
              ) : (
                <p className="text-red-700 dark:text-red-300 text-sm">
                  ✗ Failed to start terminal: {resumeResult.error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Convert UI wrapper - only show for non-Claude Code or if user wants to convert */}
        <div className={isClaudeCode ? 'mt-4' : ''}>
        <div className="mt-4 flex items-center gap-2">
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select target provider...</option>
            {installedProviders
              .filter((p) => p.slug !== session.provider)
              .map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
          </select>
          <button
            onClick={handleConvert}
            disabled={!selectedTarget || converting}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {converting ? 'Converting...' : 'Convert'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`mt-3 p-3 rounded-lg ${
              result.success
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
            }`}
          >
            {result.success ? (
              <>
                <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                  ✓ Converted {result.messages_converted} messages
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    {result.resume_command}
                  </code>
                  <button
                    onClick={copyResumeCommand}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm transition-colors"
                  >
                    {copiedResume ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {result.warnings.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-yellow-600 dark:text-yellow-400 cursor-pointer">
                      {result.warnings.length} warning(s)
                    </summary>
                    <ul className="mt-1 text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                      {result.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : (
              <p className="text-red-700 dark:text-red-300 text-sm">
                ✗ {result.error || 'Conversion failed'}
              </p>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Message preview */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Message Preview
        </h3>
        <div className="space-y-2">
          {session.preview.map((msg) => (
            <div key={msg.idx} className="flex gap-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                  ROLE_COLORS[msg.role] || 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                {msg.role}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-300 flex-1 break-words whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {session.warnings.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">
              Session Warnings
            </h4>
            <ul className="text-xs text-yellow-600 dark:text-yellow-400 list-disc list-inside">
              {session.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
