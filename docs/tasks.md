# ArtGrid Development Tasks & Roadmap

This document outlines the multi-phase development roadmap for ArtGrid.

## Phase 1: Project Scaffolding & UI Foundation
**Status: [x] Completed**

- `[x]` Initialize Tauri v2 + React + Vite + TypeScript template.
- `[x]` Establish global UI styling (Vanilla CSS, dark mode, custom scrollbars).
- `[x]` Implement core structural components:
  - `[x]` Sidebar (Navigation & Collections)
  - `[x]` Toolbar (View modes & Search)
  - `[x]` Gallery (Grid layout for assets)
  - `[x]` Detail Panel (Asset inspection)
  - `[x]` Status Bar
- `[x]` Configure custom window decorations (frameless design with drag regions).
- `[x]` Fix WebView2 initialization and locking issues on Windows (`com.artgrid.app`).

## Phase 2: Infinite Canvas & Mood Boards
**Status: [/] In Progress**

- `[ ]` Install and integrate PixiJS or a similar high-performance WebGL 2D engine.
- `[ ]` Implement basic canvas panning, zooming, and coordinate tracking.
- `[ ]` Create data structures for Board states (Nodes, Edges, Positions).
- `[ ]` Build drag-and-drop mechanics to move images from the Gallery onto the Canvas.
- `[ ]` Implement selection, moving, scaling, and deleting nodes on the canvas.
- `[ ]` Add floating canvas toolbar (Select, Pan, Text, Shapes).
- `[ ]` Create minimap viewport for spatial orientation.

## Phase 3: Local Library & Database Management
**Status: [ ] Not Started**

- `[ ]` Integrate `tauri-plugin-sql` (SQLite) or `sqlx` for local data persistence.
- `[ ]` Design database schema (Assets, Collections, Tags, Boards).
- `[ ]` Implement local file system ingest (saving images to a managed local directory).
- `[ ]` Write Rust backend handlers for scanning, hashing (to prevent duplicates), and thumbnail generation.
- `[ ]` Build Tagging system UI (adding, removing, searching by tags).

## Phase 4: Capture & Ingestion Extensions
**Status: [ ] Not Started**

- `[ ]` Create a Chrome/Edge browser extension for rapid web capture.
- `[ ]` Set up local API server or deep-linking (`artgrid://`) to receive captures from the extension.
- `[ ]` Implement background folder watching (automatically import files dropped in a specific folder).
- `[ ]` Add clipboard monitoring (auto-save images copied to clipboard).

## Phase 5: Intelligent Search & AI Polish
**Status: [ ] Not Started**

- `[ ]` Integrate on-device ML models (e.g., `tract` in Rust or ONNX Web Runtime) for visual tagging.
- `[ ]` Implement semantic search via local CLIP embeddings.
- `[ ]` Color palette extraction algorithms for sorting by color.
- `[ ]` Final UI polish, animations, and performance optimizations.
