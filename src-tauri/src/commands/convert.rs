use casr::discovery::ProviderRegistry;
use casr::pipeline::{ConversionPipeline, ConvertOptions};
use serde::{Deserialize, Serialize};
use tokio::task;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvertResult {
    pub success: bool,
    pub source_session_id: String,
    pub target_session_id: String,
    pub messages_converted: usize,
    pub written_path: String,
    pub resume_command: String,
    pub warnings: Vec<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn convert_session(
    target: String,
    session_id: String,
    force: Option<bool>,
    enrich: Option<bool>,
) -> Result<ConvertResult, String> {
    let target_provider = target;
    let sid = session_id.clone();
    let force_val = force.unwrap_or(false);
    let enrich_val = enrich.unwrap_or(true);

    let result = task::spawn_blocking(move || {
        let registry = ProviderRegistry::default_registry();
        let pipeline = ConversionPipeline { registry };

        let opts = ConvertOptions {
            dry_run: false,
            force: force_val,
            verbose: false,
            enrich: enrich_val,
            source_hint: None,
        };

        pipeline.convert(&target_provider, &sid, opts)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    match result {
        Ok(conv_result) => {
            let (written_path, resume_command) = if let Some(written) = conv_result.written {
                (
                    written
                        .paths
                        .first()
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_default(),
                    written.resume_command,
                )
            } else {
                (String::new(), String::new())
            };

            Ok(ConvertResult {
                success: true,
                source_session_id: conv_result.canonical_session.session_id.clone(),
                target_session_id: session_id,
                messages_converted: conv_result.canonical_session.messages.len(),
                written_path,
                resume_command,
                warnings: conv_result.warnings,
                error: None,
            })
        }
        Err(e) => Ok(ConvertResult {
            success: false,
            source_session_id: session_id,
            target_session_id: String::new(),
            messages_converted: 0,
            written_path: String::new(),
            resume_command: String::new(),
            warnings: vec![],
            error: Some(e.to_string()),
        }),
    }
}
