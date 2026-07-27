# ArtGrid — Exhaustive Functionality Audit & Remediation Master Plan

> **Document Version**: 3.0 (Updated after Canvas Systemic Failure Deep Dive)  
> **Target System**: ArtGrid Local-First Visual Workspace (Tauri v2 + React 18 + Rust + SQLite)  
> **Status**: Full Re-Audit Complete — Ready for Execution  

---

## Executive Summary & System Overview

ArtGrid is designed as a local-first alternative to cloud inspiration managers (Pinterest, Cosmos) and desktop reference tools (PureRef, Eagle). Its core architecture relies on:
1. **Obsidian-Style Vaults**: A local directory containing an `artgrid.db` SQLite database and a `media/` folder.
2. **Rust Background File System Watcher**: Auto-detects and ingests files dropped into `media/` via OS Explorer.
3. **Tauri v2 IPC Bridge**: Inter-process communication between the React frontend and Rust backend commands.
4. **WebGL Infinite Canvas**: PixiJS-powered mood boards with pan, zoom, and spatial arrangement.

This audit evaluates every interactive element, component, store, and Rust module against **7 Failure Categories**:
- **Category 1: Dead / No-op** (Stub handlers, empty functions, missing `onClick`, alert popups)
- **Category 2: Disconnected from Backend** (UI displays/collects data but API/SQLite layer is missing)
- **Category 3: Fake Success / State Desync** (Optimistic updates without backend verification, unpersisted DOM mutations)
- **Category 4: Partial Implementation** (Happy path only; missing loading, empty, error states or key layout CSS)
- **Category 5: Missing Basic QoL** (No search debounce, raw browser prompts, missing inline editing, accessibility gaps)
- **Category 6: Architectural Inconsistency** (Bypassing documented Zustand/Tauri state flow patterns)
- **Category 7: Orphaned / Unreachable Code** (Components or view branches that cannot be accessed by the user)

---

## 🚨 SYSTEMIC FEATURE BREAKDOWN: Mood Board & Infinite Canvas Engine

The **Mood Board / Canvas View** is the primary creative interface of ArtGrid. Re-audit confirms that **the entire canvas engine is currently in a state of systemic failure**. Users cannot interact, move nodes smoothly, add text cards, draw shapes, draw freehand lines, link items, or transform assets.

### Why the Canvas Engine Fails End-to-End:
1. **Destructive Render Loop (Drag Interruption)**: In `BoardCanvas.tsx`, `useEffect` executes `viewport.removeChildren()` whenever `nodes` or selection props change. When a user drags a node, the drag handler updates node positions in React, which immediately destroys the entire Pixi display graph, killing the active drag operation mid-pointer movement.
2. **Texture Loading & Asset Protocol Failures**: Assets dropped onto the canvas rely on `PIXI.Texture.from(node.data.url)`. Asynchronous asset protocol loading fails or renders 0x0 size textures, causing media items to vanish or render as invisible sprites.
3. **Text Nodes Unwired**: The "Add Text" toolbar button has no `onClick` event listener. `BoardCanvas.tsx` has zero code to instantiate or render text cards (`node_type = 'text'`).
4. **Shape Nodes Unwired**: The "Add Shape" toolbar button has no `onClick` listener. `BoardCanvas.tsx` has zero code to render `PIXI.Graphics` shapes (`node_type = 'shape'`).
5. **Freehand Drawing Engine Absent**: The "Draw" toolbar button has no `onClick` listener. No `PIXI.Graphics` stroke capture layer exists.
6. **Arrow / Edge Connections Absent**: Despite being specified in `QA_plan.md` Section 2.B, there is no line/arrow linking tool or dynamic edge updater connecting media nodes.
7. **Transform & Resize Handles Absent**: Node selection applies a static color tint (`0xaaaaff`). There are no corner resize handles, rotation controls, or visual selection bounding boxes.

---

## Complete Audit Matrix & Issues List

### Issue 1: Systemic Canvas & Mood Board Engine Failure (CRITICAL - HIGH PRIORITY)
- **Category**: Category 1 (Dead / No-op), Category 2 (Disconnected), Category 3 (State Desync), Category 4 (Partial Implementation), Category 5 (Missing QoL)
- **Location**: 
  - Canvas Component: [BoardCanvas.tsx:L1-L299](file:///e:/BrightGrid-Software/repos/artgrid/src/components/BoardCanvas.tsx)
  - Floating Toolbar & App Shell: [App.tsx:L346-L382](file:///e:/BrightGrid-Software/repos/artgrid/src/App.tsx#L346-L382)
  - Board Data Structures: [board.ts:L1-L30](file:///e:/BrightGrid-Software/repos/artgrid/src/types/board.ts)<br>[board.rs:L1-L49](file:///e:/BrightGrid-Software/repos/artgrid/src-tauri/src/board.rs#L1-L49)
- **Feature Issue**: 
  - Dragging nodes breaks mid-movement because `viewport.removeChildren()` destroys sprites on every React render.
  - Image textures frequently fail to load or collapse to 0x0 dimensions.
  - Text, Shape, Draw, and Arrow Connection tools are dead stubs with no handlers attached.
  - No transform/resize handles exist for canvas nodes.
- **Intention**: A PureRef / BeeRef class hardware-accelerated canvas engine. Artists must be able to:
  - Drag and drop media cards onto the board with smooth movement.
  - Resize nodes using interactive corner handles.
  - Add text notes (sticky notes) with customizable fonts/colors.
  - Add shape frames (rectangles/cards).
  - Draw freehand lines directly on the canvas.
  - Connect cards together with dynamic arrow lines (Excalidraw style) that follow nodes in real time.
  - Have all board nodes, edges, text, and strokes saved permanently to SQLite (`boards` table).
- **Remediation Plan**:
  1. **Persistent Display Object Cache**: Rebuild `BoardCanvas.tsx` to diff and update existing `PIXI.Sprite` / `PIXI.Container` objects using a `Map<string, DisplayObject>` instead of calling `removeChildren()`.
  2. **Texture Loading Engine**: Wrap texture initialization in async preloading with valid fallback bounding boxes and automatic aspect-ratio preservation.
  3. **Text Tool (`node_type = 'text'`)**: Wire "Add Text" toolbar button. Render `PIXI.Text` objects inside styled card containers with inline editing overlays.
  4. **Shape Tool (`node_type = 'shape'`)**: Wire "Add Shape" toolbar button. Render `PIXI.Graphics` rectangles/frames with background and border colors.
  5. **Freehand Drawing Engine (`activeTool = 'draw'`)**: Wire "Draw" toolbar button. Add pointer stroke recording using a `PIXI.Graphics` overlay layer and serialize stroke point arrays into board JSON state.
  6. **Arrow / Edge Connection Tool (`activeTool = 'link'`)**: Implement node linking (`Node A -> Node B`). Render dynamic `PIXI.Graphics` arrows between node centers that re-render automatically when nodes are dragged.
  7. **Transform & Bounding Box Handles**: Render interactive selection bounding boxes with 4 corner resize handles. Update node `dimensions` in real time during drag-resize.

---

### Issue 2: Asset Notes Uncontrolled & Unpersisted (CRITICAL)
- **Category**: Category 1 (Dead / No-op) & Category 2 (Disconnected from Backend)
- **Location**: 
  - Frontend: [DetailPanel.tsx:L188-L206](file:///e:/BrightGrid-Software/repos/artgrid/src/components/DetailPanel.tsx#L188-L206)
  - Database Schema: [db.rs:L8-L20](file:///e:/BrightGrid-Software/repos/artgrid/src-tauri/src/db.rs#L8-L20)
  - Backend Commands: [import.rs:L62-L104](file:///e:/BrightGrid-Software/repos/artgrid/src-tauri/src/import.rs#L62-L104)
- **Feature Issue**: The `<textarea>` in the Detail Panel for asset notes has no `value` binding and no `onChange` handler. Typing in the textarea updates nothing. Furthermore, the SQLite `assets` table lacks a `notes` column, and there is no Rust command to update asset notes.
- **Intention**: Artists need to record notes, thoughts, sources, or prompts for each asset. Notes must be loaded from SQLite, editable in real time, debounced, and persisted permanently across application restarts.
- **Remediation Plan**:
  1. Update `db.rs` schema to add `notes TEXT` to the `assets` table (`ALTER TABLE assets ADD COLUMN notes TEXT`).
  2. Update `AssetData` struct in `import.rs` and `Asset` interface in `Gallery.tsx` to include `notes: Option<String>`.
  3. Implement `update_asset_notes(id: String, notes: String)` command in Rust (`import.rs`) and register it in `lib.rs`.
  4. Bind `<textarea>` in `DetailPanel.tsx` to local state initialized from `asset.notes`.
  5. Add a 500ms debounced update handler in `DetailPanel.tsx` that invokes `update_asset_notes` and updates `assets` state in `useLibrary`.

---

### Issue 3: HTML5 File Drag & Drop Ingestion Ignored (CRITICAL)
- **Category**: Category 1 (Dead / No-op) & Category 4 (Partial Implementation)
- **Location**: [Gallery.tsx:L62-L71](file:///e:/BrightGrid-Software/repos/artgrid/src/components/Gallery.tsx#L62-L71)
- **Feature Issue**: Dragging files from the desktop or file explorer onto the Gallery triggers the visual "Drop files to import" drop-zone overlay. However, dropping files executes `console.log('Dropped files:', files.map(f => f.name))` and discards the files. No backend import is performed.
- **Intention**: Dropping files onto the application window must instantly ingest them into the active Vault `media/` folder, parse metadata, write SQLite records, and display them in the library grid.
- **Remediation Plan**:
  1. Extract absolute file paths from `e.dataTransfer.files` in `Gallery.tsx`.
  2. Pass dropped file paths to `importFiles` hook function in `useLibrary.ts`.
  3. Invoke `import_file` via Tauri IPC for each path with a loading spinner overlay.
  4. Automatically call `loadAssets()` to render newly ingested media.

---

### Issue 4: Custom Appearance Accent & Background Colors Not Persisted (CRITICAL)
- **Category**: Category 3 (Fake Success / State Desync)
- **Location**: 
  - Frontend UI: [SettingsModal.tsx:L248-L257](file:///e:/BrightGrid-Software/repos/artgrid/src/components/SettingsModal.tsx#L248-L257)
  - Settings Store: [useSettingsStore.ts:L4-L26](file:///e:/BrightGrid-Software/repos/artgrid/src/stores/useSettingsStore.ts#L4-L26)
- **Feature Issue**: In Settings -> Appearance, changing the "Background Base" or "Accent Color" color pickers executes `document.documentElement.style.setProperty(...)` directly on DOM. These color choices are never saved to `useSettingsStore` or written to `settings.json`. Upon restarting the app or closing the modal, custom colors are lost.
- **Intention**: Artists demand custom workspace themes. Accent and background color selections must be stored in `AppSettings`, saved to disk (`settings.json`), and hydrated automatically when the application launches.
- **Remediation Plan**:
  1. Expand `AppSettings` in `useSettingsStore.ts` to include `bgBaseColor?: string` and `accentColor?: string`.
  2. Update `loadSettings()` and `updateSettings()` in `useSettingsStore.ts` to apply custom CSS variables on launch and on change.
  3. Bind color pickers in `SettingsModal.tsx` to `settings.bgBaseColor` and `settings.accentColor`, enabling the "Save Changes" button when modified.

---

### Issue 5: Gallery List View Completely Unstyled & Broken (HIGH)
- **Category**: Category 2 (Disconnected from Backend) & Category 4 (Partial Implementation)
- **Location**: 
  - Toolbar Toggle: [Toolbar.tsx:L96-L101](file:///e:/BrightGrid-Software/repos/artgrid/src/components/Toolbar.tsx#L96-L101)
  - Gallery Container: [Gallery.tsx:L127](file:///e:/BrightGrid-Software/repos/artgrid/src/components/Gallery.tsx#L127)
  - Stylesheet: [design-system.css](file:///e:/BrightGrid-Software/repos/artgrid/src/styles/design-system.css)
- **Feature Issue**: Clicking the "List view" tab in the Toolbar updates `viewMode` to `'list'`, causing `Gallery.tsx` to apply class `gallery__layout--list`. However, `design-system.css` contains **zero CSS rules** for `.gallery__layout--list`. As a result, List view renders as an unstyled grid fallback.
- **Intention**: Users should be able to toggle between a Masonry Grid view for visual browsing and a dense List view for spreadsheet-style file inspection with columns for Thumbnail, Name, Dimensions, Size, Type, Tags, and Date Added.
- **Remediation Plan**:
  1. Add dedicated `.gallery__layout--list` and `.gallery__list-row` CSS styles to `design-system.css` with clean glassmorphism rows, hover highlights, and column alignment.
  2. Update `Gallery.tsx` to render a structured tabular row layout when `viewMode === 'list'`, displaying metadata columns and quick action buttons.

---

### Issue 6: Tag Creation Reactivity Desync (HIGH)
- **Category**: Category 3 (Fake Success / State Desync)
- **Location**: [DetailPanel.tsx:L17-L26](file:///e:/BrightGrid-Software/repos/artgrid/src/components/DetailPanel.tsx#L17-L26)
- **Feature Issue**: Adding a tag to an asset in `DetailPanel.tsx` calls `addTagToAsset(asset.id, newTag)`. It then directly mutates the prop object `asset.tags.push(newTag)`. Because React props are mutated directly without updating `App.tsx` state or triggering `useLibrary` state re-render, the new tag does NOT appear on the asset card in the main gallery grid until the user manually reloads or refreshes.
- **Intention**: Tagging an asset must immediately update all visual representations across the entire UI (Detail Panel, Gallery Cards, Sidebar Tag counts) seamlessly.
- **Remediation Plan**:
  1. Remove direct prop mutation `asset.tags.push(...)`.
  2. Call `loadAssets()` from `useLibrary` (or update `setAssets` state immutably) inside `handleAddTag` and `handleRemoveTag` in `DetailPanel.tsx`.

---

### Issue 7: Quick Access Archive & Trash Views Render Blank Screen (HIGH)
- **Category**: Category 1 (Dead / No-op) & Category 7 (Orphaned / Unreachable Code)
- **Location**: 
  - Sidebar Navigation: [Sidebar.tsx:L107-L108](file:///e:/BrightGrid-Software/repos/artgrid/src/components/Sidebar.tsx#L107-L108)
  - View Routing: [App.tsx:L239](file:///e:/BrightGrid-Software/repos/artgrid/src/App.tsx#L239)
  - Database Schema: [db.rs:L8-L20](file:///e:/BrightGrid-Software/repos/artgrid/src-tauri/src/db.rs#L8-L20)
- **Feature Issue**: Clicking "Archive" or "Trash" in the Sidebar's Quick Access section updates `activeView` to `'archive'` or `'trash'`. However, `App.tsx` line 239 checks `['library', 'search', 'favorites', 'recent', 'untagged'].includes(activeView)`. Because `'archive'` and `'trash'` are excluded, the main content area renders completely blank. Additionally, SQLite has no columns for archived/trashed status.
- **Intention**: Artists need soft-deletion (Trash) with recovery capability and non-destructive hiding (Archive) to clean up inspiration boards without losing files.
- **Remediation Plan**:
  1. Add `archived BOOLEAN DEFAULT 0` and `trashed BOOLEAN DEFAULT 0` columns to SQLite `assets` table in `db.rs`.
  2. Add Rust IPC commands `archive_asset(id, state)` and `trash_asset(id, state)`.
  3. Include `'archive'` and `'trash'` in `App.tsx` view routing.
  4. Update `filteredAssets` logic to exclude trashed/archived assets from the main library, and display them only when viewing Archive or Trash views.
  5. Add "Restore" and "Delete Permanently" action buttons to asset cards when in Trash view.

---

### Issue 8: Settings Data Management Buttons Use Fake JS Alerts (HIGH)
- **Category**: Category 1 (Dead / No-op)
- **Location**: [SettingsModal.tsx:L286-L294](file:///e:/BrightGrid-Software/repos/artgrid/src/components/SettingsModal.tsx#L286-L294)
- **Feature Issue**: In Settings -> Data Management, clicking "Export DB Backup", "Import DB Backup", or "Clear Cache" executes `alert('Exporting Database...')`, `alert('Importing Database...')`, and `alert('Clearing Cache...')`. No real database backup, restore, or cache maintenance is performed.
- **Intention**: Local-first users require real backup and restore mechanisms to protect their Vault database and manage storage.
- **Remediation Plan**:
  1. Implement Rust IPC commands `export_db_backup(destination_path)` and `import_db_backup(source_path)` in `import.rs`.
  2. Implement `clear_temp_cache()` in Rust to safely clean generated temporary webview files.
  3. Wire Settings buttons to open Tauri native file dialogs and invoke these Rust commands with real success/error toast notifications.

---

### Issue 9: Asset Title & Filename Cannot Be Renamed (MEDIUM)
- **Category**: Category 5 (Missing Basic QoL)
- **Location**: 
  - Detail Panel: [DetailPanel.tsx:L101-L108](file:///e:/BrightGrid-Software/repos/artgrid/src/components/DetailPanel.tsx#L101-L108)
  - QA Plan Spec: [QA_plan.md:L12-L18](file:///e:/BrightGrid-Software/repos/artgrid/docs/QA_plan.md#L12-L18)
- **Feature Issue**: In the Detail Panel, Name and Filename are displayed as non-editable static text strings. There is no edit button, no inline input field, and no Rust command (`rename_asset`) to update SQLite and rename the physical file inside `media/`.
- **Intention**: As specified in `QA_plan.md` Section 2.A, users must be able to rename asset titles and physical filenames directly from the UI, with full file system synchronization and collision handling.
- **Remediation Plan**:
  1. Implement Rust IPC command `rename_asset(id: String, new_title: String, new_filename: String)` in `import.rs`.
  2. Inside `rename_asset`, perform physical file rename (`fs::rename`) in `media/`, update SQLite `title`, `filename`, `filepath`, and `url`, handling name collisions gracefully.
  3. Add inline edit pencil icons and input fields next to Name and Filename in `DetailPanel.tsx`.

---

### Issue 10: Collection Creation Is Primitive & Lacks Hierarchy Assignment (MEDIUM)
- **Category**: Category 4 (Partial Implementation) & Category 5 (Missing Basic QoL)
- **Location**: [Sidebar.tsx:L150-L156](file:///e:/BrightGrid-Software/repos/artgrid/src/components/Sidebar.tsx#L150-L156)
- **Feature Issue**: Clicking the `+` button in the Collections section triggers a browser `window.prompt("New Collection Name:")`. It hardcodes the collection color to `#3b82f6` and provides no UI option to select a parent collection, even though `metadata.rs` and `CollectionTreeItem` fully support nested `parent_id` hierarchies.
- **Intention**: Artists organize assets into nested project hierarchies (e.g. `Client Work -> Cyberpunk Project -> Character References`). Collection creation must allow picking custom colors and parent categories.
- **Remediation Plan**:
  1. Replace `window.prompt` with an inline creation popover or modal.
  2. Provide fields for Collection Name, Color Picker (preset swatches), and Parent Collection dropdown selector.
  3. Pass `(name, color, parentId)` to `createCollection`.

---

### Issue 11: Search Input Lacks Debouncing (MEDIUM)
- **Category**: Category 5 (Missing Basic QoL)
- **Location**: [Toolbar.tsx:L51-L57](file:///e:/BrightGrid-Software/repos/artgrid/src/components/Toolbar.tsx#L51-L57)
- **Feature Issue**: Typing into the Toolbar search bar updates `searchQuery` state synchronously on every single keystroke. For libraries with thousands of items, filtering the asset array on every keypress causes typing lag and UI re-render stutter.
- **Intention**: Search inputs should debounce filter updates by ~200ms so typing remains smooth regardless of library size.
- **Remediation Plan**:
  1. Add a custom `useDebounce` hook or debounced state in `App.tsx` / `Toolbar.tsx`.
  2. Apply `searchQuery` filtering using the debounced value while keeping input typing immediate.

---

### Issue 12: Text & Markdown Lightbox Viewer Lacks Formatting (MEDIUM)
- **Category**: Category 4 (Partial Implementation)
- **Location**: [FileViewerModal.tsx:L115-L135](file:///e:/BrightGrid-Software/repos/artgrid/src/components/FileViewerModal.tsx#L115-L135)
- **Feature Issue**: Opening a `.md` or `.txt` file in the lightbox viewer renders the file content as a raw, unformatted text string inside a generic `<div>`. Markdown headers (`#`), lists (`-`), code blocks (```), and links are displayed as unparsed plain text.
- **Intention**: As specified in `features.md`, ArtGrid natively reads `.pdf` and renders `.md` and `.txt` files directly inside the lightbox with formatted headings, code highlighting, and clean typography.
- **Remediation Plan**:
  1. Add light markdown parsing/rendering or syntax-highlighted pre-blocks for `.md` and `.txt` files inside `FileViewerModal.tsx`.
  2. Add font toggle (sans-serif vs monospace) and scroll formatting for reading documents.

---

### Issue 13: Toolbar Filter & Sort Buttons Missing Event Handlers (LOW)
- **Category**: Category 1 (Dead / No-op)
- **Location**: [Toolbar.tsx:L65-L70](file:///e:/BrightGrid-Software/repos/artgrid/src/components/Toolbar.tsx#L65-L70)
- **Feature Issue**: The Toolbar contains Filter (`IconFilter`) and Sort (`IconSort`) buttons. Neither button has an `onClick` event handler attached.
- **Intention**: Clicking Filter or Sort should display dropdown menus to filter by asset type (Images, Documents, PDFs) and sort by Name, Date Added, File Size, or Dimensions.
- **Remediation Plan**:
  1. Implement drop-down menu state in `Toolbar.tsx`.
  2. Add sorting logic options (`sortBy`: `'date'` | `'name'` | `'size'`, `sortOrder`: `'asc'` | `'desc'`) and type filtering options to `App.tsx`.

---

### Issue 14: Gallery Card "More" Context Menu Button Missing (LOW)
- **Category**: Category 1 (Dead / No-op)
- **Location**: [Gallery.tsx:L204-L206](file:///e:/BrightGrid-Software/repos/artgrid/src/components/Gallery.tsx#L204-L206)
- **Feature Issue**: The action overlay on gallery cards contains a "More" button (`IconMoreHorizontal`) with no `onClick` handler attached.
- **Intention**: Clicking "More" on a card should open a context menu with options: Open in Lightbox, Rename, Copy File Path, Add to Collection, Archive, Trash.
- **Remediation Plan**:
  1. Create a lightweight context menu component for gallery cards in `Gallery.tsx`.
  2. Wire actions to `onPreviewAsset`, asset rename, favorite toggle, archive, and trash handlers.

---

### Issue 15: Inspiration Graph View Stub (LOW)
- **Category**: Category 1 (Dead / No-op) & Category 7 (Orphaned / Unreachable Code)
- **Location**: [App.tsx:L387-L413](file:///e:/BrightGrid-Software/repos/artgrid/src/App.tsx#L387-L413)
- **Feature Issue**: The "Graph" view renders a static placeholder SVG and a "Generate Graph" button with no `onClick` handler attached.
- **Intention**: As detailed in `docs/issue_tracker.md`, the Inspiration Graph is a planned V1 feature. Unwired placeholder buttons should be safely hidden or replaced with an informative roadmap card.
- **Remediation Plan**:
  1. Add a clear "Under Development (Phase 5)" indicator or build an interactive force-directed graph node visualizer linking assets by shared tags and collections using SVG or Canvas.

---

### Issue 16: Settings Modal Known Vaults Placeholder (LOW)
- **Category**: Category 1 (Dead / No-op)
- **Location**: [SettingsModal.tsx:L208-L211](file:///e:/BrightGrid-Software/repos/artgrid/src/components/SettingsModal.tsx#L208-L211)
- **Feature Issue**: Settings -> Vaults displays hardcoded italic text: "Multiple vault tracking will appear here in Phase 5."
- **Intention**: The UI should display the active vault metadata (path, total asset count, total database size) and allow switching between recent vault locations stored in `settings.json`.
- **Remediation Plan**:
  1. Track a `recentVaults: string[]` array in `useSettingsStore`.
  2. Render the list of recent vaults in `SettingsModal.tsx` with a single-click "Switch to Vault" action.

---

## Architectural & Quality Gate Remediation Plan

### Remediation Execution Order (Phased Implementation)

```
Phase 1: Infinite Canvas Engine & Mood Board Overhaul (Issue 1)
  ├── Step 1.1: Build Persistent Display Object Cache (Fix drag interruption & render destruction)
  ├── Step 1.2: Build Async Texture Loading Pipeline with Aspect Ratio Preserving Bounds
  ├── Step 1.3: Build Text Card Tool (node_type = 'text') with Inline Editable Note Overlay
  ├── Step 1.4: Build Shape Frame Tool (node_type = 'shape') with PIXI.Graphics Rendering
  ├── Step 1.5: Build Freehand Drawing Layer (activeTool = 'draw') with Stroke Persistence
  ├── Step 1.6: Build Arrow / Edge Connection Tool (activeTool = 'link') with Dynamic Line Tracking
  └── Step 1.7: Build Transform & Resize Bounding Box Handles for Scaling Nodes

Phase 2: Critical Data Integrity & Storage (Issues 2, 3, 4)
  ├── Step 2.1: Implement SQLite notes column & debounced Rust IPC handler (Issue 2)
  ├── Step 2.2: Wire HTML5 Drag & Drop ingestion to Tauri import_file IPC (Issue 3)
  └── Step 2.3: Persist Custom Appearance Colors in useSettingsStore & settings.json (Issue 4)

Phase 3: View Layouts & Reactivity (Issues 5, 6, 7, 8)
  ├── Step 3.1: Build List View CSS styles & tabular row component (Issue 5)
  ├── Step 3.2: Fix Tag addition state reactivity & reload triggers (Issue 6)
  ├── Step 3.3: Implement SQLite archived/trashed status & wire Archive/Trash views (Issue 7)
  └── Step 3.4: Build real Rust DB export/import backup commands & UI handlers (Issue 8)

Phase 4: QOL & Workflow Features (Issues 9, 10, 11, 12)
  ├── Step 4.1: Add asset title & filename renaming in Detail Panel & Rust backend (Issue 9)
  ├── Step 4.2: Build rich Collection creation popover with color & parent selector (Issue 10)
  ├── Step 4.3: Add 200ms debouncing to Toolbar Search input (Issue 11)
  └── Step 4.4: Format Markdown and plain text files in Lightbox Viewer (Issue 12)

Phase 5: UI Polish & Toolbar Stubs (Issues 13, 14, 15, 16)
  ├── Step 5.1: Add interactive Toolbar Filter & Sort dropdown menus (Issue 13)
  ├── Step 5.2: Build Gallery Card action context menu (Issue 14)
  └── Step 5.3: Update Graph View & Known Vaults Settings tab (Issues 15, 16)
```

---

## Summary of `/docs` Revisions

Upon completion of remediation, the following official documentation files will be updated:

1. **`docs/issue_tracker.md`**: Update all 16 issue items from `[ ]` (Unresolved) to `[x]` (Resolved) with resolution summaries citing commit/file diffs.
2. **`docs/QA_plan.md`**: Mark file renaming, canvas arrow linking, detail panel notes, theme editor persistence, and nested collection creation verification steps as verified.
3. **`docs/features.md`**: Update feature availability table to reflect functional mood board tools (text, shapes, drawing, links), list view, notes saving, and drag-and-drop file ingestion.
