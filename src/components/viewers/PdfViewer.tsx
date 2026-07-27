import React, { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as pdfjsLib from 'pdfjs-dist';
import { IconColumns, IconType, IconScissors, IconImage, IconCamera, IconSearch } from '../Icons';
import { ViewerProps } from './ViewerTypes';
import { AIToolbar } from './AIToolbar';

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

const ScrollPageCanvas: React.FC<{ pdfDoc: any; pageNum: number; scale: number; onVisible?: (pageNum: number) => void }> = ({
  pdfDoc,
  pageNum,
  scale,
  onVisible
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        if (onVisible) onVisible(pageNum);
      }
    }, { rootMargin: '400px' });
    
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pageNum, onVisible]);

  useEffect(() => {
    let isMounted = true;
    if (!isVisible || !pdfDoc || !canvasRef.current) return;

    pdfDoc.getPage(pageNum).then((page: any) => {
      if (!isMounted || !canvasRef.current) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        page.render({ canvasContext: ctx, viewport });
      }
    });

    return () => { isMounted = false; };
  }, [isVisible, pdfDoc, pageNum, scale]);

  return (
    <div ref={containerRef} style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginBottom: 6, fontWeight: 500 }}>
        Page {pageNum}
      </div>
      <div style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.4)', background: '#ffffff', borderRadius: 6, padding: 8, border: '1px solid #c0c0c0' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
    </div>
  );
};

export const PdfViewer: React.FC<ViewerProps> = ({ asset, resolvedUrl, onAssetsUpdated, setViewerControls }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfExtractedText, setPdfExtractedText] = useState<string | null>(null);
  const [showPdfSidebar, setShowPdfSidebar] = useState(true);
  
  const [viewMode, setViewMode] = useState<'flipbook' | 'scroll'>('flipbook');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{page: number, text: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Canvas ref for PDF Book View
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // PDF Crop Selection Tool state
  const [isCropToolActive, setIsCropToolActive] = useState(false);
  const [cropBox, setCropBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);

  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (!resolvedUrl) return;
    pdfjsLib.getDocument(resolvedUrl).promise.then(pdf => {
      setPdfDoc(pdf);
      setPdfTotalPages(pdf.numPages);
      setPdfPageNum(1);
    }).catch(err => console.error("Failed to load PDF", err));
  }, [resolvedUrl]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handlePageTurn(pdfPageNum + 1);
      else if (e.key === 'ArrowLeft') handlePageTurn(pdfPageNum - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfPageNum, pdfTotalPages, isFlipping]);

  // High-Fidelity Native PDF Embedded Image Extractor
  const handleExtractNativePdfImages = useCallback(async () => {
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
  }, [pdfDoc, pdfPageNum, asset?.title, onAssetsUpdated]);

  const handleSnapshotPdfPage = useCallback(async () => {
    if (!pdfCanvasRef.current) return;
    const dataUrl = pdfCanvasRef.current.toDataURL('image/png');
    try {
      await invoke('save_base64_image_asset', {
        title: `${asset?.title} - Page ${pdfPageNum}`,
        base64Data: dataUrl,
      });
      alert(`PDF Page ${pdfPageNum} snapshot saved as a new asset in your library!`);
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error("Failed to snapshot PDF page:", err);
    }
  }, [pdfPageNum, asset?.title, onAssetsUpdated]);

  const handleSaveExtractedTextAsAsset = useCallback(async () => {
    if (!pdfExtractedText) return;
    try {
      await invoke('save_text_asset', {
        title: `Text_${asset?.title}_Page_${pdfPageNum}`,
        textContent: pdfExtractedText,
      });
      alert(`Extracted text from Page ${pdfPageNum} saved as a new text asset in library!`);
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error("Failed to save extracted text asset:", err);
    }
  }, [pdfExtractedText, pdfPageNum, asset?.title, onAssetsUpdated]);

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

  // Provide toolbar controls to parent via setViewerControls
  useEffect(() => {
    if (setViewerControls) {
      setViewerControls(
        <>
          <button
            className={`toolbar__btn ${showPdfSidebar ? 'toolbar__btn--active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowPdfSidebar(s => !s); }}
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
          <AIToolbar asset={asset} resolvedUrl={resolvedUrl} onAssetsUpdated={onAssetsUpdated} />
        </>
      );
    }
  }, [
    showPdfSidebar, pdfPageNum, pdfTotalPages, pdfScale, isCropToolActive, 
    handleSaveExtractedTextAsAsset, handleExtractNativePdfImages, handleSnapshotPdfPage, setViewerControls
  ]);


  return (
    <>
      {/* PDF Image Preview Thumbnail Sidebar */}
      {showPdfSidebar && (
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
        {/* Fast 1-Page PDF Flipbook Container with 3D Page Turn Animation */}
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
      </div>
    </>
  );
};
