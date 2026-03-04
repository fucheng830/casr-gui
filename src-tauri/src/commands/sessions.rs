use casr::discovery::ProviderRegistry;
use casr::model::MessageRole;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::task;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub session_id: String,
    pub provider: String,
    pub title: Option<String>,
    pub workspace: Option<String>,
    pub started_at: Option<i64>,
    pub messages: usize,
    pub source_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessagePreview {
    pub idx: usize,
    pub role: String,
    pub content: String,
    pub timestamp: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionDetail {
    pub session_id: String,
    pub provider: String,
    pub title: Option<String>,
    pub workspace: Option<String>,
    pub started_at: Option<i64>,
    pub ended_at: Option<i64>,
    pub model_name: Option<String>,
    pub messages: usize,
    pub preview: Vec<MessagePreview>,
    pub warnings: Vec<String>,
    pub source_path: String,
}

#[tauri::command]
pub async fn list_sessions(
    provider: Option<String>,
    limit: Option<usize>,
    sort: Option<String>,
) -> Result<Vec<SessionSummary>, String> {
    let provider_slug = provider.clone();
    let limit_val = limit.unwrap_or(50);
    let sort_val = sort.unwrap_or_else(|| "date".to_string());

    let sessions = task::spawn_blocking(move || {
        let registry = ProviderRegistry::default_registry();

        let providers: Vec<_> = if let Some(ref slug) = provider_slug {
            registry
                .all_providers()
                .into_iter()
                .filter(|p| p.slug() == slug)
                .collect()
        } else {
            registry.installed_providers()
        };

        let mut sessions = Vec::new();

        for provider in providers {
            if let Some(listed) = provider.list_sessions() {
                for (_session_id, path) in listed {
                    if let Ok(session) = provider.read_session(&path) {
                        sessions.push(SessionSummary {
                            session_id: session.session_id,
                            provider: provider.slug().to_string(),
                            title: session.title,
                            workspace: session.workspace.map(|p| p.to_string_lossy().to_string()),
                            started_at: session.started_at,
                            messages: session.messages.len(),
                            source_path: session.source_path.to_string_lossy().to_string(),
                        });
                    }
                }
            } else {
                for root in provider.session_roots() {
                    if !root.exists() {
                        continue;
                    }

                    for entry in WalkDir::new(&root)
                        .max_depth(4)
                        .into_iter()
                        .filter_map(|e| e.ok())
                        .filter(|e| e.file_type().is_file())
                    {
                        let path = entry.path();
                        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");

                        if !matches!(ext, "jsonl" | "json" | "vscdb" | "db" | "sqlite") {
                            continue;
                        }

                        if let Ok(session) = provider.read_session(path) {
                            sessions.push(SessionSummary {
                                session_id: session.session_id,
                                provider: provider.slug().to_string(),
                                title: session.title,
                                workspace: session.workspace.map(|p| p.to_string_lossy().to_string()),
                                started_at: session.started_at,
                                messages: session.messages.len(),
                                source_path: session.source_path.to_string_lossy().to_string(),
                            });
                        }
                    }
                }
            }
        }

        match sort_val.as_str() {
            "date" => sessions.sort_by(|a, b| b.started_at.cmp(&a.started_at)),
            "messages" => sessions.sort_by(|a, b| b.messages.cmp(&a.messages)),
            "provider" => sessions.sort_by(|a, b| a.provider.cmp(&b.provider)),
            _ => {}
        }

        sessions.truncate(limit_val);
        sessions
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    Ok(sessions)
}

#[tauri::command]
pub async fn get_session(
    session_id: String,
    source_hint: Option<String>,
) -> Result<SessionDetail, String> {
    let detail = task::spawn_blocking(move || {
        let registry = ProviderRegistry::default_registry();

        let source = source_hint.and_then(|h| {
            if PathBuf::from(&h).exists() {
                Some(casr::discovery::SourceHint::Path(PathBuf::from(h)))
            } else {
                Some(casr::discovery::SourceHint::Alias(h))
            }
        });

        let resolved = registry
            .resolve_session(&session_id, source.as_ref())
            .map_err(|e| format!("Session not found: {}", e))?;

        let session = resolved
            .provider
            .read_session(&resolved.path)
            .map_err(|e| format!("Failed to read session: {}", e))?;

        let preview: Vec<MessagePreview> = session
            .messages
            .iter()
            .map(|msg| {
                let role = match &msg.role {
                    MessageRole::User => "user".to_string(),
                    MessageRole::Assistant => "assistant".to_string(),
                    MessageRole::Tool => "tool".to_string(),
                    MessageRole::System => "system".to_string(),
                    MessageRole::Other(s) => s.clone(),
                };

                let content = {
                    let mut chars = msg.content.chars();
                    let preview: String = chars.by_ref().take(200).collect();
                    if chars.next().is_some() {
                        format!("{preview}...")
                    } else {
                        preview
                    }
                };

                MessagePreview {
                    idx: msg.idx,
                    role,
                    content,
                    timestamp: msg.timestamp,
                }
            })
            .collect();

        let validation = casr::pipeline::validate_session(&session);
        let warnings = validation
            .warnings
            .into_iter()
            .chain(validation.info)
            .collect();

        Ok::<SessionDetail, String>(SessionDetail {
            session_id: session.session_id,
            provider: resolved.provider.slug().to_string(),
            title: session.title,
            workspace: session.workspace.map(|p| p.to_string_lossy().to_string()),
            started_at: session.started_at,
            ended_at: session.ended_at,
            model_name: session.model_name,
            messages: session.messages.len(),
            preview,
            warnings,
            source_path: session.source_path.to_string_lossy().to_string(),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    Ok(detail)
}
