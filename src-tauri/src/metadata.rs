use crate::import::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub color: String,
    pub parent_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub fn get_collections(state: State<'_, AppState>) -> Result<Vec<Collection>, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let mut stmt = conn.prepare("SELECT id, name, color, parent_id FROM collections").map_err(|e| e.to_string())?;
    let collection_iter = stmt.query_map([], |row| {
        Ok(Collection {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            parent_id: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut collections = Vec::new();
    for col in collection_iter {
        collections.push(col.map_err(|e| e.to_string())?);
    }
    
    Ok(collections)
}

#[tauri::command]
pub fn create_collection(name: String, color: String, parent_id: Option<String>, state: State<'_, AppState>) -> Result<Collection, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let id = Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO collections (id, name, color, parent_id) VALUES (?1, ?2, ?3, ?4)",
        (&id, &name, &color, &parent_id),
    ).map_err(|e| e.to_string())?;
    
    Ok(Collection { id, name, color, parent_id })
}

#[tauri::command]
pub fn get_tags(state: State<'_, AppState>) -> Result<Vec<Tag>, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let mut stmt = conn.prepare("SELECT id, name FROM tags").map_err(|e| e.to_string())?;
    let tag_iter = stmt.query_map([], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut tags = Vec::new();
    for tag in tag_iter {
        tags.push(tag.map_err(|e| e.to_string())?);
    }
    
    Ok(tags)
}

#[tauri::command]
pub fn add_tag_to_asset(asset_id: String, tag_name: String, state: State<'_, AppState>) -> Result<Tag, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    // Check if tag exists, if not create it
    let tag_id: String = match conn.query_row(
        "SELECT id FROM tags WHERE name = ?1",
        [&tag_name],
        |row| row.get(0),
    ) {
        Ok(id) => id,
        Err(_) => {
            let new_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO tags (id, name) VALUES (?1, ?2)",
                (&new_id, &tag_name),
            ).map_err(|e| e.to_string())?;
            new_id
        }
    };
    
    // Add to asset_tags
    conn.execute(
        "INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?1, ?2)",
        (&asset_id, &tag_id),
    ).map_err(|e| e.to_string())?;
    
    Ok(Tag { id: tag_id, name: tag_name })
}

#[tauri::command]
pub fn remove_tag_from_asset(asset_id: String, tag_name: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let tag_id: String = match conn.query_row(
        "SELECT id FROM tags WHERE name = ?1",
        [&tag_name],
        |row| row.get(0),
    ) {
        Ok(id) => id,
        Err(_) => return Err("Tag not found".to_string()),
    };
    
    conn.execute(
        "DELETE FROM asset_tags WHERE asset_id = ?1 AND tag_id = ?2",
        (&asset_id, &tag_id),
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn add_asset_to_collection(asset_id: String, collection_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    conn.execute(
        "INSERT OR IGNORE INTO asset_collections (asset_id, collection_id) VALUES (?1, ?2)",
        (&asset_id, &collection_id),
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn remove_asset_from_collection(asset_id: String, collection_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    conn.execute(
        "DELETE FROM asset_collections WHERE asset_id = ?1 AND collection_id = ?2",
        (&asset_id, &collection_id),
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
