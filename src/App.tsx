import { useState, useEffect, useCallback, useRef } from 'react';
import './styles/tailwind.css';
import { ProviderSidebar } from './components/ProviderSidebar';
import { SessionList } from './components/SessionList';
import { SessionDetail } from './components/SessionDetail';
import { useTauri } from './hooks/useTauri';
import type { ProviderInfo, SessionSummary, SessionDetail as SessionDetailType, ConvertResult, ResumeExecResult } from './types';

const SESSION_LIST_LIMIT = 100;
const SESSION_LIST_SORT = 'date';
const SESSION_CACHE_TTL_MS = 60_000;
const SESSION_CACHE_MAX_ENTRIES = 24;

function App() {
  const { getProviders, listSessions, getSession, convertSession, resumeSession } = useTauri();

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionDetailType | null>(null);
  const [selectedSessionSummary, setSelectedSessionSummary] = useState<SessionSummary | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const sessionCacheRef = useRef<Map<string, { data: SessionSummary[]; ts: number }>>(new Map());

  const makeSessionCacheKey = useCallback((providerSlug: string) => {
    return `${providerSlug}|${SESSION_LIST_LIMIT}|${SESSION_LIST_SORT}`;
  }, []);

  const pruneSessionCache = useCallback(() => {
    const now = Date.now();
    const cache = sessionCacheRef.current;
    for (const [key, value] of cache.entries()) {
      if (now - value.ts > SESSION_CACHE_TTL_MS) {
        cache.delete(key);
      }
    }

    if (cache.size <= SESSION_CACHE_MAX_ENTRIES) {
      return;
    }

    const oldestFirst = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    for (const [key] of oldestFirst) {
      if (cache.size <= SESSION_CACHE_MAX_ENTRIES) {
        break;
      }
      cache.delete(key);
    }
  }, []);

  // Wait for window to be ready before loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Load providers when ready
  useEffect(() => {
    if (!ready) return;

    setLoadingProviders(true);
    getProviders()
      .then((result) => {
        setProviders(result);
      })
      .catch((e) => {
        setError(`Failed to load providers: ${e}`);
      })
      .finally(() => setLoadingProviders(false));
  }, [ready, getProviders]);

  // Load sessions when provider is selected
  useEffect(() => {
    if (!selectedProvider) {
      setSessions([]);
      return;
    }

    const cacheKey = makeSessionCacheKey(selectedProvider);
    pruneSessionCache();
    const cached = sessionCacheRef.current.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts <= SESSION_CACHE_TTL_MS) {
      setSessions(cached.data);
      setLoadingSessions(false);
      return;
    }

    let cancelled = false;
    setLoadingSessions(true);
    setSelectedSession(null);
    setSelectedSessionSummary(null);
    listSessions(selectedProvider, SESSION_LIST_LIMIT, SESSION_LIST_SORT)
      .then((result) => {
        if (cancelled) return;
        sessionCacheRef.current.set(cacheKey, { data: result, ts: Date.now() });
        pruneSessionCache();
        setSessions(result);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(`Failed to load sessions: ${e}`);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSessions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProvider, listSessions, makeSessionCacheKey, pruneSessionCache]);

  const handleSelectSession = useCallback(
    async (summary: SessionSummary) => {
      setSelectedSessionSummary(summary);
      try {
        const detail = await getSession(summary.session_id);
        setSelectedSession(detail);
      } catch (e) {
        setError(`Failed to load session: ${e}`);
      }
    },
    [getSession]
  );

  const handleConvert = useCallback(
    async (targetSlug: string): Promise<ConvertResult | null> => {
      if (!selectedSession) return null;
      try {
        const result = await convertSession(
          targetSlug,
          selectedSession.session_id,
          false,
          true
        );
        return result;
      } catch (e) {
        setError(`Conversion failed: ${e}`);
        return null;
      }
    },
    [selectedSession, convertSession]
  );

  const handleResume = useCallback(
    async (sessionId: string): Promise<ResumeExecResult> => {
      try {
        const commandResult = await resumeSession(sessionId);
        return commandResult;
      } catch (e) {
        setError(`Resume failed: ${e}`);
        return {
          success: false,
          command: '',
          error: String(e),
        };
      }
    },
    [resumeSession]
  );

  const handleProviderSelect = useCallback((slug: string | null) => {
    setSelectedProvider(slug);
    setSelectedSession(null);
    setSelectedSessionSummary(null);
    setSessions([]);
  }, []);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Initializing...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="h-12 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 bg-gray-50 dark:bg-gray-800">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          CASR GUI
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
          Cross Agent Session Resumer
        </span>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {loadingProviders ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Loading providers...
          </div>
        ) : (
          <>
            {/* Provider sidebar */}
            <ProviderSidebar
              providers={providers}
              selectedProvider={selectedProvider}
              onSelect={handleProviderSelect}
            />

            {/* Session list */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 bg-gray-50 dark:bg-gray-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Sessions
                  {selectedProvider && (
                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                      ({providers.find((p) => p.slug === selectedProvider)?.name || selectedProvider})
                    </span>
                  )}
                </span>
              </div>
              {selectedProvider === null ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-center p-4">
                  Select a provider from the sidebar to view sessions
                </div>
              ) : (
                <SessionList
                  sessions={sessions}
                  selectedSessionId={selectedSessionSummary?.session_id || null}
                  onSelect={handleSelectSession}
                  loading={loadingSessions}
                />
              )}
            </div>

            {/* Session detail */}
            <SessionDetail
              session={selectedSession}
              providers={providers}
              onConvert={handleConvert}
              onResume={handleResume}
            />
          </>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-200 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
