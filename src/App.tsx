import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Gallery, Asset } from './components/Gallery';
import { DetailPanel } from './components/DetailPanel';
import { StatusBar } from './components/StatusBar';
import { BoardCanvas, BoardCanvasHandle } from './components/BoardCanvas';
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
export type ToolType = 'select' | 'pan' | 'text' | 'shape' | 'draw' | 'link' | 'sticky' | 'section';

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
  const boardCanvasRef = React.useRef<BoardCanvasHandle>(null);

  // Inline board rename state
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');

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
                    <h2 className="empty-state__title">Project Boards</h2>
                    <p className="empty-state__description">Create an infinite canvas for references, mood boards, storyboards, and world-building.</p>
                    <div className="empty-state__action">
                      <button className="btn btn--primary" onClick={() => createBoard('New Board')}>
                        Create Board
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flex: 1, width: '100%', overflow: 'hidden' }}>

                  {/* ── Left: Media Drawer ─────────────────────────────── */}
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
                                // Store globally for reliable Tauri webview access
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

                  {/* ── Right: Canvas area ─────────────────────────────── */}
                  <div className="canvas-container" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

                    {/* ── Board tab strip ── */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '8px 12px',
                      background: 'rgba(18,18,22,0.85)', backdropFilter: 'blur(12px)',
                      borderBottom: '1px solid var(--border-subtle)',
                      flexWrap: 'nowrap', overflowX: 'auto',
                    }}>
                      {boards.map(b => (
                        <div key={b.id} style={{ display: 'flex', flexShrink: 0 }}>
                          {renamingBoardId === b.id ? (
                            <input
                              autoFocus
                              value={renamingTitle}
                              onChange={e => setRenamingTitle(e.target.value)}
                              onBlur={() => { renameBoard(b.id, renamingTitle || b.title); setRenamingBoardId(null); }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { renameBoard(b.id, renamingTitle || b.title); setRenamingBoardId(null); }
                                if (e.key === 'Escape') setRenamingBoardId(null);
                              }}
                              style={{
                                background: 'var(--bg-surface)', border: '1px solid var(--accent)',
                                color: 'var(--text-primary)', borderRadius: '6px 0 0 6px',
                                padding: '4px 10px', fontSize: '12px', outline: 'none',
                                fontFamily: 'var(--font-family)', minWidth: 80,
                              }}
                            />
                          ) : (
                            <button
                              className={`btn ${b.id === activeBoardId ? 'btn--primary' : 'btn--ghost'}`}
                              onClick={() => setActiveBoard(b.id)}
                              onDoubleClick={() => { setRenamingBoardId(b.id); setRenamingTitle(b.title); }}
                              title="Double-click to rename"
                              style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '6px 0 0 6px', fontWeight: b.id === activeBoardId ? 600 : 400 }}
                            >
                              {b.title}
                            </button>
                          )}
                          <button
                            className={`btn ${b.id === activeBoardId ? 'btn--primary' : 'btn--ghost'}`}
                            onClick={e => {
                              e.stopPropagation();
                              if (window.confirm(`Delete board "${b.title}"?`)) deleteBoard(b.id);
                            }}
                            style={{ padding: '4px 7px', fontSize: '12px', borderRadius: '0 6px 6px 0', borderLeft: '1px solid rgba(255,255,255,0.1)', opacity: 0.7 }}
                            title="Delete board"
                          >×</button>
                        </div>
                      ))}
                      <button
                        className="btn btn--ghost"
                        onClick={() => createBoard('New Board')}
                        style={{ padding: '4px 10px', fontSize: '18px', lineHeight: 1, flexShrink: 0, opacity: 0.7 }}
                        title="New board"
                      >+</button>

                      {/* Section navigation chips (derived from section nodes) */}
                      {(activeBoard?.nodes.filter(n => n.type === 'section') ?? []).length > 0 && (
                        <>
                          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px', flexShrink: 0 }} />
                          {activeBoard!.nodes
                            .filter(n => n.type === 'section')
                            .map(sectionNode => (
                              <button
                                key={sectionNode.id}
                                onClick={() => boardCanvasRef.current?.jumpToNode(sectionNode.id)}
                                style={{
                                  padding: '3px 10px', fontSize: '11px', flexShrink: 0,
                                  border: `1px solid ${sectionNode.data.sectionColor ?? '#7c6bf0'}55`,
                                  borderRadius: 20,
                                  background: `${sectionNode.data.sectionColor ?? '#7c6bf0'}22`,
                                  color: sectionNode.data.sectionColor ?? '#7c6bf0',
                                  cursor: 'pointer', fontFamily: 'var(--font-family)',
                                  fontWeight: 500, transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = `${sectionNode.data.sectionColor ?? '#7c6bf0'}44`)}
                                onMouseLeave={e => (e.currentTarget.style.background = `${sectionNode.data.sectionColor ?? '#7c6bf0'}22`)}
                                title={`Jump to: ${sectionNode.data.text}`}
                              >
                                📐 {sectionNode.data.text}
                              </button>
                            ))
                          }
                        </>
                      )}
                    </div>

                    {/* ── Canvas (offset below tab strip) ── */}
                    <div style={{ position: 'absolute', top: 45, bottom: 0, left: 0, right: 0 }}>
                      <BoardCanvas
                        ref={boardCanvasRef}
                        nodes={activeBoard?.nodes || []}
                        onNodesChange={nodes => { if (activeBoardId) updateBoardNodes(activeBoardId, nodes); }}
                        activeTool={activeTool}
                        onToolChange={setActiveTool}
                        onUndo={() => { if (activeBoardId) useBoardStore.getState().undoNodes(activeBoardId); }}
                        onRedo={() => { if (activeBoardId) useBoardStore.getState().redoNodes(activeBoardId); }}
                        onDuplicate={nodeId => { if (activeBoardId) useBoardStore.getState().duplicateNode(activeBoardId, nodeId); }}
                        onMoveToFront={nodeId => { if (activeBoardId) useBoardStore.getState().moveNodeToFront(activeBoardId, nodeId); }}
                        onMoveToBack={nodeId => { if (activeBoardId) useBoardStore.getState().moveNodeToBack(activeBoardId, nodeId); }}
                      />
                    </div>

                    {/* ── Floating Toolbar ── */}
                    <div className="canvas-toolbar">
                      {([
                        { tool: 'select' as ToolType, icon: <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>, title: 'Select · V' },
                        { tool: 'pan' as ToolType, icon: <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M18 11V6a2 2 0 0 0-4 0v5m0 0V4a2 2 0 0 0-4 0v7m0 0V6a2 2 0 0 0-4 0v7m0-2a2 2 0 0 0-4 0v5a8 8 0 0 0 16 0v-2a2 2 0 0 0-4 0" /></svg>, title: 'Pan · H' },
                      ] as const).map(({ tool, icon, title }) => (
                        <button key={tool} className={`toolbar__btn ${activeTool === tool ? 'toolbar__btn--active' : ''}`} title={title} onClick={() => setActiveTool(tool)}>{icon}</button>
                      ))}

                      <div className="toolbar__separator" />

                      {/* Text */}
                      <button className={`toolbar__btn ${activeTool === 'text' ? 'toolbar__btn--active' : ''}`} title="Text Note — click canvas to place · T"
                        onClick={() => setActiveTool('text')}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
                        </svg>
                      </button>

                      {/* Shape */}
                      <button className={`toolbar__btn ${activeTool === 'shape' ? 'toolbar__btn--active' : ''}`} title="Shape Frame — click canvas · S"
                        onClick={() => setActiveTool('shape')}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                      </button>

                      {/* Sticky */}
                      <button className={`toolbar__btn ${activeTool === 'sticky' ? 'toolbar__btn--active' : ''}`} title="Sticky Note — click canvas to place"
                        onClick={() => setActiveTool('sticky')}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      </button>

                      {/* Section */}
                      <button className={`toolbar__btn ${activeTool === 'section' ? 'toolbar__btn--active' : ''}`} title="Section / Named Region — click canvas to place"
                        onClick={() => setActiveTool('section')}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </button>

                      {/* Draw */}
                      <button className={`toolbar__btn ${activeTool === 'draw' ? 'toolbar__btn--active' : ''}`} title="Freehand Draw · D"
                        onClick={() => setActiveTool('draw')}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><circle cx="11" cy="11" r="2" />
                        </svg>
                      </button>

                      {/* Link */}
                      <button className={`toolbar__btn ${activeTool === 'link' ? 'toolbar__btn--active' : ''}`} title="Connect Arrow · L"
                        onClick={() => setActiveTool('link')}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>

                      <div className="toolbar__separator" />

                      {/* Undo / Redo */}
                      <button className="toolbar__btn" title="Undo · ⌘Z"
                        onClick={() => { if (activeBoardId) useBoardStore.getState().undoNodes(activeBoardId); }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                        </svg>
                      </button>
                      <button className="toolbar__btn" title="Redo · ⌘⇧Z"
                        onClick={() => { if (activeBoardId) useBoardStore.getState().redoNodes(activeBoardId); }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                        </svg>
                      </button>
                    </div>

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
