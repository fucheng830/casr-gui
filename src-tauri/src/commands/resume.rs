use casr::discovery::ProviderRegistry;
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::AppHandle;
use tokio::task;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeCommandResult {
    pub command: String,
    pub provider: String,
    pub session_id: String,
    pub requires_terminal: bool,
    pub is_browser_url: bool,
    pub workspace: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeExecResult {
    pub success: bool,
    pub command: String,
    pub pid: Option<u32>,
    pub error: Option<String>,
}

/// Get the resume command for a session without executing it
#[tauri::command]
pub async fn get_resume_command(
    session_id: String,
    source_hint: Option<String>,
) -> Result<ResumeCommandResult, String> {
    let result = task::spawn_blocking(move || {
        let registry = ProviderRegistry::default_registry();

        let source = source_hint.and_then(|h| {
            if std::path::PathBuf::from(&h).exists() {
                Some(casr::discovery::SourceHint::Path(std::path::PathBuf::from(h)))
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

        let command = resolved
            .provider
            .resume_command(&session_id);

        let is_browser_url = command.starts_with("http://") || command.starts_with("https://");

        Ok::<ResumeCommandResult, String>(ResumeCommandResult {
            command,
            provider: resolved.provider.slug().to_string(),
            session_id,
            requires_terminal: !is_browser_url,
            is_browser_url,
            workspace: session.workspace.map(|p| p.to_string_lossy().to_string()),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    Ok(result)
}

/// Execute a command in a new terminal window
#[tauri::command]
pub async fn execute_resume_command(
    command: String,
    workspace: Option<String>,
    _app_handle: AppHandle,
) -> Result<ResumeExecResult, String> {
    // Enhanced debugging output
    eprintln!("=== RESUME COMMAND EXECUTION DEBUG ===");
    eprintln!("Original command: {}", command);
    if let Some(ref ws) = workspace {
        eprintln!("Workspace detected: {}", ws);
    } else {
        eprintln!("WARNING: No workspace detected!");
    }
    eprintln!("=======================================");

    let is_browser_url = command.starts_with("http://") || command.starts_with("https://");

    let result = if is_browser_url {
        // For browser URLs, use the opener plugin
        #[cfg(target_os = "windows")]
        {
            Command::new("cmd")
                .args(["/C", "start", "", &command])
                .spawn()
                .map_err(|e| format!("Failed to open browser: {}", e))?
        }
        #[cfg(target_os = "macos")]
        {
            Command::new("open")
                .arg(&command)
                .spawn()
                .map_err(|e| format!("Failed to open browser: {}", e))?
        }
        #[cfg(target_os = "linux")]
        {
            Command::new("xdg-open")
                .arg(&command)
                .spawn()
                .map_err(|e| format!("Failed to open browser: {}", e))?
        }
    } else {
        // For terminal commands, open in new terminal window with workspace context
        let full_command = if let Some(ref ws) = workspace {
            // Change to workspace directory before executing the command
            // Use pushd to better handle special characters and Unicode paths
            #[cfg(target_os = "windows")]
            {
                // Use pushd instead of cd /d for better Unicode support
                let cmd = format!("pushd \"{}\" && {}", ws, command);
                eprintln!("Windows full command: {}", cmd);
                cmd
            }
            #[cfg(target_os = "macos")]
            {
                let cmd = format!("cd \"{}\" && {}", ws, command);
                eprintln!("macOS full command: {}", cmd);
                cmd
            }
            #[cfg(target_os = "linux")]
            {
                let cmd = format!("cd \"{}\" && {}", ws, command);
                eprintln!("Linux full command: {}", cmd);
                cmd
            }
        } else {
            eprintln!("No workspace, using original command: {}", command);
            command.clone()
        };

        eprintln!("Final command to execute: {}", full_command);

        #[cfg(target_os = "windows")]
        {
            if let Some(ref ws) = workspace {
                // Open a new PowerShell window with proper command execution
                // Use start command to ensure new window opens
                let commands = format!(
                    "cd '{}'; {}",
                    ws.replace("'", "''"),
                    command.replace("'", "''")
                );

                eprintln!("Opening new PowerShell window with: {}", commands);

                Command::new("cmd")
                    .args([
                        "/C",
                        "start",
                        "powershell",
                        "-NoExit",
                        "-Command",
                        &commands
                    ])
                    .spawn()
                    .map_err(|e| format!("Failed to open terminal: {}", e))?
            } else {
                Command::new("cmd")
                    .args(["/C", "start", "cmd.exe", "/k", &full_command])
                    .spawn()
                    .map_err(|e| format!("Failed to open terminal: {}", e))?
            }
        }
        #[cfg(target_os = "macos")]
        {
            // Use AppleScript to open Terminal.app and run command
            let script = if let Some(ref ws) = workspace {
                format!(
                    "tell application \"Terminal\"\n\
                     do script \"cd \\\"{}\\\" && {}\"\n\
                     activate\n\
                     end tell",
                    ws.replace("\"", "\\\\\\\""), // Escape quotes in workspace
                    full_command.replace("\"", "\\\\\\\"") // Escape quotes in command
                )
            } else {
                format!(
                    "tell application \"Terminal\"\n\
                     do script \"{}\"\n\
                     activate\n\
                     end tell",
                    full_command.replace("\"", "\\\\\\\"") // Escape quotes
                )
            };
            Command::new("osascript")
                .args(["-e", &script])
                .spawn()
                .map_err(|e| format!("Failed to open terminal: {}", e))?
        }
        #[cfg(target_os = "linux")]
        {
            // Try multiple terminal emulators
            let terminals = vec![
                "gnome-terminal",
                "konsole",
                "xfce4-terminal",
                "xterm",
                "mate-terminal",
            ];

            let mut spawned = None;
            for term in terminals {
                let result = match term {
                    "gnome-terminal" => {
                        Command::new(term)
                            .args(["--", "bash", "-c", &full_command])
                            .spawn()
                    }
                    "konsole" => Command::new(term).args(["-e", &full_command]).spawn(),
                    "xfce4-terminal" => Command::new(term).args(["-e", &full_command]).spawn(),
                    "xterm" => Command::new(term).args(["-e", &full_command]).spawn(),
                    "mate-terminal" => Command::new(term).args(["-x", &full_command]).spawn(),
                    _ => continue,
                };

                if result.is_ok() {
                    spawned = Some(result.unwrap());
                    break;
                }
            }

            spawned.ok_or_else(|| {
                format!(
                    "Failed to open terminal. Tried: {}. Please install one of them.",
                    terminals.join(", ")
                )
            })?
        }
    };

    Ok(ResumeExecResult {
        success: true,
        command,
        pid: Some(result.id()),
        error: None,
    })
}

/// One-click resume: get command and execute it
#[tauri::command]
pub async fn resume_session(
    session_id: String,
    source_hint: Option<String>,
    app_handle: AppHandle,
) -> Result<ResumeExecResult, String> {
    let cmd_result = get_resume_command(session_id, source_hint).await?;
    let workspace = cmd_result.workspace.clone();

    execute_resume_command(cmd_result.command, workspace, app_handle).await
}
