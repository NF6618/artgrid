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

---

## 🚀 Current Features
- **Vault Auto-Watching**: The Rust backend continuously monitors the `media/` directory. Dropping a file in via Windows Explorer automatically pulls it into ArtGrid within milliseconds.
- **Hardware-Accelerated Mood Boards**: Infinite panning, zooming, and dynamic layout powered by WebGL/PixiJS.
- **Deep Linking**: Trigger web-imports directly to your vault from the terminal or browser extensions using `artgrid://save?url=...`.
- **Smart Filtering**: Robust tagging, collection assignment, and instant search utilizing a local SQLite index.
- **Frustum Culling Optimization**: Canvas rendering is aggressively optimized to cull off-screen textures, maintaining 60FPS on massive boards.

---

## 🗺️ Product Roadmap
We are actively developing new tools to enhance creative workflows and integrate with existing ecosystems. Please see our detailed roadmaps in the `/docs` folder:
- [Issue Tracker](./docs/issue_tracker.md) - Current known UI/UX issues being resolved.
- [QA Plan](./docs/QA_plan.md) - Our strict local-first testing philosophy.
- [Integration Roadmap](./docs/integration_roadmap.md) - Upcoming Chrome Extension, Pinterest Sync, and Cosmos Import.
- [QOL Roadmap](./docs/qol_roadmap.md) - Artist-focused features like Storyboarding, Canvas Drawing, and Project Scoping.

---

## 🛠️ Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/)
- [Tauri OS Dependencies](https://tauri.app/v1/guides/getting-started/prerequisites)

### Running Locally

```bash
npm install
npm run tauri dev
```

---
*Built with ❤️ for creatives everywhere.*
