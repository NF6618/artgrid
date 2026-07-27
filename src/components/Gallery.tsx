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
  palette: string[];
  url: string;
}

// Generate rich demo data
const DEMO_IMAGES: Asset[] = [
  { id: '1', title: 'Crystal Cave', filename: 'crystal_cave_ref.jpg', width: 1920, height: 1280, size: '2.4 MB', type: 'image/jpeg', tags: ['environment', 'fantasy', 'cave', 'crystals', 'lighting'], favorite: true, dateAdded: '2026-07-24', palette: ['#1a0533', '#5b2c8e', '#8b5cf6', '#c4b5fd', '#38bdf8'], url: '' },
  { id: '2', title: 'Desert Warrior', filename: 'desert_warrior.png', width: 1080, height: 1350, size: '3.1 MB', type: 'image/png', tags: ['character', 'warrior', 'desert', 'armor'], favorite: false, dateAdded: '2026-07-23', palette: ['#92400e', '#d97706', '#fbbf24', '#fef3c7', '#78350f'], url: '' },
  { id: '3', title: 'Neon Alley', filename: 'neon_alley_night.jpg', width: 1920, height: 1080, size: '1.8 MB', type: 'image/jpeg', tags: ['environment', 'cyberpunk', 'neon', 'urban', 'night'], favorite: true, dateAdded: '2026-07-22', palette: ['#0f0f23', '#1e1b4b', '#7c3aed', '#ec4899', '#06b6d4'], url: '' },
  { id: '4', title: 'Forest Spirit', filename: 'forest_spirit_concept.png', width: 1200, height: 1600, size: '4.2 MB', type: 'image/png', tags: ['character', 'fantasy', 'spirit', 'forest', 'nature'], favorite: false, dateAdded: '2026-07-21', palette: ['#064e3b', '#047857', '#34d399', '#a7f3d0', '#312e81'], url: '' },
  { id: '5', title: 'Mech Blueprint', filename: 'mech_blueprint_v3.png', width: 2400, height: 1600, size: '5.6 MB', type: 'image/png', tags: ['prop', 'sci-fi', 'mech', 'blueprint', 'technical'], favorite: false, dateAdded: '2026-07-20', palette: ['#0c1929', '#1e3a5f', '#3b82f6', '#93c5fd', '#e0f2fe'], url: '' },
  { id: '6', title: 'Golden Hour Portrait', filename: 'golden_hour_portrait.jpg', width: 1080, height: 1440, size: '1.6 MB', type: 'image/jpeg', tags: ['portrait', 'lighting', 'golden-hour', 'photography'], favorite: true, dateAdded: '2026-07-19', palette: ['#451a03', '#b45309', '#f59e0b', '#fde68a', '#fffbeb'], url: '' },
  { id: '7', title: 'Underwater Ruins', filename: 'underwater_ruins.jpg', width: 1920, height: 1080, size: '2.8 MB', type: 'image/jpeg', tags: ['environment', 'underwater', 'ruins', 'ancient', 'lighting'], favorite: false, dateAdded: '2026-07-18', palette: ['#042f2e', '#0d9488', '#2dd4bf', '#99f6e4', '#164e63'], url: '' },
  { id: '8', title: 'Dragon Scale Study', filename: 'dragon_scales.png', width: 1600, height: 1200, size: '3.8 MB', type: 'image/png', tags: ['texture', 'dragon', 'scales', 'material', 'fantasy'], favorite: false, dateAdded: '2026-07-17', palette: ['#1c1917', '#44403c', '#78716c', '#059669', '#10b981'], url: '' },
  { id: '9', title: 'Space Station Interior', filename: 'space_station_int.jpg', width: 2560, height: 1440, size: '4.1 MB', type: 'image/jpeg', tags: ['environment', 'sci-fi', 'interior', 'space', 'clean'], favorite: true, dateAdded: '2026-07-16', palette: ['#18181b', '#27272a', '#52525b', '#3b82f6', '#f0f9ff'], url: '' },
  { id: '10', title: 'Potion Bottles', filename: 'potion_bottles_set.png', width: 1200, height: 900, size: '2.2 MB', type: 'image/png', tags: ['prop', 'fantasy', 'potion', 'glass', 'stilllife'], favorite: false, dateAdded: '2026-07-15', palette: ['#1e1b2e', '#4c1d95', '#7c3aed', '#22d3ee', '#a855f7'], url: '' },
  { id: '11', title: 'Autumn Armor', filename: 'autumn_armor_concept.jpg', width: 1400, height: 1800, size: '3.5 MB', type: 'image/jpeg', tags: ['character', 'armor', 'autumn', 'leaves', 'nature'], favorite: false, dateAdded: '2026-07-14', palette: ['#431407', '#9a3412', '#ea580c', '#fdba74', '#7f1d1d'], url: '' },
  { id: '12', title: 'Cloud Study', filename: 'cloud_study_002.jpg', width: 2000, height: 1200, size: '1.4 MB', type: 'image/jpeg', tags: ['nature', 'clouds', 'sky', 'study', 'atmospheric'], favorite: false, dateAdded: '2026-07-13', palette: ['#1e3a5f', '#3b82f6', '#60a5fa', '#bfdbfe', '#f0f9ff'], url: '' },
  { id: '13', title: 'Gothic Cathedral', filename: 'gothic_cathedral.jpg', width: 1800, height: 2400, size: '4.8 MB', type: 'image/jpeg', tags: ['architecture', 'gothic', 'cathedral', 'medieval', 'stone'], favorite: true, dateAdded: '2026-07-12', palette: ['#1c1917', '#44403c', '#78716c', '#a8a29e', '#d6d3d1'], url: '' },
  { id: '14', title: 'Bioluminescent Flora', filename: 'biolum_flora.png', width: 1600, height: 1200, size: '3.3 MB', type: 'image/png', tags: ['nature', 'fantasy', 'bioluminescent', 'flora', 'glow'], favorite: false, dateAdded: '2026-07-11', palette: ['#0a0a1a', '#042f2e', '#0d9488', '#2dd4bf', '#d946ef'], url: '' },
  { id: '15', title: 'Steampunk Gadgets', filename: 'steampunk_gadgets.jpg', width: 1400, height: 1050, size: '2.7 MB', type: 'image/jpeg', tags: ['prop', 'steampunk', 'gadget', 'brass', 'vintage'], favorite: false, dateAdded: '2026-07-10', palette: ['#292524', '#78350f', '#b45309', '#d97706', '#fbbf24'], url: '' },
  { id: '16', title: 'Ice Palace Exterior', filename: 'ice_palace.png', width: 2560, height: 1440, size: '5.1 MB', type: 'image/png', tags: ['environment', 'fantasy', 'ice', 'palace', 'winter'], favorite: true, dateAdded: '2026-07-09', palette: ['#0c1929', '#1e3a5f', '#38bdf8', '#bae6fd', '#f0f9ff'], url: '' },
];

// Procedural gradient thumbnails based on palette
const generateGradient = (palette: string[]): string => {
  if (palette.length < 2) return palette[0] || '#333';
  const stops = palette.map((c, i) => `${c} ${(i / (palette.length - 1)) * 100}%`).join(', ');
  const angle = Math.floor(Math.random() * 360);
  return `linear-gradient(${angle}deg, ${stops})`;
};

interface GalleryProps {
  assets: Asset[];
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  onToggleFavorite: (id: string) => void;
}

export const Gallery: React.FC<GalleryProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  onToggleFavorite,
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
            <button className="btn btn--primary">
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
                <div className="gallery__card-title">{asset.filename}</div>
                <div className="gallery__card-meta">{asset.width}×{asset.height} · {asset.size}</div>
              </div>

              {/* Action buttons */}
              <div className="gallery__card-actions">
                <button className="gallery__card-action" title="Preview">
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

// Export demo data for use in other components
export { DEMO_IMAGES };
