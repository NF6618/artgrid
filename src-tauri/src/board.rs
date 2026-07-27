use crate::import::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use chrono::Utc;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Dimensions {
    pub width: f64,
    pub height: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NodeData {
    pub asset_id: Option<String>,
    pub url: Option<String>,
    pub text: Option<String>,
    pub font_size: Option<f64>,
    pub color: Option<String>,
    pub shape_type: Option<String>,
    pub stroke_points: Option<Vec<Position>>,
    pub stroke_color: Option<String>,
    pub stroke_width: Option<f64>,
    pub fill_color: Option<String>,
    pub fill_opacity: Option<f64>,
    pub corner_radius: Option<f64>,
    pub connected_node_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BoardNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String, // "image" | "text" | "shape"
    pub position: Position,
    pub dimensions: Dimensions,
    pub data: NodeData,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Board {
    pub id: String,
    pub title: String,
    pub nodes: Vec<BoardNode>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub fn get_boards(state: State<'_, AppState>) -> Result<Vec<Board>, String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let mut stmt = conn.prepare("SELECT id, title, nodes_json, created_at, updated_at FROM boards").map_err(|e| e.to_string())?;
    let board_iter = stmt.query_map([], |row| {
        let nodes_json: String = row.get(2)?;
        let nodes: Vec<BoardNode> = serde_json::from_str(&nodes_json).unwrap_or_default();
        
        Ok(Board {
            id: row.get(0)?,
            title: row.get(1)?,
            nodes,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

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
    let nodes: Vec<BoardNode> = vec![];
    let nodes_json = serde_json::to_string(&nodes).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO boards (id, title, nodes_json, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5)",
        (&id, &title, &nodes_json, &now, &now),
    ).map_err(|e| e.to_string())?;
    
    Ok(Board {
        id,
        title,
        nodes,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub fn save_board(id: String, title: String, nodes: Vec<BoardNode>, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    let now = Utc::now().timestamp_millis();
    let nodes_json = serde_json::to_string(&nodes).map_err(|e| e.to_string())?;
    
    conn.execute(
        "UPDATE boards SET title = ?1, nodes_json = ?2, updated_at = ?3 WHERE id = ?4",
        (&title, &nodes_json, &now, &id),
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_board(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let conn = db_lock.as_ref().ok_or("No vault opened")?;
    
    conn.execute(
        "DELETE FROM boards WHERE id = ?1",
        [&id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
