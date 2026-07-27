use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tauri::{AppHandle, Manager, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AiTask {
    ProcessImport { asset_id: String },
    RemoveBackground { asset_id: String },
    UpscaleImage { asset_id: String },
    ExtractText { asset_id: String },
}

pub struct AiPipeline {
    sender: mpsc::Sender<AiTask>,
}

impl AiPipeline {
    pub fn new(app_handle: AppHandle) -> Self {
        // Bounded channel to handle async job queuing
        let (tx, mut rx) = mpsc::channel::<AiTask>(100);
        
        let app = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            while let Some(task) = rx.recv().await {
                println!("ARTGRID AI: Processing task: {:?}", task);
                
                // Simulate processing time
                tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

                // Implementation will call the respective modules here in Phase 4
                match task {
                    AiTask::ProcessImport { asset_id } => {
                        println!("ARTGRID AI: Finished ProcessImport for {}", asset_id);
                    }
                    AiTask::RemoveBackground { asset_id } => {
                        println!("ARTGRID AI: Finished RemoveBackground for {}", asset_id);
                    }
                    AiTask::UpscaleImage { asset_id } => {
                        println!("ARTGRID AI: Finished UpscaleImage for {}", asset_id);
                    }
                    AiTask::ExtractText { asset_id } => {
                        println!("ARTGRID AI: Starting ExtractText for {}", asset_id);
                        let state = app.state::<crate::import::AppState>();
                        
                        let mut pdf_path_opt = None;
                        let mut title_opt = None;
                        if let Ok(db_lock) = state.db.lock() {
                            if let Some(conn) = db_lock.as_ref() {
                                if let Ok(mut stmt) = conn.prepare("SELECT filepath, title FROM assets WHERE id = ?1") {
                                    if let Ok(mut rows) = stmt.query([&asset_id]) {
                                        if let Ok(Some(row)) = rows.next() {
                                            if let Ok(path) = row.get::<_, String>(0) {
                                                if let Ok(title) = row.get::<_, String>(1) {
                                                    if let Ok(vault_lock) = state.vault_path.lock() {
                                                        if let Some(vault) = vault_lock.as_ref() {
                                                            pdf_path_opt = Some(vault.join(path));
                                                            title_opt = Some(title);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if let (Some(pdf_path), Some(title)) = (pdf_path_opt, title_opt) {
                            if let Ok(text) = crate::ai::pdf_extractor::extract_pdf_text_and_images(&pdf_path).await {
                                // Save extracted text
                                if let Ok(db_lock) = state.db.lock() {
                                    if let Some(conn) = db_lock.as_ref() {
                                        let new_id = uuid::Uuid::new_v4().to_string();
                                        let new_filename = format!("{}.txt", new_id);
                                        if let Ok(vault_lock) = state.vault_path.lock() {
                                            if let Some(vault) = vault_lock.as_ref() {
                                                let dest_rel_path = std::path::PathBuf::from("artgrid").join("media").join(&new_filename);
                                                let dest_abs_path = vault.join(&dest_rel_path);
                                                
                                                if std::fs::write(&dest_abs_path, text).is_ok() {
                                                    let now = chrono::Utc::now().to_rfc3339();
                                                    let url = dest_abs_path.to_string_lossy().into_owned();
                                                    
                                                    let _ = conn.execute(
                                                        "INSERT INTO assets (id, title, filename, filepath, type, size, width, height, favorite, date_added, url) 
                                                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                                                        (
                                                            &new_id,
                                                            &format!("DeepOCR_{}", title),
                                                            &new_filename,
                                                            &dest_rel_path.to_string_lossy().into_owned(),
                                                            &"text/plain",
                                                            &"0 MB",
                                                            &0,
                                                            &0,
                                                            &false,
                                                            &now,
                                                            &url,
                                                        ),
                                                    );
                                                }
                                            }
                                        }
                                    }
                                }
                                println!("ARTGRID AI: Finished ExtractText for {} successfully.", asset_id);
                            }
                        }
                    }
                }
                
                // Notify frontend to reload assets
                let _ = app.emit("vault-updated", ());
            }
        });

        Self { sender: tx }
    }

    pub fn queue_task_sync(&self, task: AiTask) {
        let sender = self.sender.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(e) = sender.send(task).await {
                eprintln!("Failed to queue AI task: {:?}", e);
            }
        });
    }
}

#[tauri::command]
pub async fn ai_remove_background(asset_id: String, pipeline: tauri::State<'_, AiPipeline>) -> Result<(), String> {
    pipeline.queue_task_sync(AiTask::RemoveBackground { asset_id });
    Ok(())
}

#[tauri::command]
pub async fn ai_upscale_image(asset_id: String, pipeline: tauri::State<'_, AiPipeline>) -> Result<(), String> {
    pipeline.queue_task_sync(AiTask::UpscaleImage { asset_id });
    Ok(())
}

#[tauri::command]
pub async fn ai_extract_text(asset_id: String, pipeline: tauri::State<'_, AiPipeline>) -> Result<(), String> {
    pipeline.queue_task_sync(AiTask::ExtractText { asset_id });
    Ok(())
}
