# Integration Roadmap

This document outlines the technical strategy for integrating external ecosystems (Pinterest, Cosmos.so) and building a native web capture tool (Chrome Extension) directly into ArtGrid's local-first vault.

## 1. Chrome Extension (Priority: High)
**Objective**: Build a Chromium extension that allows users to right-click any image on the web and send it directly to their local ArtGrid vault.
- **Architecture**:
  - The extension will inject a context menu item: "Save to ArtGrid".
  - It will extract the image's source URL.
  - It will trigger a deep link: `artgrid://save?url=<encoded_url>`.
- **Requirements**:
  - Phase 5 IPC Deep Linking is already complete and functional on the Rust backend.
  - We need to create a standalone `extension/` folder in the repository using standard manifest V3.

## 2. Pinterest Import / Syncing (Priority: Medium)
**Objective**: Allow users to migrate their Pinterest boards into ArtGrid vaults.
- **Architecture**:
  - **One-Time Import**: A tool inside ArtGrid's settings that accepts a public Pinterest Board URL.
  - **Backend Pipeline**: A Rust script that fetches the board HTML, parses the initial JSON state to extract image nodes, and iterates through them to download the highest-resolution `originals/` assets.
- **Data Mapping**:
  - Pinterest Board Name -> ArtGrid Collection.
  - Pinterest Pins -> Downloaded to `media/` and inserted into SQLite.

## 3. Cosmos.so Import / Syncing (Priority: Medium)
**Objective**: Provide an exit ramp for Cosmos.so users who wish to transition to a local-first environment.
- **Architecture**:
  - Allow users to export their Cosmos data (usually a zip of images or a JSON dump) and parse it locally.
  - Alternatively, if Cosmos exposes an API, authenticate via OAuth and pull the user's clusters.
- **Data Mapping**:
  - Cosmos Clusters -> ArtGrid Collections / Tags.
