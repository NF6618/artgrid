# ArtGrid Roadmap

This roadmap outlines the planned development trajectory for ArtGrid.

## Short-Term Goals (Current Quarter)
- **Vault Management Overhaul**: Complete the integration of the dropdown vault selection in the left sidebar, ensuring full application state resets cleanly when switching vaults.
- **Details Sidebar Refinements**: 
  - Enhance PDF preview thumbnail generation.
  - Re-order the metadata (Notes below Tags and Collections).
  - Add inline UI for creating new Tags and Collections directly from the details pane.
  - Implement the Color Palette breakdown (Dominant, Primary, Secondary, Accents).
- **Ohmgrown Services Integration**: Add specific contact placeholder data into the About/Settings pages.

## Medium-Term Goals (Next 6 Months)
- **Advanced Canvas Workspaces (tldraw)**: Deepen the integration of `tldraw` to support infinite canvas moodboarding where library assets can be seamlessly dragged onto multiple visual boards.
- **Enhanced AI Features**:
  - Auto-tagging of images based on content recognition (CLIP models).
  - Semantic search across all Markdown notes and extracted OCR text.
- **Plugin System**: Expose a basic API for users to write their own asset processing scripts.

## Long-Term Goals (12+ Months)
- **Multi-OS Distribution**: Formalizing the build pipeline for automated binary releases across Windows, macOS (Universal), and Linux (AppImage/Deb).
- **Cloud Sync**: Optional End-to-End Encrypted sync across multiple local nodes, allowing a unified Vault across different machines without relying on SaaS providers.
