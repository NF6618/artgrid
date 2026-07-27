# Quality of Life (QOL) Roadmap for Artists

As a tool built exclusively for creatives, artists, and designers, ArtGrid must support complex creative workflows. This roadmap outlines specialized QOL features.

## 1. Project Creation (Scoping)
Currently, all assets exist in a single massive Vault. Artists often work on entirely separate client projects.
- **Feature**: Project Scoping.
- **Implementation**: Allow users to create "Projects" within a Vault. A project is essentially a root-level master folder (e.g., `Vault/Project A/`). When a Project is selected, the UI only displays assets and boards belonging to that sub-directory.

## 2. Storyboarding Mode
- **Feature**: Sequential Image viewing and arrangement.
- **Implementation**: A specialized Board view that locks assets to a grid or timeline track. Users can add text descriptions under each frame, export the storyboard as a unified PDF, and easily drag-and-drop to reorder frames.

## 3. Inline Notes & Canvas Drawing
- **Feature**: Let artists draw directly on their mood boards and annotate visually.
- **Implementation**: 
  - Add a freehand brush tool to the Board toolbar.
  - Use PixiJS `Graphics` or an overlay `<canvas>` to capture stroke data and serialize it into the Board's JSON state.
  - Add inline text nodes (sticky notes) that can be placed anywhere on the canvas alongside images to replace external tools like Miro or Excalidraw.
