use casr::discovery::ProviderRegistry;
use serde::{Deserialize, Serialize};
use tokio::task;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub slug: String,
    pub name: String,
    pub cli_alias: String,
    pub installed: bool,
    pub version: Option<String>,
    pub evidence: Vec<String>,
}

#[tauri::command]
pub async fn get_providers() -> Result<Vec<ProviderInfo>, String> {
    // Run detect_all in a blocking thread to not freeze UI
    // Process everything inside the blocking task to avoid lifetime issues
    let providers = task::spawn_blocking(move || {
        let registry = ProviderRegistry::default_registry();
        let detections = registry.detect_all();

        detections
            .into_iter()
            .map(|(provider, detection)| ProviderInfo {
                slug: provider.slug().to_string(),
                name: provider.name().to_string(),
                cli_alias: provider.cli_alias().to_string(),
                installed: detection.installed,
                version: detection.version,
                evidence: detection.evidence,
            })
            .collect()
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    Ok(providers)
}
