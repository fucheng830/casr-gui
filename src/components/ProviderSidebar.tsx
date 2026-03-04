import type { ProviderInfo } from '../types';

interface ProviderSidebarProps {
  providers: ProviderInfo[];
  selectedProvider: string | null;
  onSelect: (slug: string | null) => void;
}

const PROVIDER_COLORS: Record<string, string> = {
  'claude-code': 'bg-orange-500',
  'codex': 'bg-blue-500',
  'gemini': 'bg-purple-500',
  'cursor': 'bg-cyan-500',
  'cline': 'bg-green-500',
  'aider': 'bg-red-500',
  'amp': 'bg-yellow-500',
  'opencode': 'bg-indigo-500',
  'chatgpt': 'bg-teal-500',
  'clawdbot': 'bg-pink-500',
  'vibe': 'bg-amber-500',
  'factory': 'bg-lime-500',
  'openclaw': 'bg-rose-500',
  'pi-agent': 'bg-violet-500',
};

export function ProviderSidebar({
  providers,
  selectedProvider,
  onSelect,
}: ProviderSidebarProps) {
  const installed = providers.filter((p) => p.installed);
  const notInstalled = providers.filter((p) => !p.installed);

  return (
    <div className="w-48 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Providers ({installed.length})
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {/* Instructions */}
        {selectedProvider === null && (
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
            Click a provider to view sessions
          </div>
        )}

        {/* Installed providers */}
        {installed.map((provider) => (
          <button
            key={provider.slug}
            onClick={() => onSelect(provider.slug)}
            className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2 transition-colors ${
              selectedProvider === provider.slug
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                PROVIDER_COLORS[provider.slug] || 'bg-gray-400'
              }`}
            />
            <span className="text-sm truncate">{provider.name}</span>
            {selectedProvider === provider.slug && (
              <span className="ml-auto text-xs text-blue-500">●</span>
            )}
          </button>
        ))}

        {/* Not installed providers */}
        {notInstalled.length > 0 && (
          <>
            <div className="mt-3 mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 px-3">
                Not Installed ({notInstalled.length})
              </span>
            </div>
            {notInstalled.map((provider) => (
              <div
                key={provider.slug}
                className="w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2 opacity-50"
              >
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="text-sm truncate text-gray-500 dark:text-gray-400">
                  {provider.name}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
