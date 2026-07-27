// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
use tauri::{Manager, Emitter};
use tauri_plugin_log::{Target, TargetKind};
use std::sync::Mutex;

mod db;
mod import;
mod watcher;
mod board;
mod metadata;

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
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            println!("A new instance was launched with args: {:?}", argv);
            let _ = app.emit("deep-link-received", argv);
        }))
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
            import::import_file,
            import::import_from_url,
            import::toggle_favorite,
            import::update_asset_notes,
            import::archive_asset,
            import::trash_asset,
            import::rename_asset,
            import::export_db_backup,
            import::import_db_backup,
            import::clear_temp_cache,
            import::purge_all_data,
            board::get_boards,
            board::create_board,
            board::save_board,
            board::delete_board,
            metadata::get_collections,
            metadata::create_collection,
            metadata::bulk_create_collections,
            metadata::get_tags,
            metadata::bulk_create_tags,
            metadata::add_tag_to_asset,
            metadata::remove_tag_from_asset,
            metadata::add_asset_to_collection,
            metadata::remove_asset_from_collection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
