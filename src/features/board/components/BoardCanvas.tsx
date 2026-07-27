import React, { useState, useEffect } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { useBoardSync } from '../hooks/useBoardSync';
import { useBoardStore } from '../../../stores/useBoardStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';

export const BoardCanvas: React.FC = () => {
  const activeBoardId = useBoardStore(state => state.activeBoardId);
  const store = useBoardSync(activeBoardId);
  const [editor, setEditor] = useState<Editor | null>(null);

  const { tldrawTheme, tldrawGridStyle, tldrawSnapToGrid, theme } = useSettingsStore();

  useEffect(() => {
    if (!editor) return;
    try {
      const isDark = tldrawTheme === 'light' ? false : (tldrawTheme === 'dark' || theme === 'dark');
      (editor.user as any).updateUserPreferences({ isDarkMode: isDark });
      
      if (tldrawGridStyle === 'none') {
        (editor as any).updateInstanceState({ isGridMode: false });
      } else {
        (editor as any).updateInstanceState({ isGridMode: true });
      }

      if (typeof tldrawSnapToGrid === 'boolean') {
        (editor as any).updateInstanceState({ isSnapMode: tldrawSnapToGrid });
      }
    } catch (e) {
      console.error("Failed to sync tldraw settings", e);
    }
  }, [editor, tldrawTheme, tldrawGridStyle, tldrawSnapToGrid, theme]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!editor) return;

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      let assetData: any = null;
      
      if (!dataStr) {
        assetData = (window as any).__artgridDragAsset;
      } else {
        assetData = JSON.parse(dataStr);
      }

      if (!assetData) return;

      const point = editor.screenToPage({ x: e.clientX, y: e.clientY });

      const assetId = `asset:${assetData.id || crypto.randomUUID()}` as any;
      editor.createAssets([{
        id: assetId,
        typeName: 'asset',
        type: 'image',
        props: {
          w: assetData.width || 400,
          h: assetData.height || 400,
          name: '',
          isAnimated: false,
          mimeType: 'image/jpeg',
          src: assetData.url,
        },
        meta: {},
      }]);

      let w = assetData.width || 400;
      let h = assetData.height || 400;
      if (w > 480) {
        const scale = 480 / w;
        w = 480;
        h = h * scale;
      }

      editor.createShape({
        type: 'image',
        x: point.x - w / 2,
        y: point.y - h / 2,
        props: {
          w,
          h,
          assetId,
        },
      });

    } catch (err) {
      console.error('Failed to parse dropped asset data', err);
    }
  };

  if (!activeBoardId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No board selected.
      </div>
    );
  }

  if (!store) {
    return <div style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }} />;
  }

  return (
    <div 
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
    >
      <Tldraw 
        store={store} 
        onMount={setEditor}
        forceMobile={false}
      />
    </div>
  );
};
