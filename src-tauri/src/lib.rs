// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};
use std::sync::Mutex;

mod db;
mod import;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Force WebView2 to use a unique temporary data folder to fix 0x800700AA (The requested resource is in use)
    let temp_dir = std::env::temp_dir().join("artgrid_webview2_dev");
    std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", temp_dir);

    println!("ARTGRID: Starting app initialization...");
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir { file_name: Some("artgrid.log".into()) }),
            Target::new(TargetKind::Webview),
        ]).level(log::LevelFilter::Trace).build())
        .setup(|app| {
            println!("ARTGRID: Setup hook running...");
            
            // Manage AppState (Vault not opened yet)
            app.manage(import::AppState {
                db: Mutex::new(None),
                vault_path: Mutex::new(None),
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            import::open_vault,
            import::get_assets,
            import::import_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
