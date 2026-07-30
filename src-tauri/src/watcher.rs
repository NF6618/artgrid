use notify::{Watcher, RecursiveMode, Event, EventKind};
use std::path::PathBuf;
use std::sync::mpsc;
use std::thread;
use tauri::{AppHandle, Manager, Emitter};
use crate::import::AppState;
use std::time::Duration;
use uuid::Uuid;
use chrono::Utc;
use std::fs;

// The watcher loop runs in a background thread
pub fn start_watcher(app_handle: AppHandle, vault_path: PathBuf) {
    let media_path = vault_path.join("media");
    
    // Create channel to receive events
    let (tx, rx) = mpsc::channel();
    
    // Spawn thread to run watcher
    thread::spawn(move || {
        let mut watcher = notify::recommended_watcher(tx).expect("Failed to create watcher");
        
        // Watch the media directory
        if media_path.exists() {
            watcher.watch(&media_path, RecursiveMode::Recursive).expect("Failed to watch media folder");
            println!("ARTGRID: Started watching {:?}", media_path);
        } else {
            println!("ARTGRID: Media folder does not exist yet");
            return;
        }

        for res in rx {
            match res {
                Ok(event) => {
                    handle_event(&app_handle, event);
                },
                Err(e) => println!("ARTGRID Watcher error: {:?}", e),
            }
        }
    });
}

fn handle_event(app: &AppHandle, event: Event) {
    // Only care about newly created files
    if let EventKind::Create(_) = event.kind {
        for path in event.paths {
            if path.is_file() {
                println!("ARTGRID: Detected new file: {:?}", path);
                
                // Wait a tiny bit to ensure the file is completely written by the OS before reading it
                thread::sleep(Duration::from_millis(500));
                
                process_new_file(app, path);
            }
        }
    }
}

fn process_new_file(app: &AppHandle, path: PathBuf) {
    let state = app.state::<AppState>();
    
    // Check if it already has a UUID format (meaning it was imported by our own app)
    let file_stem = path.file_stem().unwrap_or_default().to_string_lossy();
    if Uuid::parse_str(&file_stem).is_ok() {
        // It's already processed, ignore to prevent infinite loop of importing
        return;
    }

    let ext = path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
    let supported_exts = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "md", "txt", "pdf"];
    
    if !supported_exts.contains(&ext.as_str()) {
        println!("ARTGRID: Ignoring unsupported file {:?}", path);
        return;
    }

    let filename = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
    let id = Uuid::new_v4().to_string();
    let new_filename = format!("{}.{}", id, ext);
    let new_path = path.with_file_name(&new_filename);

    // Rename the file to our UUID format
    if let Err(e) = fs::rename(&path, &new_path) {
        println!("ARTGRID: Failed to rename file: {}", e);
        return;
    }

    // Get dimensions if it's an image
    let (width, height) = match ext.as_str() {
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" => {
            image::image_dimensions(&new_path).unwrap_or((0, 0))
        },
        _ => (0, 0) // Docs/PDFs don't have standard image dimensions
    };

    let size_bytes = fs::metadata(&new_path).map(|m| m.len()).unwrap_or(0);
    let size_str = format!("{:.1} MB", size_bytes as f64 / 1_048_576.0);
    
    let now = Utc::now().to_rfc3339();
    let url = new_path.to_string_lossy().into_owned();
    
    let type_ = match ext.as_str() {
        "md" | "txt" => "text/plain".to_string(),
        "pdf" => "application/pdf".to_string(),
        _ => format!("image/{}", ext)
    };

    let filepath = PathBuf::from("media").join(&new_filename).to_string_lossy().into_owned();

    // Insert into DB
    let db_lock = state.db.lock().unwrap();
    if let Some(conn) = db_lock.as_ref() {
        let res = conn.execute(
            "INSERT INTO assets (id, title, filename, filepath, type, size, width, height, favorite, date_added, url, folder_id) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, NULL)",
            (
                &id,
                &filename, // keep original filename as title
                &filename, 
                &filepath,
                &type_,
                &size_str,
                &width,
                &height,
                &false,
                &now,
                &url,
            ),
        );
        
        if res.is_ok() {
            println!("ARTGRID: Successfully watched and imported {:?}", new_filename);
            
            if let Some(pipeline) = app.try_state::<crate::ai::pipeline::AiPipeline>() {
                // Queue post-processing
                pipeline.queue_task_sync(crate::ai::pipeline::AiTask::ProcessImport { document_id: id.clone() });
            }

            // Notify frontend
            let _ = app.emit("vault-updated", ());
        } else {
            println!("ARTGRID: DB Insert failed: {:?}", res);
        }
    }
}
