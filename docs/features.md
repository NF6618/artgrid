# ArtGrid Feature Specification

## Overview
ArtGrid is a self-hosted, local-first inspiration, mood board, and knowledge management application for creatives.

---

## 1. Frictionless Capture
The capture process should be instantaneous. Anything should be savable within seconds.

### Web Capture
- **Browser Extension (Chrome, Firefox, Edge)**
- Save entire webpages or code snippets
- Save selected images, text snippets, and screenshots
- Save videos (metadata and link)
- Preserve original URL, page title, author, and favicon
- Archive page snapshot

### Local Capture
- Drag & drop files directly onto the canvas or library
- Watch folders for automatic background imports
- Bulk import directories
- Clipboard monitoring & Screenshot hotkey

---

## 2. Library & Organization
### Collections & Grouping
- Nested hierarchical collections
- Smart folders (based on dynamic queries like color, tag, or date)
- Project-specific sub-libraries

### Tagging System
- Hierarchical tagging (e.g., `Character/Sci-Fi/Cyberpunk`)
- Auto-tagging using AI (on-device vision models)
- Color extraction and palette generation
- Metadata extraction (EXIF, website open-graph data)

### View Modes
- Grid View (masonry layout for visual browsing)
- List View (for dense information and metadata)
- Detail Panel (for inspecting individual assets)

---

## 3. Infinite Canvas Mood Boards
The core creative workspace where inspiration is spatially arranged.

- **PixiJS-Powered Engine**: Hardware-accelerated rendering for thousands of high-res images without lag.
- **Tools**: Pan, Zoom, Selection, Marquee, Text nodes, and basic drawing/shapes.
- **Canvas Features**:
  - Drag and drop from the library onto the canvas.
  - Snap-to-grid and smart alignment guides.
  - Minimap for easy navigation across massive boards.
  - Export canvas portions as high-res images or PDFs.

---

## 4. Intelligent Search & AI
- **Semantic Search**: Search by visual description (e.g., "red car in the rain") using local embedding models (CLIP).
- **Color Search**: Filter by specific hex codes or palettes.
- **Related Inspiration**: "Find similar" functionality based on visual content.

---

## 5. Storage & Architecture
- **Local-First**: All data is stored locally using SQLite for ultra-fast querying.
- **Tauri Backend**: Rust-powered backend handles file I/O, database connections, and intensive image processing tasks without blocking the UI.
- **Portable**: Easily sync your library folder using Syncthing, Dropbox, or Google Drive.
