import React, { useState, useEffect, useRef } from 'react';
import { useMetadataStore, Collection } from '../stores/useMetadataStore';
import { useBoardStore } from '../stores/useBoardStore';
import { Asset } from './Gallery';
import { IconClose, IconPlus, IconArchive, IconTrash, IconMaximize, IconPencil, IconFileText, IconScanText } from './Icons';
import { invoke } from '@tauri-apps/api/core';
import { analyzePalette } from '../utils/colorTheory';

interface DetailPanelProps {
  asset: Asset | null;
  visible: boolean;
  onClose: () => void;
  onAssetsUpdated?: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ asset, visible, onClose, onAssetsUpdated }) => {
  const { addTagToAsset, removeTagFromAsset, collections, createCollection, addAssetToCollection, removeAssetFromCollection } = useMetadataStore();
  const { activeBoardId, addAssetToBoard } = useBoardStore();

  const [addedSuccess, setAddedSuccess] = useState(false);
  const [showOcrText, setShowOcrText] = useState(false);
  const [newTag, setNewTag] = useState('');

  const [isAddingTag, setIsAddingTag] = useState(false);

  // Inline collection creation state
  const [isCreatingCol, setIsCreatingCol] = useState(false);
  const [newColName, setNewColName] = useState('');

  // Notes state & debouncing
  const [notesText, setNotesText] = useState('');
  const debounceTimerRef = useRef<any>(null);

  // Unified Name editing state (updates both title and filename together)
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (asset) {
      setNotesText(asset.notes || '');
      const nameWithoutExt = asset.title || asset.filename.replace(/\.[^.]+$/, '');
      setEditName(nameWithoutExt);
      setIsEditingName(false);
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

  const handleCreateCollection = async () => {
    if (newColName.trim() && asset) {
      const created = await createCollection(newColName.trim(), '#7c6bf0');
      await addAssetToCollection(asset.id, created.id);
      setNewColName('');
      setIsCreatingCol(false);
      if (onAssetsUpdated) onAssetsUpdated();
    }
  };

  const handleSaveName = async () => {
    if (!asset || !editName.trim()) return;
    const originalExt = asset.filename.includes('.') 
      ? '.' + asset.filename.split('.').pop() 
      : '';
    const newTitle = editName.trim();
    const newFilename = newTitle + originalExt;
    try {
      await invoke('rename_asset', { id: asset.id, newTitle, newFilename });
      setIsEditingName(false);
      if (onAssetsUpdated) onAssetsUpdated();
    } catch (err) {
      console.error('Failed to rename asset:', err);
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

  const safeType = (asset?.type || '').toLowerCase();
  const safeFilename = (asset?.filename || '').toLowerCase();

  const isPDF = safeType === 'application/pdf' || safeFilename.endsWith('.pdf');

  const getReadableFileType = (type?: string, filename?: string): string => {
    const t = (type || '').toLowerCase();
    const f = (filename || '').toLowerCase();
    if (t === 'application/pdf' || f.endsWith('.pdf')) return 'PDF Document';
    if (t.includes('png') || f.endsWith('.png')) return 'PNG Image';
    if (t.includes('jpeg') || t.includes('jpg') || f.endsWith('.jpg') || f.endsWith('.jpeg')) return 'JPEG Photo';
    if (t.includes('webp') || f.endsWith('.webp')) return 'WebP Image';
    if (t.includes('gif') || f.endsWith('.gif')) return 'Animated GIF';
    if (t.includes('plain') || f.endsWith('.txt')) return 'Plain Text Note';
    if (f.endsWith('.md')) return 'Markdown Document';
    return (type || f.split('.').pop() || 'Unknown').toUpperCase();
  };

  const colorTheory = analyzePalette(asset.palette);

  // Flatten nested collections for select dropdown with depth indentation
  const flattenCollections = (cols: Collection[], depth = 0): { id: string; name: string; label: string }[] => {
    let result: { id: string; name: string; label: string }[] = [];
    cols.forEach(c => {
      const indent = '— '.repeat(depth);
      result.push({ id: c.id, name: c.name, label: `${indent}${c.name}` });
      if (c.children && c.children.length > 0) {
        result = result.concat(flattenCollections(c.children, depth + 1));
      }
    });
    return result;
  };

  const flatCollectionList = flattenCollections(collections);

  return (
    <div className="detail-panel">
      <div className="detail-panel__header">
        <span className="detail-panel__title">Details</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button 
            className="toolbar__btn" 
            title="Open Media Viewer" 
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

      {/* Media / PDF Preview Banner */}
      <div 
        className="detail-panel__preview" 
        onClick={() => (window as any).__artgridOpenPreviewAsset?.(asset)}
        style={{ cursor: 'pointer' }}
        title="Click to Open Full Media Viewer"
      >
        {isPDF ? (
          <div
            style={{
              width: '100%',
              height: 180,
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(124, 107, 240, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <IconFileText size={36} style={{ color: 'var(--accent-primary)', opacity: 0.9 }} />
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
              {asset.title}
            </div>
            <div style={{ fontSize: '10px', color: '#a5b4fc', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4 }}>
              PDF Document
            </div>
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: `${asset.width || 4}/${asset.height || 3}`,
              maxHeight: 200,
              background: 'var(--bg-tertiary)',
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
        )}
      </div>

      {/* Scrollable Content */}
      <div className="detail-panel__content">
        {/* 1. Basic Metadata Section */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Info</div>
          
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Name</span>
            {isEditingName ? (
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                <input 
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  style={{ flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--accent-primary)', padding: '2px 6px', borderRadius: 4, outline: 'none' }}
                />
                <button className="btn btn--primary" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={handleSaveName}>Save</button>
              </div>
            ) : (
              <span className="detail-panel__field-value" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setIsEditingName(true)} title="Click to rename">
                {asset.title} <IconPencil size={10} />
              </span>
            )}
          </div>

          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Filename</span>
            <span className="detail-panel__field-value" style={{ opacity: 0.7, fontSize: '11px' }}>{asset.filename}</span>
          </div>

          <div className="detail-panel__field">
            <span className="detail-panel__field-label">File Type</span>
            <span className="detail-panel__field-value" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              {getReadableFileType(asset.type, asset.filename)}
            </span>
          </div>
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Size</span>
            <span className="detail-panel__field-value">{asset.size}</span>
          </div>
          {!isPDF && (
            <div className="detail-panel__field">
              <span className="detail-panel__field-label">Dimensions</span>
              <span className="detail-panel__field-value">{asset.width} × {asset.height}</span>
            </div>
          )}
          <div className="detail-panel__field">
            <span className="detail-panel__field-label">Added</span>
            <span className="detail-panel__field-value">{asset.dateAdded}</span>
          </div>
        </div>

        {/* 1.5. Reference Board Page Pulling & Document Context */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Board Integration & Document Context</div>
          
          <button
            className="btn btn--primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              background: addedSuccess
                ? '#10b981'
                : 'linear-gradient(135deg, var(--accent-primary) 0%, #6366f1 100%)',
              transition: 'all 0.2s'
            }}
            onClick={async () => {
              if (!activeBoardId) {
                alert('Please open or select a Reference Board first!');
                return;
              }
              await addAssetToBoard(activeBoardId, asset);
              setAddedSuccess(true);
              setTimeout(() => setAddedSuccess(false), 2000);
            }}
          >
            <IconPlus size={14} /> {addedSuccess ? 'Pulled to Board' : 'Add to Active Board'}
          </button>

          {(asset.document_title || asset.page_number) && (
            <div style={{ marginTop: 12, background: 'var(--bg-secondary)', padding: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                <IconFileText size={12} /> Parent Document
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 2 }}>
                {asset.document_title || asset.title}
              </div>
              {asset.page_number && (
                <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  Page {asset.page_number}
                </div>
              )}
            </div>
          )}

          {asset.page_text && (
            <div style={{ marginTop: 10 }}>
              <button
                className="btn btn--secondary"
                style={{ width: '100%', fontSize: '10px', padding: '4px 8px', justifyContent: 'space-between', display: 'flex' }}
                onClick={() => setShowOcrText(!showOcrText)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconScanText size={12} /> Extracted OCR Text</span>
                <span>{showOcrText ? '▲ Hide' : '▼ View'}</span>
              </button>

              {showOcrText && (
                <div style={{
                  marginTop: 6,
                  maxHeight: 140,
                  overflowY: 'auto',
                  background: 'var(--bg-secondary)',
                  padding: 8,
                  borderRadius: 4,
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: 'var(--text-muted)',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {asset.page_text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Color Theory Palette Breakdown */}
        {asset.palette && asset.palette.length > 0 && (
          <div className="detail-panel__section">
            <div className="detail-panel__section-title">Color Theory Analysis</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Left-to-Right Color Harmony Bar */}
              <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', width: '100%', border: '1px solid var(--border-subtle)' }}>
                {asset.palette.map((c, i) => (
                  <div key={i} style={{ flex: 1, background: c }} title={c} />
                ))}
              </div>

              {/* Color Tiers */}
              {[
                { title: 'Dominant Colors', colors: colorTheory.dominant },
                { title: 'Primary', colors: colorTheory.primary },
                { title: 'Secondary', colors: colorTheory.secondary },
                { title: 'Accents', colors: colorTheory.accents },
              ].map(tier => (
                tier.colors.length > 0 && (
                  <div key={tier.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{tier.title}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {tier.colors.map((c, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div
                            style={{ width: 14, height: 14, borderRadius: 3, background: c.hex, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                            title={`${c.hex} (${c.family} - ${c.percentage}%)`}
                            onClick={() => navigator.clipboard.writeText(c.hex)}
                          />
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{c.family}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* 3. Tags & Collections Section */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Tags & Categories</div>
          
          {/* Tags List */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>
              Tags
            </div>
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
                  Add Tag
                </span>
              )}
            </div>
          </div>

          {/* Collections & Sub-Collections List */}
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>
              Collections & Sub-Collections
            </div>
            <div className="tags">
              {asset.collections?.map(colId => {
                 const findName = (cols: Collection[], id: string): string => {
                   for (const c of cols) {
                     if (c.id === id) return c.name;
                     if (c.children) {
                       const n = findName(c.children, id);
                       if (n) return `${c.name} > ${n}`;
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
                  if (e.target.value === '__new__') {
                    setIsCreatingCol(true);
                  } else if (e.target.value) {
                    await addAssetToCollection(asset.id, e.target.value);
                    if (onAssetsUpdated) onAssetsUpdated();
                  }
                }}
              >
                <option value="" disabled>+ Add Collection</option>
                {flatCollectionList.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
                <option value="__new__">+ Create New Collection...</option>
              </select>
            </div>

            {/* Inline Collection Creation Input */}
            {isCreatingCol && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  autoFocus
                  placeholder="Collection name..."
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: 4, background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', color: '#ffffff', fontSize: '11px' }}
                />
                <button className="btn btn--primary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={handleCreateCollection}>Create</button>
                <button className="btn btn--secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setIsCreatingCol(false)}>✕</button>
              </div>
            )}
          </div>
        </div>

        {/* 4. Notes Section (Organized directly BELOW Tags & Collections) */}
        <div className="detail-panel__section">
          <div className="detail-panel__section-title">Notes</div>
          <textarea
            placeholder="Add notes about this asset..."
            value={notesText}
            onChange={(e) => handleNotesChange(e.target.value)}
            style={{
              width: '100%',
              minHeight: 110,
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
      </div>
    </div>
  );
};
