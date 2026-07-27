# ArtGrid Issue Tracker

This document tracks all known UX/UI issues, placeholder UI elements, and "fake" components discovered during the codebase audit. Following our strict development philosophy, all of these must be wired to real logic or removed.

## 🚨 Critical Priority (Broken Functionality & Fake UI)

- [ ] **Core Feature: PDF & Document Import Missing**
  - **Issue**: The `useLibrary.ts` import function strictly filters for image extensions (`png`, `jpg`, etc.). It completely prevents users from importing `.pdf`, `.md`, and `.txt` files, despite the README claiming this is a core feature.
  - **Resolution**: Update the Tauri OS file dialog filter to allow documents. Update `import.rs` to handle parsing the mime-type of non-image files (dimensions default to 0x0).

- [ ] **Core Feature: View Mode Toggles Fake**
  - **Issue**: The Toolbar contains Grid, List, and Board view buttons. Clicking them updates the `viewMode` state, but this state is completely ignored by the `Gallery` component. The UI literally does not change.
  - **Resolution**: Pass `viewMode` into `Gallery.tsx` and dynamically render `<div className={"gallery__layout--" + viewMode}>` with proper CSS for Lists.

- [ ] **Core Feature: Masonry Grid Not Dynamic**
  - **Issue**: The current library grid is not a seamless masonry grid. The image containers are awkwardly sized and do not dynamically flow together based on horizontal/vertical aspect ratios.
  - **Resolution**: Rebuild the Gallery grid using a true CSS Column Masonry approach or a dynamic flex-box grid that respects native aspect ratios without harsh cropping.

- [ ] **Mood Boards: Canvas Interaction (Pan, Drag, Draw)**
  - **Issue**: The Board Canvas does not respond properly to dragging media, panning, or drawing. The PixiJS viewport event handling is misconfigured or blocking interactions.
  - **Resolution**: Deeply debug the `viewport.on('pointerdown')` events in `BoardCanvas.tsx` to ensure left-click selection and right-click panning work smoothly. Implement drawing mode.

- [ ] **Mood Boards: Fake Minimap**
  - **Issue**: The minimap located in the bottom right of the canvas is a hardcoded HTML/CSS placeholder (`<div className="canvas-minimap__viewport">`). It does not reflect the canvas.
  - **Resolution**: Wire the minimap to a secondary `PIXI.Application` or remove the UI element until a real minimap renderer is built.

- [ ] **Inspiration Graph View**
  - **Issue**: The `graph` view contains a static SVG and a "Generate Graph" button that does absolutely nothing.
  - **Resolution**: Hide this view in Production or build V1 of the graph layout engine.

- [ ] **Settings Modal: Vaults Tab**
  - **Issue**: Displays placeholder text "Multiple vault tracking will appear here in Phase 5."
  - **Resolution**: Implement real multi-vault tracking in `useSettingsStore` or remove the tab.

- [ ] **Detail Panel: Notes Area**
  - **Issue**: The `<textarea>` for asset notes is entirely uncontrolled and does not save to the SQLite database.
  - **Resolution**: Add a `notes` column to the `assets` table. Implement a debounce mechanism in React that triggers a Tauri command (`update_asset_notes`).

## 🟠 High Priority (Media & Data Issues)

- [ ] **Media Import: Grey Images & Thumbnail Refresh**
  - **Issue**: Newly imported media sometimes shows up as grey placeholders due to caching or async delays in the WebView file protocol (`asset://`).
  - **Resolution**: Add a manual "Refresh" button to the Library Toolbar. Investigate cache-busting (appending a timestamp query parameter to `convertFileSrc`) for newly ingested files.

- [ ] **Settings: Missing Data Management**
  - **Issue**: There is no way to backup or manage the local database from the UI.
  - **Resolution**: Add "Export DB", "Import DB", and "Clear Cache" action buttons to the Settings modal, wired to Rust file operations.

## 🟡 Medium Priority (Missing UX Features)

- [ ] **File Renaming in Detail Panel**
  - **Issue**: There is no way to edit the title or filename of an asset.
  - **Resolution**: Add an inline edit button next to the Title/Filename in the Detail Panel. Trigger a Tauri command (`rename_asset`).

- [ ] **Board Canvas: Excalidraw Connections**
  - **Issue**: Boards lack the ability to link images together with arrows/lines.
  - **Resolution**: Implement `PIXI.Graphics` edge drawing between `BoardNode` elements. 

- [ ] **Settings Modal: Theme Editor**
  - **Issue**: The settings only allow toggling "Dark/Light/System". No granular appearance control.
  - **Resolution**: Add a robust Appearance Editor with color pickers for core CSS variables (`--bg-base`, `--accent-color`).

- [ ] **Collections / Categories Nesting**
  - **Issue**: Collections currently exist as a flat list. There is no concept of sub-categories.
  - **Resolution**: Update the `collections` SQLite table to include a `parent_id`. Render a recursive tree view in the sidebar.

## 🟢 Low Priority (QOL Polish)

- [ ] **Detail Panel: Tag Creation Button**
  - **Issue**: The tag creation input relies exclusively on `onBlur` and `Enter`. Users without keyboard intuition get stuck.
  - **Resolution**: Add an explicit "+ Create" button next to the tag input field.

- [ ] **UI Layout: Collapsible Sidebar**
  - **Issue**: The left sidebar is statically sized and takes up too much screen real estate on smaller monitors.
  - **Resolution**: Add a Hamburger Menu button to the Toolbar and a `isSidebarOpen` boolean state to `App.tsx` to toggle the sidebar's visibility.
