import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Asset } from '../Gallery';

export interface AIToolbarProps {
  asset: Asset;
  resolvedUrl: string;
  onAssetsUpdated?: () => void;
}

export const AIToolbar: React.FC<AIToolbarProps> = ({ asset, resolvedUrl, onAssetsUpdated }) => {
  const isImage = asset.type.startsWith('image');
  const isPdf = asset.type === 'application/pdf';

  const handleRunBackgroundRemoval = async () => {
    try {
      alert("AI Background Removal task queued. (Backend implementation pending)");
      // await invoke('ai_remove_background', { assetId: asset.id });
      // if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunUpscale = async () => {
    try {
      alert("AI Upscale task queued. (Backend implementation pending)");
      // await invoke('ai_upscale_image', { assetId: asset.id });
      // if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleRunOcr = async () => {
    try {
      alert("AI OCR task queued. (Backend implementation pending)");
      // await invoke('ai_extract_text', { assetId: asset.id });
      // if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
            ✨ Remove BG
          </button>
          <button 
            className="btn btn--secondary" 
            onClick={(e) => { e.stopPropagation(); handleRunUpscale(); }}
            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            🔍 Upscale
          </button>
        </>
      )}
      {isPdf && (
        <button 
          className="btn btn--secondary" 
          onClick={(e) => { e.stopPropagation(); handleRunOcr(); }}
          style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          📝 Deep OCR
        </button>
      )}
    </div>
  );
};
