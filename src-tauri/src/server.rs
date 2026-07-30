use axum::{
    routing::post,
    Router,
    Json,
    extract::State,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tower_http::cors::{CorsLayer, Any};
use std::net::SocketAddr;

#[derive(Deserialize, Debug, Clone, Serialize)]
pub struct SaveImageRequest {
    pub url: String,
    pub source: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Serialize)]
pub struct SaveImageResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Deserialize, Debug, Clone, Serialize)]
pub struct AutoCollectRequest {
    pub url: String,
}

pub fn start_local_server(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        let app = Router::new()
            .route("/api/save", post(save_image_handler))
            .route("/api/auto-collect", post(auto_collect_handler))
            .layer(cors)
            .with_state(app_handle);

        let addr = SocketAddr::from(([127, 0, 0, 1], 1430));
        crate::import::log_telemetry(
            "LOG".to_string(),
            format!("Starting local extension server on {}", addr),
            "EXTENSION".to_string(),
        );

        let listener = tokio::net::TcpListener::bind(addr).await.unwrap_or_else(|e| {
            crate::import::log_telemetry(
                "ERROR".to_string(),
                format!("Failed to bind to port 1430: {}", e),
                "EXTENSION".to_string(),
            );
            panic!("Could not bind local server");
        });
        axum::serve(listener, app).await.unwrap();
    });
}

async fn save_image_handler(
    State(app): State<AppHandle>,
    Json(payload): Json<SaveImageRequest>,
) -> Json<SaveImageResponse> {
    crate::import::log_telemetry(
        "NETWORK".to_string(),
        format!("FETCH 200 -> POST /api/save [{}]", payload.url),
        "EXTENSION".to_string(),
    );
    match crate::import::import_from_url(payload.url.clone(), app.clone()).await {
        Ok(asset) => {
            crate::import::log_telemetry(
                "LOG".to_string(),
                format!("Successfully downloaded and saved image to vault: {}", asset.id),
                "EXTENSION".to_string(),
            );
            
            // Update the newly imported asset with the extension metadata (source URL, notes, etc)
            let state = app.state::<crate::AppState>();
            if let Ok(mut db_lock) = state.db.lock() {
                if let Some(conn) = db_lock.as_mut() {
                    let mut title = asset.title;
                    if let Some(meta) = &payload.metadata {
                        if let Some(alt) = meta.get("alt").and_then(|v| v.as_str()) {
                            if !alt.is_empty() {
                                title = alt.to_string();
                            }
                        }
                    }
                    
                    let _ = conn.execute(
                        "UPDATE assets SET url = ?1, title = ?2 WHERE id = ?3",
                        (payload.source.clone(), title, asset.id),
                    );
                }
            }
            
            // Emit to frontend to refresh the UI
            let _ = app.emit("vault-updated", ());
            let _ = app.emit("extension-save-image-success", payload);
            
            Json(SaveImageResponse {
                success: true,
                message: "Image downloaded and saved successfully".to_string(),
            })
        },
        Err(e) => {
            crate::import::log_telemetry(
                "ERROR".to_string(),
                format!("Failed to download image: {}", e),
                "EXTENSION".to_string(),
            );
            
            Json(SaveImageResponse {
                success: false,
                message: e,
            })
        }
    }
}

async fn auto_collect_handler(
    State(app): State<AppHandle>,
    Json(payload): Json<AutoCollectRequest>,
) -> Json<SaveImageResponse> {
    crate::import::log_telemetry(
        "NETWORK".to_string(),
        format!("FETCH 200 -> POST /api/auto-collect [{}]", payload.url),
        "EXTENSION".to_string(),
    );
    
    // Emit event to trigger background scraping
    let _ = app.emit("extension-auto-collect", payload);
    
    Json(SaveImageResponse {
        success: true,
        message: "Auto-collection initiated".to_string(),
    })
}
