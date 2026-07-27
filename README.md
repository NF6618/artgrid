# ArtGrid

**ArtGrid** is a local-first, infinite-canvas reference manager and mood board application designed for creatives, artists, and designers. Built with Tauri, React, and TypeScript, it serves as a lightweight, blazing-fast alternative to web-based visual management tools (like Pinterest or Cosmos), bringing your inspiration board directly to your local machine.

## Project Vision

Modern creatives suffer from fragmented reference libraries scattered across cloud services, messy local folders, and disjointed bookmarks. ArtGrid solves this by providing a unified, local-first ecosystem where capturing, organizing, and exploring visual inspiration is seamless and instantaneous.

### Core Pillars
1. **Local-First & Private:** Your data stays on your machine. No mandatory cloud subscriptions, no data mining, and lightning-fast loading times.
2. **Infinite Canvas:** Organize your references spatially on a performant, unbounded canvas.
3. **Frictionless Capture:** Save inspiration at the speed of thought using smart browser extensions, drop zones, and automated tagging.
4. **Intelligent Organization:** Advanced metadata, automated tagging, and AI-powered visual similarity search.

## Documentation

Comprehensive project documentation, feature specifications, and development roadmaps can be found in the `/docs` directory:
- [Features Specification](./docs/features.md)
- [Project Tasks & Phases](./docs/tasks.md)

## Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/)
- [Tauri Dependencies](https://tauri.app/v1/guides/getting-started/prerequisites)

### Running Locally

```bash
# Install dependencies
npm install

# Start the development server and Rust backend
npm run tauri dev
```

### Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/) 
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) 
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
