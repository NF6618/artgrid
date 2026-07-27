# ArtGrid Backend Architecture

The ArtGrid backend acts as the heavy lifter, bridging the gap between a high-performance desktop file system and the web-based React frontend.

## Tech Stack
- **Framework**: Tauri (v2)
- **Language**: Rust
- **System APIs**: Tauri native APIs (fs, dialog, window, shell)

## Core Responsibilities

1. **Local File System Interfacing**
   - Direct access to local storage for reading, copying, moving, and organizing assets without the sandbox restrictions of a standard web browser.
   - Managing Vault structures (the `artgrid/media/` and `artgrid/data/` directories).
   
2. **Native Asset Ingestion**
   - The Rust backend executes the `import_media_files` and `save_base64_image_asset` commands. 
   - It performs checksum validation (SHA-256), handles deduplication, and extracts file metadata (size, MIME type) before saving assets to the physical disk.

3. **Telemetry & Logging**
   - ArtGrid uses a custom verbose logging system piped through Rust back to the UI.
   - Developers can open a verbose log console to monitor memory, network, and systemic events.

## Pending Changes & Placeholders
- **Advanced Background Watcher**: Implementing a high-performance OS-level file watcher (e.g. using `notify`) in Rust to auto-import files dropped into the Vault from the OS file explorer.
- **Bulk Folder Move/Delete**: Implementing recursive, non-blocking asynchronous folder moves in Rust to improve frontend responsiveness during massive library reorganizations.
