//! Per-page PDF extraction (commit 3).
//!
//! Returns `Vec<PageResult>` so downstream logic can:
//!   - write one `assets` row per page
//!   - store per-page text in `assets.page_text`
//!   - surface OCR errors in `documents.error` instead of baking "[OCR missing]"
//!     strings into searchable text

use pdfium_render::prelude::*;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;

/// Result for a single PDF page.
#[derive(Debug, Clone)]
pub struct PageResult {
    /// 1-indexed page number.
    pub page_number: u32,
    /// Extracted / OCR text for this page. Empty string if both paths failed.
    pub text: String,
    /// Set when OCR was attempted but Tesseract is absent or returned an error.
    pub ocr_error: Option<String>,
    /// Path to the rendered page image (PNG, stored in vault media dir).
    pub image_path: PathBuf,
    /// Pixel dimensions of the rendered page image.
    pub width: u32,
    pub height: u32,
}

/// Render all pages of `pdf_path`, extract text (native then OCR fallback),
/// and write rendered page images into `output_dir` as `<prefix>_page_<N>.png`.
pub fn extract_pdf_pages(
    pdf_path: &Path,
    output_dir: &Path,
    id_prefix: &str,
) -> Result<Vec<PageResult>, String> {
    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path("./"))
            .or_else(|_| Pdfium::bind_to_system_library())
            .map_err(|e| format!("Failed to bind PDFium: {}", e))?,
    );

    let document = pdfium
        .load_pdf_from_file(pdf_path, None)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;

    let ocr_temp_dir = std::env::temp_dir().join("artgrid_ocr");
    let _ = fs::create_dir_all(&ocr_temp_dir);

    let mut results = Vec::new();

    for (idx, page) in document.pages().iter().enumerate() {
        let page_num = (idx + 1) as u32;

        let render_result = page
            .render_with_config(&PdfRenderConfig::new().set_target_width(1600))
            .and_then(|bmp| bmp.as_image());

        let (image, width, height) = match render_result {
            Ok(img) => {
                let (w, h) = (img.width(), img.height());
                (Some(img), w, h)
            }
            Err(e) => {
                println!("ARTGRID PDF: Could not render page {}: {}", page_num, e);
                (None, 0, 0)
            }
        };

        let page_filename = format!("{}_page_{:04}.png", id_prefix, page_num);
        let image_path = output_dir.join(&page_filename);

        if let Some(ref img) = image {
            if let Err(e) = img.save(&image_path) {
                println!("ARTGRID PDF: Failed to save page {} image: {}", page_num, e);
            }
        }

        let native_text = page.text().map(|t| t.all()).unwrap_or_default();
        let (text, ocr_error) = if !native_text.trim().is_empty() {
            (native_text, None)
        } else {
            run_tesseract(image.as_ref(), &ocr_temp_dir, page_num)
        };

        results.push(PageResult {
            page_number: page_num,
            text,
            ocr_error,
            image_path,
            width,
            height,
        });
    }

    Ok(results)
}

fn run_tesseract(
    image: Option<&image::DynamicImage>,
    temp_dir: &Path,
    page_num: u32,
) -> (String, Option<String>) {
    let img = match image {
        Some(i) => i,
        None => return ("".to_string(), Some("page render failed - no image to OCR".to_string())),
    };

    let tmp_path = temp_dir.join(format!("ocr_page_{}.png", page_num));
    if img.save(&tmp_path).is_err() {
        return ("".to_string(), Some("failed to write temp OCR image".to_string()));
    }

    let result = Command::new("tesseract")
        .arg(&tmp_path)
        .arg("stdout")
        .output();

    let _ = fs::remove_file(&tmp_path);

    match result {
        Ok(out) if out.status.success() => {
            let text = String::from_utf8_lossy(&out.stdout).into_owned();
            (text, None)
        }
        Ok(out) => {
            let err = String::from_utf8_lossy(&out.stderr).into_owned();
            println!("ARTGRID PDF: Tesseract OCR failed for page {}: {}", page_num, err);
            ("".to_string(), Some(format!("Tesseract failed on page {}: {}", page_num, err.trim())))
        }
        Err(_) => {
            println!("ARTGRID PDF: Tesseract not found in PATH for page {}", page_num);
            (
                "".to_string(),
                Some("Tesseract OCR not installed or not in PATH. Install it to enable OCR for image-only pages.".to_string()),
            )
        }
    }
}
