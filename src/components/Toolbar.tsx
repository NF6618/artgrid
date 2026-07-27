import React from 'react';
import {
  IconGrid, IconList, IconBoard, IconSearch, IconFilter,
  IconSort, IconColumns
} from './Icons';

type ViewMode = 'grid' | 'list' | 'board';

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showDetailPanel: boolean;
  onToggleDetailPanel: () => void;
  title?: string;
  itemCount?: number;
  onRefresh?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  showDetailPanel,
  onToggleDetailPanel,
  title = 'Library',
  itemCount,
  onRefresh,
}) => {
  return (
    <div className="toolbar">
      {/* Left: View info */}
      <div className="toolbar__group">
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </span>
        {itemCount !== undefined && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginLeft: 'var(--space-2)' }}>
            {itemCount.toLocaleString()} items
          </span>
        )}
      </div>

      <div className="toolbar__spacer" />

      {/* Center: Search */}
      <div className="search-bar">
        <IconSearch size={14} className="search-bar__icon" />
        <input
          type="text"
          className="search-bar__input"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <span className="search-bar__shortcut">⌘K</span>
      </div>

      <div className="toolbar__spacer" />

      {/* Right: View controls */}
      <div className="toolbar__group">
        <button className="toolbar__btn" title="Filter">
          <IconFilter size={15} />
        </button>
        <button className="toolbar__btn" title="Sort">
          <IconSort size={15} />
        </button>
      </div>

      <div className="toolbar__separator" />

      {/* Refresh */}
      <div className="toolbar__group">
        <button className="toolbar__btn" title="Refresh Assets" onClick={onRefresh}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      <div className="toolbar__separator" />

      {/* View mode tabs */}
      <div className="view-tabs">
        <button
          className={`view-tabs__tab ${viewMode === 'grid' ? 'view-tabs__tab--active' : ''}`}
          onClick={() => onViewModeChange('grid')}
          title="Grid view"
        >
          <IconGrid size={13} />
        </button>
        <button
          className={`view-tabs__tab ${viewMode === 'list' ? 'view-tabs__tab--active' : ''}`}
          onClick={() => onViewModeChange('list')}
          title="List view"
        >
          <IconList size={13} />
        </button>
        <button
          className={`view-tabs__tab ${viewMode === 'board' ? 'view-tabs__tab--active' : ''}`}
          onClick={() => onViewModeChange('board')}
          title="Board view"
        >
          <IconBoard size={13} />
        </button>
      </div>

      <div className="toolbar__separator" />

      <button
        className={`toolbar__btn ${showDetailPanel ? 'toolbar__btn--active' : ''}`}
        onClick={onToggleDetailPanel}
        title="Toggle detail panel"
      >
        <IconColumns size={15} />
      </button>
    </div>
  );
};
