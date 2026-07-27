use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::import::AppState;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub created_at: String,
}

pub fn get_folder_path(conn: &rusqlite::Connection, folder_id: &str) -> Result<PathBuf, String> {
    let mut path = PathBuf::new();
    let mut current_id = Some(folder_id.to_string());
    
    let mut names = Vec::new();
    
    while let Some(id) = current_id {
        let mut stmt = conn.prepare("SELECT name, parent_id FROM folders WHERE id = ?1").map_err(|e| e.to_string())?;
        let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;
        
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let name: String = row.get(0).map_err(|e| e.to_string())?;
            let parent_id: Option<String> = row.get(1).map_err(|e| e.to_string())?;
            names.push(name);
            current_id = parent_id;
        } else {
            return Err("Folder not found".to_string());
        }
    }
    
    names.reverse();
    for name in names {
        path.push(name);
    }
    
    Ok(path)
}

#[tauri::command]
pub fn get_folders(state: State<'_, AppState>) -> Result<Vec<Folder>, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let mut stmt = conn.prepare("SELECT id, name, parent_id, created_at FROM folders").map_err(|e| e.to_string())?;
    
    let folder_iter = stmt.query_map([], |row| {
        Ok(Folder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            created_at: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut folders = Vec::new();
    for folder in folder_iter {
        folders.push(folder.map_err(|e| e.to_string())?);
    }
    
    Ok(folders)
}

#[tauri::command]
pub fn create_folder(name: String, parent_id: Option<String>, state: State<'_, AppState>) -> Result<Folder, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    let vault_lock = state.vault_path.lock().unwrap();
    let vault_path = vault_lock.as_ref().ok_or("No vault path")?;
    
    conn.execute(
        "INSERT INTO folders (id, name, parent_id, created_at) VALUES (?1, ?2, ?3, ?4)",
        (&id, &name, &parent_id, &now),
    ).map_err(|e| e.to_string())?;
    
    // Create physical directory
    let mut dir_path = vault_path.join("artgrid").join("media");
    if let Ok(rel_path) = get_folder_path(conn, &id) {
        dir_path.push(rel_path);
        let _ = fs::create_dir_all(&dir_path);
    }
    
    Ok(Folder {
        id,
        name,
        parent_id,
        created_at: now,
    })
}
