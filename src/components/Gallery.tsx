import React, { useState, useCallback } from 'react';
import { IconEye, IconMoreHorizontal, IconStarFilled, IconStar, IconUpload, IconImage } from './Icons';

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
  notes?: string;
  archived?: boolean;
  trashed?: boolean;
}

// Procedural gradient thumbnails based on palette
const generateGradient = (palette: string[] | undefined): string => {
  if (!palette || palette.length < 2) return '#333';
  const stops = palette.map((c, i) => `${c} ${(i / (palette.length - 1)) * 100}%`).join(', ');
  const angle = Math.floor(Math.random() * 360);
  return `linear-gradient(${angle}deg, ${stops})`;
};

interface GalleryProps {
  assets: Asset[];
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  onPreviewAsset?: (asset: Asset) => void;
  onToggleFavorite: (id: string) => void;
  onImport?: (paths?: string[]) => void;
  viewMode?: 'grid' | 'list' | 'board';
}

export const Gallery: React.FC<GalleryProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  onPreviewAsset,
  onToggleFavorite,
  onImport,
  viewMode = 'grid'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

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
    // Send standard JSON representation for the drop target
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: asset.id,
      url: asset.url,
      title: asset.title
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

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

  return (
    <div
      className="gallery"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop zone overlay */}
      <div className={`drop-zone ${isDragOver ? 'drop-zone--active' : ''}`}>
        <div className="drop-zone__content">
          <IconUpload size={48} className="drop-zone__icon" />
          <div className="drop-zone__text">Drop files to import</div>
          <div className="drop-zone__hint">Images, videos, documents, and more</div>
        </div>
      </div>

      {/* Masonry-style grid or tabular list */}
      {viewMode === 'list' ? (
        <div className="gallery__layout--list">
          <div className="gallery__list-header" style={{
            display: 'grid',
            gridTemplateColumns: '48px 2fr 1fr 1fr 1.5fr 80px',
            padding: '8px 16px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
            fontWeight: 600,
            borderBottom: '1px solid var(--border-subtle)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <span>Preview</span>
            <span>Name</span>
            <span>Dimensions</span>
            <span>Size</span>
            <span>Tags</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {assets.map((asset) => {
            const isSelected = selectedAsset?.id === asset.id;
            return (
              <div
                key={asset.id}
                className={`gallery__list-row ${isSelected ? 'gallery__card--selected' : ''}`}
                onClick={() => onSelectAsset(asset)}
                onDoubleClick={() => onPreviewAsset && onPreviewAsset(asset)}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 2fr 1fr 1fr 1.5fr 80px',
                  alignItems: 'center',
                  padding: '8px 16px',
                  background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
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
                  {asset.title}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.filename}</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{asset.width} × {asset.height}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{asset.size}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(asset.tags || []).slice(0, 3).map(t => (
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
          })}
        </div>
      ) : (
        <div className={`gallery__layout--${viewMode}`}>
          {assets.map((asset) => {
            const isSelected = selectedAsset?.id === asset.id;
            const bgGradient = generateGradient(asset.palette);
            const aspectRatios = ['3/4', '4/3', '1/1', '3/2', '2/3', '16/9', '4/5'];
            const aspectRatio = aspectRatios[parseInt(asset.id) % aspectRatios.length];

            return (
              <div
                key={asset.id}
                className={`gallery__card ${isSelected ? 'gallery__card--selected' : ''}`}
                onClick={() => onSelectAsset(asset)}
                onDoubleClick={() => onPreviewAsset && onPreviewAsset(asset)}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
              >
                <div
                  className="gallery__card-image"
                  style={{
                    background: bgGradient,
                    aspectRatio,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <img 
                    src={asset.url} 
                    alt={asset.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    draggable={false}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
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
                </div>

                <div className="gallery__card-overlay">
                  <div 
                    className="gallery-item__image-wrapper"
                    draggable
                    onDragStart={(e) => handleDragStart(e, asset)}
                  >{asset.filename}</div>
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
          })}
        </div>
      )}
    </div>
  );
};


