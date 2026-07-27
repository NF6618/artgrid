use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{State, AppHandle};
use uuid::Uuid;
use chrono::Utc;

pub struct AppState {
    pub db: Mutex<Option<Connection>>,
    pub vault_path: Mutex<Option<PathBuf>>,
}

#[derive(Serialize, Deserialize)]
pub struct AssetData {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub filepath: String, // Relative to vault/media
    pub type_: String,
    pub size: String,
    pub width: u32,
    pub height: u32,
    pub favorite: bool,
    pub date_added: String,
    pub url: String, // Usually local custom protocol url like `asset://...`
    pub tags: Vec<String>,
}

#[tauri::command]
pub fn open_vault(path: String, state: State<'_, AppState>, app: AppHandle) -> Result<String, String> {
    let vault_dir = PathBuf::from(&path);
    
    // Create vault directory if it doesn't exist
    if !vault_dir.exists() {
        fs::create_dir_all(&vault_dir).map_err(|e| e.to_string())?;
    }
    
    // Create media directory
    let media_dir = vault_dir.join("media");
    if !media_dir.exists() {
        fs::create_dir_all(&media_dir).map_err(|e| e.to_string())?;
    }

    // Initialize Database
    let db_path = vault_dir.join("artgrid.db");
    let conn = crate::db::init_db(&db_path).map_err(|e| e.to_string())?;
    
    // Update State
    *state.db.lock().unwrap() = Some(conn);
    *state.vault_path.lock().unwrap() = Some(vault_dir.clone());
    
    // Start background file watcher
    crate::watcher::start_watcher(app, vault_dir);
    
    Ok("Vault opened successfully".to_string())
}

#[tauri::command]
pub fn get_assets(state: State<'_, AppState>) -> Result<Vec<AssetData>, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let mut stmt = conn.prepare("SELECT id, title, filename, filepath, type, size, width, height, favorite, date_added, url FROM assets").map_err(|e| e.to_string())?;
    let asset_iter = stmt.query_map([], |row| {
        Ok(AssetData {
            id: row.get(0)?,
            title: row.get(1)?,
            filename: row.get(2)?,
            filepath: row.get(3)?,
            type_: row.get(4)?,
            size: row.get(5)?,
            width: row.get(6)?,
            height: row.get(7)?,
            favorite: row.get(8)?,
            date_added: row.get(9)?,
            url: row.get(10)?,
            tags: vec![], // We'll populate tags in a real join or separate query later
        })
    }).map_err(|e| e.to_string())?;

    let mut assets = Vec::new();
    for asset in asset_iter {
        assets.push(asset.map_err(|e| e.to_string())?);
    }
    
    Ok(assets)
}

#[tauri::command]
pub fn import_file(file_path: String, state: State<'_, AppState>) -> Result<AssetData, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let vault_lock = state.vault_path.lock().unwrap();
    let vault_path = vault_lock.as_ref().ok_or("No vault path")?;
    
    let source_path = PathBuf::from(&file_path);
    if !source_path.exists() {
        return Err("File does not exist".to_string());
    }
    
    let filename = source_path.file_name().unwrap().to_string_lossy().into_owned();
    let id = Uuid::new_v4().to_string();
    let ext = source_path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
    
    let supported_exts = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "md", "txt", "pdf"];
    if !supported_exts.contains(&ext.as_str()) {
        return Err("Unsupported file type".to_string());
    }
    
    let new_filename = format!("{}.{}", id, ext);
    let dest_rel_path = PathBuf::from("media").join(&new_filename);
    let dest_abs_path = vault_path.join(&dest_rel_path);
    
    // Copy file to vault
    fs::copy(&source_path, &dest_abs_path).map_err(|e| e.to_string())?;
    
    // Read dimensions using image crate
    let (width, height) = image::image_dimensions(&dest_abs_path).unwrap_or((0, 0));
    
    // Get file size
    let metadata = fs::metadata(&dest_abs_path).map_err(|e| e.to_string())?;
    let size_bytes = metadata.len();
    let size_str = format!("{:.1} MB", size_bytes as f64 / 1_048_576.0); // simple MB conversion
    
    let now = Utc::now().to_rfc3339();
    
    // Convert absolute path to something the Tauri frontend can load
    // Using Tauri's custom asset protocol (convert_file_src in JS)
    // For now we'll just store the absolute path and format it in JS
    let url = dest_abs_path.to_string_lossy().into_owned(); 
    
    let type_ = match ext.as_str() {
        "md" | "txt" => "text/plain".to_string(),
        "pdf" => "application/pdf".to_string(),
        _ => format!("image/{}", ext)
    };
    
    let asset = AssetData {
        id: id.clone(),
        title: filename.clone(),
        filename: filename.clone(),
        filepath: dest_rel_path.to_string_lossy().into_owned(),
        type_,
        size: size_str,
        width,
        height,
        favorite: false,
        date_added: now,
        url: url.clone(),
        tags: vec![],
    };
    
    // Insert into DB
    conn.execute(
        "INSERT INTO assets (id, title, filename, filepath, type, size, width, height, favorite, date_added, url) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        (
            &asset.id,
            &asset.title,
            &asset.filename,
            &asset.filepath,
            &asset.type_,
            &asset.size,
            &asset.width,
            &asset.height,
            &asset.favorite,
            &asset.date_added,
            &asset.url,
        ),
    ).map_err(|e| e.to_string())?;
    
    Ok(asset)
}

#[tauri::command]
pub fn toggle_favorite(id: String, state: State<'_, AppState>) -> Result<bool, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    // First, get the current favorite status
    let mut stmt = conn.prepare("SELECT favorite FROM assets WHERE id = ?1").map_err(|e| e.to_string())?;
    let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;
    
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let current_favorite: bool = row.get(0).map_err(|e| e.to_string())?;
        let new_favorite = !current_favorite;
        
        // Update the database
        conn.execute(
            "UPDATE assets SET favorite = ?1 WHERE id = ?2",
            (&new_favorite, &id),
        ).map_err(|e| e.to_string())?;
        
        return Ok(new_favorite);
    }
    
    Err("Asset not found".to_string())
}
