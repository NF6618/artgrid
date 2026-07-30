import React, { useState } from 'react';
import { IconPencil } from '../../../components/Icons';

interface Asset {
  id: string;
  url: string;
  title: string;
  width?: number;
  height?: number;
}

interface Node {
  id: string;
  type: string;
  title?: string;
  text?: string;
  assetId?: string;
}

interface Board {
  id: string;
  name: string;
  nodes: Node[];
}

interface BoardMediaDrawerProps {
  boardFilteredAssets: Asset[];
  boards: Board[];
  currentBoardId: string | null;
  collections: any[];
  boardSearchQuery: string;
  setBoardSearchQuery: (query: string) => void;
  boardCategoryFilter: string;
  setBoardCategoryFilter: (filter: string) => void;
  boardSortBy: string;
  setBoardSortBy: (sort: string) => void;
  standaloneAllAssets: Asset[];
  assets: Asset[];
}

export const BoardMediaDrawer: React.FC<BoardMediaDrawerProps> = ({
  boardFilteredAssets,
  boards,
  currentBoardId,
  collections,
  boardSearchQuery,
  setBoardSearchQuery,
  boardCategoryFilter,
  setBoardCategoryFilter,
  boardSortBy,
  setBoardSortBy,
  standaloneAllAssets,
  assets,
}) => {
  const [isMediaDrawerCollapsed, setIsMediaDrawerCollapsed] = useState(false);
  const [mediaDrawerTab, setMediaDrawerTab] = useState<'library' | 'layers'>('library');

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: isMediaDrawerCollapsed ? -300 : 20,
        width: 280,
        bottom: 20,
        background: 'rgba(20, 20, 25, 0.75)',
        backdropFilter: 'blur(32px) saturate(150%)',
        WebkitBackdropFilter: 'blur(32px) saturate(150%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 900,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto',
      }}
    >
      {/* Drawer Toggle Tab (sticks out when collapsed) */}
      <button
        onClick={() => setIsMediaDrawerCollapsed(v => !v)}
        style={{
          position: 'absolute',
          top: 24,
          right: isMediaDrawerCollapsed ? -48 : -16,
          width: 32,
          height: 32,
          background: 'rgba(20, 20, 25, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 8,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          zIndex: 901,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
        }}
        title={isMediaDrawerCollapsed ? 'Open Media Drawer' : 'Close Media Drawer'}
      >
        {isMediaDrawerCollapsed ? '▶' : '◀'}
      </button>

      {/* Header Tabs */}
      <div style={{ padding: '24px 20px 16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: '0 0 16px 0', letterSpacing: '-0.3px' }}>
          Assets & Layers
        </h2>
        <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 10 }}>
          <button
            onClick={() => setMediaDrawerTab('library')}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 500,
              background: mediaDrawerTab === 'library' ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: mediaDrawerTab === 'library' ? '#fff' : 'rgba(255,255,255,0.5)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: mediaDrawerTab === 'library' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            Library
          </button>
          <button
            onClick={() => setMediaDrawerTab('layers')}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 500,
              background: mediaDrawerTab === 'layers' ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: mediaDrawerTab === 'layers' ? '#fff' : 'rgba(255,255,255,0.5)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: mediaDrawerTab === 'layers' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            Layers
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {mediaDrawerTab === 'library' && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                placeholder="Search assets..."
                value={boardSearchQuery}
                onChange={e => setBoardSearchQuery(e.target.value)}
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
                  value={boardCategoryFilter}
                  onChange={e => setBoardCategoryFilter(e.target.value)}
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
                  value={boardSortBy}
                  onChange={e => setBoardSortBy(e.target.value)}
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
              {boardFilteredAssets.length} Result{boardFilteredAssets.length !== 1 ? 's' : ''}
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {boardFilteredAssets.map(asset => (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={e => {
                    const dataObj = { id: asset.id, url: asset.url, title: asset.title, width: asset.width, height: asset.height };
                    (window as any).__artgridDragAsset = dataObj;
                    e.dataTransfer.setData('application/json', JSON.stringify(dataObj));
                    e.dataTransfer.setData('text/plain', asset.url);
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
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget.style.transform = 'scale(1.05)'); (e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.4)'); }}
                  onMouseLeave={e => { (e.currentTarget.style.transform = 'scale(1)'); (e.currentTarget.style.boxShadow = 'none'); }}
                  title={`${asset.title} — Drag onto board`}
                >
                  <img src={asset.url} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
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
                </div>
              ))}
            </div>
            {boardFilteredAssets.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                No assets match your filters.
              </div>
            )}
          </div>
        )}

        {mediaDrawerTab === 'layers' && (() => {
          const activeBoardNodes = boards.find(b => b.id === currentBoardId)?.nodes || [];
          return (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Layers ({activeBoardNodes.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeBoardNodes.map((node: any) => (
                  <div key={node.id} style={{ 
                    padding: '10px 14px', 
                    background: 'rgba(0,0,0,0.2)', 
                    borderRadius: '10px', 
                    fontSize: '13px', 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: node.type === 'section' ? '#7c6bf0' : node.type === 'image' ? '#22d3ee' : '#fef08a' }} />
                      <span style={{ fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {node.type.charAt(0).toUpperCase() + node.type.slice(1)} {node.title ? `- ${node.title}` : node.text ? `- ${node.text}` : ''}
                      </span>
                    </div>
                    {node.type === 'image' && node.assetId && (
                      <button 
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: '11px', 
                          background: 'rgba(124, 107, 240, 0.15)', 
                          color: '#a78bfa', 
                          border: 'none', 
                          borderRadius: 6, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 4,
                          cursor: 'pointer',
                        }} 
                        onClick={(e) => {
                          e.stopPropagation();
                          const ast = assets.find(a => a.id === node.assetId) || standaloneAllAssets.find(a => a.id === node.assetId);
                          if (ast && (window as any).__artgridOpenPreviewAsset) {
                            (window as any).__artgridOpenPreviewAsset(ast, node.id);
                          }
                        }}
                      >
                        <IconPencil size={12} /> Studio
                      </button>
                    )}
                  </div>
                ))}
                {activeBoardNodes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    No layers on this board.
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
