mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_providers,
            commands::list_sessions,
            commands::get_session,
            commands::convert_session,
            commands::get_resume_command,
            commands::execute_resume_command,
            commands::resume_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
