import React from 'react';
import { IconArtGrid, IconMinimize, IconMaximize, IconClose } from './Icons';

interface TitlebarProps {
  title?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  title = 'ArtGrid',
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
}) => {
  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (e) {
      console.warn('Window minimize failed:', e);
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      const isMax = await win.isMaximized();
      if (isMax) {
        await win.unmaximize();
      } else {
        await win.maximize();
      }
    } catch (e) {
      console.warn('Window maximize failed:', e);
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (e) {
      console.warn('Window close failed:', e);
    }
  };

  return (
    <div className="titlebar" data-tauri-drag-region style={{ userSelect: 'none' }}>
      {/* Navigation & Branding Group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
        <div className="titlebar__logo">
          <IconArtGrid size={18} />
        </div>

        {/* Back & Forward History Buttons */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button 
            className="toolbar__btn" 
            onClick={onGoBack} 
            disabled={!canGoBack}
            title="Go Back"
            style={{ width: 26, height: 26, minWidth: 26, padding: 0, opacity: canGoBack ? 1 : 0.3, cursor: canGoBack ? 'pointer' : 'default' }}
          >
            ◀
          </button>
          <button 
            className="toolbar__btn" 
            onClick={onGoForward} 
            disabled={!canGoForward}
            title="Go Forward"
            style={{ width: 26, height: 26, minWidth: 26, padding: 0, opacity: canGoForward ? 1 : 0.3, cursor: canGoForward ? 'pointer' : 'default' }}
          >
            ▶
          </button>
        </div>

        <span className="titlebar__title" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {title}
        </span>
      </div>

      {/* Center Drag Region */}
      <div className="titlebar__drag-region" data-tauri-drag-region style={{ flex: 1, height: '100%' }} />

      {/* Right Window Controls */}
      <div className="titlebar__controls" style={{ zIndex: 10 }}>
        <button className="titlebar__btn" onClick={handleMinimize} aria-label="Minimize" title="Minimize">
          <IconMinimize />
        </button>
        <button className="titlebar__btn" onClick={handleMaximize} aria-label="Maximize / Fullscreen" title="Maximize / Restore">
          <IconMaximize />
        </button>
        <button className="titlebar__btn titlebar__btn--close" onClick={handleClose} aria-label="Close" title="Close">
          <IconClose />
        </button>
      </div>
    </div>
  );
};
