import React, { useState, useEffect } from 'react';
import { removeBackground } from '@imgly/background-removal';
import Upscaler from 'upscaler';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { IconPencil, IconDownload } from '../Icons';
import { Asset } from '../Gallery';
import { ViewerProps } from './ViewerTypes';
import { AIToolbar } from './AIToolbar';

export const ImageViewer: React.FC<ViewerProps> = ({ asset, resolvedUrl, onAssetsUpdated, setViewerControls, sourceNodeId, onAssetCreatedFromStudio }) => {
  const [showEditStudio, setShowEditStudio] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [hueRotate, setHueRotate] = useState(0);
  const [blur, setBlur] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { enableAiModels } = useSettingsStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState('');

  const resetImageAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHueRotate(0);
    setBlur(0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    resetImageAdjustments();
    setShowEditStudio(false);
    setPreviewUrl(null);
  }, [asset, resolvedUrl]);

  // Clean up Object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const imageFilterCss = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg) blur(${blur}px)`;
  const imageTransformCss = `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  const handleSaveEditedImageAsAsset = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = previewUrl || resolvedUrl;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.filter = imageFilterCss;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2);

      const dataUrl = canvas.toDataURL('image/png');
      try {
        const newAsset = await invoke<Asset>('save_base64_image_asset', {
          title: `Edited_${asset.title}`,
          base64Data: dataUrl,
        });
        alert('Edited image saved as a new asset in your library!');
        if (onAssetsUpdated) onAssetsUpdated();
        if (sourceNodeId && onAssetCreatedFromStudio) {
          onAssetCreatedFromStudio(newAsset, sourceNodeId);
        }
      } catch (err) {
        console.error("Failed to save edited image asset:", err);
      }
    };
  };

  const handleRemoveBackground = async () => {
    setIsProcessingAI(true);
    setAiStatus('Downloading AI models & processing...');
    console.log(`[AI Studio] Starting Background Removal for: ${asset.title}`);
    try {
      let imageBlob: Blob;
      
      // Attempt Rust-native accelerated removal first (Step 5 of Architecture Plan)
      try {
        console.log(`[AI Studio] Attempting Rust native background removal...`);
        const rustMaskBytes = await invoke<number[]>('remove_background', { imagePath: asset.filepath });
        imageBlob = new Blob([new Uint8Array(rustMaskBytes)], { type: 'image/png' });
        console.log(`[AI Studio] Rust native removal successful.`);
      } catch (rustErr) {
        console.warn(`[AI Studio] Rust native removal unavailable, falling back to JS @imgly implementation:`, rustErr);
        // Fallback to JS implementation
        imageBlob = await removeBackground(previewUrl || resolvedUrl, {
          progress: (key, current, total) => {
            const pct = Math.round((current/total)*100);
            setAiStatus(`Removing background: ${key} ${pct}%`);
            console.log(`[AI Studio] BG Removal Progress [${key}]: ${pct}%`);
          }
        });
      }
      
      setAiStatus('Saving to Vault...');
      console.log(`[AI Studio] Background removal complete. Saving to vault...`);
      
      const blobToBase64 = (blob: Blob): Promise<string> => new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
      const base64data = await blobToBase64(imageBlob);
      
      const newAsset = await invoke<Asset>('save_base64_image_asset', {
        title: `NoBG_${asset.title}`,
        base64Data: base64data,
      });
      
      if (onAssetsUpdated) onAssetsUpdated();
      if (sourceNodeId && onAssetCreatedFromStudio) {
        onAssetCreatedFromStudio(newAsset, sourceNodeId);
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Background Removal', { body: 'Image successfully saved to Vault.' });
      } else {
        alert('AI Background Removal complete! The new image was saved to your library.');
      }
      
      const objectUrl = URL.createObjectURL(imageBlob);
      setPreviewUrl(objectUrl);
      resetImageAdjustments();
    } catch (e) {
      console.error("[AI Studio] Background removal failed:", e);
      alert('Background removal failed.');
    } finally {
      setIsProcessingAI(false);
      setAiStatus('');
    }
  };

  const handleUpscale = async () => {
    setIsProcessingAI(true);
    setAiStatus('Downloading ESRGAN model & upscaling...');
    console.log(`[AI Studio] Starting Upscale for: ${asset.title}`);
    try {
      const upscaler = new Upscaler();
      const dataUrl = await upscaler.upscale(previewUrl || resolvedUrl, {
        patchSize: 64,
        padding: 2,
        progress: (amount) => {
          const pct = Math.round(amount * 100);
          setAiStatus(`Upscaling: ${pct}%`);
          console.log(`[AI Studio] Upscale Progress: ${pct}%`);
        }
      });
      
      setAiStatus('Saving to Vault...');
      console.log(`[AI Studio] Upscale complete. Saving to vault...`);
      
      const newAsset = await invoke<Asset>('save_base64_image_asset', {
        title: `Upscaled_${asset.title}`,
        base64Data: dataUrl,
      });
      
      if (onAssetsUpdated) onAssetsUpdated();
      if (sourceNodeId && onAssetCreatedFromStudio) {
        onAssetCreatedFromStudio(newAsset, sourceNodeId);
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Upscale', { body: 'Upscaled image successfully saved to Vault.' });
      } else {
        alert('AI Upscale complete! The new image was saved to your library.');
      }
      
      setPreviewUrl(dataUrl);
      resetImageAdjustments();
    } catch(e) {
      console.error("[AI Studio] Upscaling failed:", e);
      alert('Upscaling failed. Image might be too large for browser memory.');
    } finally {
      setIsProcessingAI(false);
      setAiStatus('');
    }
  };

  // Provide toolbar controls to parent via setViewerControls
  useEffect(() => {
    if (setViewerControls) {
      setViewerControls(
        <>
          <button 
            className={`btn ${showEditStudio ? 'btn--primary' : 'btn--secondary'}`} 
            onClick={(e) => { e.stopPropagation(); setShowEditStudio(s => !s); }}
            style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <IconPencil size={14} /> Studio Tools
          </button>
          <button 
            className="btn btn--primary"
            onClick={(e) => { e.stopPropagation(); handleSaveEditedImageAsAsset(); }}
            style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <IconDownload size={14} /> Save Copy to Library
          </button>
          <AIToolbar asset={asset} resolvedUrl={resolvedUrl} onAssetsUpdated={onAssetsUpdated} />
        </>
      );
    }
  }, [showEditStudio, brightness, contrast, saturation, hueRotate, blur, rotation, flipH, flipV, resolvedUrl, asset, setViewerControls, onAssetsUpdated]);

  return (
    <>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'auto', position: 'relative' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {isProcessingAI && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px 0' }}>AI Processing...</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{aiStatus}</p>
            </div>
          )}

          {imageLoading && !imageError && (
            <div style={{ color: 'white', fontSize: '0.9rem', opacity: 0.8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
              <span>Loading media preview...</span>
            </div>
          )}

          {imageError ? (
            <div style={{ padding: '30px 40px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'white', maxWidth: 500 }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#f06b8e', fontSize: '1.1rem' }}>Unable to Render Image</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px 0', wordBreak: 'break-all' }}>
                <strong>File:</strong> {asset.filename}<br />
                <strong>Resolved Path:</strong> {resolvedUrl}
              </p>
              <button 
                className="btn btn--primary" 
                onClick={() => { setImageError(false); setImageLoading(true); }}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                🔄 Retry Loading
              </button>
            </div>
          ) : (
            <img 
              src={previewUrl || resolvedUrl} 
              alt={asset.title} 
              onLoad={() => setImageLoading(false)}
              onError={(err) => {
                console.error("Failed to load image preview:", resolvedUrl, err);
                setImageLoading(false);
                setImageError(true);
              }}
              style={{ 
                maxWidth: '90%', 
                maxHeight: '90%', 
                objectFit: 'contain',
                filter: imageFilterCss,
                transform: imageTransformCss,
                transition: 'filter 0.1s ease, transform 0.1s ease',
                boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
                display: imageLoading ? 'none' : 'block'
              }}
            />
          )}
        </div>
      </div>

      {showEditStudio && (
        <div style={{ width: 280, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-subtle)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Image Studio Controls</h4>
            <button className="btn btn--secondary" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={resetImageAdjustments}>Reset</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <h5 style={{ margin: 0, fontSize: '11px', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>✨ Background Removal & Upscaling</h5>
            {enableAiModels ? (
              <>
                <button className="btn btn--secondary" style={{ fontSize: '12px' }} onClick={handleRemoveBackground} disabled={isProcessingAI}>
                  {isProcessingAI ? 'Processing...' : '✂️ Remove Background'}
                </button>
                <button className="btn btn--secondary" style={{ fontSize: '12px' }} onClick={handleUpscale} disabled={isProcessingAI}>
                  {isProcessingAI ? 'Processing...' : '🔎 Upscale (2x ESRGAN)'}
                </button>
              </>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-base)', padding: 8, borderRadius: 4, textAlign: 'center' }}>
                AI models are disabled. You can enable them in Settings.
              </div>
            )}
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '11px', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Brightness</span><span>{brightness}%</span>
            </div>
            <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Contrast</span><span>{contrast}%</span>
            </div>
            <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Saturation</span><span>{saturation}%</span>
            </div>
            <input type="range" min="0" max="200" value={saturation} onChange={e => setSaturation(Number(e.target.value))} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Hue Rotate</span><span>{hueRotate}°</span>
            </div>
            <input type="range" min="0" max="360" value={hueRotate} onChange={e => setHueRotate(Number(e.target.value))} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Blur</span><span>{blur}px</span>
            </div>
            <input type="range" min="0" max="10" value={blur} onChange={e => setBlur(Number(e.target.value))} />
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn--secondary" style={{ flex: 1, padding: 6, fontSize: '11px' }} onClick={() => setRotation(r => (r + 90) % 360)}>↻ Rotate 90°</button>
            <button className="btn btn--secondary" style={{ padding: 6, fontSize: '11px' }} onClick={() => setFlipH(!flipH)}>↔ Flip H</button>
            <button className="btn btn--secondary" style={{ padding: 6, fontSize: '11px' }} onClick={() => setFlipV(!flipV)}>↕ Flip V</button>
          </div>
        </div>
      )}
    </>
  );
};
