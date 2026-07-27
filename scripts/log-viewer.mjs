import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const logFile = path.join(os.tmpdir(), 'artgrid-verbose.log');

// Setup ANSI colors
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const CYN   = '\x1b[36m';
const GRN   = '\x1b[32m';

console.log(`${BOLD}${CYN}ArtGrid Verbose Dev & Network Log Stream${RESET}`);
console.log('Waiting for artgrid.exe to start...\n');

// Wrap in async IIFE
(async () => {
  let isRunning = false;
  while (!isRunning) {
    try {
      const stdout = execSync('tasklist /FI "IMAGENAME eq artgrid.exe" /NH', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (stdout.includes('artgrid.exe')) {
        isRunning = true;
      }
    } catch (e) {
      // ignore
    }
    if (!isRunning) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`${BOLD}${GRN}✔ ArtGrid is running! Streaming logs...${RESET}\n`);

  let position = 0;
  while (true) {
    if (fs.existsSync(logFile)) {
      try {
        const stat = fs.statSync(logFile);
        if (stat.size > position) {
          const fd = fs.openSync(logFile, 'r');
          const buffer = Buffer.alloc(stat.size - position);
          fs.readSync(fd, buffer, 0, buffer.length, position);
          fs.closeSync(fd);
          process.stdout.write(buffer.toString('utf8'));
          position = stat.size;
        } else if (stat.size < position) {
          // File was truncated or reset
          position = 0;
        }
      } catch (err) {
        // file might be locked briefly, ignore
      }
    }
    await new Promise(r => setTimeout(r, 100));
  }
})();
