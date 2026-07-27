# ArtGrid Frontend Architecture

The ArtGrid frontend is built using a modern, reactive tech stack tailored for high-performance media rendering and organization.

## Tech Stack
- **Framework**: React 18
- **Language**: TypeScript
- **Bundler**: Vite
- **State Management**: Zustand (Global state for settings, modals, contexts)
- **Styling**: Vanilla CSS with comprehensive CSS Variables for dynamic theming (Dark/Light/Custom themes)
- **Icons**: Lucide-React (via standard SVG paths in a custom `Icons.tsx` to minimize dependencies)

## Core Components
- **Layout Manager**: A multi-pane resizable layout that supports collapsing sidebars.
- **Gallery**: A highly optimized virtualized grid for rendering thousands of assets. It supports lazy loading, drag-and-drop operations, and custom context menus.
- **Viewers**:
  - **ImageViewer**: Advanced controls (brightness, contrast, rotation) and AI integrations.
  - **PdfViewer**: Supports 3D Flipbook reading, continuous scrolling, text search, OCR, and crop selection.
  - **ModelViewer**: Basic 3D (.glb, .obj) rendering.
  - **MarkdownViewer**: For text notes.

## Pending Changes & Placeholders
- **Vault Overhaul UI**: Dropdown menu for Vault selection on the left sidebar is pending final wiring.
- **Ohmgrown Services**: Contact details (TD & William) placeholders need to be styled and exposed in the `SettingsModal` or an `About` page.
- **Color Palette Breakdown**: Enhancing the asset details sidebar to categorize colors by Dominant, Primary, Secondary, and Accent based on color theory.
