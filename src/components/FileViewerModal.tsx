import React, { useEffect, useState, useRef } from 'react';
import { Asset } from './Gallery';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { useSettingsStore } from '../stores/useSettingsStore';

// Set up pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FileViewerModalProps {
  asset: Asset | null;
  visible: boolean;
  onClose: () => void;
  onAssetsUpdated?: () => void;
}

const renderFormattedMarkdown = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, index) => {
    if (line.startsWith('# ')) return <h1 key={index} style={{ color: 'var(--accent-primary)', fontSize: '1.8rem', margin: '16px 0 8px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4 }}>{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={index} style={{ color: 'var(--text-primary)', fontSize: '1.4rem', margin: '14px 0 6px 0' }}>{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={index} style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: '12px 0 4px 0' }}>{line.slice(4)}</h3>;
    if (line.startsWith('- ') || line.startsWith('* ')) return <li key={index} style={{ marginLeft: 20, marginBottom: 4 }}>{line.slice(2)}</li>;
    if (line.startsWith('> ')) return <blockquote key={index} style={{ borderLeft: '3px solid var(--accent-primary)', margin: '8px 0', paddingLeft: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{line.slice(2)}</blockquote>;
    if (line.startsWith('```')) return <div key={index} style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.85rem' }}>{line}</div>;
    if (!line.trim()) return <div key={index} style={{ height: 12 }} />;
    return <p key={index} style={{ margin: '4px 0', lineHeight: 1.6 }}>{line}</p>;
  });
};

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ asset, visible, onClose, onAssetsUpdated }) => {
  const { vaultPath } = useSettingsStore();

  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // Image editing tools & loading state
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

  // PDF Viewer state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [pdfExtractedText, setPdfExtractedText] = useState<string | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

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
    let rawUrl = asset.url || (asset as any).filepath || '';
    
    // Web URL
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      if (!rawUrl.includes('localhost')) return rawUrl;
    }

    // Strip cache busting parameter if present for path calculations
    const cleanPath = rawUrl.split('?')[0];

    // Check if relative path (e.g. "artgrid/media/xxx.jpg")
    let absPath = cleanPath;
    if (vaultPath && !cleanPath.includes(':') && !cleanPath.startsWith('/') && !cleanPath.startsWith('\\')) {
      const cleanVault = vaultPath.replace(/[/\\]+$/, '');
      const cleanRel = cleanPath.replace(/^[/\\]+/, '');
      absPath = `${cleanVault}/${cleanRel}`;
    }

    if (absPath.includes(':') || absPath.startsWith('/') || absPath.startsWith('\\')) {
      return convertFileSrc(absPath) + `?t=${Date.now()}`;
    }

    return rawUrl.startsWith('asset:') || rawUrl.startsWith('http')
      ? rawUrl
      : convertFileSrc(rawUrl);
  };

  const resolvedUrl = getResolvedUrl();

  useEffect(() => {
    setImageLoading(true);
    setImageError(false);

    if (!visible || !asset) {
      setTextContent(null);
      setDocxHtml(null);
      setPdfDoc(null);
      setShowEditStudio(false);
      resetImageAdjustments();
      return;
    }

    if (isText && resolvedUrl) {
      fetch(resolvedUrl)
        .then(res => res.text())
        .then(text => setTextContent(text))
        .catch(err => console.error("Failed to fetch text content", err));
    } else if (isDocx && resolvedUrl) {
      fetch(resolvedUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => mammoth.convertToHtml({ arrayBuffer: buffer }))
        .then(result => setDocxHtml(result.value))
        .catch(err => console.error("Failed to parse DOCX document", err));
    } else if (isPdf && resolvedUrl) {
      pdfjsLib.getDocument(resolvedUrl).promise.then(pdf => {
        setPdfDoc(pdf);
        setPdfTotalPages(pdf.numPages);
        setPdfPageNum(1);
      }).catch(err => console.error("Failed to load PDF", err));
    }
  }, [visible, asset]);

  // Render PDF page onto canvas
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    pdfDoc.getPage(pdfPageNum).then((page: any) => {
      const viewport = page.getViewport({ scale: pdfScale });
      const canvas = pdfCanvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      page.render(renderContext);

      // Extract page text for quick inspection
      page.getTextContent().then((textContentObj: any) => {
        const text = textContentObj.items.map((item: any) => item.str).join(' ');
        setPdfExtractedText(text);
      });
    });
  }, [pdfDoc, pdfPageNum, pdfScale]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

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

  if (!visible || !asset) return null;

  const imageFilterCss = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg) blur(${blur}px)`;
  const imageTransformCss = `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  // Save edited image as a new asset in library
  const handleSaveEditedImageAsAsset = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = resolvedUrl;
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
        await invoke('import_from_url', { url: dataUrl });
        alert('Edited image saved as a new asset in your library!');
        if (onAssetsUpdated) onAssetsUpdated();
      } catch (err) {
        console.error("Failed to save edited image asset:", err);
      }
    };
  };

  // PDF Page Snapshot Extractor -> Save to library as editable image asset
  const handleSnapshotPdfPage = async () => {
    if (!pdfCanvasRef.current) return;
    const dataUrl = pdfCanvasRef.current.toDataURL('image/png');
    try {
      await invoke('import_from_url', { url: dataUrl });
      alert(`PDF Page ${pdfPageNum} snapshot saved as a new editable asset in your library!`);
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error("Failed to snapshot PDF page:", err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2000,
      backdropFilter: 'blur(12px)',
      fontFamily: 'var(--font-family)'
    }} onClick={onClose}>
      
      {/* Top Studio Bar */}
      <div 
        style={{
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(16,16,24,0.95)',
          borderBottom: '1px solid var(--border-subtle)',
          color: 'white',
          zIndex: 2001
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{asset.title}</h3>
          <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-muted)' }}>
            {asset.filename} • {asset.size}
          </span>
        </div>

        {/* Action Controls for Images & PDFs */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isImage && (
            <>
              <button 
                className={`btn ${showEditStudio ? 'btn--primary' : 'btn--secondary'}`} 
                onClick={() => setShowEditStudio(!showEditStudio)}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                🎨 Image Studio Tools
              </button>
              <button 
                className="btn btn--primary"
                onClick={handleSaveEditedImageAsAsset}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                💾 Save Copy to Library
              </button>
            </>
          )}

          {isPdf && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 6 }}>
                <button className="toolbar__btn" onClick={() => setPdfPageNum(p => Math.max(1, p - 1))}>◀</button>
                <span style={{ fontSize: '12px', minWidth: 60, textAlign: 'center' }}>Page {pdfPageNum} / {pdfTotalPages}</span>
                <button className="toolbar__btn" onClick={() => setPdfPageNum(p => Math.min(pdfTotalPages, p + 1))}>▶</button>
              </div>
              <button className="toolbar__btn" title="Zoom Out" onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))}>-</button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{Math.round(pdfScale * 100)}%</span>
              <button className="toolbar__btn" title="Zoom In" onClick={() => setPdfScale(s => Math.min(3.0, s + 0.2))}>+</button>
              
              <button 
                className="btn btn--secondary" 
                onClick={() => {
                  if (pdfExtractedText) {
                    navigator.clipboard.writeText(pdfExtractedText);
                    alert('Page text copied to clipboard!');
                  }
                }}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                title="Copy text content of current page"
              >
                📝 Copy Page Text
              </button>

              <button 
                className="btn btn--primary" 
                onClick={handleSnapshotPdfPage}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                📷 Snapshot Page to Asset
              </button>
            </>
          )}

          <button 
            className="toolbar__btn" 
            onClick={onClose}
            style={{ width: 32, height: 32, minWidth: 32, background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        
        {/* Content Preview Area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'auto', position: 'relative' }}>
          {isImage ? (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  src={resolvedUrl} 
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
          ) : isPdf ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto', maxHeight: '100%' }}>
              <canvas ref={pdfCanvasRef} style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.8)', background: 'white', borderRadius: 4 }} />
            </div>
          ) : isDocx ? (
            <div 
              style={{ width: '100%', maxWidth: 850, height: '100%', background: 'var(--bg-base)', color: 'var(--text-primary)', borderRadius: 8, padding: 40, overflowY: 'auto', border: '1px solid var(--border-subtle)' }}
              dangerouslySetInnerHTML={{ __html: docxHtml || 'Loading DOCX document...' }}
            />
          ) : isText ? (
            <div style={{ width: '100%', maxWidth: 850, height: '100%', background: 'var(--bg-base)', color: 'var(--text-primary)', borderRadius: 8, padding: 40, overflowY: 'auto', border: '1px solid var(--border-subtle)' }}>
              {textContent ? renderFormattedMarkdown(textContent) : 'Loading document content...'}
            </div>
          ) : (
            <div style={{ color: 'white' }}>Unsupported media viewer file type: {asset.type}</div>
          )}
        </div>

        {/* Side Image Studio Editing Controls Drawer */}
        {isImage && showEditStudio && (
          <div style={{ width: 280, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-subtle)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Image Studio Controls</h4>
              <button className="btn btn--secondary" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={resetImageAdjustments}>Reset</button>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '11px' }}>
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
      </div>
    </div>
  );
};
