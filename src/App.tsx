import React, { useState, useCallback } from 'react';
import { Titlebar } from './components/Titlebar';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Gallery, DEMO_IMAGES, Asset } from './components/Gallery';
import { DetailPanel } from './components/DetailPanel';
import { StatusBar } from './components/StatusBar';

type ViewType = 'library' | 'boards' | 'graph' | 'search';
type ViewMode = 'grid' | 'list' | 'board';

const App: React.FC = () => {
  // Navigation state
  const [activeView, setActiveView] = useState<ViewType>('library');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showDetailPanel, setShowDetailPanel] = useState(true);

  // Data state
  const [assets, setAssets] = useState<Asset[]>(DEMO_IMAGES);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handlers
  const handleSelectAsset = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    if (!showDetailPanel) {
      setShowDetailPanel(true);
    }
  }, [showDetailPanel]);

  const handleToggleFavorite = useCallback((id: string) => {
    setAssets(prev => prev.map(a =>
      a.id === id ? { ...a, favorite: !a.favorite } : a
    ));
    // Update selected asset if it's the one being toggled
    setSelectedAsset(prev =>
      prev?.id === id ? { ...prev, favorite: !prev.favorite } : prev
    );
  }, []);

  const handleToggleDetailPanel = useCallback(() => {
    setShowDetailPanel(prev => !prev);
  }, []);

  // Filter assets by search
  const filteredAssets = searchQuery
    ? assets.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        a.filename.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets;

  // Get title based on active view
  const getViewTitle = () => {
    switch (activeView) {
      case 'library': return activeCollection ? 'Collection' : 'All Assets';
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
            {/* Gallery / Board / Graph view */}
            {activeView === 'library' || activeView === 'search' ? (
              <Gallery
                assets={filteredAssets}
                selectedAsset={selectedAsset}
                onSelectAsset={handleSelectAsset}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : activeView === 'boards' ? (
              <div className="canvas-container">
                <div className="canvas-container__grid" />
                {/* Canvas placeholder — will be replaced with PixiJS */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div className="empty-state">
                    <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="empty-state__icon">
                      <rect x="2" y="3" width="20" height="18" rx="2" />
                      <rect x="4" y="5" width="6" height="5" rx="1" />
                      <rect x="14" y="5" width="6" height="4" rx="1" />
                      <rect x="4" y="12" width="5" height="7" rx="1" />
                      <rect x="12" y="11" width="8" height="3" rx="1" />
                    </svg>
                    <h2 className="empty-state__title">Mood Boards</h2>
                    <p className="empty-state__description">
                      Create infinite canvas boards for your reference compositions. Drag images from your library onto the canvas.
                    </p>
                    <div className="empty-state__action">
                      <button className="btn btn--primary">
                        Create New Board
                      </button>
                    </div>
                  </div>
                </div>

                {/* Canvas floating toolbar */}
                <div className="canvas-toolbar">
                  <button className="toolbar__btn toolbar__btn--active" title="Select">
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                    </svg>
                  </button>
                  <button className="toolbar__btn" title="Hand (Pan)">
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
    </>
  );
};

export default App;
