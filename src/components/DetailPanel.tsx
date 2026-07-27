import React, { useState, useEffect, useRef } from 'react';
import { useMetadataStore } from '../stores/useMetadataStore';
import { Asset } from './Gallery';
import { IconClose, IconPlus, IconArchive, IconTrash, IconMaximize } from './Icons';
import { invoke } from '@tauri-apps/api/core';

interface DetailPanelProps {
  asset: Asset | null;
  visible: boolean;
  onClose: () => void;
  onAssetsUpdated?: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ asset, visible, onClose, onAssetsUpdated }) => {
  const { addTagToAsset, removeTagFromAsset, collections, addAssetToCollection, removeAssetFromCollection } = useMetadataStore();
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Notes state & debouncing
  const [notesText, setNotesText] = useState('');
  const debounceTimerRef = useRef<any>(null);

  // Title & Filename editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingFilename, setIsEditingFilename] = useState(false);
  const [editFilename, setEditFilename] = useState('');

  useEffect(() => {
    if (asset) {
      setNotesText(asset.notes || '');
      setEditTitle(asset.title);
      setEditFilename(asset.filename);
      setIsEditingTitle(false);
      setIsEditingFilename(false);
    }
  }, [asset]);

  const handleNotesChange = (text: string) => {
    setNotesText(text);
    if (!asset) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await invoke('update_asset_notes', { id: asset.id, notes: text });
        if (onAssetsUpdated) onAssetsUpdated();
      } catch (err) {
        console.error('Failed to update asset notes:', err);
      }
    }, 400);
  };

  const handleAddTag = async () => {
    if (newTag.trim() && asset) {
      await addTagToAsset(asset.id, newTag.trim());
      setNewTag('');
      setIsAddingTag(false);
      if (onAssetsUpdated) onAssetsUpdated();
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (!asset) return;
    await removeTagFromAsset(asset.id, tagName);
    if (onAssetsUpdated) onAssetsUpdated();
  };

  const handleSaveTitle = async () => {
    if (!asset || !editTitle.trim()) return;
    try {
      await invoke('rename_asset', { id: asset.id, newTitle: editTitle.trim(), newFilename: asset.filename });
      setIsEditingTitle(false);
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error('Failed to rename asset title:', err);
    }
  };

  const handleSaveFilename = async () => {
    if (!asset || !editFilename.trim()) return;
    try {
      await invoke('rename_asset', { id: asset.id, newTitle: asset.title, newFilename: editFilename.trim() });
      setIsEditingFilename(false);
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error('Failed to rename asset filename:', err);
    }
  };

  const handleToggleArchive = async () => {
    if (!asset) return;
    try {
      await invoke('archive_asset', { id: asset.id, archived: !asset.archived });
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error('Failed to toggle archive:', err);
    }
  };

  const handleToggleTrash = async () => {
    if (!asset) return;
    try {
      await invoke('trash_asset', { id: asset.id, trashed: !asset.trashed });
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error('Failed to toggle trash:', err);
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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button 
            className="toolbar__btn" 
            title="Pop-out Media Viewer Window" 
            onClick={() => (window as any).__artgridOpenPreviewAsset?.(asset)}
          >
            <IconMaximize size={14} />
          </button>
          <button 
            className="toolbar__btn" 
            title={asset.archived ? "Unarchive" : "Archive Asset"} 
            onClick={handleToggleArchive}
            style={{ color: asset.archived ? 'var(--accent-primary)' : 'inherit' }}
          >
            <IconArchive size={14} />
          </button>
          <button 
            className="toolbar__btn" 
            title={asset.trashed ? "Restore from Trash" : "Move to Trash"} 
            onClick={handleToggleTrash}
            style={{ color: asset.trashed ? 'var(--color-error)' : 'inherit' }}
          >
            <IconTrash size={14} />
          </button>
          <button className="detail-panel__close" onClick={onClose}>
            <IconClose size={12} />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div 
        className="detail-panel__preview" 
        onClick={() => (window as any).__artgridOpenPreviewAsset?.(asset)}
        style={{ cursor: 'pointer' }}
        title="Click to Open Standalone Media Viewer Window"
      >
        <div
          style={{
            width: '100%',
            aspectRatio: `${asset.width || 4}/${asset.height || 3}`,
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
          <img src={asset.url} alt={asset.title} style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="detail-panel__content">
        {/* Info & Renaming Section */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Info</div>
          
          {/* Title Field */}
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Name</span>
            {isEditingTitle ? (
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                <input 
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                  style={{ flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '2px 6px', borderRadius: 4 }}
                />
                <button className="btn btn--primary" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={handleSaveTitle}>Save</button>
              </div>
            ) : (
              <span className="detail-panel__field-value" style={{ cursor: 'pointer' }} onClick={() => setIsEditingTitle(true)} title="Click to rename title">
                {asset.title} ✏️
              </span>
            )}
          </div>

          {/* Filename Field */}
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Filename</span>
            {isEditingFilename ? (
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                <input 
                  autoFocus
                  value={editFilename}
                  onChange={e => setEditFilename(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveFilename()}
                  style={{ flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '2px 6px', borderRadius: 4 }}
                />
                <button className="btn btn--primary" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={handleSaveFilename}>Save</button>
              </div>
            ) : (
              <span className="detail-panel__field-value" style={{ cursor: 'pointer' }} onClick={() => setIsEditingFilename(true)} title="Click to rename filename">
                {asset.filename} ✏️
              </span>
            )}
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

        {/* Color Profile Swatches */}
        {asset.palette && asset.palette.length > 0 && (
          <div className="detail-panel__section">
            <div className="detail-panel__section-title">Color Palette</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {asset.palette.map((c, i) => (
                <div 
                  key={i} 
                  title={c}
                  style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: 4, 
                    background: c, 
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    cursor: 'pointer'
                  }} 
                  onClick={() => navigator.clipboard.writeText(c)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Tags</div>
          <div className="tags">
            {(asset.tags || []).map(tag => (
              <span key={tag} className="tag">
                {tag}
                <span 
                  style={{ cursor: 'pointer', marginLeft: 6, opacity: 0.6 }} 
                  onClick={() => handleRemoveTag(tag)}
                >
                  ×
                </span>
              </span>
            ))}
            {isAddingTag ? (
              <input 
                autoFocus
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onBlur={handleAddTag}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', width: 80, padding: '2px 4px', fontSize: '10px' }}
              />
            ) : (
              <span className="tag tag--add" onClick={() => setIsAddingTag(true)}>
                <IconPlus size={10} />
                Add
              </span>
            )}
          </div>
        </div>

        {/* Notes (Debounced SQLite Persistence) */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Notes</div>
          <textarea
            placeholder="Add notes about this asset..."
            value={notesText}
            onChange={(e) => handleNotesChange(e.target.value)}
            style={{
              width: '100%',
              minHeight: 90,
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
            {asset.collections?.map(colId => {
               const findName = (cols: any[], id: string): string => {
                 for (const c of cols) {
                   if (c.id === id) return c.name;
                   if (c.children) {
                     const n = findName(c.children, id);
                     if (n) return n;
                   }
                 }
                 return id;
               };
               const colName = findName(collections, colId);
               return (
                 <span key={colId} className="tag" style={{ background: 'var(--bg-tertiary)' }}>
                   {colName}
                   <span 
                     style={{ cursor: 'pointer', marginLeft: 6, opacity: 0.6 }} 
                     onClick={async () => {
                       await removeAssetFromCollection(asset.id, colId);
                       if (onAssetsUpdated) onAssetsUpdated();
                     }}
                   >
                     ×
                   </span>
                 </span>
               );
            })}
            
            <select 
              className="tag tag--add" 
              style={{ background: 'transparent', border: '1px dashed var(--border-subtle)', outline: 'none', cursor: 'pointer' }}
              value=""
              onChange={async (e) => {
                if (e.target.value) {
                  await addAssetToCollection(asset.id, e.target.value);
                  if (onAssetsUpdated) onAssetsUpdated();
                }
              }}
            >
              <option value="" disabled>+ Add</option>
              {collections.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
