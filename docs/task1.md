# ArtGrid — Phase 1 Tasks

## Core Architecture
- [x] Tauri v2 + React + TypeScript project scaffold
- [ ] SQLite schema design + data layer (assets, collections, tags, boards)
- [ ] File storage engine (configurable paths, originals vs thumbnails)
- [ ] Thumbnail generation pipeline (Rust-side, 3 sizes, parallel)

## UI Shell
- [x] Obsidian-inspired dark theme + glassmorphism design system
- [x] Main window layout (sidebar + content area + detail panel)
- [x] Sidebar navigation (library, collections, boards, search, settings)
- [ ] Resizable panels with drag handles
- [ ] Settings / preferences page
- [ ] Global keyboard shortcuts system

## Library Views
- [x] Masonry gallery view (virtualized, lazy-loading)
- [/] List view with sortable columns
- [x] Detail panel (metadata, tags, notes, preview)
- [ ] Fullscreen lightbox viewer with swipe navigation

## Infinite Canvas (Mood Boards)
- [ ] PixiJS/Konva canvas engine with WebGL rendering
- [ ] Object placement (images, text cards, shapes)
- [ ] Transform controls (drag, resize, rotate)
- [ ] Snap-to-grid + snap-to-object alignment guides
- [ ] Layers panel (z-order, lock, visibility)
- [ ] Canvas persistence (save/load board state)
- [ ] PureRef-style always-on-top overlay mode
- [ ] Minimap for large board navigation
- [ ] Background options (color, gradient, image)

## Capture
- [ ] Drag-and-drop file import
- [ ] Folder monitoring (watch directories)
- [ ] Clipboard capture (images + text)
- [ ] Global screenshot hotkey
- [ ] Browser extension v1 (Chrome — save images + pages)

## Organization
- [ ] Collections + nested folder hierarchy
- [ ] Tag system (freeform, hierarchical)
- [ ] Metadata editor (custom fields)
- [ ] Favorites + archive + recently viewed
- [ ] Keyword search (filename, tags, metadata)
- [ ] Advanced filters (type, size, date, resolution, orientation, rating)

## Polish
- [ ] Keyboard shortcut reference sheet
- [ ] Onboarding / first-run experience
- [ ] Error handling + toast notifications
- [ ] Window state persistence (size, position, panels)
