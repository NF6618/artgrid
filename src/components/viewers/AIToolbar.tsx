import React, { useState } from 'react';
import { Asset } from '../Gallery';
import { IconSparkles, IconZoomIn, IconScanText } from '../Icons';
import { invoke } from '@tauri-apps/api/core';

export interface AIToolbarProps {
  asset: Asset;
  resolvedUrl: string;
  onAssetsUpdated?: () => void;
}

export const AIToolbar: React.FC<AIToolbarProps> = ({ asset, onAssetsUpdated }) => {
  const [queuedTask, setQueuedTask] = useState<string | null>(null);

  const assetType = asset?.type || (asset as any)?.type_ || '';
  const ext = (asset?.filename || asset?.title || '').split('.').pop()?.toLowerCase() || '';
  const isImage = assetType.startsWith('image') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext);
  const isPdf = assetType.includes('pdf') || ext === 'pdf';

  const showTooltip = (task: string) => {
    setQueuedTask(task);
    setTimeout(() => setQueuedTask(null), 3000);
  };

  const handleRunBackgroundRemoval = async () => {
    try {
      console.log(`[AIToolbar] Queueing backend task: ai_remove_background for ${asset.id}`);
      await invoke('ai_remove_background', { assetId: asset.id });
      showTooltip('Background Removal');
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error("[AIToolbar] Failed to queue Background Removal:", err);
    }
  };

  const handleRunUpscale = async () => {
    try {
      console.log(`[AIToolbar] Queueing backend task: ai_upscale_image for ${asset.id}`);
      await invoke('ai_upscale_image', { assetId: asset.id });
      showTooltip('Upscale');
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error("[AIToolbar] Failed to queue Upscale:", err);
    }
  };
  
  const handleRunOcr = async () => {
    try {
      console.log(`[AIToolbar] Queueing backend task: ai_extract_text for ${asset.id}`);
      await invoke('ai_extract_text', { assetId: asset.id });
      showTooltip('OCR');
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error("[AIToolbar] Failed to queue OCR:", err);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
      <div style={{ width: 1, height: 16, background: 'var(--border-subtle)', margin: '0 4px' }} />
      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', marginRight: 4 }}>
        AI Tools
      </span>
      {isImage && (
        <>
          <button 
            className="btn btn--secondary" 
            onClick={(e) => { e.stopPropagation(); handleRunBackgroundRemoval(); }}
            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <IconSparkles size={13} /> Remove BG
          </button>
          <button 
            className="btn btn--secondary" 
            onClick={(e) => { e.stopPropagation(); handleRunUpscale(); }}
            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <IconZoomIn size={13} /> Upscale
          </button>
        </>
      )}
      {isPdf && (
        <button 
          className="btn btn--secondary" 
          onClick={(e) => { e.stopPropagation(); handleRunOcr(); }}
          style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <IconScanText size={13} /> Deep OCR
        </button>
      )}
      {queuedTask && (
        <div style={{
          position: 'absolute',
          top: '-32px',
          right: 0,
          background: 'var(--accent-primary)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: '10px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          pointerEvents: 'none'
        }}>
          ✅ {queuedTask} task queued
        </div>
      )}
    </div>
  );
};
