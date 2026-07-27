# Known Issues & Bug Tracker

This document tracks persistent known issues, edge cases, and recently resolved major bugs in ArtGrid.

## Active Known Issues
- **3D Model Sizing**: Extremely large `.obj` or `.glb` models may cause canvas slowdowns or run out of memory context in the `ModelViewer`. Lazy loading optimization is required.
- **Large Vault Load Times**: Vaults with over 10,000 assets might experience a 1-3 second delay on initial load before the virtualized gallery catches up.
- **Memory Consumption in Scroll Mode**: Rendering 100+ page PDFs in "Continuous Scroll" mode consumes heavy RAM despite Intersection Observers because `pdfjs` holds page data in memory. Needs stronger page-garbage collection.

## Recently Resolved
- **[FIXED] PDF Infinite Render Loop**: The `PdfViewer.tsx` previously suffered from a maximum update depth exceeded error due to unstable dependencies (array and function recreations) inside `useEffect` blocks.
- **[FIXED] PDF Crop Button Clipping**: The UI button to save cropped PDF selections was being hidden by the parent `overflow: auto` container. It is now fixed relative to the viewport.
- **[FIXED] Context Menu on Gallery Background**: Right-clicking in the empty space of the library now correctly shows the global folder creation / media import context menu instead of doing nothing.
