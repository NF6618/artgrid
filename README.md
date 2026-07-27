<div align="center">
  <img src="https://via.placeholder.com/150x150.png?text=ArtGrid+Logo" alt="ArtGrid Logo" width="150" height="150" />
  <h1>ArtGrid</h1>
  <p><strong>The Privacy-First, AI-Powered Local Asset Manager & Moodboard</strong></p>
</div>

ArtGrid is a high-performance desktop application designed for artists, researchers, and creatives who need to organize thousands of reference images, 3D models, PDFs, and notes *without* relying on cloud subscriptions or giving up their privacy. Built on a lightning-fast Rust backend and a beautiful React frontend, ArtGrid brings advanced AI tools directly to your local hardware.

---

## 🏆 Feature Comparison

Why choose ArtGrid? Here is how we stack up against the competition:

| Feature | ArtGrid | Eagle | PureRef | Obsidian / Notion |
|---------|:---:|:---:|:---:|:---:|
| **Pricing** | **Free & Open Source** | Paid ($29.95) | Pay What You Want | Free / SaaS |
| **Local / Offline First** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Notion is Cloud |
| **Asset Types Supported** | Images, PDFs, 3D, MD | Images, 3D, Video | Images Only | MD, limited assets |
| **Infinite Canvas Boards** | ✅ Yes (tldraw) | ❌ No | ✅ Yes | ❌ No / Canvas Plugin |
| **Local AI Background Removal**| ✅ Yes (Runs locally) | ❌ No | ❌ No | ❌ No |
| **Local AI Upscaling (2x)** | ✅ Yes (ESRGAN) | ❌ No | ❌ No | ❌ No |
| **PDF OCR & Extraction** | ✅ Yes (Local Tesseract) | ❌ No | ❌ No | ❌ No |

---

## ✨ Full Feature List

### 📂 Organization & Vaults
- **Multiple Vaults**: Keep distinct projects in entirely separate workspaces (Vaults) on your hard drive.
- **Virtualized Gallery**: Effortlessly scroll through libraries containing 10,000+ items with zero lag.
- **Robust Metadata**: Assign Collections, Sub-collections, Tags, and Markdown Notes to any asset.
- **Auto-Watch Folders**: Simply drop files into your OS folder, and ArtGrid instantly ingests them.

### 🛠️ Advanced Media Viewers
- **Image Studio**: Adjust brightness, contrast, hue, and rotation natively.
- **PDF Powerhouse**: 3D Flipbook view, continuous scroll mode, global text search, and bounding-box crop extraction.
- **3D Model Viewer**: Natively spin and inspect `.obj` and `.glb` files.
- **Markdown Editor**: Write robust text notes directly in the app.

### 🧠 Local AI Magic
All AI models run offline on your machine—no APIs, no subscriptions, no data harvesting.
- **OCR Text Extraction**: Extract text from scanned PDFs or specific cropped regions using `tesseract.js`.
- **Background Removal**: Instantly cut out subjects from complex backgrounds using WebAssembly models.
- **Image Upscaling**: Double the resolution of low-quality references using an ESRGAN neural network.

---

## 🚀 Roadmap

We are constantly evolving. Here is a peek at what is coming:

- [ ] **Vault Management Overhaul**: Seamless UI dropdowns for rapid context switching.
- [ ] **Semantic AI Search**: Search for images based on visual content (e.g., "red car on a hill") using local CLIP embeddings.
- [ ] **Enhanced Infinite Canvas**: Tighter integration with `tldraw` to drag and drop thousands of assets onto massive moodboards.
- [ ] **Cross-Platform Release Binaries**: Automated installer generation for Windows, macOS (Apple Silicon), and Linux.

*(For detailed architectural plans, see the [docs](./docs) folder).*

---

## 🛠️ Build it from Scratch (Developer Tutorial)

Want to contribute or build ArtGrid for yourself? It's easy. ArtGrid uses **Tauri**, so you will need both Node.js and Rust installed.

### Prerequisites
1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **Rust** - Install via [rustup](https://rustup.rs/)
3. **C++ Build Tools** (Windows only) - Install the "Desktop development with C++" workload via Visual Studio Installer.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/artgrid.git
cd artgrid
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Run in Development Mode
This will start the Vite dev server and the Tauri Rust backend simultaneously.
```bash
npm run tauri:dev
```
*Note: The first time you run this, Cargo (Rust) will take a few minutes to download and compile the backend crates.*

### 4. Build a Production Release
Ready to package ArtGrid into a standalone `.exe` (Windows), `.app` (Mac), or `.deb` (Linux)?
```bash
npm run tauri:build
```
Once finished, your compiled installer will be located in `src-tauri/target/release/bundle/`.

---

<div align="center">
  <i>Built with ❤️ by Ohmgrown Services</i>
</div>
