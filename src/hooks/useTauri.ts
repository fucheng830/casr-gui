import { useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ProviderInfo, SessionSummary, SessionDetail, ConvertResult, ResumeCommandResult, ResumeExecResult } from '../types';

export function useTauri() {
  const getProviders = useCallback(async (): Promise<ProviderInfo[]> => {
    return invoke<ProviderInfo[]>('get_providers');
  }, []);

  const listSessions = useCallback(async (
    provider?: string,
    limit?: number,
    sort?: string
  ): Promise<SessionSummary[]> => {
    return invoke<SessionSummary[]>('list_sessions', { provider, limit, sort });
  }, []);

  const getSession = useCallback(async (
    sessionId: string,
    sourceHint?: string
  ): Promise<SessionDetail> => {
    return invoke<SessionDetail>('get_session', { sessionId, sourceHint });
  }, []);

  const convertSession = useCallback(async (
    target: string,
    sessionId: string,
    force?: boolean,
    enrich?: boolean
  ): Promise<ConvertResult> => {
    return invoke<ConvertResult>('convert_session', { target, sessionId, force, enrich });
  }, []);

  const getResumeCommand = useCallback(async (
    sessionId: string,
    sourceHint?: string
  ): Promise<ResumeCommandResult> => {
    return invoke<ResumeCommandResult>('get_resume_command', { sessionId, sourceHint });
  }, []);

  const executeResumeCommand = useCallback(async (
    command: string,
    workspace?: string
  ): Promise<ResumeExecResult> => {
    return invoke<ResumeExecResult>('execute_resume_command', { command, workspace });
  }, []);

  const resumeSession = useCallback(async (
    sessionId: string,
    sourceHint?: string
  ): Promise<ResumeExecResult> => {
    return invoke<ResumeExecResult>('resume_session', { sessionId, sourceHint });
  }, []);

  return useMemo(
    () => ({
      getProviders,
      listSessions,
      getSession,
      convertSession,
      getResumeCommand,
      executeResumeCommand,
      resumeSession,
    }),
    [getProviders, listSessions, getSession, convertSession, getResumeCommand, executeResumeCommand, resumeSession]
  );
}
