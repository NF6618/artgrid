use crate::import::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use chrono::Utc;
use uuid::Uuid;

/// Board is stored with nodes as a raw JSON array so the Rust layer never
/// drops unknown fields when new node types / properties are added on the
/// TypeScript side. The frontend owns the full node schema.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Board {
    pub id: String,
    pub title: String,
    pub nodes: Vec<Value>,  // opaque pass-through — TypeScript defines the schema
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub fn get_boards(state: State<'_, AppState>) -> Result<Vec<Board>, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;

    let mut stmt = conn
        .prepare("SELECT id, title, nodes_json, created_at, updated_at FROM boards ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;

    let board_iter = stmt
        .query_map([], |row| {
            let nodes_json: String = row.get(2)?;
            let mut nodes: Vec<Value> = serde_json::from_str(&nodes_json).unwrap_or_default();
            
            // Self-heal: backfill assetId from src for images if missing on load
            for node in nodes.iter_mut() {
                if let Some(obj) = node.as_object_mut() {
                    let n_type = obj.get("type").and_then(|v| v.as_str()).unwrap_or("");
                    if n_type == "image" {
                        let has_asset_id = obj.get("assetId").is_some() && !obj.get("assetId").unwrap().is_null();
                        if !has_asset_id {
                            if let Some(src_val) = obj.get("src") {
                                if let Some(src) = src_val.as_str() {
                                    let sql = "SELECT id FROM assets WHERE url = ?1 OR filepath = ?1 LIMIT 1";
                                    if let Ok(mut stmt_inner) = conn.prepare(sql) {
                                        if let Ok(mut rows_inner) = stmt_inner.query([src]) {
                                            if let Ok(Some(row_inner)) = rows_inner.next() {
                                                if let Ok(asset_id) = row_inner.get::<_, String>(0) {
                                                    obj.insert("assetId".to_string(), Value::String(asset_id));
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Ok(Board {
                id: row.get(0)?,
                title: row.get(1)?,
                nodes,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut boards = Vec::new();
    for board in board_iter {
        boards.push(board.map_err(|e| e.to_string())?);
    }
    Ok(boards)
}

#[tauri::command]
pub fn create_board(title: String, state: State<'_, AppState>) -> Result<Board, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();
    let nodes_json = "[]";

    conn.execute(
        "INSERT INTO boards (id, title, nodes_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&id, &title, nodes_json, &now, &now),
    )
    .map_err(|e| e.to_string())?;

    Ok(Board {
        id,
        title,
        nodes: vec![],
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub fn save_board(
    id: String,
    title: String,
    mut nodes: Vec<Value>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;

    let now = Utc::now().timestamp_millis();
    
    // Self-heal: backfill assetId from src for images if missing
    for node in nodes.iter_mut() {
        if let Some(obj) = node.as_object_mut() {
            let n_type = obj.get("type").and_then(|v| v.as_str()).unwrap_or("");
            if n_type == "image" {
                let has_asset_id = obj.get("assetId").is_some() && !obj.get("assetId").unwrap().is_null();
                if !has_asset_id {
                    if let Some(src_val) = obj.get("src") {
                        if let Some(src) = src_val.as_str() {
                            let sql = "SELECT id FROM assets WHERE url = ?1 OR filepath = ?1 LIMIT 1";
                            if let Ok(mut stmt) = conn.prepare(sql) {
                                if let Ok(mut rows) = stmt.query([src]) {
                                    if let Ok(Some(row)) = rows.next() {
                                        if let Ok(asset_id) = row.get::<_, String>(0) {
                                            obj.insert("assetId".to_string(), Value::String(asset_id));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let nodes_json = serde_json::to_string(&nodes).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE boards SET title = ?1, nodes_json = ?2, updated_at = ?3 WHERE id = ?4",
        (&title, &nodes_json, &now, &id),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_board(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    conn.execute("DELETE FROM boards WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
