import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Gallery, Asset } from './components/Gallery';
import { DetailPanel } from './components/DetailPanel';
import { StatusBar } from './components/StatusBar';
import { convertFileSrc } from '@tauri-apps/api/core';
import { api } from './services/api';
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
import { useAssetFilter } from './hooks/useAssetFilter';
import { StandaloneLayout } from './components/layouts/StandaloneLayout';
import { MoodboardView } from './features/board/components/MoodboardView';

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
  const { assets, folders, isLoading, isBackgroundRefreshing, vaultPath, setVaultPath, openVault, createVault, loadVault, scanVaultMedia, importFiles, setAssets, loadAssets } = useLibrary();


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
  const [previewSourceNodeId, setPreviewSourceNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle opening preview asset directly in in-app media viewer
  const handleOpenPreviewAsset = useCallback((asset: Asset, sourceNodeId?: string) => {
    setPreviewAsset(asset);
    setPreviewSourceNodeId(sourceNodeId || null);
  }, []);

  const handleAssetCreatedFromStudio = useCallback(async (newAsset: Asset, sourceNodeId: string) => {
    const { boards, activeBoardId, updateBoardNodes } = useBoardStore.getState();
    const activeBoard = boards.find(b => b.id === activeBoardId);
    if (!activeBoard) return;

    const updatedNodes = activeBoard.nodes.map(n => {
      if (n.id === sourceNodeId && n.type === 'image') {
        return {
          ...n,
          src: newAsset.url,
          assetId: newAsset.id
        };
      }
      return n;
    });

    await updateBoardNodes(activeBoard.id, updatedNodes);
  }, []);

  useEffect(() => {
    (window as any).__artgridOpenPreviewAsset = (asset: Asset, sourceNodeId?: string) => handleOpenPreviewAsset(asset, sourceNodeId);
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
      const fetchedAssets: Asset[] = await api.getAssets();
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
    let timeoutId: number | undefined;
    const unlisten = listen('vault-updated', () => {
      console.log('Vault updated event received in standalone window, queuing assets reload...');
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        loadStandaloneAssets();
      }, 500);
    });

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
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
                await api.importFromUrl(imageUrl);
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
      await api.toggleFavorite(id);
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
  const { filteredAssets, boardFilteredAssets } = useAssetFilter({
    assets,
    activeView,
    activeCollection,
    activeTag,
    filterType,
    colorFilter,
    sortBy,
    searchQuery,
    boardSearchQuery,
    boardCategoryFilter,
    boardSortBy,
  });

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
      case 'boards': return 'Project Boards';
      case 'graph': return 'Inspiration Graph';
      case 'search': return 'Search';
      default: return 'Library';
    }
  };

  // Standalone Window Mode Render (100% full window studio view)
  if (isStandaloneWindow) {
    return (
      <StandaloneLayout
        standaloneAsset={standaloneAsset}
        standaloneAllAssets={standaloneAllAssets}
        standaloneDetailVisible={standaloneDetailVisible}
        setStandaloneAsset={setStandaloneAsset}
        loadStandaloneAssets={loadStandaloneAssets}
        setStandaloneDetailVisible={setStandaloneDetailVisible}
      />
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
                  <h2 className="empty-state__title">Welcome to Xios</h2>
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
                <MoodboardView
                  boards={boards}
                  currentBoardId={currentBoardId}
                  activeTabId={activeTabId}
                  updateTabContext={updateTabContext}
                  setActiveBoard={setActiveBoard}
                  boardFilteredAssets={boardFilteredAssets}
                  collections={collections}
                  boardSearchQuery={boardSearchQuery}
                  setBoardSearchQuery={setBoardSearchQuery}
                  boardCategoryFilter={boardCategoryFilter}
                  setBoardCategoryFilter={setBoardCategoryFilter}
                  boardSortBy={boardSortBy}
                  setBoardSortBy={setBoardSortBy}
                  standaloneAllAssets={standaloneAllAssets}
                  assets={assets}
                />
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
        isRefreshing={isBackgroundRefreshing}
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
        statusText="Initializing Xios Vault..."
        subText="Loading media workspace & indexing local assets"
        logs={[
          'Connected to Xios SQLite engine',
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
        sourceNodeId={previewSourceNodeId || undefined}
        onAssetCreatedFromStudio={handleAssetCreatedFromStudio}
        onClose={() => {
          setPreviewAsset(null);
          setPreviewSourceNodeId(null);
        }}
        onSelectAsset={setPreviewAsset}
        onAssetsUpdated={loadAssets}
      />
    </>
  );
};

export default App;
