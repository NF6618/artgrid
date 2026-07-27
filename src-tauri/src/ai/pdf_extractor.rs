use pdfium_render::prelude::*;
use std::path::Path;
use std::process::Command;
use std::fs;

pub async fn extract_pdf_text_and_images(pdf_path: &Path) -> Result<String, String> {
    // 1. Initialize PDFium (Looks for pdfium.dll in current directory or system path)
    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path("./"))
            .or_else(|_| Pdfium::bind_to_system_library())
            .map_err(|e| format!("Failed to bind PDFium library. Ensure pdfium.dll is installed. Error: {}", e))?
    );

    let document = pdfium.load_pdf_from_file(pdf_path, None)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;

    let mut full_text = String::new();

    for (index, page) in document.pages().iter().enumerate() {
        let page_text = page.text().map(|t| t.all()).unwrap_or_default();
        
        if page_text.trim().is_empty() {
            println!("ARTGRID AI: Page {} has no native text. Triggering OCR Fallback...", index + 1);
            
            // Generate a high-res image of the page for OCR
            if let Ok(bitmap) = page.render_with_config(&PdfRenderConfig::new().set_target_width(2000)) {
                let temp_dir = std::env::temp_dir().join("artgrid_ocr");
                let _ = fs::create_dir_all(&temp_dir);
                let img_path = temp_dir.join(format!("page_{}.png", index + 1));
                
                if let Ok(image) = bitmap.as_image() {
                    let _ = image.save(&img_path);
                    
                    // Attempt to use Tesseract for OCR
                    let ocr_output = Command::new("tesseract")
                        .arg(&img_path)
                        .arg("stdout")
                        .output();
                        
                    if let Ok(output) = ocr_output {
                        if output.status.success() {
                            let ocr_text = String::from_utf8_lossy(&output.stdout);
                            full_text.push_str(&ocr_text);
                        } else {
                            println!("ARTGRID AI: Tesseract OCR failed for page {}.", index + 1);
                            full_text.push_str(&format!("\n[Failed to OCR page {}]\n", index + 1));
                        }
                    } else {
                        println!("ARTGRID AI: Tesseract is not installed or not in PATH.");
                        full_text.push_str(&format!("\n[OCR missing on system for page {}]\n", index + 1));
                    }
                    
                    // Cleanup temp image
                    let _ = fs::remove_file(&img_path);
                }
            }
        } else {
            full_text.push_str(&page_text);
        }
        full_text.push('\n');
    }

    Ok(full_text)
}
