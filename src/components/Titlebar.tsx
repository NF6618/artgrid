import React from 'react';
import { IconArtGrid, IconMinimize, IconMaximize, IconClose } from './Icons';

interface TitlebarProps {
  title?: string;
}

export const Titlebar: React.FC<TitlebarProps> = ({ title = 'ArtGrid' }) => {
  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {
      // Running in browser mode
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      const isMaximized = await win.isMaximized();
      if (isMaximized) {
        await win.unmaximize();
      } else {
        await win.maximize();
      }
    } catch {
      // Running in browser mode
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      // Running in browser mode
    }
  };

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar__drag-region" data-tauri-drag-region>
        <div className="titlebar__logo">
          <IconArtGrid size={18} />
        </div>
        <span className="titlebar__title">{title}</span>
      </div>
      <div className="titlebar__controls">
        <button className="titlebar__btn" onClick={handleMinimize} aria-label="Minimize">
          <IconMinimize />
        </button>
        <button className="titlebar__btn" onClick={handleMaximize} aria-label="Maximize">
          <IconMaximize />
        </button>
        <button className="titlebar__btn titlebar__btn--close" onClick={handleClose} aria-label="Close">
          <IconClose />
        </button>
      </div>
    </div>
  );
};
