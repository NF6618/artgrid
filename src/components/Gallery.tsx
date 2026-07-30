import React, { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import { IconEye, IconMoreHorizontal, IconStarFilled, IconStar, IconUpload, IconImage, IconTrash, IconSparkles, IconFileText, IconFolder, IconArchive } from './Icons';
import { api } from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';

// Set up pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Demo data — procedural art reference images using placeholder services
export interface Asset {
  id: string;
  title: string;
  filename: string;
  width: number;
  height: number;
  size: string;
  type: string;
  tags: string[];
  collections: string[];
  favorite: boolean;
  dateAdded: string;
  palette?: string[];
  url: string;
  filepath?: string;
  color_profile?: string;
  notes?: string;
  archived?: boolean;
  trashed?: boolean;
  folder_id?: string;
  thumbnail_url?: string;
  status?: string;
  document_id?: string;
  page_number?: number;
  page_text?: string;
  is_semantic?: boolean;
  score?: number;
  document_title?: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  created_at: string;
}



const PdfThumbnailCard: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!url) return;

    pdfjsLib.getDocument(url).promise.then(pdf => {
      return pdf.getPage(1);
    }).then(page => {
      if (!isMounted || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        page.render({ canvasContext: ctx, viewport }).promise.then(() => {
          if (isMounted) setLoading(false);
        });
      }
    }).catch(err => {
      console.error("Failed to render PDF thumbnail:", err);
      if (isMounted) { setError(true); setLoading(false); }
    });

    return () => { isMounted = false; };
  }, [url]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1c28' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: loading ? 'none' : 'block' }} />
      {loading && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loading PDF...</div>}
      {error && <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><IconFileText size={12} /> {title}</div>}
      <div style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: 'white', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em', zIndex: 10 }}>
        PDF
      </div>
    </div>
  );
};

interface GalleryProps {
  assets: Asset[];
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  onPreviewAsset?: (asset: Asset) => void;
  onToggleFavorite: (id: string) => void;
  onImport?: (paths?: string[]) => void;
  viewMode?: 'grid' | 'list' | 'board';
  showImageNames?: boolean;
  onAssetsUpdated?: () => void;
  folders?: Folder[];
  currentFolderId?: string | null;
  onNavigateFolder?: (folderId: string | null) => void;
}

export const Gallery: React.FC<GalleryProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  onPreviewAsset,
  onToggleFavorite,
  onImport,
  viewMode = 'grid',
  showImageNames = true,
  onAssetsUpdated,
  folders = [],
  currentFolderId = null,
  onNavigateFolder
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    asset?: Asset;
    isBackground?: boolean;
  } | null>(null);

  useEffect(() => {
    const handleCloseContextMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseContextMenu);
    return () => window.removeEventListener('click', handleCloseContextMenu);
  }, []);

  // Marquee selection box state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const paths = files
      .map(f => (f as any).path)
      .filter((p): p is string => typeof p === 'string' && p.length > 0);

    if (paths.length > 0 && onImport) {
      onImport(paths);
    }
  }, [onImport]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: asset.id,
      url: asset.url,
      title: asset.title
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Selection handlers
  const handleCardClick = (e: React.MouseEvent, asset: Asset) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => prev.includes(asset.id) ? prev.filter(id => id !== asset.id) : [...prev, asset.id]);
    } else if (e.shiftKey && selectedIds.length > 0) {
      const lastIndex = assets.findIndex(a => a.id === selectedIds[selectedIds.length - 1]);
      const currentIndex = assets.findIndex(a => a.id === asset.id);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const rangeIds = assets.slice(start, end + 1).map(a => a.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...rangeIds])));
    } else {
      setSelectedIds([asset.id]);
    }
    onSelectAsset(asset);
  };

  // Mouse marquee box drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.gallery__card') || (e.target as HTMLElement).closest('button')) {
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;

    setIsSelecting(true);
    setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
    if (!e.ctrlKey && !e.shiftKey) {
      setSelectedIds([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionBox || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const currentY = e.clientY - rect.top + containerRef.current.scrollTop;

    setSelectionBox(prev => prev ? { ...prev, currentX, currentY } : null);

    const boxLeft = Math.min(selectionBox.startX, currentX);
    const boxRight = Math.max(selectionBox.startX, currentX);
    const boxTop = Math.min(selectionBox.startY, currentY);
    const boxBottom = Math.max(selectionBox.startY, currentY);

    const cardElements = containerRef.current.querySelectorAll('[data-asset-id]');
    const newlySelected: string[] = [];

    cardElements.forEach(el => {
      const cardId = el.getAttribute('data-asset-id');
      const htmlEl = el as HTMLElement;
      const elLeft = htmlEl.offsetLeft;
      const elTop = htmlEl.offsetTop;
      const elRight = elLeft + htmlEl.offsetWidth;
      const elBottom = elTop + htmlEl.offsetHeight;

      const intersects = !(elRight < boxLeft || elLeft > boxRight || elBottom < boxTop || elTop > boxBottom);
      if (intersects && cardId) {
        newlySelected.push(cardId);
      }
    });

    setSelectedIds(newlySelected);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectionBox(null);
  };

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.gallery__card') || target.closest('.gallery__list-row')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, isBackground: true });
  };

  // Bulk Operations
  const handleBulkFavorite = async () => {
    for (const id of selectedIds) {
      await api.toggleFavorite(id);
    }
    if (onAssetsUpdated) onAssetsUpdated();
  };

  const handleBulkArchive = async () => {
    for (const id of selectedIds) {
      await api.archiveAsset(id, true);
    }
    if (onAssetsUpdated) onAssetsUpdated();
  };

  const handleBulkTrash = async () => {
    if (window.confirm(`Move ${selectedIds.length} assets to Trash?`)) {
      for (const id of selectedIds) {
        await api.trashAsset(id, true);
      }
      setSelectedIds([]);
      if (onAssetsUpdated) onAssetsUpdated();
    }
  };

  const handleBulkAddTag = async () => {
    const tagName = prompt(`Enter tag name to add to ${selectedIds.length} assets:`);
    if (tagName && tagName.trim()) {
      for (const id of selectedIds) {
        await api.addTag(id, tagName.trim());
      }
      if (onAssetsUpdated) onAssetsUpdated();
    }
  };

  const gridComponents = React.useMemo(() => ({
    List: forwardRef<HTMLDivElement, any>((props, ref) => (
      <div
        {...props}
        ref={ref}
        className={`gallery__layout--${viewMode}`}
      />
    )),
    Item: ({ children, ...props }: any) => (
      <div {...props}>{children}</div>
    )
  }), [viewMode]);

  if (assets.length === 0) {
    return (
      <div className="gallery" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <div className={`drop-zone ${isDragOver ? 'drop-zone--active' : ''}`}>
          <div className="drop-zone__content">
            <IconUpload size={48} className="drop-zone__icon" />
            <div className="drop-zone__text">Drop files here</div>
            <div className="drop-zone__hint">or click to browse</div>
          </div>
        </div>
        <div className="empty-state">
          <IconImage size={64} className="empty-state__icon" />
          <h2 className="empty-state__title">No assets yet</h2>
          <p className="empty-state__description">
            Drag and drop files here, use the browser extension, or import from a folder to get started.
          </p>
          <div className="empty-state__action">
            <button className="btn btn--primary" onClick={() => onImport && onImport()}>
              <IconUpload size={14} />
              Import Files
            </button>
          </div>
        </div>
      </div>
    );
  }

  const boxRect = selectionBox ? {
    left: Math.min(selectionBox.startX, selectionBox.currentX),
    top: Math.min(selectionBox.startY, selectionBox.currentY),
    width: Math.abs(selectionBox.currentX - selectionBox.startX),
    height: Math.abs(selectionBox.currentY - selectionBox.startY)
  } : null;

  const currentFolders = folders.filter(f => (f.parent_id || null) === currentFolderId);
  const currentAssets = assets.filter(a => (a.folder_id || null) === currentFolderId);
  const combinedItems = [
    ...currentFolders.map(f => ({ type: 'folder', data: f })),
    ...currentAssets.map(a => ({ type: 'asset', data: a }))
  ];

  return (
    <div
      ref={containerRef}
      className="gallery"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleBackgroundContextMenu}
      style={{ position: 'relative' }}
    >
      {/* Selection Box Overlay */}
      {isSelecting && boxRect && (
        <div 
          style={{
            position: 'absolute',
            left: boxRect.left,
            top: boxRect.top,
            width: boxRect.width,
            height: boxRect.height,
            border: '1px solid var(--accent-primary)',
            background: 'rgba(124, 107, 240, 0.18)',
            pointerEvents: 'none',
            zIndex: 1000,
            borderRadius: 4
          }}
        />
      )}

      {/* Drop zone overlay */}
      <div className={`drop-zone ${isDragOver ? 'drop-zone--active' : ''}`}>
        <div className="drop-zone__content">
          <IconUpload size={48} className="drop-zone__icon" />
          <div className="drop-zone__text">Drop files to import</div>
          <div className="drop-zone__hint">Images, videos, documents, and more</div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 1 && (
        <div style={{
          position: 'fixed',
          bottom: 40,
          right: 360,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--accent-primary)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          borderRadius: 8,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 1500,
          backdropFilter: 'blur(8px)'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {selectedIds.length} items selected
          </span>
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
          <button className="btn btn--secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={handleBulkAddTag}>+ Tag</button>
          <button className="btn btn--secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={handleBulkFavorite}>★ Favorite</button>
          <button className="btn btn--secondary" style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={handleBulkArchive}><IconArchive size={12} /> Archive</button>
          <button className="btn btn--secondary" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--color-error)' }} onClick={handleBulkTrash}>🗑 Trash</button>
          <button className="toolbar__btn" style={{ fontSize: '11px', padding: '2px 6px' }} onClick={() => setSelectedIds([])}>✕</button>
        </div>
      )}

      {/* Masonry-style grid or tabular list */}
      {viewMode === 'list' ? (
        <Virtuoso
          style={{ flex: 1 }}
          data={combinedItems}
          computeItemKey={(_index, item) => item.type === 'folder' ? `folder-${(item.data as Folder).id}` : `asset-${(item.data as Asset).id}`}
          itemContent={(_index, item) => {
            if (item.type === 'folder') {
              const folder = item.data as Folder;
              return (
                <div
                  key={folder.id}
                  className="gallery__list-row"
                  onDoubleClick={() => onNavigateFolder && onNavigateFolder(folder.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><IconFolder size={24} /></div>
                  <div className="text-truncate" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{folder.name}</div>
                  <div>--</div>
                  <div>--</div>
                  <div>--</div>
                  <div></div>
                </div>
              );
            } else {
              const asset = item.data as Asset;
              const isSelected = selectedAsset?.id === asset.id || selectedIds.includes(asset.id);
              return (
                <div
                  key={asset.id}
                  data-asset-id={asset.id}
                  className={`gallery__list-row ${isSelected ? 'gallery__card--selected' : ''}`}
                  onClick={(e) => handleCardClick(e, asset)}
                  onDoubleClick={() => onPreviewAsset && onPreviewAsset(asset)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectAsset(asset);
                    setContextMenu({ x: e.clientX, y: e.clientY, asset });
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 2fr 1fr 1fr 1.5fr 80px',
                    alignItems: 'center',
                    padding: '8px 16px',
                    background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-base)' }}>
                    <img src={asset.url} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {showImageNames ? asset.title : '••••••••'}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.filename}</div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{asset.width} × {asset.height}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{asset.size}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(asset.tags || []).slice(0, 3).map((t) => (
                      <span key={t} className="tag" style={{ fontSize: '9px', padding: '1px 5px' }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button 
                      className="gallery__card-action" 
                      title="Preview"
                      onClick={(e) => { e.stopPropagation(); onPreviewAsset && onPreviewAsset(asset); }}
                      style={{ position: 'static', opacity: 1 }}
                    >
                      <IconEye size={13} />
                    </button>
                    <button
                      className="gallery__card-action"
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(asset.id); }}
                      title={asset.favorite ? 'Remove favorite' : 'Favorite'}
                      style={{ position: 'static', opacity: 1, color: asset.favorite ? '#f06b8e' : 'inherit' }}
                    >
                      {asset.favorite ? <IconStarFilled size={13} /> : <IconStar size={13} />}
                    </button>
                  </div>
                </div>
              );
            }
          }}
        />
      ) : (
        <VirtuosoGrid
          style={{ flex: 1 }}
          data={combinedItems}
          computeItemKey={(_index, item) => item.type === 'folder' ? `folder-${(item.data as Folder).id}` : `asset-${(item.data as Asset).id}`}
          components={gridComponents}
          itemContent={(_index, item) => {
            if (item.type === 'folder') {
              const folder = item.data as Folder;
              return (
                <div
                  key={folder.id}
                  className="gallery__card gallery__card--folder"
                  onDoubleClick={() => onNavigateFolder && onNavigateFolder(folder.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 16,
                    cursor: 'pointer', border: '1px solid var(--border-subtle)', aspectRatio: '1/1',
                    transition: 'all 0.2s', userSelect: 'none'
                  }}
                >
                  <div style={{ marginBottom: 12, color: 'var(--accent-primary)', opacity: 0.8 }}><IconFolder size={40} /></div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 500 }}>
                    {folder.name}
                  </div>
                </div>
              );
            } else {
              const asset = item.data as Asset;
              const isSelected = selectedAsset?.id === asset.id || selectedIds.includes(asset.id);
              const isPdf = (asset.type && asset.type.toLowerCase().includes('pdf')) || asset.filename.toLowerCase().endsWith('.pdf');
              const aspectRatio = (asset.width && asset.height) ? `${asset.width} / ${asset.height}` : '4/3';

              return (
                <div
                  key={asset.id}
                  data-asset-id={asset.id}
                  className={`gallery__card ${isSelected ? 'gallery__card--selected' : ''}`}
                  onClick={(e) => handleCardClick(e, asset)}
                  onDoubleClick={() => onPreviewAsset && onPreviewAsset(asset)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectAsset(asset);
                    setContextMenu({ x: e.clientX, y: e.clientY, asset });
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset)}
                >
                  <div
                    className="gallery__card-image"
                    style={{
                      background: 'var(--bg-secondary)',
                      aspectRatio,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {isPdf ? (
                      asset.thumbnail_url ? (
                        <>
                          <img 
                            src={asset.thumbnail_url} 
                            alt={asset.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            draggable={false}
                          />
                          <div style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: 'white', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em', zIndex: 10 }}>
                            PDF
                          </div>
                        </>
                      ) : (
                        <PdfThumbnailCard url={asset.url} title={asset.title} />
                      )
                    ) : (
                      <img 
                        src={asset.url} 
                        alt={asset.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        draggable={false}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {asset.is_semantic && (
                      <div style={{
                        position: 'absolute', top: 6, left: 6,
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                        color: 'white', fontSize: '9px', fontWeight: 700,
                        padding: '2px 7px', borderRadius: 4, letterSpacing: '0.04em',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 12,
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconSparkles size={10} /> Semantic</span>
                      </div>
                    )}
                    {asset.status && asset.status !== 'indexed' && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'white', zIndex: 20,
                        backdropFilter: 'blur(2px)'
                      }}>
                        <div style={{
                          width: 24, height: 24,
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: 'white', borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginBottom: 8
                        }} />
                        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          {asset.status}
                        </div>
                        {asset.page_number && (
                          <div style={{ fontSize: '9px', opacity: 0.8, marginTop: 4 }}>
                            Page {asset.page_number}
                          </div>
                        )}
                      </div>
                    )}
                    {(asset.document_title || asset.page_number) && !asset.status && (
                      <div style={{
                        position: 'absolute', bottom: 6, left: 6, right: 6,
                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                        color: '#e2e8f0', fontSize: '10px', fontWeight: 500,
                        padding: '3px 6px', borderRadius: 4, zIndex: 11,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconFileText size={10} /> {asset.document_title || 'Document'} {asset.page_number ? `• Pg ${asset.page_number}` : ''}
                        </span>
                      </div>
                    )}
                    {showImageNames && (
                      <div style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        right: 8,
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        color: 'white',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        opacity: 0.8,
                      }}>
                        {asset.title}
                      </div>
                    )}
                  </div>

                  <div className="gallery__card-overlay">
                    <div 
                      className="gallery-item__image-wrapper"
                      draggable
                      onDragStart={(e) => handleDragStart(e, asset)}
                    >{showImageNames ? asset.filename : ''}</div>
                    <div className="gallery__card-meta">{asset.width}×{asset.height} · {asset.size}</div>
                  </div>

                  <div className="gallery__card-actions">
                    <button 
                      className="gallery__card-action" 
                      title="Preview"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onPreviewAsset) onPreviewAsset(asset);
                      }}
                    >
                      <IconEye size={13} />
                    </button>
                    <button 
                      className="gallery__card-action" 
                      title="More Details"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAsset(asset);
                      }}
                    >
                      <IconMoreHorizontal size={13} />
                    </button>
                  </div>

                  <button
                    className={`gallery__card-action gallery__card-favorite ${asset.favorite ? 'gallery__card-favorite--active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(asset.id); }}
                    title={asset.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    style={asset.favorite ? { color: '#f06b8e' } : {}}
                  >
                    {asset.favorite ? <IconStarFilled size={13} /> : <IconStar size={13} />}
                  </button>
                </div>
              );
            }
          }}
        />
      )}
      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 260),
            width: 210,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 6,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            userSelect: 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.isBackground ? (
            <>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase' }}>
                Library Actions
              </div>
              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  onImport?.();
                  setContextMenu(null);
                }}
              >
                <IconUpload size={14} /> Import Media Files...
              </button>
              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={async () => {
                  const name = prompt('New folder name:');
                  if (name && name.trim()) {
                    await api.createFolder(name.trim(), currentFolderId);
                    onAssetsUpdated?.();
                  }
                  setContextMenu(null);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconFolder size={12} /> Create Folder...</span>
              </button>
            </>
          ) : contextMenu.asset ? (
            <>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase' }}>
                Asset Actions
              </div>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  onPreviewAsset?.(contextMenu.asset!);
                  setContextMenu(null);
                }}
              >
                <IconEye size={14} /> Open Media Viewer
              </button>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  onToggleFavorite(contextMenu.asset!.id);
                  setContextMenu(null);
                }}
              >
                <IconStar size={14} /> {contextMenu.asset.favorite ? 'Unfavorite' : 'Mark as Favorite'}
              </button>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={async () => {
                  const name = prompt('New title for asset:', contextMenu.asset!.title);
                  if (name && name.trim()) {
                    const ext = contextMenu.asset!.filename.includes('.') ? '.' + contextMenu.asset!.filename.split('.').pop() : '';
                    await api.renameAsset(contextMenu.asset!.id, name.trim(), name.trim() + ext);
                    onAssetsUpdated?.();
                  }
                  setContextMenu(null);
                }}
              >
                ✏️ Rename Asset...
              </button>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  onImport?.();
                  setContextMenu(null);
                }}
              >
                <IconUpload size={14} /> Import Media Files...
              </button>

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', color: '#f06b8e', borderColor: 'rgba(240, 107, 142, 0.3)', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={async () => {
                  await api.trashAsset(contextMenu.asset!.id, true);
                  onAssetsUpdated?.();
                  setContextMenu(null);
                }}
              >
                <IconTrash size={14} /> Move to Trash
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};


