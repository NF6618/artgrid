import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../stores/useSettingsStore';

class TelemetryLogger {
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      this.sendToBackend('LOG', args);
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      this.sendToBackend('WARN', args);
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      this.sendToBackend('ERROR', args);
    };

    // Intercept fetch network traffic
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || 'URL';
      try {
        const response = await originalFetch.apply(window, args);
        const duration = Math.round(performance.now() - startTime);
        this.sendNetworkLog(`FETCH ${response.status} [${duration}ms] -> ${url}`);
        return response;
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        this.sendNetworkLog(`FETCH ERROR [${duration}ms] -> ${url} (${err})`);
        throw err;
      }
    };
  }

  private async sendToBackend(level: 'LOG' | 'WARN' | 'ERROR', args: any[]) {
    const { enableVerboseLogging } = useSettingsStore.getState();
    if (enableVerboseLogging === false) return;

    try {
      const formatted = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      await invoke('log_telemetry', { level, message: formatted, category: 'FRONTEND' });
    } catch (_) {
      // Ignore background log emission failures
    }
  }

  private async sendNetworkLog(message: string) {
    const { enableVerboseLogging } = useSettingsStore.getState();
    if (enableVerboseLogging === false) return;

    try {
      await invoke('log_telemetry', { level: 'NETWORK', message, category: 'NETWORK' });
    } catch (_) {
      // Ignore
    }
  }
}

export const logger = new TelemetryLogger();
