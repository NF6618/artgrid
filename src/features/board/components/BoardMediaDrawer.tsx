import React, { useState } from 'react';
import { ArtGridNode } from '../engine/types';
import { Asset } from '../../../components/Gallery';
import { LibraryTab } from './drawer/LibraryTab';
import { LayersTab } from './drawer/LayersTab';
import { Panel } from '../../../components/ui/Panel';

interface Board {
  id: string;
  name: string;
  nodes: ArtGridNode[];
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
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
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
  isCollapsed,
  setIsCollapsed,
}) => {
  const [mediaDrawerTab, setMediaDrawerTab] = useState<'library' | 'layers'>('library');

  return (
    <Panel
      style={{
        position: 'absolute',
        top: 20,
        left: isCollapsed ? -300 : 20,
        width: 280,
        bottom: 20,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 900,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto',
      }}
    >
      {/* Drawer Toggle Tab (sticks out when collapsed) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          top: 24,
          right: isCollapsed ? -48 : -16,
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
        title={isCollapsed ? 'Open Media Drawer' : 'Close Media Drawer'}
      >
        {isCollapsed ? '▶' : '◀'}
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
          <LibraryTab
            assets={boardFilteredAssets}
            searchQuery={boardSearchQuery}
            setSearchQuery={setBoardSearchQuery}
            categoryFilter={boardCategoryFilter}
            setCategoryFilter={setBoardCategoryFilter}
            sortBy={boardSortBy}
            setSortBy={setBoardSortBy}
            collections={collections}
          />
        )}

        {mediaDrawerTab === 'layers' && (
          <LayersTab
            nodes={boards.find(b => b.id === currentBoardId)?.nodes || []}
            assets={assets}
            standaloneAllAssets={standaloneAllAssets}
          />
        )}
      </div>
    </Panel>
  );
};
