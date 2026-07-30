import React, { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as pdfjsLib from 'pdfjs-dist';
import {
  IconColumns, IconScissors, IconImage, IconCamera, IconSearch,
  IconBookOpen, IconScrollText, IconChevronLeft, IconChevronRight,
  IconZoomIn, IconZoomOut, IconScanText, IconFileText,
} from '../Icons';
import { ViewerProps } from './ViewerTypes';
import { AIToolbar } from './AIToolbar';
import { Virtuoso } from 'react-virtuoso';

// Set up pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ─── Thumbnail Sidebar Page Preview ───────────────────────────────────────────
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

// ─── Scroll-Mode Lazy Page Canvas ─────────────────────────────────────────────
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
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 6, fontWeight: 500 }}>
        Page {pageNum}
      </div>
      <div style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.4)', background: '#ffffff', borderRadius: 6, padding: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
    </div>
  );
};

// ─── Single Flipbook Page Canvas ──────────────────────────────────────────────
const FlipbookPageCanvas: React.FC<{
  pdfDoc: any;
  pageNum: number;
  fitScale: number;
  userZoom: number;
  side: 'left' | 'right' | 'solo';
  isCropToolActive?: boolean;
  cropBox?: { startX: number; startY: number; endX: number; endY: number } | null;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}> = ({
  pdfDoc,
  pageNum,
  fitScale,
  userZoom,
  side,
  isCropToolActive,
  cropBox,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  canvasRef: externalCanvasRef,
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = externalCanvasRef || internalCanvasRef;

  useEffect(() => {
    let isMounted = true;
    if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages || !activeCanvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!isMounted || !activeCanvasRef.current) return;
        const scale = fitScale * userZoom;
        const viewport = page.getViewport({ scale });
        const canvas = activeCanvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (err) {
        console.error(`Failed to render page ${pageNum}:`, err);
      }
    };

    renderPage();
    return () => { isMounted = false; };
  }, [pdfDoc, pageNum, fitScale, userZoom]);

  const borderRadius = side === 'left'
    ? '8px 0 0 8px'
    : side === 'right'
      ? '0 8px 8px 0'
      : '8px';

  return (
    <div
      style={{
        position: 'relative',
        background: '#ffffff',
        borderRadius,
        overflow: 'hidden',
        cursor: isCropToolActive ? 'crosshair' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <canvas ref={activeCanvasRef} style={{ display: 'block', borderRadius }} />

      {/* Crop Marquee Overlay */}
      {isCropToolActive && cropBox && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(cropBox.startX, cropBox.endX),
            top: Math.min(cropBox.startY, cropBox.endY),
            width: Math.abs(cropBox.endX - cropBox.startX),
            height: Math.abs(cropBox.endY - cropBox.startY),
            border: '2px dashed var(--accent-primary)',
            background: 'rgba(124, 107, 240, 0.25)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Page number label */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '10px',
        fontWeight: 500,
        color: 'rgba(0,0,0,0.35)',
        userSelect: 'none',
      }}>
        {pageNum}
      </div>
    </div>
  );
};

// ─── Main PDF Viewer ──────────────────────────────────────────────────────────
export const PdfViewer: React.FC<ViewerProps> = ({ asset, resolvedUrl, onAssetsUpdated, setViewerControls }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [userZoom, setUserZoom] = useState(1.0);
  const [fitScale, setFitScale] = useState(1.0);
  const [pdfExtractedText, setPdfExtractedText] = useState<string | null>(null);
  const [showPdfSidebar, setShowPdfSidebar] = useState(true);
  
  const [viewMode, setViewMode] = useState<'flipbook' | 'scroll'>('flipbook');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Refs
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

  // PDF Crop Selection Tool state
  const [isCropToolActive, setIsCropToolActive] = useState(false);
  const [cropBox, setCropBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [activeCropSide, setActiveCropSide] = useState<'left' | 'right'>('right');

  // Page transition animation
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ─── PDF Document Loading ─────────────────────────────────────────────────
  useEffect(() => {
    if (!resolvedUrl) return;
    pdfjsLib.getDocument(resolvedUrl).promise.then(pdf => {
      setPdfDoc(pdf);
      setPdfTotalPages(pdf.numPages);
      setPdfPageNum(1);
    }).catch(err => console.error("Failed to load PDF", err));
  }, [resolvedUrl]);

  // ─── Dynamic Responsive Sizing via ResizeObserver ─────────────────────────
  useEffect(() => {
    if (!contentAreaRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    observer.observe(contentAreaRef.current);
    return () => observer.disconnect();
  }, []);

  // ─── Compute fitScale based on container & PDF page dimensions ────────────
  useEffect(() => {
    if (!pdfDoc || pdfTotalPages < 1) return;

    const computeFitScale = async () => {
      try {
        // Use page 1 as reference for dimensions
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageW = viewport.width;
        const pageH = viewport.height;

        const padding = 80; // total padding around the book
        const spineGap = 4; // gap between left/right pages
        const availH = containerSize.height - padding;
        const availW = containerSize.width - padding;

        let scale: number;
        if (viewMode === 'flipbook') {
          // Two-page spread: each page gets half the width
          const isSpread = pdfTotalPages > 1;
          const pagesWide = isSpread ? 2 : 1;
          const scaleByWidth = (availW - spineGap) / (pageW * pagesWide);
          const scaleByHeight = availH / pageH;
          scale = Math.min(scaleByWidth, scaleByHeight, 2.5);
        } else {
          // Scroll mode: fit width
          const scaleByWidth = Math.min(availW, 1000) / pageW;
          scale = Math.min(scaleByWidth, 2.5);
        }

        setFitScale(Math.max(0.3, scale));
      } catch (err) {
        console.error("Failed to compute fit scale:", err);
      }
    };

    computeFitScale();
  }, [pdfDoc, pdfTotalPages, containerSize, viewMode]);

  // ─── Two-Page Spread Logic ────────────────────────────────────────────────
  // Page 1 sits alone on the right (like a book cover).
  // Then: 2-3, 4-5, 6-7, etc.
  const getSpreadPages = useCallback((currentPage: number): { left: number | null; right: number | null } => {
    if (pdfTotalPages <= 1) {
      return { left: null, right: 1 };
    }
    if (currentPage === 1) {
      return { left: null, right: 1 };
    }
    // Make currentPage land on an even-odd boundary
    const evenPage = currentPage % 2 === 0 ? currentPage : currentPage - 1;
    const left = evenPage;
    const right = evenPage + 1 <= pdfTotalPages ? evenPage + 1 : null;
    return { left, right };
  }, [pdfTotalPages]);

  const spread = getSpreadPages(pdfPageNum);

  // ─── Text Extraction for Current Page ─────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc) return;
    let isMounted = true;

    const extractText = async () => {
      try {
        const page = await pdfDoc.getPage(pdfPageNum);
        const textObj = await page.getTextContent();
        const text = textObj.items.map((item: any) => item.str).join(' ');
        if (isMounted) setPdfExtractedText(text);
      } catch (err) {
        console.error("Text extraction failed:", err);
      }
    };

    extractText();
    return () => { isMounted = false; };
  }, [pdfDoc, pdfPageNum]);

  // ─── Page Turn ────────────────────────────────────────────────────────────
  const handlePageTurn = useCallback((targetPage: number) => {
    if (targetPage < 1 || targetPage > pdfTotalPages || targetPage === pdfPageNum || isTransitioning) return;
    
    setIsTransitioning(true);
    // Brief transition delay for visual feedback
    setTimeout(() => {
      setPdfPageNum(targetPage);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 80);
  }, [pdfPageNum, pdfTotalPages, isTransitioning]);

  const handleNextSpread = useCallback(() => {
    if (pdfPageNum === 1) {
      handlePageTurn(Math.min(2, pdfTotalPages));
    } else {
      const evenPage = pdfPageNum % 2 === 0 ? pdfPageNum : pdfPageNum - 1;
      handlePageTurn(Math.min(evenPage + 2, pdfTotalPages));
    }
  }, [pdfPageNum, pdfTotalPages, handlePageTurn]);

  const handlePrevSpread = useCallback(() => {
    if (pdfPageNum <= 3) {
      handlePageTurn(1);
    } else {
      const evenPage = pdfPageNum % 2 === 0 ? pdfPageNum : pdfPageNum - 1;
      handlePageTurn(Math.max(evenPage - 2, 1));
    }
  }, [pdfPageNum, handlePageTurn]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'flipbook') return;
      if (e.key === 'ArrowRight') handleNextSpread();
      else if (e.key === 'ArrowLeft') handlePrevSpread();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfPageNum, pdfTotalPages, isTransitioning, viewMode, handleNextSpread, handlePrevSpread]);

  // ─── High-Fidelity Native PDF Embedded Image Extractor ────────────────────
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

  // ─── Page Snapshot ────────────────────────────────────────────────────────
  const handleSnapshotPdfPage = useCallback(async () => {
    // Use the right canvas (active page) or left canvas as fallback
    const targetCanvas = rightCanvasRef.current || leftCanvasRef.current;
    if (!targetCanvas) return;
    const dataUrl = targetCanvas.toDataURL('image/png');
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

  // ─── Save Extracted Text ──────────────────────────────────────────────────
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

  // ─── Crop Tool Mouse Handlers ─────────────────────────────────────────────
  const handleCropMouseDown = (side: 'left' | 'right') => (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropToolActive) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawingCrop(true);
    setActiveCropSide(side);
    setCropBox({ startX: x, startY: y, endX: x, endY: y });
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropToolActive || !isDrawingCrop || !cropBox) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const endY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setCropBox(prev => prev ? { ...prev, endX, endY } : null);
  };

  const handleCropMouseUp = (e: React.MouseEvent) => {
    if (!isCropToolActive) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDrawingCrop(false);
  };

  // ─── Extract Cropped Region ───────────────────────────────────────────────
  const handleExtractCroppedPdfRegion = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const sourceCanvas = activeCropSide === 'left' ? leftCanvasRef.current : rightCanvasRef.current;
    if (!sourceCanvas || !cropBox) return;

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
      const cropPage = activeCropSide === 'left' ? spread.left : (spread.right || pdfPageNum);
      await invoke('save_base64_image_asset', {
        title: `Crop_${asset.title}_P${cropPage}`,
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

  // ─── OCR Extraction ───────────────────────────────────────────────────────
  const handleOcrExtraction = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const sourceCanvas = rightCanvasRef.current || leftCanvasRef.current;
    if (!sourceCanvas) return;
    
    setIsOcrProcessing(true);
    let targetCanvas: HTMLCanvasElement = sourceCanvas;
    
    if (isCropToolActive && cropBox && Math.abs(cropBox.endX - cropBox.startX) > 10) {
      const rect = targetCanvas.getBoundingClientRect();
      const scaleX = targetCanvas.width / rect.width;
      const scaleY = targetCanvas.height / rect.height;

      const x = Math.min(cropBox.startX, cropBox.endX) * scaleX;
      const y = Math.min(cropBox.startY, cropBox.endY) * scaleY;
      const w = Math.abs(cropBox.endX - cropBox.startX) * scaleX;
      const h = Math.abs(cropBox.endY - cropBox.startY) * scaleY;
      
      const destCanvas = document.createElement('canvas');
      destCanvas.width = w;
      destCanvas.height = h;
      const ctx = destCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(targetCanvas, x, y, w, h, 0, 0, w, h);
        targetCanvas = destCanvas;
      }
    }
    
    const dataUrl = targetCanvas.toDataURL('image/png');
    
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await worker.recognize(dataUrl);
      const text = ret.data.text;
      await worker.terminate();
      
      if (!text || !text.trim()) {
        alert("No text could be recognized.");
      } else {
        await invoke('save_text_asset', {
          title: `OCR_${asset?.title}_P${pdfPageNum}`,
          textContent: text,
        });
        alert(`OCR successful! Extracted text saved to library.`);
        if (onAssetsUpdated) onAssetsUpdated();
        setCropBox(null);
        setIsCropToolActive(false);
      }
    } catch (err) {
      console.error("OCR Failed:", err);
      alert("OCR Processing failed.");
    } finally {
      setIsOcrProcessing(false);
    }
  }, [pdfPageNum, asset?.title, isCropToolActive, cropBox, onAssetsUpdated]);

  // ─── PDF Text Search ──────────────────────────────────────────────────────
  const handleSearchPdf = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !pdfDoc) return;
    setIsSearching(true);
    
    const results: {page: number, text: string}[] = [];
    const query = searchQuery.toLowerCase();
    
    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textObj = await page.getTextContent();
        const text = textObj.items.map((item: any) => item.str).join(' ');
        if (text.toLowerCase().includes(query)) {
          results.push({ page: i, text: text.substring(0, 50) + "..." });
        }
      }
      
      if (results.length === 0) {
        alert("No matches found.");
      } else {
        if (viewMode === 'flipbook') {
          handlePageTurn(results[0].page);
        }
      }
    } catch(err) {
      console.error("Search error", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, pdfDoc, viewMode, handlePageTurn]);

  // ─── Toolbar Controls ─────────────────────────────────────────────────────
  useEffect(() => {
    if (setViewerControls) {
      setViewerControls(
        <>
          {/* Sidebar toggle */}
          <button
            className={`toolbar__btn ${showPdfSidebar ? 'toolbar__btn--active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowPdfSidebar(s => !s); }}
            title="Toggle Page Thumbnail Sidebar"
          >
            <IconColumns size={15} />
          </button>

          {/* View mode toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--bg-secondary)', padding: '2px', borderRadius: 6 }}>
            <button
              className={`toolbar__btn ${viewMode === 'flipbook' ? 'toolbar__btn--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setViewMode('flipbook'); }}
              title="Flipbook View"
            >
              <IconBookOpen size={15} />
            </button>
            <button
              className={`toolbar__btn ${viewMode === 'scroll' ? 'toolbar__btn--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setViewMode('scroll'); }}
              title="Continuous Scroll View"
            >
              <IconScrollText size={15} />
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchPdf} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 6 }}>
            <input 
              type="text" 
              placeholder="Search PDF..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: 100, fontSize: '12px' }}
              onClick={e => e.stopPropagation()}
            />
            <button type="submit" className="toolbar__btn" title="Search" disabled={isSearching}>
              <IconSearch size={14} />
            </button>
          </form>

          {/* Page navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 6 }}>
            <button 
              className="toolbar__btn" 
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handlePageTurn(pdfPageNum - 1); }}
              disabled={pdfPageNum <= 1 || viewMode === 'scroll'}
              title="Previous Page"
            >
              <IconChevronLeft size={15} />
            </button>
            <span style={{ fontSize: '12px', minWidth: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>
              {pdfPageNum} / {pdfTotalPages}
            </span>
            <button 
              className="toolbar__btn" 
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handlePageTurn(pdfPageNum + 1); }}
              disabled={pdfPageNum >= pdfTotalPages || viewMode === 'scroll'}
              title="Next Page"
            >
              <IconChevronRight size={15} />
            </button>
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: 6 }}>
            <button className="toolbar__btn" title="Zoom Out" onClick={(e) => { e.stopPropagation(); setUserZoom(s => Math.max(0.5, +(s - 0.15).toFixed(2))); }}>
              <IconZoomOut size={14} />
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: 36, textAlign: 'center' }}>{Math.round(fitScale * userZoom * 100)}%</span>
            <button className="toolbar__btn" title="Zoom In" onClick={(e) => { e.stopPropagation(); setUserZoom(s => Math.min(3.0, +(s + 0.15).toFixed(2))); }}>
              <IconZoomIn size={14} />
            </button>
          </div>

          {/* Crop tool */}
          <button 
            className={`toolbar__btn ${isCropToolActive ? 'toolbar__btn--active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setIsCropToolActive(!isCropToolActive); setCropBox(null); }}
            title="Select a region on page to extract as asset"
          >
            <IconScissors size={14} />
          </button>
          
          {/* Text extract */}
          <button 
            className="toolbar__btn" 
            onClick={(e) => {
              e.stopPropagation();
              handleSaveExtractedTextAsAsset();
            }}
            title="Save extracted page text to library as markdown asset"
          >
            <IconFileText size={14} />
          </button>

          {/* OCR */}
          <button 
            className="toolbar__btn"
            onClick={handleOcrExtraction}
            disabled={isOcrProcessing}
            title="Run OCR on current page or crop selection"
            style={{ opacity: isOcrProcessing ? 0.5 : 1 }}
          >
            <IconScanText size={14} />
          </button>

          {/* Extract images */}
          <button 
            className="toolbar__btn"
            onClick={(e) => {
              e.stopPropagation();
              handleExtractNativePdfImages();
            }}
            title="Extract native embedded images at original source resolution"
          >
            <IconImage size={14} />
          </button>

          {/* Snapshot */}
          <button 
            className={`toolbar__btn toolbar__btn--active`}
            onClick={(e) => { e.stopPropagation(); handleSnapshotPdfPage(); }}
            title="Snapshot current page as image asset"
          >
            <IconCamera size={14} />
          </button>

          <AIToolbar asset={asset} resolvedUrl={resolvedUrl} onAssetsUpdated={onAssetsUpdated} />
        </>
      );
    }
  }, [
    showPdfSidebar, pdfPageNum, pdfTotalPages, userZoom, fitScale, isCropToolActive, viewMode, searchQuery, isSearching, isOcrProcessing,
    handleSaveExtractedTextAsAsset, handleExtractNativePdfImages, handleSnapshotPdfPage, handleSearchPdf, handleOcrExtraction, setViewerControls,
    asset, resolvedUrl, onAssetsUpdated,
  ]);


  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* PDF Thumbnail Sidebar */}
      {showPdfSidebar && (
        <div style={{
          width: 170,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          <div style={{ padding: '12px 12px 6px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pages ({pdfTotalPages})
          </div>
          <Virtuoso
            style={{ flex: 1, width: '100%' }}
            totalCount={pdfTotalPages}
            itemContent={(index) => {
              const pNum = index + 1;
              return (
                <div style={{ padding: '6px 12px' }}>
                  <PdfPageThumbnailCanvas
                    key={pNum}
                    pdfDoc={pdfDoc}
                    pageNum={pNum}
                    isSelected={pdfPageNum === pNum || spread.left === pNum || spread.right === pNum}
                    onClick={() => handlePageTurn(pNum)}
                  />
                </div>
              );
            }}
          />
        </div>
      )}

      {/* Content Preview Area */}
      <div
        ref={contentAreaRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: viewMode === 'scroll' ? 'flex-start' : 'center',
          justifyContent: 'center',
          padding: viewMode === 'scroll' ? 0 : 24,
          overflow: viewMode === 'scroll' ? 'hidden' : 'auto',
          position: 'relative',
        }}
      >
        {viewMode === 'scroll' ? (
          /* ─── Scroll Mode ──────────────────────────────────────────────── */
          <Virtuoso
            style={{ width: '100%', height: '100%', maxWidth: 1000, margin: '0 auto' }}
            totalCount={pdfTotalPages}
            itemContent={(index) => {
              const pNum = index + 1;
              return (
                <div style={{ padding: '24px 0', paddingBottom: index === pdfTotalPages - 1 ? 60 : 0 }}>
                  <ScrollPageCanvas 
                    key={pNum} 
                    pdfDoc={pdfDoc} 
                    pageNum={pNum} 
                    scale={fitScale * userZoom} 
                    onVisible={(page) => {
                      if (page !== pdfPageNum && !isSearching) setPdfPageNum(page);
                    }}
                  />
                </div>
              );
            }}
          />
        ) : (
          /* ─── Flipbook Mode: Two-Page Spread ───────────────────────────── */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            width: '100%',
            justifyContent: 'center',
          }}>
            {/* Previous Page Arrow */}
            <button
              onClick={handlePrevSpread}
              disabled={pdfPageNum <= 1 || isTransitioning}
              className="toolbar__btn"
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                opacity: pdfPageNum > 1 ? 0.9 : 0.2,
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              title="Previous Page (Left Arrow)"
            >
              <IconChevronLeft size={20} />
            </button>

            {/* Book Spread Container */}
            <div style={{
              display: 'flex',
              boxShadow: '0 25px 70px rgba(0,0,0,0.7), 0 0 30px rgba(0,0,0,0.3)',
              borderRadius: 8,
              overflow: 'hidden',
              transition: 'opacity 0.15s ease, transform 0.15s ease',
              opacity: isTransitioning ? 0.7 : 1,
              transform: isTransitioning ? 'scale(0.985)' : 'scale(1)',
              maxWidth: '100%',
            }}>
              {/* Left page */}
              {spread.left && (
                <FlipbookPageCanvas
                  pdfDoc={pdfDoc}
                  pageNum={spread.left}
                  fitScale={fitScale}
                  userZoom={userZoom}
                  side="left"
                  isCropToolActive={isCropToolActive}
                  cropBox={activeCropSide === 'left' ? cropBox : null}
                  onMouseDown={handleCropMouseDown('left')}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  canvasRef={leftCanvasRef}
                />
              )}

              {/* Spine divider */}
              {spread.left && spread.right && (
                <div style={{
                  width: 4,
                  background: 'linear-gradient(to right, #d0d0d0, #e8e8e8, #d0d0d0)',
                  boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.15), inset -2px 0 4px rgba(0,0,0,0.15)',
                  flexShrink: 0,
                }} />
              )}

              {/* Right page */}
              {spread.right && (
                <FlipbookPageCanvas
                  pdfDoc={pdfDoc}
                  pageNum={spread.right}
                  fitScale={fitScale}
                  userZoom={userZoom}
                  side={spread.left ? 'right' : 'solo'}
                  isCropToolActive={isCropToolActive}
                  cropBox={activeCropSide === 'right' ? cropBox : null}
                  onMouseDown={handleCropMouseDown('right')}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  canvasRef={rightCanvasRef}
                />
              )}
            </div>

            {/* Next Page Arrow */}
            <button
              onClick={handleNextSpread}
              disabled={pdfPageNum >= pdfTotalPages || isTransitioning}
              className="toolbar__btn"
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                opacity: pdfPageNum < pdfTotalPages ? 0.9 : 0.2,
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              title="Next Page (Right Arrow)"
            >
              <IconChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Floating Crop Extract Button */}
        {isCropToolActive && cropBox && Math.abs(cropBox.endX - cropBox.startX) > 10 && (
          <button 
            className="btn btn--primary" 
            onClick={handleExtractCroppedPdfRegion}
            style={{
              position: 'fixed',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 16px',
              fontSize: '13px',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            }}
          >
            <IconScissors size={14} /> Extract Cropped Selection as Asset
          </button>
        )}
      </div>
    </>
  );
};
