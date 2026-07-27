import React, { useEffect, useState, useRef } from 'react';
import { Asset } from './Gallery';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { useSettingsStore } from '../stores/useSettingsStore';
import {
  IconClose,
  IconMaximize,
  IconDownload,
  IconPencil,
  IconColumns,
  IconType,
  IconScissors,
  IconCamera,
  IconImage,
} from './Icons';

// Set up pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Chrome/Adobe Acrobat style PDF page thumbnail preview component
const PdfPageThumbnailCanvas: React.FC<{ pdfDoc: any; pageNum: number; isSelected: boolean; onClick: () => void }> = ({
  pdfDoc,
  pageNum,
  isSelected,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!pdfDoc || !canvasRef.current) return;

    pdfDoc.getPage(pageNum).then((page: any) => {
      if (!isMounted || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 0.2 });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        page.render({ canvasContext: ctx, viewport }).promise.then(() => {
          if (isMounted) setLoading(false);
        });
      }
    }).catch((err: any) => console.error("Failed rendering thumbnail page:", err));

    return () => { isMounted = false; };
  }, [pdfDoc, pageNum]);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: 6,
        background: isSelected ? 'rgba(124, 107, 240, 0.2)' : 'var(--bg-tertiary)',
        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ position: 'relative', width: '100%', minHeight: 120, background: '#fff', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: loading ? 'none' : 'block' }} />
        {loading && <span style={{ fontSize: '10px', color: '#888' }}>P.{pageNum}</span>}
      </div>
      <span style={{ fontSize: '11px', fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
        Page {pageNum}
      </span>
    </div>
  );
};

interface FileViewerModalProps {
  asset: Asset | null;
  allAssets?: Asset[];
  visible: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: Asset) => void;
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

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ 
  asset, 
  allAssets = [], 
  visible, 
  onClose, 
  onSelectAsset,
  onAssetsUpdated 
}) => {
  const { vaultPath } = useSettingsStore();

  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // Pop-out Window / Floating Studio Mode - DEFAULT TO TRUE
  const [isPopOutWindow, setIsPopOutWindow] = useState(true);

  // Auto spawn popout window when asset is opened
  useEffect(() => {
    if (visible && asset) {
      handleSpawnPopOutWindow();
    }
  }, [visible, asset?.id]);

  // Image editing studio
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

  // PDF Viewer state (Scale 1.0 = 100% view)
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfExtractedText, setPdfExtractedText] = useState<string | null>(null);
  const [showPdfSidebar, setShowPdfSidebar] = useState(true);

  // Canvas ref for PDF Book View
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  // PDF Crop Selection Tool state
  const [isCropToolActive, setIsCropToolActive] = useState(false);
  const [cropBox, setCropBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);

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

  // PDF Page Pre-rendering Cache & Instant Rendering
  const pageCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  // Pre-render page helper
  const getRenderedPageCanvas = async (doc: any, pageNum: number, scale: number): Promise<HTMLCanvasElement | null> => {
    if (!doc || pageNum < 1 || pageNum > doc.numPages) return null;
    const cacheKey = `${pageNum}_${scale}`;
    if (pageCacheRef.current.has(cacheKey)) {
      return pageCacheRef.current.get(cacheKey)!;
    }

    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = viewport.width;
      offscreenCanvas.height = viewport.height;
      const ctx = offscreenCanvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        pageCacheRef.current.set(cacheKey, offscreenCanvas);
        return offscreenCanvas;
      }
    } catch (e) {
      console.error(`Failed to pre-render PDF page ${pageNum}:`, e);
    }
    return null;
  };

  // Render active page instantly onto visible canvas
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    let isMounted = true;
    const drawPage = async () => {
      const cached = await getRenderedPageCanvas(pdfDoc, pdfPageNum, pdfScale);
      if (!isMounted || !pdfCanvasRef.current || !cached) return;

      const targetCanvas = pdfCanvasRef.current;
      targetCanvas.width = cached.width;
      targetCanvas.height = cached.height;
      const ctx = targetCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.drawImage(cached, 0, 0);
      }

      // Pre-render adjacent pages in background for instant flipping
      getRenderedPageCanvas(pdfDoc, pdfPageNum + 1, pdfScale);
      getRenderedPageCanvas(pdfDoc, pdfPageNum - 1, pdfScale);

      // Extract text
      const page = await pdfDoc.getPage(pdfPageNum);
      const textObj = await page.getTextContent();
      const text = textObj.items.map((item: any) => item.str).join(' ');
      if (isMounted) setPdfExtractedText(text);
    };

    drawPage();
    return () => { isMounted = false; };
  }, [pdfDoc, pdfPageNum, pdfScale]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') handlePageTurn(pdfPageNum + 1);
      else if (e.key === 'ArrowLeft') handlePageTurn(pdfPageNum - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, pdfPageNum, pdfTotalPages, onClose]);

  const handlePageTurn = (targetPage: number) => {
    if (targetPage < 1 || targetPage > pdfTotalPages || targetPage === pdfPageNum || isFlipping) return;
    
    const direction = targetPage > pdfPageNum ? 'next' : 'prev';
    setFlipDirection(direction);
    setIsFlipping(true);

    setTimeout(() => {
      setPdfPageNum(targetPage);
      setTimeout(() => {
        setIsFlipping(false);
        setFlipDirection(null);
      }, 150);
    }, 150);
  };

  const handleSpawnPopOutWindow = async () => {
    if (!asset) return;
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const label = `artgrid_viewer_${Date.now()}`;
      const popoutUrl = `${window.location.origin}${window.location.pathname}?previewAssetId=${asset.id}`;
      const webview = new WebviewWindow(label, {
        url: popoutUrl,
        title: `ArtGrid Media Viewer — ${asset.title}`,
        width: 1200,
        height: 850,
        decorations: true,
        resizable: true,
        shadow: true,
        focus: true,
        center: true,
      });
      webview.once('tauri://created', () => {
        onClose();
      });
    } catch (e) {
      console.warn("Tauri WebviewWindow popout fallback:", e);
      setIsPopOutWindow(true);
    }
  };

  // High-Fidelity Native PDF Embedded Image Extractor
  const handleExtractNativePdfImages = async () => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(pdfPageNum);
      const ops = await page.getOperatorList();
      let extractedCount = 0;

      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
          const imgName = ops.argsArray[i][0];
          let imgObj = null;
          try {
            if (page.objs.has(imgName)) imgObj = page.objs.get(imgName);
            else if (page.commonObjs.has(imgName)) imgObj = page.commonObjs.get(imgName);
          } catch (err) {
            console.warn("Could not retrieve PDF obj:", imgName, err);
          }

          if (imgObj && imgObj.width && imgObj.height) {
            const canvas = document.createElement('canvas');
            canvas.width = imgObj.width;
            canvas.height = imgObj.height;
            const ctx = canvas.getContext('2d');
            if (ctx && imgObj.data) {
              const imgData = ctx.createImageData(imgObj.width, imgObj.height);
              if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
                imgData.data.set(imgObj.data);
              } else if (imgObj.data.length === imgObj.width * imgObj.height * 3) {
                for (let p = 0, j = 0; p < imgObj.data.length; p += 3, j += 4) {
                  imgData.data[j] = imgObj.data[p];
                  imgData.data[j + 1] = imgObj.data[p + 1];
                  imgData.data[j + 2] = imgObj.data[p + 2];
                  imgData.data[j + 3] = 255;
                }
              }
              ctx.putImageData(imgData, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              await invoke('save_base64_image_asset', {
                title: `${asset?.title}_NativeImg_P${pdfPageNum}_${extractedCount + 1}`,
                base64Data: dataUrl,
              });
              extractedCount++;
            }
          }
        }
      }

      if (extractedCount > 0) {
        alert(`Extracted ${extractedCount} native high-fidelity image asset(s) at 100% original source resolution!`);
        if (onAssetsUpdated) onAssetsUpdated();
      } else {
        // Fallback: extract page at 300% ultra-high DPI crisp resolution
        const highDpiViewport = page.getViewport({ scale: 3.0 });
        const canvas = document.createElement('canvas');
        canvas.width = highDpiViewport.width;
        canvas.height = highDpiViewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport: highDpiViewport }).promise;
          const dataUrl = canvas.toDataURL('image/png');
          await invoke('save_base64_image_asset', {
            title: `${asset?.title}_HiRes_P${pdfPageNum}`,
            base64Data: dataUrl,
          });
          alert(`Extracted High-Fidelity 300% HD Page Image to library!`);
          if (onAssetsUpdated) onAssetsUpdated();
        }
      }
    } catch (err) {
      console.error("Failed to extract native PDF image:", err);
      alert("Failed to extract native image asset.");
    }
  };

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
        await invoke('save_base64_image_asset', {
          title: `Edited_${asset.title}`,
          base64Data: dataUrl,
        });
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
      await invoke('save_base64_image_asset', {
        title: `${asset.title} - Page ${pdfPageNum}`,
        base64Data: dataUrl,
      });
      alert(`PDF Page ${pdfPageNum} snapshot saved as a new asset in your library!`);
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error("Failed to snapshot PDF page:", err);
    }
  };

  // Save Extracted Text to Library as a Text Asset
  const handleSaveExtractedTextAsAsset = async () => {
    if (!pdfExtractedText) return;
    try {
      await invoke('save_text_asset', {
        title: `Text_${asset.title}_Page_${pdfPageNum}`,
        textContent: pdfExtractedText,
      });
      alert(`Extracted text from Page ${pdfPageNum} saved as a new text asset in library!`);
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error("Failed to save extracted text asset:", err);
    }
  };

  // Asset Pagination
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

  // PDF Crop Selection Tool Handlers
  const handlePdfCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropToolActive) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawingCrop(true);
    setCropBox({ startX: x, startY: y, endX: x, endY: y });
  };

  const handlePdfCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropToolActive || !isDrawingCrop || !cropBox) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const endY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setCropBox(prev => prev ? { ...prev, endX, endY } : null);
  };

  const handlePdfCanvasMouseUp = (e: React.MouseEvent) => {
    if (!isCropToolActive) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDrawingCrop(false);
  };

  const handleExtractCroppedPdfRegion = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!pdfCanvasRef.current || !cropBox) return;

    const sourceCanvas = pdfCanvasRef.current;
    const rect = sourceCanvas.getBoundingClientRect();
    const scaleX = sourceCanvas.width / rect.width;
    const scaleY = sourceCanvas.height / rect.height;

    const x = Math.min(cropBox.startX, cropBox.endX) * scaleX;
    const y = Math.min(cropBox.startY, cropBox.endY) * scaleY;
    const w = Math.abs(cropBox.endX - cropBox.startX) * scaleX;
    const h = Math.abs(cropBox.endY - cropBox.startY) * scaleY;

    if (w < 10 || h < 10) {
      alert("Please drag a larger selection box over the region you want to extract.");
      return;
    }

    const destCanvas = document.createElement('canvas');
    destCanvas.width = w;
    destCanvas.height = h;
    const ctx = destCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);
    const dataUrl = destCanvas.toDataURL('image/png');

    try {
      await invoke('save_base64_image_asset', {
        title: `Crop_${asset.title}_P${pdfPageNum}`,
        base64Data: dataUrl,
      });
      alert("Cropped PDF section extracted & imported into library as a new asset!");
      setCropBox(null);
      setIsCropToolActive(false);
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error("Failed to extract cropped PDF region:", err);
    }
  };

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
                ◀
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
                ▶
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

        {/* Action Controls for Images & PDFs */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isImage && (
            <>
              <button 
                className={`btn ${showEditStudio ? 'btn--primary' : 'btn--secondary'}`} 
                onClick={(e) => { e.stopPropagation(); setShowEditStudio(!showEditStudio); }}
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
            </>
          )}

          {isPdf && (
            <>
              <button
                className={`toolbar__btn ${showPdfSidebar ? 'toolbar__btn--active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setShowPdfSidebar(!showPdfSidebar); }}
                title="Toggle Page Thumbnail Sidebar"
              >
                <IconColumns size={15} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 6 }}>
                <button 
                  className="toolbar__btn" 
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); handlePageTurn(pdfPageNum - 1); }}
                  disabled={pdfPageNum <= 1}
                  title="Previous Page"
                >
                  ◀
                </button>
                <span style={{ fontSize: '12px', minWidth: 60, textAlign: 'center' }}>Page {pdfPageNum} / {pdfTotalPages}</span>
                <button 
                  className="toolbar__btn" 
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); handlePageTurn(pdfPageNum + 1); }}
                  disabled={pdfPageNum >= pdfTotalPages}
                  title="Next Page"
                >
                  ▶
                </button>
              </div>

              <button className="toolbar__btn" title="Zoom Out" onClick={(e) => { e.stopPropagation(); setPdfScale(s => Math.max(0.5, s - 0.2)); }}>-</button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{Math.round(pdfScale * 100)}%</span>
              <button className="toolbar__btn" title="Zoom In" onClick={(e) => { e.stopPropagation(); setPdfScale(s => Math.min(3.0, s + 0.2)); }}>+</button>

              <button 
                className={`btn ${isCropToolActive ? 'btn--primary' : 'btn--secondary'}`} 
                onClick={(e) => { e.stopPropagation(); setIsCropToolActive(!isCropToolActive); setCropBox(null); }}
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}
                title="Select a region on page to extract as asset"
              >
                <IconScissors size={14} /> Crop Region
              </button>
              
              <button 
                className="btn btn--secondary" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveExtractedTextAsAsset();
                }}
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}
                title="Save extracted page text to library as markdown asset"
              >
                <IconType size={14} /> Extract Text
              </button>

              <button 
                className="btn btn--secondary" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleExtractNativePdfImages();
                }}
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}
                title="Extract native embedded images at original source resolution"
              >
                <IconImage size={14} /> Extract Image
              </button>

              <button 
                className="btn btn--primary" 
                onClick={(e) => { e.stopPropagation(); handleSnapshotPdfPage(); }}
                style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <IconCamera size={14} /> Snapshot Page
              </button>
            </>
          )}

          {/* Pop-out Window Mode Toggle */}
          <button 
            className="toolbar__btn"
            onClick={(e) => { e.stopPropagation(); handleSpawnPopOutWindow(); }}
            title="Pop-out into Standalone Window"
          >
            <IconMaximize size={15} />
          </button>

          <button 
            className="toolbar__btn" 
            onClick={onClose}
            style={{ width: 32, height: 32, minWidth: 32, background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%' }}
          >
            <IconClose size={16} />
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        
        {/* PDF Image Preview Thumbnail Sidebar */}
        {isPdf && showPdfSidebar && (
          <div style={{
            width: 170,
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-subtle)',
            padding: 12,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pages ({pdfTotalPages})
            </div>
            {Array.from({ length: pdfTotalPages }, (_, i) => i + 1).map(pNum => (
              <PdfPageThumbnailCanvas
                key={pNum}
                pdfDoc={pdfDoc}
                pageNum={pNum}
                isSelected={pdfPageNum === pNum}
                onClick={() => handlePageTurn(pNum)}
              />
            ))}
          </div>
        )}

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
            /* Fast 1-Page PDF Flipbook Container with 3D Page Turn Animation */
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'relative', perspective: 1400 }}>
              {/* Previous Page Arrow Overlay */}
              <button
                onClick={() => handlePageTurn(pdfPageNum - 1)}
                disabled={pdfPageNum <= 1 || isFlipping}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  color: 'white',
                  border: 'none',
                  fontSize: '22px',
                  cursor: pdfPageNum > 1 ? 'pointer' : 'default',
                  opacity: pdfPageNum > 1 ? 0.9 : 0.2,
                  zIndex: 10,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
                title="Previous Page (Left Arrow)"
              >
                ◀
              </button>

              {/* Book Paper Sheet with 3D Flip */}
              <div 
                style={{ 
                  position: 'relative', 
                  boxShadow: isFlipping ? '0 40px 90px rgba(0,0,0,0.95)' : '0 25px 70px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.4)', 
                  background: '#ffffff', 
                  borderRadius: 8,
                  padding: 12,
                  border: '1px solid #c0c0c0',
                  cursor: isCropToolActive ? 'crosshair' : 'default',
                  transformOrigin: flipDirection === 'next' ? 'left center' : 'right center',
                  transform: isFlipping 
                    ? (flipDirection === 'next' ? 'rotateY(-180deg) scale(0.92)' : 'rotateY(180deg) scale(0.92)') 
                    : 'rotateY(0deg) scale(1)',
                  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease',
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                }}
                onMouseDown={handlePdfCanvasMouseDown}
                onMouseMove={handlePdfCanvasMouseMove}
                onMouseUp={handlePdfCanvasMouseUp}
              >
                <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginBottom: 4, fontWeight: 500 }}>
                  Page {pdfPageNum} of {pdfTotalPages}
                </div>
                <canvas ref={pdfCanvasRef} style={{ display: 'block', borderRadius: 4 }} />

                {/* PDF Crop Selection Marquee Box */}
                {isCropToolActive && cropBox && (
                  <div 
                    style={{
                      position: 'absolute',
                      left: Math.min(cropBox.startX, cropBox.endX) + 12,
                      top: Math.min(cropBox.startY, cropBox.endY) + 12,
                      width: Math.abs(cropBox.endX - cropBox.startX),
                      height: Math.abs(cropBox.endY - cropBox.startY),
                      border: '2px dashed var(--accent-primary)',
                      background: 'rgba(124, 107, 240, 0.25)',
                      pointerEvents: 'none'
                    }}
                  />
                )}
              </div>

              {/* Next Page Arrow Overlay */}
              <button
                onClick={() => handlePageTurn(pdfPageNum + 1)}
                disabled={pdfPageNum >= pdfTotalPages || isFlipping}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  color: 'white',
                  border: 'none',
                  fontSize: '22px',
                  cursor: pdfPageNum < pdfTotalPages ? 'pointer' : 'default',
                  opacity: pdfPageNum < pdfTotalPages ? 0.9 : 0.2,
                  zIndex: 10,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
                title="Next Page (Right Arrow)"
              >
                ▶
              </button>

              {/* Extract Crop Region Action Button */}
              {isCropToolActive && cropBox && Math.abs(cropBox.endX - cropBox.startX) > 10 && (
                <button 
                  className="btn btn--primary" 
                  onClick={handleExtractCroppedPdfRegion}
                  style={{ position: 'absolute', bottom: -50, left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', fontSize: '13px', zIndex: 100, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <IconScissors size={14} /> Extract Cropped Selection as Asset
                </button>
              )}
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
