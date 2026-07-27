import React, { useState } from 'react';
import {
  IconImage, IconBoard, IconSearch, IconStar,
  IconClock, IconArchive, IconTrash, IconTag, IconGraph,
  IconSettings, IconChevronRight,
  IconPlus, IconImport
} from './Icons';

// Types
type ViewType = 'library' | 'boards' | 'graph' | 'search';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  activeCollection: string | null;
  onCollectionChange: (id: string | null) => void;
  onImport?: () => void;
  onSettings?: () => void;
  stats: {
    library: number;
    boards: number;
    favorites: number;
    untagged: number;
  };
}

interface Collection {
  id: string;
  name: string;
  color: string;
  count: number;
  children?: Collection[];
}

// Demo collections data removed
const COLLECTIONS: Collection[] = [];

// Removed static NAV_ITEMS and QUICK_ACCESS to move them inside component

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
        {collection.count > 0 && (
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
  onImport,
  onSettings,
  stats
}) => {
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
    { id: 'archive', label: 'Archive', icon: IconArchive },
    { id: 'trash', label: 'Trash', icon: IconTrash, count: 0 },
  ];

  return (
    <div className="sidebar">
      {/* Navigation */}
      <nav className="sidebar__nav">
        {/* Main views */}
        <div className="sidebar__section-title">Navigate</div>
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`sidebar__item ${activeView === item.id ? 'sidebar__item--active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <item.icon size={16} className="sidebar__item-icon" />
            <span className="sidebar__item-label">{item.label}</span>
            {item.count !== undefined && (
              <span className="sidebar__item-count">{item.count}</span>
            )}
          </div>
        ))}

        {/* Quick access */}
        <div className="sidebar__section-title">Quick Access</div>
        {QUICK_ACCESS.map(item => (
          <div key={item.id} className="sidebar__item">
            <item.icon size={16} className="sidebar__item-icon" />
            <span className="sidebar__item-label">{item.label}</span>
            {item.count !== undefined && (
              <span className="sidebar__item-count">{item.count}</span>
            )}
          </div>
        ))}

        {/* Collections */}
        <div className="sidebar__section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 'var(--space-3)' }}>
          <span>Collections</span>
          <button
            className="toolbar__btn"
            style={{ width: 20, height: 20, minWidth: 20, padding: 0 }}
            title="New collection"
          >
            <IconPlus size={12} />
          </button>
        </div>
        <div className="collection-tree">
          {COLLECTIONS.map(collection => (
            <CollectionTreeItem
              key={collection.id}
              collection={collection}
              depth={0}
              active={activeCollection}
              onSelect={onCollectionChange}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar__footer">
        <div className="sidebar__item" onClick={onImport} style={{ cursor: 'pointer' }}>
          <IconImport size={16} className="sidebar__item-icon" />
          <span className="sidebar__item-label">Import</span>
        </div>
        <div className="sidebar__item" onClick={onSettings} style={{ cursor: 'pointer' }}>
          <IconSettings size={16} className="sidebar__item-icon" />
          <span className="sidebar__item-label">Settings</span>
        </div>
      </div>
    </div>
  );
};
