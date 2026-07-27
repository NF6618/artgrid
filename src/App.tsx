import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Gallery, Asset } from './components/Gallery';
import { DetailPanel } from './components/DetailPanel';
import { StatusBar } from './components/StatusBar';
import { BoardCanvas } from './components/BoardCanvas';
import { v4 as uuidv4 } from 'uuid';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { useLibrary } from './hooks/useLibrary';
import { useBoardStore } from './stores/useBoardStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useMetadataStore } from './stores/useMetadataStore';
import { SettingsModal } from './components/SettingsModal';
import { FileViewerModal } from './components/FileViewerModal';

type ViewType = 'library' | 'boards' | 'graph' | 'search' | 'favorites' | 'recent' | 'untagged' | 'archive' | 'trash';
type ViewMode = 'grid' | 'list' | 'board';
export type ToolType = 'select' | 'pan' | 'text' | 'shape' | 'draw' | 'link';

const App: React.FC = () => {
  // Navigation state
  const [activeView, setActiveView] = useState<ViewType>('library');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const { isLoaded, loadSettings, vaultPath: savedVaultPath, defaultView, compactMode, updateSettings, addVault } = useSettingsStore();

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Library state via Tauri
  const { assets, vaultPath, openVault, loadVault, importFiles, setAssets, loadAssets } = useLibrary();

  // Auto load saved vault on startup
  React.useEffect(() => {
    if (isLoaded && savedVaultPath && !vaultPath) {
      loadVault(savedVaultPath);
      setActiveView(defaultView as ViewType);
    }
  }, [isLoaded, savedVaultPath, vaultPath, loadVault, defaultView]);

  // Sync new vault selection back to settings
  React.useEffect(() => {
    if (isLoaded && vaultPath && vaultPath !== savedVaultPath) {
      updateSettings({ vaultPath });
      const vaultName = vaultPath.split(/[\\/]/).pop() || 'My Vault';
      addVault(vaultName, vaultPath);
    }
  }, [vaultPath, savedVaultPath, isLoaded, updateSettings, addVault]);
  
  // Data state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Board state via Zustand
  const { boards, activeBoardId, loadBoards, createBoard, updateBoardNodes, setActiveBoard, renameBoard, deleteBoard } = useBoardStore();
  const activeBoard = boards.find(b => b.id === activeBoardId);

  // Load boards when vault is available
  React.useEffect(() => {
    if (vaultPath) {
      loadBoards();
    }
  }, [vaultPath, loadBoards]);

  // Deep link listener
  useEffect(() => {
    const unlisten = listen('deep-link-received', async (event: any) => {
      const argv = event.payload as string[];
      const deepLink = argv.find(arg => arg.startsWith('artgrid://'));
      if (deepLink) {
        try {
          const urlObj = new URL(deepLink);
          if (urlObj.hostname === 'save') {
             const imageUrl = urlObj.searchParams.get('url');
             if (imageUrl) {
                console.log("Deep link received, importing from url:", imageUrl);
                await invoke('import_from_url', { url: imageUrl });
                loadAssets();
             }
          }
        } catch(e) {
          console.error("Failed to parse deep link", e);
        }
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [loadAssets]);

  // Metadata Store
  const { collections } = useMetadataStore();

  // Canvas Tools
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

  // Board Media Drawer State & Filtering
  const [isMediaDrawerCollapsed, setIsMediaDrawerCollapsed] = useState(false);
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [boardCategoryFilter, setBoardCategoryFilter] = useState('all');
  const [boardSortBy, setBoardSortBy] = useState('date');

  // Filter assets by view (Archive/Trash vs Normal)
  let filteredAssets: Asset[] = assets;

  if (activeView === 'trash') {
    filteredAssets = filteredAssets.filter((a: Asset) => a.trashed);
  } else if (activeView === 'archive') {
    filteredAssets = filteredAssets.filter((a: Asset) => a.archived && !a.trashed);
  } else {
    filteredAssets = filteredAssets.filter((a: Asset) => !a.trashed && !a.archived);
  }

  if (activeCollection) {
    filteredAssets = filteredAssets.filter(a => a.collections && a.collections.includes(activeCollection));
  }
  
  if (activeTag) {
    filteredAssets = filteredAssets.filter(a => a.tags && a.tags.includes(activeTag));
  }
  
  if (activeView === 'favorites') {
    filteredAssets = filteredAssets.filter(a => a.favorite);
  } else if (activeView === 'untagged') {
    filteredAssets = filteredAssets.filter(a => !a.tags || a.tags.length === 0);
  } else if (activeView === 'recent') {
    filteredAssets = [...filteredAssets].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }

  if (searchQuery) {
    filteredAssets = filteredAssets.filter(a =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Media Drawer filtering for Boards view
  let boardFilteredAssets = assets.filter(a => !a.trashed && !a.archived);
  if (boardSearchQuery) {
    boardFilteredAssets = boardFilteredAssets.filter(a =>
      a.title.toLowerCase().includes(boardSearchQuery.toLowerCase()) ||
      a.filename.toLowerCase().includes(boardSearchQuery.toLowerCase()) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(boardSearchQuery.toLowerCase())))
    );
  }
  if (boardCategoryFilter !== 'all') {
    boardFilteredAssets = boardFilteredAssets.filter(a => a.collections && a.collections.includes(boardCategoryFilter));
  }
  if (boardSortBy === 'title') {
    boardFilteredAssets = [...boardFilteredAssets].sort((a, b) => a.title.localeCompare(b.title));
  } else if (boardSortBy === 'size') {
    boardFilteredAssets = [...boardFilteredAssets].sort((a, b) => (parseFloat(b.size) || 0) - (parseFloat(a.size) || 0));
  } else {
    boardFilteredAssets = [...boardFilteredAssets].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }

  // Get title based on active view
  const getViewTitle = () => {
    switch (activeView) {
      case 'library': return activeCollection ? 'Collection' : 'All Assets';
      case 'favorites': return 'Favorites';
      case 'recent': return 'Recent Imports';
      case 'untagged': return 'Untagged Assets';
      case 'archive': return 'Archive';
      case 'trash': return 'Trash Bin';
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
      <div className={`app-layout ${compactMode ? 'app-layout--compact' : ''}`}>
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          activeCollection={activeCollection}
          onCollectionChange={setActiveCollection}
          activeTag={activeTag}
          onTagChange={setActiveTag}
          onImport={importFiles}
          onSettings={() => setShowSettings(true)}
          stats={{
            library: assets.length,
            boards: boards.length,
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
            onRefresh={loadAssets}
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
            ) : ['library', 'search', 'favorites', 'recent', 'untagged', 'archive', 'trash'].includes(activeView) ? (
              <Gallery
                assets={filteredAssets}
                selectedAsset={selectedAsset}
                onSelectAsset={handleSelectAsset}
                onPreviewAsset={setPreviewAsset}
                onToggleFavorite={handleToggleFavorite}
                onImport={importFiles}
                viewMode={viewMode}
              />
            ) : activeView === 'boards' ? (
              boards.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
                  <div className="empty-state">
                    <h2 className="empty-state__title">Mood Boards</h2>
                    <p className="empty-state__description">Create a new infinite canvas.</p>
                    <div className="empty-state__action">
                      <button className="btn btn--primary" onClick={() => createBoard('New Board')}>
                        Create Board
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flex: 1, width: '100%', overflow: 'hidden' }}>
                  {/* Left Side: Rich Media Drawer for Board */}
                  <div style={{ 
                    width: isMediaDrawerCollapsed ? 48 : 280, 
                    transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    borderRight: '1px solid var(--border-subtle)', 
                    display: 'flex', 
                    flexDirection: 'column',
                    background: 'var(--bg-secondary)',
                    position: 'relative',
                    zIndex: 20,
                    fontFamily: 'var(--font-family)'
                  }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {!isMediaDrawerCollapsed && (
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Media Library
                        </span>
                      )}
                      <button 
                        className="toolbar__btn" 
                        onClick={() => setIsMediaDrawerCollapsed(!isMediaDrawerCollapsed)}
                        title={isMediaDrawerCollapsed ? "Expand Media Sidebar" : "Collapse Media Sidebar"}
                        style={{ padding: '4px 8px', margin: isMediaDrawerCollapsed ? '0 auto' : '0' }}
                      >
                        {isMediaDrawerCollapsed ? '▶' : '◀'}
                      </button>
                    </div>

                    {!isMediaDrawerCollapsed && (
                      <>
                        {/* Filtering Controls */}
                        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                          <input 
                            placeholder="Search library..."
                            value={boardSearchQuery}
                            onChange={e => setBoardSearchQuery(e.target.value)}
                            style={{ 
                              background: 'var(--bg-secondary)', 
                              border: '1px solid var(--border-subtle)', 
                              color: 'var(--text-primary)', 
                              borderRadius: 'var(--radius-sm)', 
                              padding: '6px 10px', 
                              fontSize: 'var(--font-size-xs)',
                              outline: 'none',
                              fontFamily: 'var(--font-family)'
                            }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <select 
                              value={boardCategoryFilter}
                              onChange={e => setBoardCategoryFilter(e.target.value)}
                              style={{ 
                                flex: 1, 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-subtle)', 
                                color: 'var(--text-primary)', 
                                borderRadius: 'var(--radius-sm)', 
                                padding: '4px 6px', 
                                fontSize: 'var(--font-size-xs)',
                                outline: 'none',
                                fontFamily: 'var(--font-family)'
                              }}
                            >
                              <option value="all">All Categories</option>
                              {collections.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <select 
                              value={boardSortBy}
                              onChange={e => setBoardSortBy(e.target.value)}
                              style={{ 
                                flex: 1, 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-subtle)', 
                                color: 'var(--text-primary)', 
                                borderRadius: 'var(--radius-sm)', 
                                padding: '4px 6px', 
                                fontSize: 'var(--font-size-xs)',
                                outline: 'none',
                                fontFamily: 'var(--font-family)'
                              }}
                            >
                              <option value="date">Date</option>
                              <option value="title">Title</option>
                              <option value="size">Size</option>
                            </select>
                          </div>
                        </div>

                        {/* Asset Grid */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
                          {boardFilteredAssets.map(asset => (
                            <div 
                              key={asset.id} 
                              draggable 
                              onDragStart={(e) => {
                                const dataObj = { 
                                  id: asset.id, 
                                  url: asset.url, 
                                  title: asset.title,
                                  width: asset.width,
                                  height: asset.height
                                };
                                e.dataTransfer.setData('application/json', JSON.stringify(dataObj));
                                e.dataTransfer.setData('text/plain', asset.url);
                              }}
                              style={{ 
                                aspectRatio: '1', 
                                background: 'var(--bg-base)', 
                                borderRadius: 'var(--radius-md)', 
                                border: '1px solid var(--border-subtle)',
                                overflow: 'hidden', 
                                cursor: 'grab', 
                                position: 'relative',
                                transition: 'all 0.15s ease'
                              }}
                              title={`${asset.title} - Drag onto board`}
                            >
                              <img src={asset.url} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                              <div style={{ 
                                position: 'absolute', 
                                bottom: 0, 
                                inset: 'auto 0 0 0', 
                                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', 
                                padding: '6px 4px 3px 4px', 
                                fontSize: '10px', 
                                fontWeight: 500,
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                color: 'white',
                                fontFamily: 'var(--font-family)'
                              }}>
                                {asset.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Right Side: Canvas */}
                  <div className="canvas-container" style={{ flex: 1, position: 'relative' }}>
                    <div className="canvas-container__grid" />
                    
                    {/* Board Tabs */}
                    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '8px' }}>
                      {boards.map(b => (
                        <div key={b.id} style={{ display: 'flex' }}>
                          <button 
                            className={`btn ${b.id === activeBoardId ? 'btn--primary' : 'btn--secondary'}`}
                            onClick={() => setActiveBoard(b.id)}
                            style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px 0 0 4px' }}
                            onDoubleClick={() => {
                              const newTitle = prompt('Rename board:', b.title);
                              if (newTitle) renameBoard(b.id, newTitle);
                            }}
                            title="Double-click to rename"
                          >
                            {b.title}
                          </button>
                          <button 
                            className={`btn ${b.id === activeBoardId ? 'btn--primary' : 'btn--secondary'}`}
                            onClick={(e) => {
                               e.stopPropagation();
                               if (window.confirm(`Delete board "${b.title}"?`)) {
                                 deleteBoard(b.id);
                               }
                            }}
                            style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '0 4px 4px 0', borderLeft: '1px solid rgba(0,0,0,0.1)' }}
                            title="Delete Board"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button className="btn btn--secondary" onClick={() => createBoard('New Board')} style={{ padding: '4px 8px' }}>+</button>
                    </div>

                  {/* Canvas Implementation */}
                  <BoardCanvas 
                    nodes={activeBoard?.nodes || []}
                    onNodesChange={(nodes) => {
                      if (activeBoardId) updateBoardNodes(activeBoardId, nodes);
                    }}
                    activeTool={activeTool}
                    onToolChange={setActiveTool}
                  />

                  {/* Canvas floating toolbar with Direct Item Creation */}
                <div className="canvas-toolbar">
                  <button 
                    className={`toolbar__btn ${activeTool === 'select' ? 'toolbar__btn--active' : ''}`} 
                    title="Select & Move (V)"
                    onClick={() => setActiveTool('select')}
                  >
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                    </svg>
                  </button>
                  <button 
                    className={`toolbar__btn ${activeTool === 'pan' ? 'toolbar__btn--active' : ''}`} 
                    title="Hand / Pan Viewport (H)"
                    onClick={() => setActiveTool('pan')}
                  >
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M18 11V6a2 2 0 0 0-4 0v5m0 0V4a2 2 0 0 0-4 0v7m0 0V6a2 2 0 0 0-4 0v7m0-2a2 2 0 0 0-4 0v5a8 8 0 0 0 16 0v-2a2 2 0 0 0-4 0" />
                    </svg>
                  </button>
                  <div className="toolbar__separator" />
                  <button 
                    className={`toolbar__btn ${activeTool === 'text' ? 'toolbar__btn--active' : ''}`} 
                    title="Add Text Note (T)"
                    onClick={() => {
                      setActiveTool('text');
                      const textStr = prompt("Enter text note:", "Note idea...");
                      if (textStr && textStr.trim() && activeBoardId) {
                        const newNode: any = {
                          id: uuidv4(),
                          type: 'text',
                          position: { x: 300 + Math.random() * 60, y: 300 + Math.random() * 60 },
                          dimensions: { width: 220, height: 110 },
                          data: { text: textStr.trim(), fontSize: 14, color: '#3b82f6' }
                        };
                        updateBoardNodes(activeBoardId, [...(activeBoard?.nodes || []), newNode]);
                        setActiveTool('select');
                      }
                    }}
                  >
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                  </button>
                  <button 
                    className={`toolbar__btn ${activeTool === 'shape' ? 'toolbar__btn--active' : ''}`} 
                    title="Add Shape Frame (S)"
                    onClick={() => {
                      setActiveTool('shape');
                      if (activeBoardId) {
                        const newNode: any = {
                          id: uuidv4(),
                          type: 'shape',
                          position: { x: 350 + Math.random() * 60, y: 350 + Math.random() * 60 },
                          dimensions: { width: 240, height: 160 },
                          data: { shapeType: 'rectangle', color: '#7c6bf0' }
                        };
                        updateBoardNodes(activeBoardId, [...(activeBoard?.nodes || []), newNode]);
                        setActiveTool('select');
                      }
                    }}
                  >
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                  </button>
                  <button 
                    className={`toolbar__btn ${activeTool === 'draw' ? 'toolbar__btn--active' : ''}`} 
                    title="Freehand Draw (D)"
                    onClick={() => setActiveTool('draw')}
                  >
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
                    </svg>
                  </button>
                  <button 
                    className={`toolbar__btn ${activeTool === 'link' ? 'toolbar__btn--active' : ''}`} 
                    title="Connect Arrow Link (L)"
                    onClick={() => setActiveTool('link')}
                  >
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>

                {/* Fake Minimap Removed */}
                  </div>
                </div>
              )
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
              onAssetsUpdated={loadAssets}
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
