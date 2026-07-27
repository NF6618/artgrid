#!/usr/bin/env node
/**
 * scripts/dev-fresh.mjs
 *
 * Wipes all ArtGrid persisted data (vault, SQLite DB, Tauri app data,
 * plugin-store settings, WebView2 cache) and then launches `tauri dev`.
 *
 * Usage:  npm run tauri:fresh
 *
 * What gets deleted
 * ─────────────────
 * 1. Vault folder  — read from the Tauri plugin-store JSON file so we know
 *    the exact path the user last chose.  If found, the entire vault dir
 *    (media/ + artgrid.db) is removed.
 * 2. Tauri app-data dir  — %APPDATA%\com.artgrid.app  (Windows)
 *    ~/Library/Application Support/com.artgrid.app  (macOS)
 *    ~/.local/share/com.artgrid.app  (Linux)
 *    This contains plugin-store JSON, logs, and crash data.
 * 3. WebView2 dev cache  — %TEMP%\artgrid_webview2_dev  (Windows only)
 *    avoids stale renderer caches that can surface as white-screen or
 *    protocol errors after schema changes.
 * 4. Vite / TypeScript build cache  — node_modules/.vite  (optional fast
 *    path — ensures no stale hot-reload module graph).
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ── Helpers ───────────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const RED   = '\x1b[31m';
const YEL   = '\x1b[33m';
const GRN   = '\x1b[32m';
const CYN   = '\x1b[36m';
const DIM   = '\x1b[2m';

function log(msg)   { console.log(`  ${msg}`); }
function info(msg)  { console.log(`  ${CYN}ℹ${RESET}  ${msg}`); }
function ok(msg)    { console.log(`  ${GRN}✔${RESET}  ${msg}`); }
function warn(msg)  { console.log(`  ${YEL}⚠${RESET}  ${msg}`); }
function skip(msg)  { console.log(`  ${DIM}–  ${msg}${RESET}`); }

function rmrf(target) {
  if (!target || !fs.existsSync(target)) { skip(`Not found, skipping: ${target}`); return; }
  try {
    fs.rmSync(target, { recursive: true, force: true });
    ok(`Deleted: ${target}`);
  } catch (e) {
    warn(`Could not delete ${target}: ${e.message}`);
  }
}

// ── Tauri app-data dir by platform ────────────────────────────────────────────

function tauriAppDataDir(identifier) {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), identifier);
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', identifier);
    default:
      return path.join(process.env.XDG_DATA_HOME ?? path.join(home, '.local', 'share'), identifier);
  }
}

const APP_ID   = 'com.artgrid.app';
const APP_DATA = tauriAppDataDir(APP_ID);

// ── Resolve vault path from plugin-store ──────────────────────────────────────

function findVaultPath() {
  // Tauri plugin-store saves files as <storeName>.json inside the app data dir.
  // The store name used in ArtGrid is typically "settings.json" or similar.
  const candidates = [
    path.join(APP_DATA, 'settings.json'),
    path.join(APP_DATA, 'artgrid.json'),
    path.join(APP_DATA, 'store.json'),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      // Plugin-store v2 format: { "key": value, ... }
      const vp = raw?.vaultPath ?? raw?.vault_path ?? null;
      if (vp && typeof vp === 'string') return vp;
    } catch (_) { /* ignore parse errors */ }
  }

  // Scan the whole app-data dir for any .json that mentions vaultPath
  if (fs.existsSync(APP_DATA)) {
    for (const f of fs.readdirSync(APP_DATA)) {
      if (!f.endsWith('.json')) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(APP_DATA, f), 'utf8'));
        const vp = raw?.vaultPath ?? raw?.vault_path ?? null;
        if (vp && typeof vp === 'string') { info(`Found vault path in ${f}: ${vp}`); return vp; }
      } catch (_) { /* ignore */ }
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log();
console.log(`${BOLD}${RED}╔════════════════════════════════════════════╗${RESET}`);
console.log(`${BOLD}${RED}║   ArtGrid — Fresh Dev Reset                ║${RESET}`);
console.log(`${BOLD}${RED}╚════════════════════════════════════════════╝${RESET}`);
console.log();

// 1. Vault folder
log(`${BOLD}[1/4] Locating vault data…${RESET}`);
const vaultPath = findVaultPath();
if (vaultPath) {
  info(`Vault path resolved to: ${vaultPath}`);
  rmrf(vaultPath);
} else {
  skip('No vault path found in plugin-store — nothing to remove');
}
console.log();

// 2. Tauri app-data dir (settings, logs, plugin-store JSON)
log(`${BOLD}[2/4] Clearing Tauri app-data…${RESET}`);
info(`App data dir: ${APP_DATA}`);
rmrf(APP_DATA);
console.log();

// 3. WebView2 dev cache (Windows only)
log(`${BOLD}[3/4] Clearing WebView2 dev cache…${RESET}`);
if (process.platform === 'win32') {
  const wv2Cache = path.join(os.tmpdir(), 'artgrid_webview2_dev');
  rmrf(wv2Cache);
} else {
  skip('WebView2 cache only applies on Windows');
}
console.log();

// 4. Vite module cache
log(`${BOLD}[4/4] Clearing Vite build cache…${RESET}`);
rmrf(path.join(projectRoot, 'node_modules', '.vite'));
console.log();

// ── Done — launch tauri dev ───────────────────────────────────────────────────

console.log(`${GRN}${BOLD}  ✔  All data cleared. Launching tauri dev…${RESET}`);
console.log();

const child = spawn('npm', ['run', 'tauri', 'dev'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', code => process.exit(code ?? 0));
