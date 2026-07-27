# ArtGrid
<div align="center">
  <img src="https://raw.githubusercontent.com/tauri-apps/tauri/dev/app-icon.png" width="128" height="128" alt="ArtGrid Logo" />
  <h3>Your Ultimate Local-First Visual Workspace</h3>
  <p>A blazing-fast, infinite-canvas reference manager and mood board application designed exclusively for creatives, artists, and designers.</p>
</div>

---

## 🎨 What is ArtGrid?

**ArtGrid** is a complete local-first ecosystem that rethinks how you gather, organize, and utilize visual inspiration. Built with [Tauri](https://tauri.app/), [React](https://reactjs.org/), and [TypeScript](https://www.typescriptlang.org/), it acts as a lightweight, lightning-fast alternative to cloud-dependent reference managers like Pinterest or Cosmos. 

Instead of fragmenting your creative assets across cloud services, messy local folders, and disjointed browser bookmarks, ArtGrid centralizes your entire library on your local machine using an **Obsidian-style Vault Architecture**.

### 🌟 Why Choose ArtGrid?
- **100% Local-First & Private:** Your data is yours. It lives on your hard drive, inside a standard SQLite database and folder structure. No mandatory cloud subscriptions, no data mining, and no lag.
- **Obsidian-Style Vaults:** Pick any folder on your computer to act as your "Vault". Easily sync it with Dropbox, Google Drive, or Syncthing. Track multiple vaults for different major projects.
- **Frictionless Capture:** Drop files directly into your Vault folder, and our **Background File System Watcher** will instantly detect, parse, and organize them into your UI without you lifting a finger.
- **Infinite Canvas:** Organize your references spatially on a hardware-accelerated, PixiJS-powered unbounded canvas capable of handling thousands of high-res images.
- **Versatile Document Support:** Don't just save images. ArtGrid natively supports reading `.pdf`, `.md`, and `.txt` files directly in its integrated full-screen lightbox.

---

## 🚀 Key Features

### 📁 The Vault Architecture
ArtGrid respects your file system. It stores your assets in a unified "Vault". 
- **Auto-Watching:** The Rust backend continuously monitors the `media/` directory inside your vault. Dropping a file in via Windows Explorer or Finder automatically pulls it into ArtGrid within milliseconds.
- **SQLite Powered:** All metadata (tags, favorites, dimensions) is indexed in an ultra-fast local SQLite database (`artgrid.db`).

### 🖼️ Infinite Mood Boards (Canvas)
- Hardware-accelerated rendering via **PixiJS**.
- Dedicated tools for Panning, Selecting, and navigating massive boards via the Minimap.
- Seamlessly drag assets from your library onto multiple interconnected boards.

### 🎛️ Fleshed-Out Interface
- **Dynamic Sidebar:** Instantly filter your massive library using intelligent Quick Access links (Favorites, Untagged, Recent).
- **Settings Hub:** Deep customization including Light/Dark themes, Compact Mode layouts, Keybind mappings, and Vault management.
- **File Lightbox:** Double-click any asset to launch a beautiful, native full-screen viewer for your images and documents.

---

## 📚 Documentation

Comprehensive project documentation, feature specifications, and development roadmaps can be found in the `/docs` directory:
- [Features Specification](./docs/features.md) - Deep dive into all planned and current features.
- [Project Tasks & Phases](./docs/tasks.md) - Our current development roadmap and progress tracker.

---

## 🛠️ Development Setup

ArtGrid leverages a dual-architecture: a blisteringly fast **Rust** backend handling OS-level APIs and SQLite, and a rich **React/Vite** frontend for the UI.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/)
- [Tauri OS Dependencies](https://tauri.app/v1/guides/getting-started/prerequisites)

### Running Locally

```bash
# 1. Install Node dependencies
npm install

# 2. Start the development server and compile the Rust backend
npm run tauri dev
```

### Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/) 
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) 
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---
*Built with ❤️ for creatives everywhere.*
