import React, { useState } from 'react';
import { Asset } from '../../../../components/Gallery';

interface LibraryTabProps {
  assets: Asset[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  collections: any[];
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  assets,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
  collections,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  return (
    <div 
      style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: '100%' }}
      onClick={() => setSelectedIds([])}
    >
      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          placeholder="Search assets..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            color: '#fff',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent-primary)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              color: '#e2e8f0',
              fontSize: '12px',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Collections</option>
            {collections.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              color: '#e2e8f0',
              fontSize: '12px',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="date">Date Modified</option>
            <option value="title">Name A–Z</option>
            <option value="size">File Size</option>
          </select>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {assets.length} Result{assets.length !== 1 ? 's' : ''}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {assets.map(asset => {
          const isSelected = selectedIds.includes(asset.id);
          
          return (
          <div
            key={asset.id}
            draggable
            onClick={(e) => {
              e.stopPropagation();
              if (e.shiftKey && lastSelectedId) {
                const currentIndex = assets.findIndex(a => a.id === asset.id);
                const lastIndex = assets.findIndex(a => a.id === lastSelectedId);
                if (currentIndex !== -1 && lastIndex !== -1) {
                  const start = Math.min(currentIndex, lastIndex);
                  const end = Math.max(currentIndex, lastIndex);
                  const rangeIds = assets.slice(start, end + 1).map(a => a.id);
                  const newSelection = new Set([...selectedIds, ...rangeIds]);
                  setSelectedIds(Array.from(newSelection));
                }
              } else if (e.ctrlKey || e.metaKey) {
                if (isSelected) {
                  setSelectedIds(selectedIds.filter(id => id !== asset.id));
                } else {
                  setSelectedIds([...selectedIds, asset.id]);
                }
                setLastSelectedId(asset.id);
              } else {
                setSelectedIds([asset.id]);
                setLastSelectedId(asset.id);
              }
            }}
            onDragStart={e => {
              let idsToDrag = isSelected ? selectedIds : [asset.id];
              const dragAssets = assets
                .filter(a => idsToDrag.includes(a.id))
                .map(a => ({ id: a.id, url: a.url, title: a.title, width: a.width, height: a.height, thumbnail_url: a.thumbnail_url }));
              
              (window as any).__artgridDragAsset = dragAssets;
              e.dataTransfer.setData('application/json', JSON.stringify(dragAssets));
              e.dataTransfer.setData('text/plain', dragAssets.map(a => a.url).join('\n'));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onDragEnd={() => { (window as any).__artgridDragAsset = null; }}
            style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.2)',
              cursor: 'grab',
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease',
              border: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
            }}
            onMouseEnter={e => { (e.currentTarget.style.transform = 'scale(1.05)'); (e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.4)'); }}
            onMouseLeave={e => { (e.currentTarget.style.transform = 'scale(1)'); (e.currentTarget.style.boxShadow = 'none'); }}
            title={`${asset.title} — Click to select, Drag onto board`}
          >
            <img src={asset.thumbnail_url || asset.url} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '24px 8px 8px 8px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                pointerEvents: 'none',
              }}
            >
              {asset.title}
            </div>
            
            {isSelected && selectedIds.length > 1 && (
              <div style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'var(--accent-primary)',
                color: '#fff',
                width: 20,
                height: 20,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
              }}>
                {selectedIds.length}
              </div>
            )}
          </div>
        )})}
      </div>
      {assets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
          No assets match your filters.
        </div>
      )}
    </div>
  );
};
