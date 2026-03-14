export interface ProviderInfo {
  slug: string;
  name: string;
  cli_alias: string;
  installed: boolean;
  version?: string;
  evidence: string[];
}

export interface SessionSummary {
  session_id: string;
  provider: string;
  title?: string;
  workspace?: string;
  started_at?: number;
  messages: number;
  source_path: string;
}

export interface MessagePreview {
  idx: number;
  role: string;
  content: string;
  timestamp?: number;
}

export interface SessionDetail {
  session_id: string;
  provider: string;
  title?: string;
  workspace?: string;
  started_at?: number;
  ended_at?: number;
  model_name?: string;
  messages: number;
  preview: MessagePreview[];
  warnings: string[];
  source_path: string;
}

export interface ConvertResult {
  success: boolean;
  source_session_id: string;
  target_session_id: string;
  messages_converted: number;
  written_path: string;
  resume_command: string;
  warnings: string[];
  error?: string;
}

export interface ResumeCommandResult {
  command: string;
  provider: string;
  session_id: string;
  requires_terminal: boolean;
  is_browser_url: boolean;
  workspace?: string;
}

export interface ResumeExecResult {
  success: boolean;
  command: string;
  pid?: number;
  error?: string;
}
