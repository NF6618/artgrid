import React, { useState } from 'react';
import { useMetadataStore } from '../stores/useMetadataStore';
import { Asset } from './Gallery';
import { IconClose, IconPlus } from './Icons';

interface DetailPanelProps {
  asset: Asset | null;
  visible: boolean;
  onClose: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ asset, visible, onClose }) => {
  const { addTagToAsset } = useMetadataStore();
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const handleAddTag = async () => {
    if (newTag.trim() && asset) {
      await addTagToAsset(asset.id, newTag.trim());
      if (!asset.tags.includes(newTag.trim())) {
        asset.tags.push(newTag.trim());
      }
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  if (!visible) return null;

  if (!asset) {
    return (
      <div className="detail-panel">
        <div className="detail-panel__header">
          <span className="detail-panel__title">Details</span>
          <button className="detail-panel__close" onClick={onClose}>
            <IconClose size={12} />
          </button>
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-6)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}>
          Select an asset to view details
        </div>
      </div>
    );
  }

  const generateGradient = (palette?: string[]): string => {
    if (!palette || palette.length < 2) return (palette && palette[0]) || '#333';
    const stops = palette.map((c, i) => `${c} ${(i / (palette.length - 1)) * 100}%`).join(', ');
    return `linear-gradient(135deg, ${stops})`;
  };

  return (
    <div className="detail-panel">
      <div className="detail-panel__header">
        <span className="detail-panel__title">Details</span>
        <button className="detail-panel__close" onClick={onClose}>
          <IconClose size={12} />
        </button>
      </div>

      {/* Preview */}
      <div className="detail-panel__preview">
        <div
          style={{
            width: '100%',
            aspectRatio: `${asset.width}/${asset.height}`,
            maxHeight: 200,
            background: generateGradient(asset.palette),
            borderRadius: 'var(--radius-md)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.12,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
          }} />
          <img src={asset.url} alt={asset.title} style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="detail-panel__content">
        {/* Title */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Info</div>
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Name</span>
            <span className="detail-panel__field-value">{asset.title}</span>
          </div>
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Filename</span>
            <span className="detail-panel__field-value">{asset.filename}</span>
          </div>
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Type</span>
            <span className="detail-panel__field-value">{asset.type}</span>
          </div>
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Size</span>
            <span className="detail-panel__field-value">{asset.size}</span>
          </div>
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Dimensions</span>
            <span className="detail-panel__field-value">{asset.width} × {asset.height}</span>
          </div>
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Added</span>
            <span className="detail-panel__field-value">{asset.dateAdded}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Tags</div>
          <div className="tags">
            {asset.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
            {isAddingTag ? (
              <input 
                autoFocus
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onBlur={handleAddTag}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', width: 60, padding: '2px 4px', fontSize: '10px' }}
              />
            ) : (
              <span className="tag tag--add" onClick={() => setIsAddingTag(true)}>
                <IconPlus size={10} />
                Add
              </span>
            )}
          </div>
        </div>

        {/* Color Palette */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Color Palette</div>
          <div className="palette">
            {(asset.palette || []).map((color, i) => (
              <div
                key={i}
                className="palette__swatch"
                style={{ background: color }}
                title={color}
                onClick={() => navigator.clipboard.writeText(color)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-1)' }}>
            {(asset.palette || []).map((color, i) => (
              <span key={i} style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}>
                {color}
              </span>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Notes</div>
          <textarea
            placeholder="Add notes about this asset..."
            style={{
              width: '100%',
              minHeight: 80,
              padding: 'var(--space-2)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>

        {/* Collections */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Collections</div>
          <div className="tags">
            <span className="tag tag--add">
              <IconPlus size={10} />
              Add to Collection
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
