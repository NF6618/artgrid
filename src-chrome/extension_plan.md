# ArtGrid Chrome Extension: Implementation Plan

## 1. Executive Summary
The ArtGrid Chrome extension will act as a seamless bridge between the web and the user's ArtGrid vault. Mimicking the frictionless experience of Cosmos.so, the extension will inject an intuitive "Save to Vault" UI overlay on web images. It will feature deep, native-feeling integrations with visual discovery platforms like Pinterest and Cosmos, enabling single-click saves and bulk board imports. The extension will employ smart metadata extraction to automatically tag and categorize saved assets.

## 2. Architecture & Technology Stack
- **Framework:** React 18 + TypeScript + Vite (via CRXJS Vite plugin for seamless extension bundling).
- **Extension API:** Chrome Manifest V3 (Standard for all modern extensions).
- **Styling:** TailwindCSS (scoped in Shadow DOM to avoid polluting host page CSS).
- **Communication:**
  - **Content Scripts:** Inject the hover UI on `<img>` tags and platform-specific DOM elements (Pinterest pins, Cosmos cards).
  - **Service Worker (Background Script):** Handles API requests to the ArtGrid backend, manages authentication state, and processes background tasks.
  - **Popup UI:** Quick access to vault settings, manual tagging, and recent saves.

## 3. Core Features & Technical Approach

### A. Contextual Image Hover UI
- **DOM MutationObserver:** Monitor the DOM for added `<img>` elements or elements with CSS background images.
- **Hover Injection:** When a user hovers over an image (above a certain dimension threshold, e.g., 150x150px to ignore small icons), a lightweight React component (the "Save" button) is rendered in a shadow DOM overlay to prevent host site CSS conflicts.

### B. Platform-Specific Integrations
- **Pinterest Integration:**
  - Target `.pinWrapper` or equivalent DOM selectors.
  - Extract high-resolution image URLs (e.g., replacing `/236x/` with `/originals/` in the URL).
  - Extract Pinterest tags, board context, and description from the DOM or inline JSON data (`<script id="initial-state">`).
- **Cosmos Integration:**
  - Identify Cosmos element cards.
  - Extract metadata such as cluster names, source URLs, and element descriptions.

### C. Smart Tagging & Metadata Extraction
- **Image Metadata:** Extract `alt` text, `title`, and surrounding contextual text (`<figcaption>`, nearest headers).
- **Open Graph / SEO:** Parse `<meta property="og:image:alt">`, `<meta name="keywords">` for global page context.
- **Auto-Collection Workflow:** 
  - Allow users to "subscribe" to a Pinterest board or Cosmos cluster.
  - The background script (or backend) periodically fetches new items from these public/shared URLs and syncs them directly to the vault.

## 4. Multi-Phase Development Plan

### Phase 1: Foundation & Vault Connection
- Set up Vite + React + CRXJS extension boilerplate in `src-chrome`.
- Implement Manifest V3 configurations.
- Develop Service Worker for authentication and robust communication with the ArtGrid Vault API.
- Create basic popup UI to confirm connection status and settings.

### Phase 2: Core Image Capture & Overlay UI
- Develop Content Script with `MutationObserver` for image detection.
- Build the Shadow DOM React container.
- Implement the "Save to Vault" hover button on standard web images.
- Wire up the save action to send image URL and basic page title to the vault.

### Phase 3: Pinterest & Cosmos Deep Integrations
- Build site-specific parsers (Adapter pattern) for `pinterest.com` and `cosmos.so`.
- Implement high-res image resolution for Pinterest.
- Extract platform-specific metadata (board names, pin descriptions, Cosmos clusters).
- Ensure the overlay UI aligns naturally with the layout of these platforms.

### Phase 4: Smart Tagging & Auto-Collection
- Implement robust metadata extraction (Alt tags, Open Graph, surrounding DOM context).
- Map extracted metadata to ArtGrid vault tags automatically.
- Develop the "Auto-Collection" logic to handle bulk or scheduled imports from specific boards.

### Phase 5: Polish, Performance, & Edge Cases
- Optimize `MutationObserver` to ensure zero performance lag on image-heavy sites.
- Implement UI micro-animations and feedback states (e.g., "Saved!", loading spinners).
- Handle CORS issues by routing image downloads through the Service Worker or ArtGrid backend.
- Comprehensive testing across complex sites.

## 5. Technical Decisions (Resolved)
1. **Vault API Readiness:** We are utilizing a local-first architecture (Option A). A lightweight HTTP server will be embedded in the ArtGrid Tauri Rust backend to listen for incoming saves on a localhost port.
2. **Auto-Collection Behavior:** The extension will pass board URLs to the local Tauri backend, which will handle continuous scraping and auto-collection (provided the app is open).
3. **Image Upload Strategy:** The extension will send the image URL and metadata to the Tauri local server. The Rust backend will fetch the image directly, which is more efficient for the client and avoids most CORS issues.
