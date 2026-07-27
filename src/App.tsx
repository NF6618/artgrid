import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Gallery, Asset } from './components/Gallery';
import { DetailPanel } from './components/DetailPanel';
import { StatusBar } from './components/StatusBar';
import { BoardCanvas } from './features/board/components/BoardCanvas';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { useLibrary } from './hooks/useLibrary';
import { useBoardStore } from './stores/useBoardStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useMetadataStore } from './stores/useMetadataStore';
import { SettingsModal } from './components/SettingsModal';
import { FileViewerModal } from './components/FileViewerModal';
import { ImportVaultModal } from './components/ImportVaultModal';
import { SplashLoader } from './components/SplashLoader';
import { ImportProgressModal, ImportProgressData } from './components/ImportProgressModal';
import { VaultInitModal } from './components/VaultInitModal';
import { BoardsGallery } from './components/BoardsGallery';
import { TabBar } from './components/TabBar';
import { useTabStore, TabType } from './stores/useTabStore';

type ViewMode = 'grid' | 'list' | 'board';

const App: React.FC = () => {
  // Tab state
  const { tabs, activeTabId, updateTabContext, addTab, setActiveTab } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const activeView = activeTab.type;
  const activeCollection = activeTab.collectionId || null;
  const activeTag = activeTab.tag || null;
  const activeBoardIdOverride = activeTab.boardId || null;

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showVaultInitModal, setShowVaultInitModal] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgressData | null>(null);

  const { isLoaded, loadSettings, vaultPath: savedVaultPath, defaultView, compactMode, updateSettings, addVault } = useSettingsStore();

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Library state via Tauri
  const { assets, folders, isLoading, vaultPath, setVaultPath, openVault, createVault, loadVault, scanVaultMedia, importFiles, setAssets, loadAssets } = useLibrary();

  // Listen for real-time import progress from Rust backend
  useEffect(() => {
    const unlisten = listen<ImportProgressData>('import-progress', (event) => {
      setImportProgress(event.payload);
      if (event.payload.current >= event.payload.total) {
        setTimeout(() => setImportProgress(null), 1200);
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // Auto load saved vault on startup
  React.useEffect(() => {
    if (isLoaded && savedVaultPath && !vaultPath) {
      const urlParams = new URLSearchParams(window.location.search);
      const isStandalone = urlParams.get('standaloneTab') === 'true' || !!urlParams.get('previewAssetId');

      if (isStandalone) {
        // Vault is already opened by main window, skip heavy backend init
        setVaultPath(savedVaultPath);
        // loadStandaloneAssets handles fetching for previewAssetId
      } else {
        loadVault(savedVaultPath);
        updateTabContext('default', { type: defaultView as TabType, title: defaultView.charAt(0).toUpperCase() + defaultView.slice(1) });
      }
    }
  }, [isLoaded, savedVaultPath, vaultPath, loadVault, setVaultPath, defaultView, updateTabContext]);

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

  // Handle opening preview asset directly in in-app media viewer
  const handleOpenPreviewAsset = useCallback((asset: Asset) => {
    setPreviewAsset(asset);
  }, []);

  useEffect(() => {
    (window as any).__artgridOpenPreviewAsset = (asset: Asset) => handleOpenPreviewAsset(asset);
  }, [handleOpenPreviewAsset]);

  // Check if running in Standalone Window Mode
  const urlParams = new URLSearchParams(window.location.search);
  const standaloneAssetId = urlParams.get('previewAssetId');
  const isMediaViewer = urlParams.get('mediaViewer') === 'true';
  const isStandaloneWindow = !!standaloneAssetId || isMediaViewer;
  
  // Standalone Tab Mode
  const isStandaloneTab = urlParams.get('standaloneTab') === 'true';
  const standaloneTabType = urlParams.get('tabType') as TabType || 'library';
  const standaloneTabId = urlParams.get('tabId') || 'standalone-tab';
  const standaloneBoardId = urlParams.get('boardId');
  const standaloneCollectionId = urlParams.get('collectionId');
  const standaloneTag = urlParams.get('tag');

  useEffect(() => {
    if (isStandaloneTab) {
      // Force the store to adopt this single standalone tab configuration
      updateTabContext('default', {
        id: standaloneTabId,
        type: standaloneTabType,
        boardId: standaloneBoardId || null,
        collectionId: standaloneCollectionId || null,
        tag: standaloneTag || null,
      });
      setActiveTab(standaloneTabId);
    }
  }, [isStandaloneTab, standaloneTabType, standaloneTabId, standaloneBoardId, standaloneCollectionId, standaloneTag, updateTabContext, setActiveTab]);
  const [standaloneAsset, setStandaloneAsset] = useState<Asset | null>(null);
  const [standaloneAllAssets, setStandaloneAllAssets] = useState<Asset[]>([]);
  const [standaloneDetailVisible, setStandaloneDetailVisible] = useState(false);

  // Standalone window asset loading.
  // The Rust backend's AppState (DB connection) is shared across all windows,
  // so if the main window already opened the vault, get_assets works immediately.
  const loadStandaloneAssets = useCallback(async (retriesLeft = 5) => {
    try {
      const fetchedAssets: Asset[] = await invoke('get_assets');
      const now = Date.now();
      const processed = fetchedAssets.map(a => ({
        ...a,
        url: convertFileSrc(a.url) + `?t=${now}`,
      }));
      setStandaloneAllAssets(processed);
      if (standaloneAssetId) {
        const found = processed.find(a => a.id === standaloneAssetId);
        if (found && !standaloneAsset) {
          setStandaloneAsset(found);
        }
      } else if (isMediaViewer && processed.length > 0 && !standaloneAsset) {
        setStandaloneAsset(processed[0]);
      }
    } catch (err) {
      if (retriesLeft > 0) {
        setTimeout(() => loadStandaloneAssets(retriesLeft - 1), 300);
      } else {
        console.error("Failed to load standalone assets:", err);
      }
    }
  }, [standaloneAssetId, standaloneAsset]);

  useEffect(() => {
    if (!isStandaloneWindow) return;
    loadStandaloneAssets();

    // Listen for cross-window state updates
    const unlisten = listen('vault-updated', () => {
      console.log('Vault updated event received in standalone window, reloading assets...');
      loadStandaloneAssets();
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [isStandaloneWindow, loadStandaloneAssets]);
  
  const { boards, activeBoardId, loadBoards, createBoard, setActiveBoard, renameBoard, deleteBoard } = useBoardStore();
  const currentBoardId = activeBoardIdOverride || activeBoardId;

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
  const { collections, loadMetadata } = useMetadataStore();

  useEffect(() => {
    if (vaultPath) {
      loadMetadata();
    }
  }, [vaultPath, loadMetadata]);

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
  // Filter and Toolbar state
  const [showImageNames, setShowImageNames] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

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

  if (filterType !== 'all') {
    if (filterType === 'image') filteredAssets = filteredAssets.filter(a => a.type.startsWith('image/'));
    else if (filterType === 'pdf') filteredAssets = filteredAssets.filter(a => a.type === 'application/pdf');
    else if (filterType === 'text') filteredAssets = filteredAssets.filter(a => a.type.startsWith('text/'));
  }

  if (colorFilter !== 'all') {
    filteredAssets = filteredAssets.filter(a => {
      if (!(a as any).color_profile) return false;
      try {
        const parsed = JSON.parse((a as any).color_profile);
        return parsed.temperature === colorFilter;
      } catch {
        return false;
      }
    });
  }
  
  if (activeView === 'favorites') {
    filteredAssets = filteredAssets.filter(a => a.favorite);
  } else if (activeView === 'untagged') {
    filteredAssets = filteredAssets.filter(a => !a.tags || a.tags.length === 0);
  } else if (activeView === 'recent') {
    filteredAssets = [...filteredAssets].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }

  if (sortBy === 'name') {
    filteredAssets = [...filteredAssets].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'size') {
    filteredAssets = [...filteredAssets].sort((a, b) => (parseFloat(b.size) || 0) - (parseFloat(a.size) || 0));
  } else if (sortBy === 'dimensions') {
    filteredAssets = [...filteredAssets].sort((a, b) => (b.width * b.height) - (a.width * a.height));
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

  const handleNavViewChange = (newView: TabType) => {
    if (newView === activeView && !activeCollection && !activeTag) return;
    updateTabContext(activeTabId, {
      type: newView,
      title: newView.charAt(0).toUpperCase() + newView.slice(1),
      collectionId: null,
      tag: null,
      boardId: null,
    });
  };

  const handleNavCollectionChange = (colId: string | null) => {
    updateTabContext(activeTabId, { collectionId: colId, tag: null, boardId: null });
  };

  const handleNavTagChange = (tagName: string | null) => {
    updateTabContext(activeTabId, { tag: tagName, collectionId: null, boardId: null });
  };

  // Import Target Vault Modal state
  const [showImportVaultModal, setShowImportVaultModal] = useState(false);

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

  // Standalone Window Mode Render (100% full window studio view)
  if (isStandaloneWindow) {
    const handleStandaloneSelectAsset = (asset: Asset) => {
      setStandaloneAsset(asset);
    };

    const handleStandaloneAssetsUpdated = async () => {
      await loadStandaloneAssets();
    };

    return (
      <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden', display: 'flex' }}>
        {/* Main Viewer Area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {standaloneAsset ? (
            <FileViewerModal
              asset={standaloneAsset}
              allAssets={standaloneAllAssets}
              visible={true}
              isPopOutWindow={false}
              onClose={async () => {
                try {
                  const { getCurrentWindow } = await import('@tauri-apps/api/window');
                  await getCurrentWindow().close();
                } catch (e) {
                  window.close();
                }
              }}
              onSelectAsset={handleStandaloneSelectAsset}
              onAssetsUpdated={handleStandaloneAssetsUpdated}
              onToggleDetail={() => setStandaloneDetailVisible(v => !v)}
              showDetailToggle={true}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
              <span>Loading media preview...</span>
            </div>
          )}
        </div>

        {/* Detail Editor Sidebar */}
        {standaloneDetailVisible && (
          <div style={{ width: 300, minWidth: 300, height: '100vh', overflow: 'hidden', borderLeft: '1px solid var(--border-subtle)' }}>
            <DetailPanel
              asset={standaloneAsset}
              visible={true}
              onClose={() => setStandaloneDetailVisible(false)}
              onAssetsUpdated={handleStandaloneAssetsUpdated}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`app-layout ${compactMode ? 'app-layout--compact' : ''}`}>
      {/* Sidebar - Hide in standalone tab mode */}
      {!isStandaloneTab && (
        <Sidebar
          activeView={activeView}
          onViewChange={handleNavViewChange}
          activeCollection={activeCollection}
          onCollectionChange={handleNavCollectionChange}
          activeTag={activeTag}
          onTagChange={handleNavTagChange}
          onImport={() => setShowImportVaultModal(true)}
          onSettings={() => setShowSettings(true)}
          currentVaultPath={vaultPath}
          onSelectVault={(selectedPath) => loadVault(selectedPath)}
          onOpenVaultModal={() => setShowVaultInitModal(true)}
          stats={{
            library: assets.length,
            boards: boards.length,
            favorites: assets.filter(a => a.favorite).length,
            untagged: assets.filter(a => !a.tags || a.tags.length === 0).length,
          }}
        />
      )}

      {/* Content Area */}
      <div className="content-area">
        {/* TabBar - Hide in standalone tab mode */}
        {!isStandaloneTab && <TabBar />}
        
        {/* Toolbar */}
        <Toolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showDetailPanel={showDetailPanel}
          onToggleDetailPanel={handleToggleDetailPanel}
          title={currentFolderId ? folders.find(f => f.id === currentFolderId)?.name || 'Folder' : getViewTitle()}
          itemCount={filteredAssets.filter(a => (a.folder_id || null) === currentFolderId).length}
          onRefresh={loadAssets}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          colorFilter={colorFilter}
          onColorFilterChange={setColorFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          showImageNames={showImageNames}
          onToggleImageNames={() => setShowImageNames(v => !v)}
          onImport={importFiles}
          canGoBack={currentFolderId !== null}
          canGoForward={false}
          onGoBack={() => {
            if (currentFolderId) {
              const currentFolder = folders.find(f => f.id === currentFolderId);
              setCurrentFolderId(currentFolder?.parent_id || null);
            }
          }}
          onGoForward={() => {}}
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
                onPreviewAsset={handleOpenPreviewAsset}
                onToggleFavorite={handleToggleFavorite}
                onImport={importFiles}
                viewMode={viewMode}
                showImageNames={showImageNames}
                onAssetsUpdated={loadAssets}
                folders={folders}
                currentFolderId={currentFolderId}
                onNavigateFolder={setCurrentFolderId}
              />
            ) : activeView === 'boards' ? (
              currentBoardId ? (
                <div style={{ display: 'flex', flex: 1, width: '100%', overflow: 'hidden' }}>
                  {/* Left: Media Drawer */}
                  <div style={{
                    width: isMediaDrawerCollapsed ? 48 : 300,
                    transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                    borderRight: '1px solid var(--border-subtle)',
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--bg-secondary)',
                    position: 'relative', zIndex: 20,
                    fontFamily: 'var(--font-family)',
                    overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                      {!isMediaDrawerCollapsed && (
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Media Library
                        </span>
                      )}
                      <button
                        className="toolbar__btn"
                        onClick={() => setIsMediaDrawerCollapsed(v => !v)}
                        title={isMediaDrawerCollapsed ? 'Expand Media Sidebar' : 'Collapse Media Sidebar'}
                        style={{ padding: '4px 8px', margin: isMediaDrawerCollapsed ? '0 auto' : '0' }}
                      >
                        {isMediaDrawerCollapsed ? '▶' : '◀'}
                      </button>
                    </div>

                    {!isMediaDrawerCollapsed && (
                      <>
                        {/* Filter / Sort */}
                        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)', flexShrink: 0 }}>
                          <input
                            placeholder="🔍  Search assets…"
                            value={boardSearchQuery}
                            onChange={e => setBoardSearchQuery(e.target.value)}
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '7px 10px',
                              fontSize: 'var(--font-size-xs)',
                              outline: 'none',
                              fontFamily: 'var(--font-family)',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <select
                              value={boardCategoryFilter}
                              onChange={e => setBoardCategoryFilter(e.target.value)}
                              style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '5px 6px', fontSize: 'var(--font-size-xs)', outline: 'none', fontFamily: 'var(--font-family)', cursor: 'pointer' }}
                            >
                              <option value="all">All Collections</option>
                              {collections.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <select
                              value={boardSortBy}
                              onChange={e => setBoardSortBy(e.target.value)}
                              style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '5px 6px', fontSize: 'var(--font-size-xs)', outline: 'none', fontFamily: 'var(--font-family)', cursor: 'pointer' }}
                            >
                              <option value="date">Date Modified</option>
                              <option value="title">Name A–Z</option>
                              <option value="size">File Size</option>
                            </select>
                          </div>
                        </div>

                        {/* Count */}
                        <div style={{ padding: '6px 14px', fontSize: '0.7rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                          {boardFilteredAssets.length} asset{boardFilteredAssets.length !== 1 ? 's' : ''}
                        </div>

                        {/* Asset grid */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
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
                                aspectRatio: '1',
                                background: 'var(--bg-base)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)',
                                overflow: 'hidden', cursor: 'grab',
                                position: 'relative',
                                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
                              title={`${asset.title} — drag onto board`}
                            >
                              <img src={asset.url} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} draggable={false} />
                              <div style={{
                                position: 'absolute', inset: 'auto 0 0 0',
                                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
                                padding: '14px 5px 4px',
                                fontSize: '10px', fontWeight: 500,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                color: 'white', fontFamily: 'var(--font-family)',
                              }}>
                                {asset.title}
                              </div>
                            </div>
                          ))}
                          {boardFilteredAssets.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                              No assets match your filters.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Canvas Area */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                    {/* Canvas Header & Board Tabs */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 16px',
                      background: 'var(--bg-primary)',
                      borderBottom: '1px solid var(--border-subtle)',
                      zIndex: 30,
                    }}>
                      <button 
                        className="btn btn--secondary" 
                        onClick={() => {
                          setActiveBoard('');
                          updateTabContext(activeTabId, { boardId: null });
                        }}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        ← Back to All Boards
                      </button>

                      <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
                        {boards.map(b => (
                          <button
                            key={b.id}
                            className={`btn ${b.id === currentBoardId ? 'btn--primary' : 'btn--ghost'}`}
                            onClick={() => {
                              setActiveBoard(b.id);
                              updateTabContext(activeTabId, { boardId: b.id });
                            }}
                            style={{ padding: '4px 10px', fontSize: '12px', fontWeight: b.id === currentBoardId ? 600 : 400 }}
                          >
                            {b.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Board Canvas Area */}
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                      <BoardCanvas />
                    </div>
                  </div>
                </div>
              ) : (
                <BoardsGallery
                  boards={boards}
                  onOpenBoard={(id) => {
                    const board = boards.find(b => b.id === id);
                    addTab({ type: 'boards', title: board?.title || 'Board', boardId: id });
                  }}
                  onCreateBoard={async (t) => {
                    const newBoard = await createBoard(t);
                    if (newBoard) {
                      addTab({ type: 'boards', title: newBoard.title, boardId: newBoard.id });
                    }
                  }}
                  onRenameBoard={renameBoard}
                  onDeleteBoard={deleteBoard}
                />
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
          setShowVaultInitModal(true);
        }}
      />

      {/* Vault Initialization (Create / Open) Modal */}
      <VaultInitModal
        visible={showVaultInitModal}
        onClose={() => setShowVaultInitModal(false)}
        onCreateVault={async (path) => {
          await createVault(path);
          updateTabContext('default', { type: defaultView as TabType, title: defaultView.charAt(0).toUpperCase() + defaultView.slice(1) });
        }}
        onOpenVault={async (path, resetSchema) => {
          await loadVault(path, resetSchema);
          await scanVaultMedia();
          updateTabContext('default', { type: defaultView as TabType, title: defaultView.charAt(0).toUpperCase() + defaultView.slice(1) });
        }}
      />

      {/* Loading Splash Screen */}
      <SplashLoader
        visible={isLoading && !importProgress}
        statusText="Initializing ArtGrid Vault..."
        subText="Loading media workspace & indexing local assets"
        logs={[
          'Connected to ArtGrid SQLite engine',
          'Syncing media gallery & board canvas',
          'Ready!'
        ]}
      />

      {/* Real-time Import Progress Toast/Modal */}
      <ImportProgressModal
        visible={importProgress !== null}
        progress={importProgress}
      />

      {/* Import Target Vault Selection Modal */}
      <ImportVaultModal
        visible={showImportVaultModal}
        onClose={() => setShowImportVaultModal(false)}
        onConfirmImport={(targetVault) => {
          importFiles(undefined, targetVault);
        }}
      />

      {/* File Viewer Pop-out Modal */}
      <FileViewerModal
        asset={previewAsset}
        allAssets={filteredAssets}
        visible={previewAsset !== null}
        onClose={() => setPreviewAsset(null)}
        onSelectAsset={setPreviewAsset}
        onAssetsUpdated={loadAssets}
      />
    </>
  );
};

export default App;
