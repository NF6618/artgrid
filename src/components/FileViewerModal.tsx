import React, { useState, useEffect, ReactNode } from 'react';
import { Asset } from './Gallery';
import { convertFileSrc } from '@tauri-apps/api/core';
import { IconClose, IconInfo, IconChevronLeft, IconChevronRight } from './Icons';
import { useSettingsStore } from '../stores/useSettingsStore';
import { ImageViewer } from './viewers/ImageViewer';
import { PdfViewer } from './viewers/PdfViewer';
import { TextViewer } from './viewers/TextViewer';

interface FileViewerModalProps {
  asset: Asset | null;
  allAssets?: Asset[];
  visible: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: Asset) => void;
  onAssetsUpdated?: () => void;
  isPopOutWindow?: boolean;
  onToggleDetail?: () => void;
  showDetailToggle?: boolean;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ 
  asset, 
  allAssets = [], 
  visible, 
  onClose, 
  onSelectAsset,
  onAssetsUpdated,
  isPopOutWindow: isPopOutProp = false,
  onToggleDetail,
  showDetailToggle = false,
}) => {
  const { vaultPath } = useSettingsStore();
  const [viewerControls, setViewerControls] = useState<ReactNode>(null);
  const [isPopOutWindow, setIsPopOutWindow] = useState(isPopOutProp);

  useEffect(() => {
    if (isPopOutProp) setIsPopOutWindow(true);
  }, [isPopOutProp]);

  // Format & URL Resolution
  const ext = (asset?.filename || (asset as any)?.filepath || asset?.title || '').split('.').pop()?.toLowerCase() || '';

  const isImage = asset ? (
    (asset.type && asset.type.toLowerCase().startsWith('image')) ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'tiff', 'ico', 'avif'].includes(ext) ||
    asset.type === 'png' || asset.type === 'jpg'
  ) : false;

  const isPdf = asset ? ((asset.type && asset.type.toLowerCase().includes('pdf')) || ext === 'pdf') : false;
  const isDocx = asset ? ((asset.type && asset.type.toLowerCase().includes('word')) || ext === 'docx' || ext === 'doc') : false;
  const isText = asset ? ((asset.type && asset.type.toLowerCase().startsWith('text')) || ext === 'md' || ext === 'txt' || ext === 'json' || ext === 'log') : false;

  const getResolvedUrl = (): string => {
    if (!asset) return '';
    const rawUrl = asset.url || (asset as any).filepath || '';
    
    if (
      rawUrl.startsWith('http://') || 
      rawUrl.startsWith('https://') || 
      rawUrl.startsWith('asset:') || 
      rawUrl.startsWith('data:')
    ) {
      return rawUrl;
    }

    const cleanPath = rawUrl.split('?')[0];
    let absPath = cleanPath;
    if (vaultPath && !cleanPath.includes(':') && !cleanPath.startsWith('/') && !cleanPath.startsWith('\\')) {
      const cleanVault = vaultPath.replace(/[/\\]+$/, '');
      const cleanRel = cleanPath.replace(/^[/\\]+/, '');
      absPath = `${cleanVault}/${cleanRel}`;
    }

    return convertFileSrc(absPath);
  };

  const resolvedUrl = getResolvedUrl();

  const handleCloseWindow = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isPopOutWindow) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        await win.close();
      } catch (err) {
        try {
          window.close();
        } catch (_) {}
      }
    }
    onClose();
  };

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseWindow();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);



  const currentAssetIndex = asset ? allAssets.findIndex(a => a.id === asset.id) : -1;

  const handlePrevMediaAsset = (e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (currentAssetIndex > 0 && onSelectAsset) {
      onSelectAsset(allAssets[currentAssetIndex - 1]);
    }
  };

  const handleNextMediaAsset = (e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (currentAssetIndex >= 0 && currentAssetIndex < allAssets.length - 1 && onSelectAsset) {
      onSelectAsset(allAssets[currentAssetIndex + 1]);
    }
  };

  if (!visible || !asset) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: isPopOutWindow ? '40px' : 0,
      backgroundColor: 'rgba(10, 10, 15, 0.96)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2000,
      backdropFilter: 'blur(16px)',
      fontFamily: 'var(--font-family)',
      borderRadius: isPopOutWindow ? 12 : 0,
      boxShadow: isPopOutWindow ? '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px var(--border-subtle)' : 'none',
      overflow: 'hidden',
    }} onClick={onClose}>
      
      {/* Top Studio Pop-out Header Bar */}
      <div 
        style={{
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(16,16,24,0.96)',
          borderBottom: '1px solid var(--border-subtle)',
          color: 'white',
          zIndex: 2001
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Media Asset Info & Pagination Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {allAssets.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 6 }}>
              <button 
                className="toolbar__btn" 
                onClick={handlePrevMediaAsset} 
                disabled={currentAssetIndex <= 0}
                title="Previous Asset"
                style={{ width: 24, height: 24, minWidth: 24, opacity: currentAssetIndex > 0 ? 1 : 0.3 }}
              >
                <IconChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', minWidth: 60, textAlign: 'center' }}>
                {currentAssetIndex + 1} of {allAssets.length}
              </span>
              <button 
                className="toolbar__btn" 
                onClick={handleNextMediaAsset} 
                disabled={currentAssetIndex >= allAssets.length - 1}
                title="Next Asset"
                style={{ width: 24, height: 24, minWidth: 24, opacity: currentAssetIndex < allAssets.length - 1 ? 1 : 0.3 }}
              >
                <IconChevronRight size={14} />
              </button>
            </div>
          )}

          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              {asset.title}
              <span style={{ fontSize: '10px', background: 'var(--accent-primary)', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                {ext}
              </span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {asset.filename} • {asset.size}
            </span>
          </div>
        </div>

        {/* Action Controls for specific viewers */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {viewerControls}



          {/* Detail Panel Toggle (visible in standalone window) */}
          {showDetailToggle && onToggleDetail && (
            <button 
              className="toolbar__btn"
              onClick={(e) => { e.stopPropagation(); onToggleDetail(); }}
              title="Toggle Detail Editor Panel"
              style={{ width: 32, height: 32, minWidth: 32 }}
            >
              <IconInfo size={15} />
            </button>
          )}

          <button 
            className="toolbar__btn" 
            onClick={handleCloseWindow}
            style={{ width: 32, height: 32, minWidth: 32, background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%' }}
          >
            <IconClose size={16} />
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {isImage ? (
          <ImageViewer 
            asset={asset} 
            resolvedUrl={resolvedUrl} 
            onAssetsUpdated={onAssetsUpdated} 
            setViewerControls={setViewerControls}
          />
        ) : isPdf ? (
          <PdfViewer 
            asset={asset} 
            resolvedUrl={resolvedUrl} 
            onAssetsUpdated={onAssetsUpdated} 
            setViewerControls={setViewerControls}
          />
        ) : isDocx || isText ? (
          <TextViewer 
            asset={asset} 
            resolvedUrl={resolvedUrl} 
            isDocx={isDocx} 
            setViewerControls={setViewerControls}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            Unsupported media viewer file type: {asset.type}
          </div>
        )}
      </div>
    </div>
  );
};
