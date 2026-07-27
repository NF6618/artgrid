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

// ── Kill processes utilizing target port ─────────────────────────────────────

function killPortAndProcesses(port = 1420) {
  log(`${BOLD}[0/5] Terminating running processes on port ${port}…${RESET}`);
  if (process.platform === 'win32') {
    try {
      execSync(`powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' });
      ok(`Freed port ${port}`);
    } catch (_) {}
    try {
      execSync('taskkill /F /IM artgrid.exe', { stdio: 'ignore' });
      ok('Terminated running artgrid.exe process');
    } catch (_) {}
  } else {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      ok(`Freed port ${port}`);
    } catch (_) {}
    try {
      execSync('pkill -9 -f artgrid', { stdio: 'ignore' });
      ok('Terminated running artgrid processes');
    } catch (_) {}
  }
}

import readline from 'readline';

function askPrompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log();
console.log(`${BOLD}${RED}╔════════════════════════════════════════════╗${RESET}`);
console.log(`${BOLD}${RED}║   ArtGrid — Fresh Dev Launch               ║${RESET}`);
console.log(`${BOLD}${RED}╚════════════════════════════════════════════╝${RESET}`);
console.log();

// 0. Close running processes on port 1420
killPortAndProcesses(1420);
console.log();

// Determine whether to clear data based on CLI flags or interactive prompt
const cliArgs = process.argv.slice(2);
const forceClear = cliArgs.includes('--clear') || cliArgs.includes('--clear-data') || cliArgs.includes('-y') || cliArgs.includes('--yes');
const forceKeep  = cliArgs.includes('--keep') || cliArgs.includes('--keep-data') || cliArgs.includes('--skip') || cliArgs.includes('--skip-clear') || cliArgs.includes('--no-clear');

let shouldWipeData = false;

if (forceClear) {
  shouldWipeData = true;
  info('CLI option specified: Wiping all persisted data.');
} else if (forceKeep) {
  shouldWipeData = false;
  info('CLI option specified: Preserving existing data.');
} else if (process.stdin.isTTY) {
  const answer = await askPrompt(`  ${YEL}?${RESET}  ${BOLD}Do you want to clear all persisted vault data & app caches? (y/N): ${RESET}`);
  shouldWipeData = ['y', 'yes'].includes(answer);
} else {
  shouldWipeData = false;
  skip('Non-interactive terminal: Preserving data by default. (Use npm run tauri:fresh -- --clear to force wipe)');
}
console.log();

if (shouldWipeData) {
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
} else {
  skip('Data clear skipped as requested. Preserving vault & application state.');
  console.log();
}

// ── Done — launch tauri dev with verbose log stream ─────────────────────────────

console.log(`${GRN}${BOLD}  ✔  Launching tauri dev with Verbose Logging enabled…${RESET}`);
console.log(`${CYN}  ℹ  Opening dedicated CMD stream window: "ArtGrid — Verbose Dev & Network Log Stream"${RESET}`);
console.log();

// Enable Rust & Tauri trace logging
process.env.RUST_LOG = 'artgrid=trace,tauri=info';
process.env.VERBOSE_LOG = 'true';

if (process.platform === 'win32') {
  // Spawn separate CMD window titled "ArtGrid — Verbose Dev & Network Log Stream"
  spawn('cmd.exe', ['/c', 'start', 'ArtGrid — Verbose Dev & Network Log Stream', 'cmd.exe', '/k', 'npm run tauri dev'], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
    shell: true,
  });
}

// Also run in current terminal window for seamless interaction
const child = spawn('npm', ['run', 'tauri', 'dev'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, RUST_LOG: 'artgrid=trace,tauri=info', VERBOSE_LOG: 'true' }
});

child.on('exit', code => process.exit(code ?? 0));
