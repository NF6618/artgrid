import React, { useState, useEffect, useRef } from 'react';
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
  filterType?: string;
  onFilterTypeChange?: (type: string) => void;
  sortBy?: string;
  onSortByChange?: (sort: string) => void;
  showImageNames?: boolean;
  onToggleImageNames?: () => void;
  colorFilter?: string;
  onColorFilterChange?: (color: string) => void;
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
  filterType = 'all',
  onFilterTypeChange,
  sortBy = 'date',
  onSortByChange,
  showImageNames = true,
  onToggleImageNames,
  colorFilter = 'all',
  onColorFilterChange,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const searchDebounceRef = useRef<any>(null);

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchInput = (value: string) => {
    setLocalSearch(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 200);
  };

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

      {/* Center: Search with 200ms Debouncing */}
      <div className="search-bar">
        <IconSearch size={14} className="search-bar__icon" />
        <input
          type="text"
          className="search-bar__input"
          placeholder="Search assets..."
          value={localSearch}
          onChange={(e) => handleSearchInput(e.target.value)}
        />
      </div>

      <div className="toolbar__spacer" />

      {/* Right: View controls (Filter & Sort Dropdowns) */}
      <div className="toolbar__group" style={{ position: 'relative' }}>
        {/* Toggle Image Names Button */}
        <button 
          className={`toolbar__btn ${showImageNames ? 'toolbar__btn--active' : ''}`} 
          title={showImageNames ? "Hide Image Names" : "Show Image Names"}
          onClick={onToggleImageNames}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>Aa</span>
        </button>

        {/* Filter Button */}
        <button 
          className={`toolbar__btn ${showFilterMenu || filterType !== 'all' || (colorFilter && colorFilter !== 'all') ? 'toolbar__btn--active' : ''}`} 
          title="Filter Assets"
          onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
        >
          <IconFilter size={15} />
        </button>

        {showFilterMenu && (
          <div style={{
            position: 'absolute',
            top: '110%',
            right: 40,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
            padding: '8px 0',
            zIndex: 100,
            minWidth: 160
          }}>
            <div style={{ padding: '4px 12px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Format</div>
            {[
              { id: 'all', label: 'All Formats' },
              { id: 'image', label: 'Images' },
              { id: 'pdf', label: 'PDF Documents' },
              { id: 'text', label: 'Text / Markdown' },
            ].map(f => (
              <div 
                key={f.id}
                style={{
                  padding: '5px 16px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: filterType === f.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: filterType === f.id ? 'var(--accent-primary)' : 'var(--text-primary)'
                }}
                onClick={() => {
                  if (onFilterTypeChange) onFilterTypeChange(f.id);
                  setShowFilterMenu(false);
                }}
              >
                {f.label}
              </div>
            ))}

            <div style={{ padding: '8px 12px 4px 12px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>Color Temperature</div>
            {[
              { id: 'all', label: 'All Colors' },
              { id: 'warm', label: '🔥 Warm Colors' },
              { id: 'cool', label: '❄️ Cool Colors' },
              { id: 'neutral', label: '⚪ Neutral Colors' },
            ].map(c => (
              <div 
                key={c.id}
                style={{
                  padding: '5px 16px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: colorFilter === c.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: colorFilter === c.id ? 'var(--accent-primary)' : 'var(--text-primary)'
                }}
                onClick={() => {
                  if (onColorFilterChange) onColorFilterChange(c.id);
                  setShowFilterMenu(false);
                }}
              >
                {c.label}
              </div>
            ))}
          </div>
        )}

        {/* Sort Button */}
        <button 
          className={`toolbar__btn ${showSortMenu ? 'toolbar__btn--active' : ''}`} 
          title="Sort Assets"
          onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
        >
          <IconSort size={15} />
        </button>

        {showSortMenu && (
          <div style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
            padding: '6px 0',
            zIndex: 100,
            minWidth: 140
          }}>
            {[
              { id: 'date', label: 'Date Added' },
              { id: 'name', label: 'Asset Name' },
              { id: 'size', label: 'File Size' },
              { id: 'dimensions', label: 'Dimensions' },
            ].map(s => (
              <div 
                key={s.id}
                style={{
                  padding: '6px 16px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: sortBy === s.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: sortBy === s.id ? 'var(--accent-primary)' : 'var(--text-primary)'
                }}
                onClick={() => {
                  if (onSortByChange) onSortByChange(s.id);
                  setShowSortMenu(false);
                }}
              >
                {s.label}
              </div>
            ))}
          </div>
        )}
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
