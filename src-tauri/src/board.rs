use crate::import::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use chrono::Utc;
use uuid::Uuid;
use rusqlite::OptionalExtension;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Board {
    pub id: String,
    pub title: String,
    pub nodes: Vec<Value>,
    pub created_at: i64,
    pub updated_at: i64,
}

// Helper to extract bounds from a node JSON
fn extract_bounds(node: &Value) -> (f64, f64, f64, f64) {
    let x = node.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let y = node.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let w = node.get("width").and_then(|v| v.as_f64()).unwrap_or(100.0);
    let h = node.get("height").and_then(|v| v.as_f64()).unwrap_or(100.0);
    (x, x + w, y, y + h)
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
            let id: String = row.get(0)?;
            let title: String = row.get(1)?;
            let nodes_json: String = row.get(2)?;
            let created_at: i64 = row.get(3)?;
            let updated_at: i64 = row.get(4)?;
            
            // Check if we need to migrate nodes to board_nodes table
            let mut nodes: Vec<Value> = Vec::new();
            
            // Fetch from board_nodes if they exist
            let mut nodes_stmt = conn.prepare("SELECT node_json FROM board_nodes WHERE board_id = ?1");
            if let Ok(mut n_stmt) = nodes_stmt {
                if let Ok(n_iter) = n_stmt.query_map([&id], |nrow| {
                    let json_str: String = nrow.get(0)?;
                    Ok(serde_json::from_str::<Value>(&json_str).unwrap_or(Value::Null))
                }) {
                    for n in n_iter.flatten() {
                        if !n.is_null() {
                            nodes.push(n);
                        }
                    }
                }
            }

            // If empty, it might be a legacy board. Let's parse nodes_json and migrate it inline.
            if nodes.is_empty() && nodes_json.len() > 5 { // "[]" is length 2
                nodes = serde_json::from_str(&nodes_json).unwrap_or_default();
                for (idx, node) in nodes.iter().enumerate() {
                    let uuid = node.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let n_type = node.get("type").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let n_json = serde_json::to_string(node).unwrap_or_default();
                    let (min_x, max_x, min_y, max_y) = extract_bounds(node);
                    
                    if !uuid.is_empty() {
                        let _ = conn.execute(
                            "INSERT OR REPLACE INTO board_nodes (uuid, board_id, node_type, node_json, z_index) VALUES (?1, ?2, ?3, ?4, ?5)",
                            (&uuid, &id, &n_type, &n_json, idx as i64)
                        );
                        
                        // Insert into R-Tree (need integer ID)
                        let internal_id: Option<i64> = conn.query_row(
                            "SELECT id FROM board_nodes WHERE uuid = ?1",
                            [&uuid],
                            |r| r.get(0)
                        ).optional().unwrap_or(None);
                        
                        if let Some(iid) = internal_id {
                            let _ = conn.execute(
                                "INSERT OR REPLACE INTO board_nodes_rtree (id, minX, maxX, minY, maxY) VALUES (?1, ?2, ?3, ?4, ?5)",
                                (iid, min_x, max_x, min_y, max_y)
                            );
                        }
                    }
                }
                
                // Clear the legacy blob to mark as migrated
                let _ = conn.execute("UPDATE boards SET nodes_json = '[]' WHERE id = ?1", [&id]);
            }

            // Self-heal logic
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
                id,
                title,
                nodes,
                created_at,
                updated_at,
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

// Legacy save_board (still updates the title, but leaves nodes empty)
#[tauri::command]
pub fn save_board(
    id: String,
    title: String,
    _nodes: Vec<Value>, // Deprecated parameter, handled by upsert_nodes
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    let now = Utc::now().timestamp_millis();

    conn.execute(
        "UPDATE boards SET title = ?1, updated_at = ?2 WHERE id = ?3",
        (&title, &now, &id),
    ).map_err(|e| e.to_string())?;

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

#[tauri::command]
pub fn get_visible_nodes(
    board_id: String, 
    min_x: f64, 
    min_y: f64, 
    max_x: f64, 
    max_y: f64, 
    state: State<'_, AppState>
) -> Result<Vec<Value>, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;

    let mut stmt = conn.prepare(
        "SELECT n.node_json 
         FROM board_nodes_rtree r 
         JOIN board_nodes n ON n.id = r.id 
         WHERE n.board_id = ?1 
         AND r.minX <= ?2 AND r.maxX >= ?3 
         AND r.minY <= ?4 AND r.maxY >= ?5
         ORDER BY n.z_index ASC"
    ).map_err(|e| e.to_string())?;

    // Note: R-Tree overlap query:
    // r.minX <= viewport.maxX AND r.maxX >= viewport.minX
    let iter = stmt.query_map(rusqlite::params![&board_id, &max_x, &min_x, &max_y, &min_y], |row| {
        let json_str: String = row.get(0)?;
        Ok(serde_json::from_str::<Value>(&json_str).unwrap_or(Value::Null))
    }).map_err(|e| e.to_string())?;

    let mut nodes = Vec::new();
    for n in iter.flatten() {
        if !n.is_null() {
            nodes.push(n);
        }
    }
    
    Ok(nodes)
}

#[tauri::command]
pub fn upsert_nodes(board_id: String, nodes: Vec<Value>, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let mut processed_nodes = nodes.clone();
    for node in processed_nodes.iter_mut() {
        if let Some(obj) = node.as_object_mut() {
            let n_type = obj.get("type").and_then(|v| v.as_str()).unwrap_or("");
            if n_type == "image" && (obj.get("assetId").is_none() || obj.get("assetId").unwrap().is_null()) {
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

    for node in processed_nodes {
        let uuid = node.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if uuid.is_empty() { continue; }
        
        let n_type = node.get("type").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let (min_x, max_x, min_y, max_y) = extract_bounds(&node);
        let n_json = serde_json::to_string(&node).unwrap_or_default();
        let z_index = node.get("zIndex").and_then(|v| v.as_i64()).unwrap_or(0);
        
        let _ = conn.execute(
            "INSERT OR REPLACE INTO board_nodes (uuid, board_id, node_type, node_json, z_index) VALUES (?1, ?2, ?3, ?4, ?5)",
            (&uuid, &board_id, &n_type, &n_json, &z_index)
        );
        
        let internal_id: Option<i64> = conn.query_row(
            "SELECT id FROM board_nodes WHERE uuid = ?1",
            [&uuid],
            |r| r.get(0)
        ).optional().unwrap_or(None);
        
        if let Some(iid) = internal_id {
            let _ = conn.execute(
                "INSERT OR REPLACE INTO board_nodes_rtree (id, minX, maxX, minY, maxY) VALUES (?1, ?2, ?3, ?4, ?5)",
                (iid, min_x, max_x, min_y, max_y)
            );
        }
    }
    
    // Update board modified time
    let now = Utc::now().timestamp_millis();
    let _ = conn.execute("UPDATE boards SET updated_at = ?1 WHERE id = ?2", (&now, &board_id));

    Ok(())
}

#[tauri::command]
pub fn delete_nodes(board_id: String, node_ids: Vec<String>, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;

    for uuid in node_ids {
        let internal_id: Option<i64> = conn.query_row(
            "SELECT id FROM board_nodes WHERE uuid = ?1 AND board_id = ?2",
            (&uuid, &board_id),
            |r| r.get(0)
        ).optional().unwrap_or(None);
        
        if let Some(iid) = internal_id {
            let _ = conn.execute("DELETE FROM board_nodes_rtree WHERE id = ?1", [iid]);
            let _ = conn.execute("DELETE FROM board_nodes WHERE id = ?1", [iid]);
        }
    }
    
    let now = Utc::now().timestamp_millis();
    let _ = conn.execute("UPDATE boards SET updated_at = ?1 WHERE id = ?2", (&now, &board_id));

    Ok(())
}

#[tauri::command]
pub fn layout_section(board_id: String, section_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;

    // 1. Get the section node
    let section_str: String = conn.query_row(
        "SELECT node_json FROM board_nodes WHERE uuid = ?1 AND board_id = ?2",
        (&section_id, &board_id),
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let mut section_val: Value = serde_json::from_str(&section_str).map_err(|e| e.to_string())?;

    // 2. Get all children of this section
    let mut stmt = conn.prepare(
        "SELECT id, uuid, node_type, node_json 
         FROM board_nodes 
         WHERE board_id = ?1 AND json_extract(node_json, '$.parentId') = ?2
         ORDER BY z_index ASC"
    ).map_err(|e| e.to_string())?;

    struct ChildNode {
        id: i64,
        uuid: String,
        node_type: String,
        json: Value,
    }

    let child_iter = stmt.query_map([&board_id, &section_id], |row| {
        let id: i64 = row.get(0)?;
        let uuid: String = row.get(1)?;
        let n_type: String = row.get(2)?;
        let json_str: String = row.get(3)?;
        let json: Value = serde_json::from_str(&json_str).unwrap_or(Value::Null);
        Ok(ChildNode { id, uuid, node_type: n_type, json })
    }).map_err(|e| e.to_string())?;

    let mut children = Vec::new();
    for c in child_iter.flatten() {
        if !c.json.is_null() { children.push(c); }
    }

    if children.is_empty() { return Ok(()); }

    let layout = section_val.get("layout").and_then(|v| v.as_str()).unwrap_or("free");
    let padding = 32.0;
    let top_padding = 48.0;

    let sec_x = section_val.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let sec_y = section_val.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);

    let mut updated_children = Vec::new();
    let mut new_sec_width = section_val.get("width").and_then(|v| v.as_f64()).unwrap_or(100.0);
    let mut new_sec_height = section_val.get("height").and_then(|v| v.as_f64()).unwrap_or(100.0);

    if layout == "masonry" {
        let col_width = 300.0;
        let gap = 20.0;
        
        let mut columns = section_val.get("columns").and_then(|v| v.as_i64()).unwrap_or(0);
        if columns <= 0 {
            columns = 1.max((children.len() as f64).sqrt().ceil() as i64);
        }
        
        let mut col_heights = vec![0.0; columns as usize];

        for mut child in children {
            let mut min_col = 0;
            let mut min_height = col_heights[0];
            for i in 1..(columns as usize) {
                if col_heights[i] < min_height {
                    min_height = col_heights[i];
                    min_col = i;
                }
            }

            let orig_w = child.json.get("width").and_then(|v| v.as_f64()).unwrap_or(100.0);
            let orig_h = child.json.get("height").and_then(|v| v.as_f64()).unwrap_or(100.0);
            
            let mut new_w = orig_w;
            let mut new_h = orig_h;

            if child.node_type == "image" || orig_w > col_width {
                let scale = col_width / orig_w;
                new_w = col_width;
                new_h = orig_h * scale;
            }

            let new_x = sec_x + padding + min_col as f64 * (col_width + gap);
            let new_y = sec_y + top_padding + col_heights[min_col];

            if let Some(obj) = child.json.as_object_mut() {
                obj.insert("x".to_string(), Value::from(new_x));
                obj.insert("y".to_string(), Value::from(new_y));
                obj.insert("width".to_string(), Value::from(new_w));
                obj.insert("height".to_string(), Value::from(new_h));
            }
            
            col_heights[min_col] += new_h + gap;
            updated_children.push(child);
        }

        let max_col_h = col_heights.iter().cloned().fold(f64::NAN, f64::max);
        new_sec_width = padding * 2.0 + columns as f64 * col_width + if columns > 1 { (columns - 1) as f64 * gap } else { 0.0 };
        new_sec_height = top_padding + padding + max_col_h;

    } else {
        // Free layout bounding box calculation
        let mut min_x = f64::INFINITY;
        let mut min_y = f64::INFINITY;
        let mut max_x = f64::NEG_INFINITY;
        let mut max_y = f64::NEG_INFINITY;

        for child in &children {
            let cx = child.json.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let cy = child.json.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let cw = child.json.get("width").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let ch = child.json.get("height").and_then(|v| v.as_f64()).unwrap_or(0.0);

            if cx < min_x { min_x = cx; }
            if cy < min_y { min_y = cy; }
            if cx + cw > max_x { max_x = cx + cw; }
            if cy + ch > max_y { max_y = cy + ch; }
        }

        new_sec_width = (max_x - min_x) + padding * 2.0;
        new_sec_height = (max_y - min_y) + padding + top_padding;
        
        let new_sec_x = min_x - padding;
        let new_sec_y = min_y - top_padding;
        
        if let Some(obj) = section_val.as_object_mut() {
            obj.insert("x".to_string(), Value::from(new_sec_x));
            obj.insert("y".to_string(), Value::from(new_sec_y));
        }
    }

    if let Some(obj) = section_val.as_object_mut() {
        obj.insert("width".to_string(), Value::from(new_sec_width));
        obj.insert("height".to_string(), Value::from(new_sec_height));
    }

    // Save Section
    let (s_min_x, s_max_x, s_min_y, s_max_y) = extract_bounds(&section_val);
    let sec_json_str = serde_json::to_string(&section_val).unwrap_or_default();
    
    let _ = conn.execute(
        "UPDATE board_nodes SET node_json = ?1 WHERE uuid = ?2",
        (&sec_json_str, &section_id)
    );
    
    let s_internal_id: Option<i64> = conn.query_row(
        "SELECT id FROM board_nodes WHERE uuid = ?1",
        [&section_id],
        |r| r.get(0)
    ).optional().unwrap_or(None);
    
    if let Some(iid) = s_internal_id {
        let _ = conn.execute(
            "INSERT OR REPLACE INTO board_nodes_rtree (id, minX, maxX, minY, maxY) VALUES (?1, ?2, ?3, ?4, ?5)",
            (iid, s_min_x, s_max_x, s_min_y, s_max_y)
        );
    }

    // Save Children
    for child in updated_children {
        let (c_min_x, c_max_x, c_min_y, c_max_y) = extract_bounds(&child.json);
        let c_json_str = serde_json::to_string(&child.json).unwrap_or_default();
        
        let _ = conn.execute(
            "UPDATE board_nodes SET node_json = ?1 WHERE id = ?2",
            (&c_json_str, &child.id)
        );
        let _ = conn.execute(
            "INSERT OR REPLACE INTO board_nodes_rtree (id, minX, maxX, minY, maxY) VALUES (?1, ?2, ?3, ?4, ?5)",
            (child.id, c_min_x, c_max_x, c_min_y, c_max_y)
        );
    }

    let now = Utc::now().timestamp_millis();
    let _ = conn.execute("UPDATE boards SET updated_at = ?1 WHERE id = ?2", (&now, &board_id));

    Ok(())
}
