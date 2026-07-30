import re

with open('src-tauri/src/import.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace import_file
import_file_pattern = r'#\[tauri::command\]\npub fn import_file\(file_path: String, state: State<\'_,\s*AppState>,\s*app: tauri::AppHandle\)\s*->\s*Result<AssetData,\s*String>\s*\{([\s\S]*?\n    Ok\(asset\)\n)\}'
import_file_repl = r'''#[tauri::command]
pub async fn import_file(file_path: String, app: tauri::AppHandle) -> Result<AssetData, String> {
    tokio::task::spawn_blocking(move || {
        let state = app.state::<AppState>();\1    }).await.map_err(|e| e.to_string())?
}'''
code = re.sub(import_file_pattern, import_file_repl, code)

# Replace import_from_url
import_from_url_pattern = r'#\[tauri::command\]\npub fn import_from_url\(url: String, state: State<\'_,\s*AppState>\)\s*->\s*Result<AssetData,\s*String>\s*\{([\s\S]*?)(let response = reqwest::blocking::get\(&url\)\.map_err[^;]+;[\s\S]*?let bytes = response\.bytes\(\)\.map_err[^;]+;)([\s\S]*?\n    Ok\(asset\)\n)\}'
import_from_url_repl = r'''#[tauri::command]
pub async fn import_from_url(url: String, app: tauri::AppHandle) -> Result<AssetData, String> {
    let response = reqwest::get(&url).await.map_err(|e| format!("Failed to download: {}", e))?;
    let bytes = response.bytes().await.map_err(|e| format!("Failed to read bytes: {}", e))?;

    tokio::task::spawn_blocking(move || {
        let state = app.state::<AppState>();\4    }).await.map_err(|e| e.to_string())?
}'''
code = re.sub(import_from_url_pattern, import_from_url_repl, code)

# Replace save_base64_image_asset
save_b64_pattern = r'#\[tauri::command\]\npub fn save_base64_image_asset\(title: String, base64_data: String, state: State<\'_,\s*AppState>,\s*app: AppHandle\)\s*->\s*Result<AssetData,\s*String>\s*\{([\s\S]*?\n    Ok\(asset\)\n)\}'
save_b64_repl = r'''#[tauri::command]
pub async fn save_base64_image_asset(title: String, base64_data: String, app: tauri::AppHandle) -> Result<AssetData, String> {
    tokio::task::spawn_blocking(move || {
        let state = app.state::<AppState>();\1    }).await.map_err(|e| e.to_string())?
}'''
code = re.sub(save_b64_pattern, save_b64_repl, code)

with open('src-tauri/src/import.rs', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated import.rs')
