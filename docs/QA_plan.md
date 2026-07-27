# Quality Assurance (QA) Plan

This QA Plan outlines the testing methodologies and verification steps required to ensure that all upcoming features from the `issue_tracker.md` function perfectly and respect the "no fake UI" philosophy.

## 1. Testing Philosophy
- **End-to-End Local Execution**: All tests must be run locally in the compiled Tauri environment. Browser-only testing is strictly prohibited, as it bypasses the Rust/SQLite backend.
- **Persistence Verification**: UI state changes (e.g. adding a note, renaming a file, drawing a line) MUST survive a full application restart. If it disappears on reboot, it is a fake/unwired state.
- **Edge Case Protection**: Always test with empty inputs, extreme resolutions, and corrupted file paths.

## 2. Feature Verification Steps

### A. File Renaming Verification
1. Open the Detail Panel for an asset.
2. Edit the title to a valid string (e.g., `Cyberpunk Reference`). Verify SQLite `title` updates.
3. Edit the filename to `new_image.jpg`.
4. **Validation Check**: Open Windows File Explorer and manually verify the file `new_image.jpg` exists in the `media/` folder and the old file is gone. 
5. **Edge Case**: Attempt to rename to a filename that already exists. The backend must reject this gracefully and present an error in the UI.

### B. Board Canvas Connections (Excalidraw-style)
1. Drop two assets onto a Mood Board.
2. Select the "Link" tool and drag from Node A to Node B.
3. **Validation Check 1**: An arrow/line should immediately appear.
4. **Validation Check 2**: Drag Node A around the canvas. The line must dynamically follow the node in real-time.
5. **Validation Check 3**: Restart the application. The line must still exist, proving it was saved to the JSON serialized nodes in the `boards` table.

### C. Detail Panel Notes
1. Type a multi-line note into the Detail Panel textarea.
2. Wait 1 second (for debounce).
3. **Validation Check**: Restart the application. Select the asset again. The exact note text must persist.

### D. Settings Theme Editor
1. Open Settings -> Appearance.
2. Use the color picker to change `--bg-base` to an obnoxious color (e.g., `#ff00ff`).
3. **Validation Check 1**: The entire app background should immediately update via CSS variable injection.
4. **Validation Check 2**: Restart the application. The neon pink background must persist on launch via `tauri-plugin-store` hydration.

### E. Nested Collections (Sub-Categories)
1. Create a Collection named `Characters`.
2. Create a Sub-Collection named `Cyberpunk` with `Characters` as the parent.
3. **Validation Check**: In the Sidebar, `Cyberpunk` must be indented under `Characters`. Clicking the parent should collapse the children.
4. Assign an asset to `Cyberpunk`. Ensure it appears when filtering by `Cyberpunk`.

## 3. Performance Profiling
For canvas updates, we must verify that rendering the new PIXI Graphics connections does not drop the application frame rate below 60FPS when panning a board with >100 nodes.
