use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tauri::{AppHandle, Manager, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AiTask {
    ProcessImport { document_id: String },
    GenerateEmbeddings { document_id: String },
    RemoveBackground { asset_id: String },
    UpscaleImage { asset_id: String },
}

pub struct AiPipeline {
    sender: mpsc::Sender<AiTask>,
}

impl AiPipeline {
    pub fn new(app_handle: AppHandle) -> Self {
        let (tx, mut rx) = mpsc::channel::<AiTask>(100);
        
        let app = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            let registry = crate::importers::ImporterRegistry::new();

            while let Some(task) = rx.recv().await {
                println!("ARTGRID AI: Processing task: {:?}", task);
                
                match task {
                    AiTask::ProcessImport { document_id } => {
                        println!("ARTGRID AI: Starting ProcessImport for {}", document_id);
                        let state = app.state::<crate::import::AppState>();
                        
                        let mut doc_info = None;
                        if let Ok(db_lock) = state.db.lock() {
                            if let Some(conn) = db_lock.as_ref() {
                                if let Ok(mut stmt) = conn.prepare("SELECT id, title, filename, filepath, type, size, date_added FROM documents WHERE id = ?1") {
                                    if let Ok(mut rows) = stmt.query([&document_id]) {
                                        if let Ok(Some(row)) = rows.next() {
                                            let draft = crate::importers::DocumentDraft {
                                                id: row.get(0).unwrap(),
                                                title: row.get(1).unwrap(),
                                                filename: row.get(2).unwrap(),
                                                filepath: std::path::PathBuf::from(row.get::<_, String>(3).unwrap()),
                                                type_: row.get(4).unwrap(),
                                                size_str: row.get(5).unwrap(),
                                                date_added: row.get(6).unwrap(),
                                            };
                                            doc_info = Some(draft);
                                        }
                                    }
                                }
                                // Update status to extracting
                                let _ = conn.execute("UPDATE documents SET status = 'extracting' WHERE id = ?1", [&document_id]);
                            }
                        }

                        if let Some(doc) = doc_info {
                            let vault_path = {
                                let lock = state.vault_path.lock().unwrap();
                                lock.as_ref().unwrap().clone()
                            };

                            let ext = doc.filepath.extension().unwrap_or_default().to_string_lossy().to_lowercase();
                            
                            if let Some(importer) = registry.find(&ext) {
                                match importer.extract(&doc, &vault_path) {
                                    Ok(assets) => {
                                        if let Ok(db_lock) = state.db.lock() {
                                            if let Some(conn) = db_lock.as_ref() {
                                                let now = chrono::Utc::now().to_rfc3339();
                                                
                                                for asset in &assets {
                                                    let url = vault_path.join(&asset.filepath).to_string_lossy().into_owned();
                                                    
                                                    let _ = conn.execute(
                                                        "INSERT INTO assets (id, title, filename, filepath, type, size, width, height, favorite, date_added, url, document_id, page_number, page_text, status, thumbnail_url) 
                                                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
                                                        (
                                                            &asset.id,
                                                            &asset.title,
                                                            &asset.filename,
                                                            &asset.filepath.to_string_lossy().into_owned(),
                                                            &asset.type_,
                                                            &asset.size_str,
                                                            &asset.width,
                                                            &asset.height,
                                                            &false,
                                                            &now,
                                                            &url,
                                                            &doc.id,
                                                            &asset.page_number,
                                                            &asset.page_text,
                                                            &"embedding",
                                                            &asset.thumbnail_url.as_ref().map(|p| p.to_string_lossy().into_owned())
                                                        ),
                                                    );
                                                }
                                                
                                                let _ = conn.execute("UPDATE documents SET page_count = ?1, status = 'embedding' WHERE id = ?2", (assets.len() as u32, &doc.id));
                                            }
                                        }
                                        
                                        let _ = app.emit("vault-updated", ());
                                        
                                        // Queue embeddings step
                                        let state_pipeline = app.state::<AiPipeline>();
                                        state_pipeline.queue_task_sync(AiTask::GenerateEmbeddings { document_id: doc.id });
                                    }
                                    Err(e) => {
                                        println!("ARTGRID AI: Extraction failed for doc {}: {}", doc.id, e);
                                        if let Ok(db_lock) = state.db.lock() {
                                            if let Some(conn) = db_lock.as_ref() {
                                                let _ = conn.execute("UPDATE documents SET status = 'failed', error = ?1 WHERE id = ?2", (&e, &doc.id));
                                            }
                                        }
                                    }
                                }
                            } else {
                                // No extractor needed; just set indexed
                                if let Ok(db_lock) = state.db.lock() {
                                    if let Some(conn) = db_lock.as_ref() {
                                        let _ = conn.execute("UPDATE documents SET status = 'indexed' WHERE id = ?1", [&doc.id]);
                                    }
                                }
                            }
                        }
                    }
                    AiTask::GenerateEmbeddings { document_id } => {
                        println!("ARTGRID AI: GenerateEmbeddings for {}", document_id);
                        
                        let state = app.state::<crate::import::AppState>();
                        let vault_path = {
                            let lock = state.vault_path.lock().unwrap();
                            lock.as_ref().unwrap().clone()
                        };

                        let embedder = crate::ai::embedder::StubEmbedder;
                        let mut asset_updates = Vec::new();

                        if let Ok(db_lock) = state.db.lock() {
                            if let Some(conn) = db_lock.as_ref() {
                                // 1. Read all assets for this document
                                if let Ok(mut stmt) = conn.prepare("SELECT id, filepath, page_text FROM assets WHERE document_id = ?1") {
                                    if let Ok(mut rows) = stmt.query([&document_id]) {
                                        while let Ok(Some(row)) = rows.next() {
                                            let asset_id: String = row.get(0).unwrap();
                                            let filepath: String = row.get(1).unwrap();
                                            let page_text: Option<String> = row.get(2).unwrap();
                                            asset_updates.push((asset_id, filepath, page_text));
                                        }
                                    }
                                }
                            }
                        }

                        // 2. Generate embeddings outside of the DB lock
                        let mut computed_embeddings = Vec::new();
                        for (asset_id, rel_filepath, page_text) in asset_updates {
                            let text_emb = match page_text {
                                Some(ref t) if !t.trim().is_empty() => {
                                    Some(crate::ai::embedder::to_blob(&crate::ai::embedder::Embedder::embed_text(&embedder, t)))
                                }
                                _ => None,
                            };

                            let abs_path = vault_path.join(&rel_filepath);
                            let img_emb = crate::ai::embedder::to_blob(&crate::ai::embedder::Embedder::embed_image(&embedder, &abs_path));
                            
                            computed_embeddings.push((asset_id, text_emb, img_emb));
                        }

                        // 3. Write them to DB and mark as indexed
                        if let Ok(db_lock) = state.db.lock() {
                            if let Some(conn) = db_lock.as_ref() {
                                let now = chrono::Utc::now().to_rfc3339();
                                
                                for (asset_id, text_emb, img_emb) in computed_embeddings {
                                    let _ = conn.execute(
                                        "INSERT OR REPLACE INTO asset_embeddings (asset_id, text_embedding, image_embedding, indexed_at) 
                                         VALUES (?1, ?2, ?3, ?4)",
                                        (
                                            &asset_id,
                                            text_emb.as_deref(),
                                            &img_emb,
                                            &now,
                                        ),
                                    );
                                    let _ = conn.execute("UPDATE assets SET status = 'indexed' WHERE id = ?1", [&asset_id]);
                                    
                                    // Notify frontend
                                    let _ = app.emit("asset-indexed", asset_id);
                                }
                                
                                let _ = conn.execute("UPDATE documents SET status = 'indexed' WHERE id = ?1", [&document_id]);
                            }
                        }
                        
                        let _ = app.emit("vault-updated", ());
                    }
                    AiTask::RemoveBackground { asset_id } => {
                        println!("ARTGRID AI: Finished RemoveBackground for {}", asset_id);
                    }
                    AiTask::UpscaleImage { asset_id } => {
                        println!("ARTGRID AI: Finished UpscaleImage for {}", asset_id);
                    }
                }
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
