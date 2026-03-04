# CASR GUI - Cross Agent Session Resumer

A desktop GUI for [casr](../session-resumer), the Cross Agent Session Resumer tool that enables seamless conversion of AI coding sessions between 14 different AI coding agents.

## Features

- **Visual Provider Browser**: See all 14 supported AI coding agents with their installation status
- **Session List**: Browse sessions from all installed providers with filtering and sorting
- **Session Preview**: View session details including message count, workspace, and message preview
- **One-Click Conversion**: Convert sessions between providers with a single click
- **Resume Command**: Copy the resume command to continue the session in the target agent

## Supported Providers

- Claude Code
- Codex (OpenAI)
- Gemini
- Cursor
- Cline
- Aider
- Amp
- OpenCode
- ChatGPT
- ClawdBot
- Vibe
- Factory
- OpenClaw
- Pi Agent

## Tech Stack

- **Backend**: Rust + Tauri v2
- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Library**: [casr](../session-resumer) for session conversion

## Development

### Prerequisites

- Node.js 18+
- Rust 1.70+
- pnpm/npm/yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run tauri dev
```

### Build

```bash
# Build for production
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Architecture

```
casr-gui/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri entry point
│   │   ├── lib.rs                # Plugin registration
│   │   ├── state.rs              # App state (ProviderRegistry)
│   │   └── commands/             # Tauri IPC commands
│   │       ├── providers.rs      # get_providers
│   │       ├── sessions.rs       # list_sessions, get_session
│   │       └── convert.rs        # convert_session
│   └── Cargo.toml
├── src/                          # React frontend
│   ├── App.tsx                   # Main layout
│   ├── components/
│   │   ├── ProviderSidebar.tsx   # Provider list
│   │   ├── SessionList.tsx       # Session list
│   │   └── SessionDetail.tsx     # Session details + conversion
│   ├── hooks/useTauri.ts         # Tauri IPC wrapper
│   └── types/index.ts            # TypeScript types
└── package.json
```

## Tauri Commands

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `get_providers` | - | `Vec<ProviderInfo>` | List all providers with installation status |
| `list_sessions` | `provider?: string, limit?: number, sort?: string` | `Vec<SessionSummary>` | List sessions from providers |
| `get_session` | `session_id: string, source_hint?: string` | `SessionDetail` | Get detailed session info |
| `convert_session` | `target: string, session_id: string, force?: bool, enrich?: bool` | `ConvertResult` | Convert session to target provider |

## License

MIT
