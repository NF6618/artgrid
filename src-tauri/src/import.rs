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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AssetData {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub filepath: String, // Relative to vault
    pub type_: String,
    pub size: String,
    pub width: u32,
    pub height: u32,
    pub favorite: bool,
    pub date_added: String,
    pub url: String,
    pub notes: Option<String>,
    pub archived: bool,
    pub trashed: bool,
    pub tags: Vec<String>,
    pub collections: Vec<String>,
    pub palette: Option<Vec<String>>,
    pub color_profile: Option<String>,
}

fn extract_color_palette(path: &PathBuf) -> (Option<Vec<String>>, Option<String>) {
    if let Ok(img) = image::open(path) {
        let resized = img.thumbnail(64, 64);
        let rgb_img = resized.to_rgb8();
        let pixels = rgb_img.pixels();
        
        let mut color_counts: std::collections::HashMap<(u8, u8, u8), u32> = std::collections::HashMap::new();
        for p in pixels {
            let r = (p[0] / 32) * 32 + 16;
            let g = (p[1] / 32) * 32 + 16;
            let b = (p[2] / 32) * 32 + 16;
            *color_counts.entry((r, g, b)).or_insert(0) += 1;
        }

        let mut sorted: Vec<((u8, u8, u8), u32)> = color_counts.into_iter().collect();
        sorted.sort_by(|a, b| b.1.cmp(&a.1));

        let top_colors: Vec<String> = sorted.iter().take(5).map(|((r, g, b), _)| {
            format!("#{:02x}{:02x}{:02x}", r, g, b)
        }).collect();

        let dominant_color = top_colors.first().cloned().unwrap_or_else(|| "#808080".to_string());
        
        let mut total_r = 0u64;
        let mut total_g = 0u64;
        let mut total_b = 0u64;
        let count = rgb_img.pixels().len() as u64;
        for p in rgb_img.pixels() {
            total_r += p[0] as u64;
            total_g += p[1] as u64;
            total_b += p[2] as u64;
        }
        let avg_r = (total_r / count.max(1)) as f32;
        let avg_g = (total_g / count.max(1)) as f32;
        let avg_b = (total_b / count.max(1)) as f32;
        let brightness = (0.299 * avg_r + 0.587 * avg_g + 0.114 * avg_b) / 255.0;
        let temp = if avg_r > avg_b + 10.0 { "warm" } else if avg_b > avg_r + 10.0 { "cool" } else { "neutral" };

        let profile_json = serde_json::json!({
            "dominant": dominant_color,
            "brightness": brightness,
            "temperature": temp
        }).to_string();

        (Some(top_colors), Some(profile_json))
    } else {
        (None, None)
    }
}

#[tauri::command]
pub fn open_vault(path: String, state: State<'_, AppState>, app: AppHandle) -> Result<String, String> {
    let vault_dir = PathBuf::from(&path);
    
    if !vault_dir.exists() {
        fs::create_dir_all(&vault_dir).map_err(|e| e.to_string())?;
    }

    // Encapsulate vault engine files inside the `artgrid` folder
    let artgrid_dir = vault_dir.join("artgrid");
    if !artgrid_dir.exists() {
        fs::create_dir_all(&artgrid_dir).map_err(|e| e.to_string())?;
    }
    
    let media_dir = artgrid_dir.join("media");
    if !media_dir.exists() {
        fs::create_dir_all(&media_dir).map_err(|e| e.to_string())?;
    }

    // Legacy vault auto-migration: move legacy root `artgrid.db` and `media/` into `artgrid/`
    let legacy_db = vault_dir.join("artgrid.db");
    let target_db = artgrid_dir.join("artgrid.db");
    if legacy_db.exists() && !target_db.exists() {
        let _ = fs::rename(&legacy_db, &target_db);
    }

    let legacy_media = vault_dir.join("media");
    if legacy_media.exists() {
        if let Ok(entries) = fs::read_dir(&legacy_media) {
            for entry in entries.flatten() {
                let target = media_dir.join(entry.file_name());
                if !target.exists() {
                    let _ = fs::rename(entry.path(), target);
                }
            }
        }
        let _ = fs::remove_dir_all(&legacy_media);
    }

    // Initialize Database in artgrid/ directory
    let conn = crate::db::init_db(&target_db).map_err(|e| e.to_string())?;
    
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
    
    let mut stmt = conn.prepare("
        SELECT 
            a.id, a.title, a.filename, a.filepath, a.type, a.size, a.width, a.height, a.favorite, a.date_added, a.url, a.notes, a.archived, a.trashed, a.palette, a.color_profile,
            (SELECT GROUP_CONCAT(t.name) FROM asset_tags at JOIN tags t ON t.id = at.tag_id WHERE at.asset_id = a.id) as tags,
            (SELECT GROUP_CONCAT(ac.collection_id) FROM asset_collections ac WHERE ac.asset_id = a.id) as collections
        FROM assets a
    ").map_err(|e| e.to_string())?;
    
    let asset_iter = stmt.query_map([], |row| {
        let palette_raw: Option<String> = row.get(14)?;
        let palette: Option<Vec<String>> = palette_raw.and_then(|s| serde_json::from_str(&s).ok());
        let color_profile: Option<String> = row.get(15)?;
        let tags_str: Option<String> = row.get(16)?;
        let tags = tags_str.map(|s| s.split(',').map(|t| t.to_string()).collect()).unwrap_or_default();
        
        let cols_str: Option<String> = row.get(17)?;
        let collections = cols_str.map(|s| s.split(',').map(|t| t.to_string()).collect()).unwrap_or_default();

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
            notes: row.get(11)?,
            archived: row.get(12)?,
            trashed: row.get(13)?,
            palette,
            color_profile,
            tags,
            collections,
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
    
    let supported_exts = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "md", "txt", "pdf", "docx", "doc"];
    if !supported_exts.contains(&ext.as_str()) {
        return Err("Unsupported file type".to_string());
    }
    
    let new_filename = format!("{}.{}", id, ext);
    let dest_rel_path = PathBuf::from("artgrid").join("media").join(&new_filename);
    let dest_abs_path = vault_path.join(&dest_rel_path);

    if let Some(parent) = dest_abs_path.parent() {
        if !parent.exists() {
            let _ = fs::create_dir_all(parent);
        }
    }
    
    // Copy file to vault
    fs::copy(&source_path, &dest_abs_path).map_err(|e| e.to_string())?;
    
    // Read dimensions using image crate if image
    let (width, height) = image::image_dimensions(&dest_abs_path).unwrap_or((0, 0));
    let (palette, color_profile) = extract_color_palette(&dest_abs_path);
    let palette_json = palette.as_ref().map(|p| serde_json::to_string(p).unwrap_or_default());
    
    // Get file size
    let metadata = fs::metadata(&dest_abs_path).map_err(|e| e.to_string())?;
    let size_bytes = metadata.len();
    let size_str = format!("{:.1} MB", size_bytes as f64 / 1_048_576.0);
    
    let now = Utc::now().to_rfc3339();
    let url = dest_abs_path.to_string_lossy().into_owned(); 
    
    let type_ = match ext.as_str() {
        "md" | "txt" => "text/plain".to_string(),
        "pdf" => "application/pdf".to_string(),
        "docx" | "doc" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string(),
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
        notes: None,
        archived: false,
        trashed: false,
        palette,
        color_profile: color_profile.clone(),
        tags: vec![],
        collections: vec![],
    };
    
    // Insert into DB
    conn.execute(
        "INSERT INTO assets (id, title, filename, filepath, type, size, width, height, favorite, date_added, url, palette, color_profile) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
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
            &palette_json,
            &color_profile,
        ),
    ).map_err(|e| e.to_string())?;
    
    Ok(asset)
}

#[tauri::command]
pub fn toggle_favorite(id: String, state: State<'_, AppState>) -> Result<bool, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let mut stmt = conn.prepare("SELECT favorite FROM assets WHERE id = ?1").map_err(|e| e.to_string())?;
    let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;
    
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let current_favorite: bool = row.get(0).map_err(|e| e.to_string())?;
        let new_favorite = !current_favorite;
        
        conn.execute(
            "UPDATE assets SET favorite = ?1 WHERE id = ?2",
            (&new_favorite, &id),
        ).map_err(|e| e.to_string())?;
        
        return Ok(new_favorite);
    }
    
    Err("Asset not found".to_string())
}

#[tauri::command]
pub fn import_from_url(url: String, state: State<'_, AppState>) -> Result<AssetData, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let vault_lock = state.vault_path.lock().unwrap();
    let vault_path = vault_lock.as_ref().ok_or("No vault path")?;

    let response = reqwest::blocking::get(&url).map_err(|e| format!("Failed to download: {}", e))?;
    let bytes = response.bytes().map_err(|e| format!("Failed to read bytes: {}", e))?;

    let id = Uuid::new_v4().to_string();
    
    let ext_guess = url.split('.').last().unwrap_or("jpg").to_lowercase();
    let valid_exts = ["jpg", "jpeg", "png", "gif", "webp"];
    let ext = if valid_exts.contains(&ext_guess.as_str()) { ext_guess } else { "jpg".to_string() };
    
    let filename = format!("web_import_{}.{}", id.chars().take(8).collect::<String>(), ext);
    let new_filename = format!("{}.{}", id, ext);
    let dest_rel_path = PathBuf::from("artgrid").join("media").join(&new_filename);
    let dest_abs_path = vault_path.join(&dest_rel_path);

    if let Some(parent) = dest_abs_path.parent() {
        if !parent.exists() {
            let _ = fs::create_dir_all(parent);
        }
    }
    
    fs::write(&dest_abs_path, bytes).map_err(|e| e.to_string())?;
    
    let (width, height) = image::image_dimensions(&dest_abs_path).unwrap_or((0, 0));
    let (palette, color_profile) = extract_color_palette(&dest_abs_path);
    let palette_json = palette.as_ref().map(|p| serde_json::to_string(p).unwrap_or_default());
    let metadata = fs::metadata(&dest_abs_path).map_err(|e| e.to_string())?;
    let size_bytes = metadata.len();
    let size_str = format!("{:.1} MB", size_bytes as f64 / 1_048_576.0);
    
    let now = Utc::now().to_rfc3339();
    let local_url = dest_abs_path.to_string_lossy().into_owned();
    
    let type_ = format!("image/{}", ext);
    
    let asset = AssetData {
        id: id.clone(),
        title: "Imported from Web".to_string(),
        filename: filename.clone(),
        filepath: dest_rel_path.to_string_lossy().into_owned(),
        type_,
        size: size_str,
        width,
        height,
        favorite: false,
        date_added: now,
        url: local_url.clone(),
        notes: None,
        archived: false,
        trashed: false,
        palette,
        color_profile: color_profile.clone(),
        tags: vec![],
        collections: vec![],
    };
    
    conn.execute(
        "INSERT INTO assets (id, title, filename, filepath, type, size, width, height, favorite, date_added, url, notes, archived, trashed, palette, color_profile) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
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
            &asset.notes,
            &asset.archived,
            &asset.trashed,
            &palette_json,
            &color_profile,
        ),
    ).map_err(|e| e.to_string())?;
    
    Ok(asset)
}

#[tauri::command]
pub fn save_base64_image_asset(title: String, base64_data: String, state: State<'_, AppState>) -> Result<AssetData, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let vault_lock = state.vault_path.lock().unwrap();
    let vault_path = vault_lock.as_ref().ok_or("No vault path")?;

    let raw_b64 = if let Some(pos) = base64_data.find(',') {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };

    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD.decode(raw_b64)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let filename = format!("{}.png", id);
    let dest_rel_path = PathBuf::from("artgrid").join("media").join(&filename);
    let dest_abs_path = vault_path.join(&dest_rel_path);

    if let Some(parent) = dest_abs_path.parent() {
        if !parent.exists() {
            let _ = fs::create_dir_all(parent);
        }
    }

    fs::write(&dest_abs_path, bytes).map_err(|e| format!("Failed to write image file: {}", e))?;

    let (width, height) = image::image_dimensions(&dest_abs_path).unwrap_or((0, 0));
    let (palette, color_profile) = extract_color_palette(&dest_abs_path);
    let palette_json = palette.as_ref().map(|p| serde_json::to_string(p).unwrap_or_default());
    let metadata = fs::metadata(&dest_abs_path).map_err(|e| e.to_string())?;
    let size_bytes = metadata.len();
    let size_str = format!("{:.1} MB", size_bytes as f64 / 1_048_576.0);

    let now = Utc::now().to_rfc3339();
    let local_url = dest_abs_path.to_string_lossy().into_owned();

    let asset = AssetData {
        id: id.clone(),
        title: if title.trim().is_empty() { format!("Snapshot_{}", &id[..6]) } else { title },
        filename: filename.clone(),
        filepath: dest_rel_path.to_string_lossy().into_owned(),
        type_: "image/png".to_string(),
        size: size_str,
        width,
        height,
        favorite: false,
        date_added: now,
        url: local_url.clone(),
        notes: None,
        archived: false,
        trashed: false,
        palette,
        color_profile: color_profile.clone(),
        tags: vec![],
        collections: vec![],
    };

    conn.execute(
        "INSERT INTO assets (id, title, filename, filepath, type, size, width, height, favorite, date_added, url, notes, archived, trashed, palette, color_profile) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
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
            &asset.notes,
            &asset.archived,
            &asset.trashed,
            &palette_json,
            &color_profile,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(asset)
}

#[tauri::command]
pub fn save_text_asset(title: String, text_content: String, state: State<'_, AppState>) -> Result<AssetData, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let vault_lock = state.vault_path.lock().unwrap();
    let vault_path = vault_lock.as_ref().ok_or("No vault path")?;

    let id = Uuid::new_v4().to_string();
    let filename = format!("{}.md", id);
    let dest_rel_path = PathBuf::from("artgrid").join("media").join(&filename);
    let dest_abs_path = vault_path.join(&dest_rel_path);

    if let Some(parent) = dest_abs_path.parent() {
        if !parent.exists() {
            let _ = fs::create_dir_all(parent);
        }
    }

    fs::write(&dest_abs_path, text_content.as_bytes()).map_err(|e| format!("Failed to write text file: {}", e))?;

    let metadata = fs::metadata(&dest_abs_path).map_err(|e| e.to_string())?;
    let size_bytes = metadata.len();
    let size_str = format!("{:.1} KB", size_bytes as f64 / 1024.0);

    let now = Utc::now().to_rfc3339();
    let local_url = dest_abs_path.to_string_lossy().into_owned();

    let asset = AssetData {
        id: id.clone(),
        title: if title.trim().is_empty() { "Extracted Text".to_string() } else { title },
        filename: filename.clone(),
        filepath: dest_rel_path.to_string_lossy().into_owned(),
        type_: "text/plain".to_string(),
        size: size_str,
        width: 0,
        height: 0,
        favorite: false,
        date_added: now,
        url: local_url.clone(),
        notes: None,
        archived: false,
        trashed: false,
        palette: None,
        color_profile: None,
        tags: vec![],
        collections: vec![],
    };

    conn.execute(
        "INSERT INTO assets (id, title, filename, filepath, type, size, width, height, favorite, date_added, url, notes, archived, trashed, palette, color_profile) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
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
            &asset.notes,
            &asset.archived,
            &asset.trashed,
            None::<String>,
            None::<String>,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(asset)
}

#[tauri::command]
pub fn update_asset_notes(id: String, notes: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;

    conn.execute(
        "UPDATE assets SET notes = ?1 WHERE id = ?2",
        (&notes, &id),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn archive_asset(id: String, archived: bool, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;

    conn.execute(
        "UPDATE assets SET archived = ?1 WHERE id = ?2",
        (&archived, &id),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn trash_asset(id: String, trashed: bool, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;

    conn.execute(
        "UPDATE assets SET trashed = ?1 WHERE id = ?2",
        (&trashed, &id),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn rename_asset(id: String, new_title: String, new_filename: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;

    let vault_lock = state.vault_path.lock().unwrap();
    let vault_path = vault_lock.as_ref().ok_or("No vault path")?;

    let mut stmt = conn.prepare("SELECT filepath FROM assets WHERE id = ?1").map_err(|e| e.to_string())?;
    let current_filepath: String = stmt.query_row([&id], |row| row.get(0)).map_err(|e| e.to_string())?;

    let old_abs_path = vault_path.join(&current_filepath);

    let ext = old_abs_path.extension().unwrap_or_default().to_string_lossy();
    let formatted_new_filename = if new_filename.contains('.') {
        new_filename
    } else {
        format!("{}.{}", new_filename, ext)
    };

    let new_rel_path = PathBuf::from("artgrid").join("media").join(&formatted_new_filename);
    let new_abs_path = vault_path.join(&new_rel_path);

    if old_abs_path.exists() && old_abs_path != new_abs_path {
        fs::rename(&old_abs_path, &new_abs_path).map_err(|e| format!("Failed to rename file on disk: {}", e))?;
    }

    let new_url = new_abs_path.to_string_lossy().into_owned();

    conn.execute(
        "UPDATE assets SET title = ?1, filename = ?2, filepath = ?3, url = ?4 WHERE id = ?5",
        (&new_title, &formatted_new_filename, &new_rel_path.to_string_lossy().into_owned(), &new_url, &id),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn export_db_backup(destination_path: String, state: State<'_, AppState>) -> Result<(), String> {
    let vault_lock = state.vault_path.lock().unwrap();
    let vault_path = vault_lock.as_ref().ok_or("No vault opened")?;

    let db_path = vault_path.join("artgrid").join("artgrid.db");
    let target_db = if db_path.exists() { db_path } else { vault_path.join("artgrid.db") };
    if !target_db.exists() {
        return Err("Database file does not exist".to_string());
    }

    fs::copy(&target_db, PathBuf::from(destination_path)).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn import_db_backup(source_path: String, state: State<'_, AppState>) -> Result<(), String> {
    let vault_lock = state.vault_path.lock().unwrap();
    let vault_path = vault_lock.as_ref().ok_or("No vault opened")?;

    let src = PathBuf::from(source_path);
    if !src.exists() {
        return Err("Backup file does not exist".to_string());
    }

    let dest = vault_path.join("artgrid").join("artgrid.db");
    if let Some(parent) = dest.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn clear_temp_cache(state: State<'_, AppState>) -> Result<String, String> {
    let mut cleaned_count = 0;
    
    // 1. Remove temporary webview cache files
    let temp_dir = std::env::temp_dir().join("artgrid_webview2_dev");
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 2. Scan database for imported assets no longer physically present in the vault folder
    let db_lock = state.db.lock().unwrap();
    let vault_lock = state.vault_path.lock().unwrap();

    if let (Some(conn), Some(vault_path)) = (db_lock.as_ref(), vault_lock.as_ref()) {
        let mut stmt = conn.prepare("SELECT id, filepath FROM assets").map_err(|e| e.to_string())?;
        let asset_rows: Vec<(String, String)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }).map_err(|e| e.to_string())?
          .filter_map(Result::ok)
          .collect();

        for (id, rel_filepath) in asset_rows {
            let abs_path = vault_path.join(&rel_filepath);
            let legacy_abs = vault_path.join(rel_filepath.trim_start_matches("artgrid/"));
            if !abs_path.exists() && !legacy_abs.exists() {
                let _ = conn.execute("DELETE FROM asset_tags WHERE asset_id = ?1", [&id]);
                let _ = conn.execute("DELETE FROM asset_collections WHERE asset_id = ?1", [&id]);
                let _ = conn.execute("DELETE FROM assets WHERE id = ?1", [&id]);
                cleaned_count += 1;
            }
        }
    }

    Ok(format!("Cache cleared successfully. Cleaned {} missing/orphaned database entries.", cleaned_count))
}

#[tauri::command]
pub fn purge_all_data(state: State<'_, AppState>) -> Result<String, String> {
    // 1. Clear webview dev cache
    let wv2_cache = std::env::temp_dir().join("artgrid_webview2_dev");
    if wv2_cache.exists() {
        let _ = fs::remove_dir_all(&wv2_cache);
    }

    // 2. Clear vault DB & media if opened
    let mut db_lock = state.db.lock().unwrap();
    let mut vault_lock = state.vault_path.lock().unwrap();

    if let Some(vault_path) = vault_lock.as_ref() {
        let artgrid_dir = vault_path.join("artgrid");
        if artgrid_dir.exists() {
            let _ = fs::remove_dir_all(&artgrid_dir);
        }
    }

    *db_lock = None;
    *vault_lock = None;

    Ok("All application data, temporary cache, and vault database have been completely reset.".to_string())
}


