import React, { useState } from 'react';
import { useMetadataStore, Collection } from '../stores/useMetadataStore';
import {
  IconImage, IconBoard, IconSearch, IconStar,
  IconClock, IconArchive, IconTrash, IconTag, IconGraph,
  IconSettings, IconChevronRight,
  IconPlus, IconImport
} from './Icons';

import { useSettingsStore } from '../stores/useSettingsStore';

// Types
export type ViewType = 'library' | 'boards' | 'graph' | 'search' | 'favorites' | 'recent' | 'untagged' | 'archive' | 'trash';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  activeCollection: string | null;
  onCollectionChange: (id: string | null) => void;
  activeTag?: string | null;
  onTagChange?: (id: string | null) => void;
  onImport?: () => void;
  onSettings?: () => void;
  currentVaultPath?: string | null;
  onSelectVault?: (vaultPath: string) => void;
  onOpenVaultModal?: () => void;
  stats: {
    library: number;
    boards: number;
    favorites: number;
    untagged: number;
    archive?: number;
    trash?: number;
  };
}

// Collection tree item component
const CollectionTreeItem: React.FC<{
  collection: Collection;
  depth: number;
  active: string | null;
  onSelect: (id: string) => void;
}> = ({ collection, depth, active, onSelect }) => {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = collection.children && collection.children.length > 0;

  return (
    <>
      <div
        className={`collection-tree__item ${active === collection.id ? 'sidebar__item--active' : ''}`}
        style={{ '--tree-indent': depth } as React.CSSProperties}
        onClick={() => onSelect(collection.id)}
      >
        {hasChildren ? (
          <div
            className={`collection-tree__expand ${expanded ? 'collection-tree__expand--open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            <IconChevronRight size={12} />
          </div>
        ) : (
          <div style={{ width: 14 }} />
        )}
        <div className="collection-tree__color" style={{ background: collection.color }} />
        <span className="sidebar__item-label">{collection.name}</span>
        {collection.count !== undefined && collection.count > 0 && (
          <span className="sidebar__item-count">{collection.count}</span>
        )}
      </div>
      {hasChildren && expanded && collection.children!.map(child => (
        <CollectionTreeItem
          key={child.id}
          collection={child}
          depth={depth + 1}
          active={active}
          onSelect={onSelect}
        />
      ))}
    </>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  activeCollection,
  onCollectionChange,
  activeTag,
  onTagChange,
  onImport,
  onSettings,
  currentVaultPath,
  onSelectVault,
  onOpenVaultModal,
  stats
}) => {
  const { collections, tags, tagCategoryMap, createCollection, createTag, loadMetadata } = useMetadataStore();
  const { vaults } = useSettingsStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVaultDropdownOpen, setIsVaultDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState('#3b82f6');
  const [newColParent, setNewColParent] = useState<string | undefined>(undefined);

  // Tag creation state
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('');

  const handleCreateTagSubmit = async () => {
    if (newTagName.trim()) {
      await createTag(newTagName.trim(), newTagCategory || undefined);
      setNewTagName('');
      setNewTagCategory('');
      setShowTagModal(false);
    }
  };

  const activeVaultName = currentVaultPath ? (currentVaultPath.split(/[\\/]/).pop() || 'Vault') : 'Select Vault';

  const NAV_ITEMS = [
    { id: 'library' as ViewType, label: 'Library', icon: IconImage, count: stats.library },
    { id: 'boards' as ViewType, label: 'Boards', icon: IconBoard, count: stats.boards },
    { id: 'graph' as ViewType, label: 'Graph', icon: IconGraph },
    { id: 'search' as ViewType, label: 'Search', icon: IconSearch },
  ];

  const QUICK_ACCESS = [
    { id: 'favorites', label: 'Favorites', icon: IconStar, count: stats.favorites },
    { id: 'recent', label: 'Recent', icon: IconClock, count: stats.library },
    { id: 'untagged', label: 'Untagged', icon: IconTag, count: stats.untagged },
    { id: 'archive', label: 'Archive', icon: IconArchive, count: stats.archive || 0 },
    { id: 'trash', label: 'Trash Bin', icon: IconTrash, count: stats.trash || 0 },
  ];

  const handleCreateCollectionSubmit = async () => {
    if (newColName.trim()) {
      if (newColName.includes('>')) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('bulk_create_collections', { rawInput: newColName, defaultColor: newColColor });
        await loadMetadata();
      } else {
        await createCollection(newColName.trim(), newColColor, newColParent);
      }
      setNewColName('');
      setShowCreateModal(false);
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Sidebar Header with Collapse Toggle */}
      <div className="sidebar__header" style={{ padding: '8px 12px', display: 'flex', justifyContent: isCollapsed ? 'center' : 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
        {!isCollapsed && (
          <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
            ARTGRID
          </span>
        )}
        <button 
          className="toolbar__btn" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{ width: 24, height: 24, minWidth: 24, padding: 0 }}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Vault Selector Dropdown Menu */}
      {!isCollapsed && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', position: 'relative' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>
            Current Vault
          </div>
          <button
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onClick={() => setIsVaultDropdownOpen(!isVaultDropdownOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <span style={{ fontSize: '14px' }}>📦</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeVaultName}
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{isVaultDropdownOpen ? '▲' : '▼'}</span>
          </button>

          {isVaultDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 12,
                right: 12,
                marginTop: 4,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
                zIndex: 500,
                padding: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                backdropFilter: 'blur(16px)',
              }}
            >
              {vaults && vaults.length > 0 ? vaults.map(v => (
                <div
                  key={v.id}
                  onClick={() => {
                    setIsVaultDropdownOpen(false);
                    if (v.path !== currentVaultPath && onSelectVault) {
                      onSelectVault(v.path);
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 4,
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: v.path === currentVaultPath ? 'var(--bg-tertiary)' : 'transparent',
                    color: v.path === currentVaultPath ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontWeight: v.path === currentVaultPath ? 600 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.name}
                  </span>
                  {v.path === currentVaultPath && <span style={{ fontSize: '10px' }}>✓</span>}
                </div>
              )) : (
                <div style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--text-muted)' }}>No saved vaults</div>
              )}

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '11px', gap: 6, width: '100%' }}
                onClick={() => {
                  setIsVaultDropdownOpen(false);
                  onOpenVaultModal?.();
                }}
              >
                <IconPlus size={12} /> Open / Create Vault...
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar__nav">
        {/* Main views */}
        {!isCollapsed && <div className="sidebar__section-title">Navigate</div>}
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`sidebar__item ${activeView === item.id ? 'sidebar__item--active' : ''}`}
            onClick={() => onViewChange(item.id)}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon size={16} className="sidebar__item-icon" />
            {!isCollapsed && <span className="sidebar__item-label">{item.label}</span>}
            {!isCollapsed && item.count !== undefined && (
              <span className="sidebar__item-count">{item.count}</span>
            )}
          </div>
        ))}

        {/* Quick access */}
        {!isCollapsed && <div className="sidebar__section-title">Quick Access</div>}
        {QUICK_ACCESS.map(item => (
          <div 
            key={item.id} 
            className={`sidebar__item ${activeView === item.id ? 'sidebar__item--active' : ''}`} 
            onClick={() => onViewChange(item.id as ViewType)}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon size={16} className="sidebar__item-icon" />
            {!isCollapsed && <span className="sidebar__item-label">{item.label}</span>}
            {!isCollapsed && item.count !== undefined && (
              <span className="sidebar__item-count">{item.count}</span>
            )}
          </div>
        ))}

        {!isCollapsed && (
          <>
            {/* Collections Header + Add Button */}
            <div className="sidebar__section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 'var(--space-3)' }}>
              <span>Collections</span>
              <button
                className="toolbar__btn"
                style={{ width: 20, height: 20, minWidth: 20, padding: 0 }}
                title="New collection"
                onClick={() => setShowCreateModal(true)}
              >
                <IconPlus size={12} />
              </button>
            </div>

            {/* Rich Creation Modal Popover */}
            {showCreateModal && (
              <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 6, margin: '4px 8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input 
                  autoFocus
                  placeholder="Name (or Parent > Child)..."
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 4, padding: '4px 8px', fontSize: '0.8rem' }}
                />
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {['#3b82f6', '#7c6bf0', '#f06b8e', '#10b981', '#f59e0b'].map(c => (
                    <div 
                      key={c} 
                      onClick={() => setNewColColor(c)}
                      style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', border: newColColor === c ? '2px solid white' : 'none' }} 
                    />
                  ))}
                </div>
                <select 
                  value={newColParent || ''} 
                  onChange={e => setNewColParent(e.target.value || undefined)}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 4, padding: '4px', fontSize: '0.75rem' }}
                >
                  <option value="">No Parent (Root)</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn--secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button className="btn btn--primary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={handleCreateCollectionSubmit}>Create</button>
                </div>
              </div>
            )}

            <div className="collection-tree">
              {collections.map(collection => (
                <CollectionTreeItem
                  key={collection.id}
                  collection={collection}
                  depth={0}
                  active={activeCollection}
                  onSelect={(id) => onCollectionChange(activeCollection === id ? null : id)}
                />
              ))}
            </div>

            {/* Tags Header + Add Tag Button */}
            <div className="sidebar__section-title" style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 'var(--space-3)' }}>
              <span>Tags</span>
              <button
                className="toolbar__btn"
                style={{ width: 20, height: 20, minWidth: 20, padding: 0 }}
                title="Create New Tag"
                onClick={() => setShowTagModal(!showTagModal)}
              >
                <IconPlus size={12} />
              </button>
            </div>

            {/* Tag Creation Popover */}
            {showTagModal && (
              <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 6, margin: '4px 8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input 
                  autoFocus
                  placeholder="New tag name..."
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTagSubmit()}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 4, padding: '4px 8px', fontSize: '0.8rem' }}
                />
                <select
                  value={newTagCategory}
                  onChange={e => setNewTagCategory(e.target.value)}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 4, padding: '4px', fontSize: '0.75rem' }}
                >
                  <option value="">No Category Association</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>Category: {c.name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn--secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setShowTagModal(false)}>Cancel</button>
                  <button className="btn btn--primary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={handleCreateTagSubmit}>Create Tag</button>
                </div>
              </div>
            )}

            <div className="collection-tree" style={{ paddingLeft: 'var(--space-2)' }}>
              {tags.map(tag => {
                const assocColId = tagCategoryMap[tag.name];
                const assocCol = assocColId ? collections.find(c => c.id === assocColId) : null;
                return (
                  <div 
                    key={tag.id}
                    className={`sidebar__item ${activeTag === tag.name ? 'sidebar__item--active' : ''}`}
                    onClick={() => {
                      if (onTagChange) {
                        onTagChange(activeTag === tag.name ? null : tag.name);
                      }
                    }}
                    style={{ paddingLeft: 'var(--space-2)', height: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <IconTag size={12} className="sidebar__item-icon" />
                      <span className="sidebar__item-label" style={{ fontSize: '0.8rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tag.name}</span>
                    </div>
                    {assocCol && (
                      <span style={{ fontSize: '9px', background: 'var(--bg-tertiary)', color: assocCol.color || 'var(--text-muted)', padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        {assocCol.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar__footer">
        <div className="sidebar__item" onClick={onImport} style={{ cursor: 'pointer' }} title={isCollapsed ? "Import" : undefined}>
          <IconImport size={16} className="sidebar__item-icon" />
          {!isCollapsed && <span className="sidebar__item-label">Import</span>}
        </div>
        <div className="sidebar__item" onClick={onSettings} style={{ cursor: 'pointer' }} title={isCollapsed ? "Settings" : undefined}>
          <IconSettings size={16} className="sidebar__item-icon" />
          {!isCollapsed && <span className="sidebar__item-label">Settings</span>}
        </div>
      </div>
    </div>
  );
};
