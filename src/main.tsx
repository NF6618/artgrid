import React from 'react';
import ReactDOM from 'react-dom/client';
import { attachConsole } from '@tauri-apps/plugin-log';
import App from './App';
import './styles/design-system.css';
import { logger } from './utils/logger';

// Initialize console & network telemetry
logger.init();

// Forward all frontend console logs to the Rust backend (and log file)
attachConsole().catch(console.error);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
