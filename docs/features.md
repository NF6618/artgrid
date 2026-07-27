# ArtGrid Feature Specification

## Overview
ArtGrid is a self-hosted, local-first inspiration, mood board, and knowledge management application for creatives.

---

## 1. Frictionless Capture
The capture process should be instantaneous. Anything should be savable within seconds.

### The Vault Architecture & Background Watchers
- **Obsidian-Style Vaults:** ArtGrid uses standard folders on your hard drive to store all assets and the SQLite database.
- **Auto-Watching:** The Rust backend utilizes a background thread (`notify` crate) to continuously watch the vault's `media/` directory.
- **Instant Imports:** Drop any image or document directly into the vault via OS File Explorer, and it is instantly processed, added to SQLite, and rendered in the UI without any manual import steps.

### Web Capture (Phase 5)
- **Browser Extension (Chrome, Firefox, Edge)**
- Save entire webpages or code snippets
- Save selected images, text snippets, and screenshots
- Preserve original URL, page title, author, and favicon

---

## 2. Library & Organization
### Extensive Format Support
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`
- Documents: Natively read `.pdf` and render `.md` and `.txt` files directly inside ArtGrid's lightbox.

### Collections & Grouping
- Nested hierarchical collections
- Smart folders (based on dynamic queries like color, tag, or date)
- Project-specific sub-libraries

### Tagging System
- Hierarchical tagging (e.g., `Character/Sci-Fi/Cyberpunk`)
- Auto-tagging using AI (on-device vision models)
- Color extraction and palette generation

### View Modes & Interface
- **Grid View**: Masonry layout for dense, visual browsing.
- **Interactive Sidebar**: Dynamic Quick Access filters for Favorites, Untagged, Recent, and Trash.
- **Settings Hub**: Deep UI customization including Dark/Light themes, Compact Mode, multiple Vault tracking, and system Keybinds.
- **File Lightbox**: Full-screen immersive modal for viewing images and reading documents.

---

## 3. Infinite Canvas Mood Boards
The core creative workspace where inspiration is spatially arranged.

- **PixiJS-Powered Engine**: Hardware-accelerated rendering for thousands of high-res images without lag.
- **Tools**: Pan, Zoom, Selection, Marquee, Text nodes, and basic drawing/shapes.
- **Canvas Features**:
  - Drag and drop from the library onto the canvas.
  - Snap-to-grid and smart alignment guides.
  - Minimap for easy navigation across massive boards.

---

## 4. Intelligent Search & AI (Phase 5)
- **Semantic Search**: Search by visual description (e.g., "red car in the rain") using local embedding models (CLIP).
- **Color Search**: Filter by specific hex codes or palettes.
- **Related Inspiration**: "Find similar" functionality based on visual content.

---

## 5. Storage & Architecture
- **Local-First**: All data is stored locally using SQLite for ultra-fast querying.
- **Tauri Backend**: Rust-powered backend handles file I/O, database connections, background directory watching, and intensive processing tasks without blocking the UI.
- **Portable**: Easily sync your library folder using Syncthing, Dropbox, or Google Drive.
