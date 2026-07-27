import React, { useState, useCallback } from 'react';
import { Titlebar } from './components/Titlebar';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Gallery, Asset } from './components/Gallery';
import { DetailPanel } from './components/DetailPanel';
import { StatusBar } from './components/StatusBar';
import { BoardCanvas } from './components/BoardCanvas';
import { BoardNode } from './types/board';
import { invoke } from '@tauri-apps/api/core';

import { useLibrary } from './hooks/useLibrary';
import { SettingsModal } from './components/SettingsModal';
import { FileViewerModal } from './components/FileViewerModal';

type ViewType = 'library' | 'boards' | 'graph' | 'search' | 'favorites' | 'recent' | 'untagged' | 'archive' | 'trash';
type ViewMode = 'grid' | 'list' | 'board';
export type ToolType = 'select' | 'pan';

const App: React.FC = () => {
  // Navigation state
  const [activeView, setActiveView] = useState<ViewType>('library');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Library state via Tauri
  const { assets, vaultPath, openVault, importFiles, setAssets } = useLibrary();
  
  // Data state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Board state
  const [boardNodes, setBoardNodes] = useState<BoardNode[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');

  // Handlers
  const handleSelectAsset = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    if (!showDetailPanel) {
      setShowDetailPanel(true);
    }
  }, [showDetailPanel]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setAssets(prev => prev.map(a =>
        a.id === id ? { ...a, favorite: !a.favorite } : a
      ));
      setSelectedAsset(prev =>
        prev?.id === id ? { ...prev, favorite: !prev.favorite } : prev
      );

      // Hit backend
      await invoke('toggle_favorite', { id });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      // Revert on failure
      setAssets(prev => prev.map(a =>
        a.id === id ? { ...a, favorite: !a.favorite } : a
      ));
      setSelectedAsset(prev =>
        prev?.id === id ? { ...prev, favorite: !prev.favorite } : prev
      );
    }
  }, [setAssets]);

  const handleToggleDetailPanel = useCallback(() => {
    setShowDetailPanel(prev => !prev);
  }, []);

  // Filter assets by search and active view
  let filteredAssets = assets;
  
  if (activeView === 'favorites') {
    filteredAssets = filteredAssets.filter(a => a.favorite);
  } else if (activeView === 'untagged') {
    filteredAssets = filteredAssets.filter(a => !a.tags || a.tags.length === 0);
  } else if (activeView === 'recent') {
    // For now just sort by newest (we'll assume they are generally sorted by date_added anyway)
    // or we can slice the first 50.
    filteredAssets = [...filteredAssets].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }

  if (searchQuery) {
    filteredAssets = filteredAssets.filter(a =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Get title based on active view
  const getViewTitle = () => {
    switch (activeView) {
      case 'library': return activeCollection ? 'Collection' : 'All Assets';
      case 'favorites': return 'Favorites';
      case 'recent': return 'Recent Imports';
      case 'untagged': return 'Untagged Assets';
      case 'boards': return 'Mood Boards';
      case 'graph': return 'Inspiration Graph';
      case 'search': return 'Search';
      default: return 'Library';
    }
  };

  return (
    <>
      {/* Custom Titlebar — hidden while using native decorations */}
      {/* <Titlebar title="ArtGrid" /> */}

      {/* Main Layout */}
      <div className="app-layout">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          activeCollection={activeCollection}
          onCollectionChange={setActiveCollection}
          onImport={importFiles}
          onSettings={() => setShowSettings(true)}
          stats={{
            library: assets.length,
            boards: 0, // Mocked for now until Phase 4 (Boards db)
            favorites: assets.filter(a => a.favorite).length,
            untagged: assets.filter(a => !a.tags || a.tags.length === 0).length,
          }}
        />

        {/* Content Area */}
        <div className="content-area">
          {/* Toolbar */}
          <Toolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            showDetailPanel={showDetailPanel}
            onToggleDetailPanel={handleToggleDetailPanel}
            title={getViewTitle()}
            itemCount={filteredAssets.length}
          />

          {/* Main content + detail panel */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Vault empty state */}
            {!vaultPath ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
                <div className="empty-state">
                  <h2 className="empty-state__title">Welcome to ArtGrid</h2>
                  <p className="empty-state__description">
                    Open or create a Vault folder to store your library.
                  </p>
                  <div className="empty-state__action">
                    <button className="btn btn--primary" onClick={openVault}>
                      Select Vault Folder
                    </button>
                  </div>
                </div>
              </div>
            ) : ['library', 'search', 'favorites', 'recent', 'untagged'].includes(activeView) ? (
              <Gallery
                assets={filteredAssets}
                selectedAsset={selectedAsset}
                onSelectAsset={handleSelectAsset}
                onPreviewAsset={setPreviewAsset}
                onToggleFavorite={handleToggleFavorite}
                onImport={importFiles}
              />
            ) : activeView === 'boards' ? (
              <div className="canvas-container">
                <div className="canvas-container__grid" />
                {/* Canvas Implementation */}
                <BoardCanvas 
                  nodes={boardNodes}
                  onNodesChange={setBoardNodes}
                  activeTool={activeTool}
                />

                {/* Canvas floating toolbar */}
                <div className="canvas-toolbar">
                  <button 
                    className={`toolbar__btn ${activeTool === 'select' ? 'toolbar__btn--active' : ''}`} 
                    title="Select"
                    onClick={() => setActiveTool('select')}
                  >
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                    </svg>
                  </button>
                  <button 
                    className={`toolbar__btn ${activeTool === 'pan' ? 'toolbar__btn--active' : ''}`} 
                    title="Hand (Pan)"
                    onClick={() => setActiveTool('pan')}
                  >
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M18 11V6a2 2 0 0 0-4 0v5m0 0V4a2 2 0 0 0-4 0v7m0 0V6a2 2 0 0 0-4 0v7m0-2a2 2 0 0 0-4 0v5a8 8 0 0 0 16 0v-2a2 2 0 0 0-4 0" />
                    </svg>
                  </button>
                  <div className="toolbar__separator" />
                  <button className="toolbar__btn" title="Add Text">
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                  </button>
                  <button className="toolbar__btn" title="Add Shape">
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                  </button>
                  <button className="toolbar__btn" title="Draw">
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
                    </svg>
                  </button>
                </div>

                {/* Minimap */}
                <div className="canvas-minimap">
                  <div className="canvas-minimap__viewport" style={{
                    top: '20%', left: '25%', width: '40%', height: '50%',
                  }} />
                </div>
              </div>
            ) : activeView === 'graph' ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-base)',
                position: 'relative',
              }}>
                {/* Graph placeholder with animated nodes */}
                <div className="empty-state">
                  <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="empty-state__icon">
                    <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
                    <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" /><line x1="15.5" y1="7.5" x2="8.5" y2="16.5" />
                  </svg>
                  <h2 className="empty-state__title">Inspiration Graph</h2>
                  <p className="empty-state__description">
                    Visualize connections between your references. Tags, collections, and visual similarity create an explorable web of inspiration.
                  </p>
                  <div className="empty-state__action">
                    <button className="btn btn--primary">
                      Generate Graph
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Detail Panel */}
            <DetailPanel
              asset={selectedAsset}
              visible={showDetailPanel}
              onClose={handleToggleDetailPanel}
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        itemCount={filteredAssets.length}
        selectedCount={selectedAsset ? 1 : 0}
        viewMode={viewMode}
      />
      
      {/* Settings Modal */}
      <SettingsModal 
        visible={showSettings} 
        onClose={() => setShowSettings(false)} 
        vaultPath={vaultPath}
        onChangeVault={() => {
          setShowSettings(false);
          openVault();
        }}
      />

      {/* File Viewer Modal */}
      <FileViewerModal
        asset={previewAsset}
        visible={previewAsset !== null}
        onClose={() => setPreviewAsset(null)}
      />
    </>
  );
};

export default App;
