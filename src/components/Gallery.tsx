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
  favorite: boolean;
  dateAdded: string;
  palette?: string[]; // Make palette optional since imported images won't have it initially
  url: string;
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
  onImport?: () => void;
}

export const Gallery: React.FC<GalleryProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  onPreviewAsset,
  onToggleFavorite,
  onImport
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
    // Future: handle file drops
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      console.log('Dropped files:', files.map(f => f.name));
    }
  }, []);

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
            <button className="btn btn--primary" onClick={onImport}>
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

      {/* Masonry-style grid */}
      <div className="gallery__grid">
        {assets.map((asset) => {
          const isSelected = selectedAsset?.id === asset.id;
          // Generate a visually rich placeholder using the asset's palette
          const bgGradient = generateGradient(asset.palette);
          // Randomize aspect ratios for visual interest in the masonry layout
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
              {/* Gradient placeholder that represents the asset's color palette */}
              <div
                className="gallery__card-image"
                style={{
                  background: bgGradient,
                  aspectRatio,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Noise texture overlay for realism */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.15,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                }} />
                {/* Title overlay inside the image */}
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

              {/* Hover overlay */}
              <div className="gallery__card-overlay">
                <div 
                  className="gallery-item__image-wrapper"
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset)}
                >{asset.filename}</div>
                <div className="gallery__card-meta">{asset.width}×{asset.height} · {asset.size}</div>
              </div>

              {/* Action buttons */}
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
                <button className="gallery__card-action" title="More">
                  <IconMoreHorizontal size={13} />
                </button>
              </div>

              {/* Favorite toggle */}
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
    </div>
  );
};


