//! Importer trait + registry (fixes audit finding 4 — four hard-coded extension arrays).
//!
//! Adding a new file type requires only:
//!   1. Implementing `Importer` for a new struct
//!   2. Calling `registry.register(Box::new(MyImporter))` once in lib.rs setup
//!
//! Nothing in tagging, search, or boards needs to change.

use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

// ── Data transfer types ───────────────────────────────────────────────────────

/// Minimal record returned by the fast ingest path.
/// Written to `documents` immediately; `assets` rows come from `extract()`.
#[derive(Debug, Clone)]
pub struct DocumentDraft {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub filepath: PathBuf,   // absolute, vault-relative written by caller
    pub type_: String,
    pub size_str: String,
    pub date_added: String,
}

/// One page / one image asset produced by the slow extract path.
#[derive(Debug, Clone)]
pub struct AssetDraft {
    pub id: String,
    pub document_id: String,
    pub page_number: Option<u32>,  // None for standalone images
    pub title: String,
    pub filename: String,
    pub filepath: PathBuf,         // absolute path to the rendered page image
    pub type_: String,
    pub size_str: String,
    pub width: u32,
    pub height: u32,
    pub page_text: Option<String>,
    pub ocr_error: Option<String>, // surfaces to documents.error if Tesseract absent
    pub thumbnail_url: Option<PathBuf>,
}

// ── Importer trait ────────────────────────────────────────────────────────────

pub trait Importer: Send + Sync {
    /// File extensions this importer handles, all lowercase, without leading dot.
    fn extensions(&self) -> &'static [&'static str];

    /// Fast path: validate the file can be imported; fill in a DocumentDraft.
    /// Must be cheap (no rendering, no OCR). Called in the request/response path.
    fn can_handle(&self, ext: &str) -> bool {
        self.extensions().contains(&ext)
    }

    /// MIME type for this importer's files.
    fn mime_type(&self, ext: &str) -> String;

    /// Fast path: runs in the request path, must be cheap (file copy + row insert only)
    fn ingest(&self, src: &Path, dest: &Path) -> Result<DocumentDraft, String>;

    /// Slow path: runs on the background worker to extract pages/assets
    fn extract(&self, doc: &DocumentDraft, vault_path: &Path) -> Result<Vec<AssetDraft>, String>;
}

// ── ImageImporter ─────────────────────────────────────────────────────────────

pub struct ImageImporter;

impl Importer for ImageImporter {
    fn extensions(&self) -> &'static [&'static str] {
        &["png", "jpg", "jpeg", "gif", "webp", "bmp"]
    }

    fn mime_type(&self, ext: &str) -> String {
        format!("image/{}", ext)
    }

    fn ingest(&self, _src: &Path, _dest: &Path) -> Result<DocumentDraft, String> {
        // We'll leave the actual ingest implementation to be called from import.rs,
        // or just return a dummy draft for now since import.rs handles it currently.
        // The track B design says: import_one dispatches to ingest() then extract().
        // For now, pipeline.rs just needs extract().
        Err("Not implemented".to_string())
    }

    fn extract(&self, doc: &DocumentDraft, vault_path: &Path) -> Result<Vec<AssetDraft>, String> {
        // Extract returns exactly one AssetDraft for an image, page_number = None
        let id = uuid::Uuid::new_v4().to_string();
        
        // Extract dimensions if possible
        let (width, height) = match image::image_dimensions(vault_path.join(&doc.filepath)) {
            Ok((w, h)) => (w, h),
            Err(_) => (0, 0),
        };

        Ok(vec![AssetDraft {
            id,
            document_id: doc.id.clone(),
            page_number: None,
            title: doc.title.clone(),
            filename: doc.filename.clone(),
            filepath: doc.filepath.clone(),
            type_: doc.type_.clone(),
            size_str: doc.size_str.clone(),
            width,
            height,
            page_text: None,
            ocr_error: None,
            thumbnail_url: None, // Will be generated later or not needed for images
        }])
    }
}

// ── TextImporter ──────────────────────────────────────────────────────────────

pub struct TextImporter;

impl Importer for TextImporter {
    fn extensions(&self) -> &'static [&'static str] {
        &["md", "txt"]
    }

    fn mime_type(&self, _ext: &str) -> String {
        "text/plain".to_string()
    }

    fn ingest(&self, _src: &Path, _dest: &Path) -> Result<DocumentDraft, String> {
        Err("Not implemented".to_string())
    }

    fn extract(&self, doc: &DocumentDraft, vault_path: &Path) -> Result<Vec<AssetDraft>, String> {
        let id = uuid::Uuid::new_v4().to_string();
        
        let text = std::fs::read_to_string(vault_path.join(&doc.filepath))
            .unwrap_or_default();

        Ok(vec![AssetDraft {
            id,
            document_id: doc.id.clone(),
            page_number: None,
            title: doc.title.clone(),
            filename: doc.filename.clone(),
            filepath: doc.filepath.clone(),
            type_: doc.type_.clone(),
            size_str: doc.size_str.clone(),
            width: 0,
            height: 0,
            page_text: Some(text),
            ocr_error: None,
            thumbnail_url: None,
        }])
    }
}

// ── DocImporter ───────────────────────────────────────────────────────────────

pub struct DocImporter;

impl Importer for DocImporter {
    fn extensions(&self) -> &'static [&'static str] {
        &["docx", "doc"]
    }

    fn mime_type(&self, _ext: &str) -> String {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string()
    }

    fn ingest(&self, _src: &Path, _dest: &Path) -> Result<DocumentDraft, String> {
        Err("Not implemented".to_string())
    }

    fn extract(&self, _doc: &DocumentDraft, _vault_path: &Path) -> Result<Vec<AssetDraft>, String> {
        Ok(vec![])
    }
}

// ── PdfImporter ───────────────────────────────────────────────────────────────

pub struct PdfImporter;

impl Importer for PdfImporter {
    fn extensions(&self) -> &'static [&'static str] {
        &["pdf"]
    }

    fn mime_type(&self, _ext: &str) -> String {
        "application/pdf".to_string()
    }

    fn ingest(&self, _src: &Path, _dest: &Path) -> Result<DocumentDraft, String> {
        Err("Not implemented".to_string())
    }

    fn extract(&self, doc: &DocumentDraft, vault_path: &Path) -> Result<Vec<AssetDraft>, String> {
        // This delegates to our new pdf_extractor.rs
        let pdf_path = vault_path.join(&doc.filepath);
        let output_dir = vault_path.join("artgrid").join("media");
        
        let pages = crate::ai::pdf_extractor::extract_pdf_pages(&pdf_path, &output_dir, &doc.id)?;
        
        let mut drafts = Vec::new();
        for page in pages {
            let id = uuid::Uuid::new_v4().to_string();
            // Path relative to vault root
            let rel_filepath = std::path::PathBuf::from("artgrid").join("media").join(page.image_path.file_name().unwrap());
            
            drafts.push(AssetDraft {
                id,
                document_id: doc.id.clone(),
                page_number: Some(page.page_number),
                title: format!("{} - Page {}", doc.title, page.page_number),
                filename: page.image_path.file_name().unwrap().to_string_lossy().into_owned(),
                filepath: rel_filepath.clone(),
                type_: "image/png".to_string(), // Extracted page is an image
                size_str: "0 MB".to_string(), // Could compute real size
                width: page.width,
                height: page.height,
                page_text: Some(page.text),
                ocr_error: page.ocr_error,
                thumbnail_url: Some(rel_filepath), // Uses the page image as thumbnail
            });
        }
        
        Ok(drafts)
    }
}

// ── Registry ──────────────────────────────────────────────────────────────────

/// Single source of truth for which file types are supported and how.
/// Replaces all hard-coded extension arrays in import.rs / watcher.rs.
pub struct ImporterRegistry {
    importers: Vec<Box<dyn Importer>>,
}

impl ImporterRegistry {
    pub fn new() -> Self {
        let mut reg = Self { importers: Vec::new() };
        reg.register(Box::new(ImageImporter));
        reg.register(Box::new(TextImporter));
        reg.register(Box::new(DocImporter));
        reg.register(Box::new(PdfImporter));
        reg
    }

    pub fn register(&mut self, importer: Box<dyn Importer>) {
        self.importers.push(importer);
    }

    /// Flat list of all supported extensions, for dialog filters and validation.
    pub fn supported_extensions(&self) -> Vec<&'static str> {
        self.importers.iter().flat_map(|i| i.extensions().iter().copied()).collect()
    }

    /// Look up the importer for a given extension. Returns None if unsupported.
    pub fn find(&self, ext: &str) -> Option<&dyn Importer> {
        let lower = ext.to_lowercase();
        self.importers.iter().find(|i| i.can_handle(&lower)).map(|i| i.as_ref())
    }

    /// Convenience: resolve MIME type for an extension.
    pub fn mime_type(&self, ext: &str) -> Option<String> {
        let lower = ext.to_lowercase();
        self.find(&lower).map(|i| i.mime_type(&lower))
    }

    /// Returns true if the extension is supported by any registered importer.
    pub fn supports(&self, ext: &str) -> bool {
        self.find(ext).is_some()
    }
}

impl Default for ImporterRegistry {
    fn default() -> Self {
        Self::new()
    }
}
