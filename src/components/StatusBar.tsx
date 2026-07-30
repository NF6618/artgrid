import React from 'react';

interface StatusBarProps {
  itemCount: number;
  selectedCount: number;
  viewMode: string;
  zoomLevel?: number;
  isRefreshing?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  itemCount,
  selectedCount,
  viewMode,
  zoomLevel = 100,
  isRefreshing = false,
}) => {
  return (
    <div className="statusbar">
      <div className="statusbar__item" style={{ color: isRefreshing ? 'var(--accent-primary)' : 'inherit' }}>
        {isRefreshing ? (
          <div style={{
            width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--accent-primary)',
            borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginRight: 6
          }} />
        ) : (
          <div className="statusbar__dot" />
        )}
        <span>{isRefreshing ? 'Refreshing Library...' : 'Ready'}</span>
      </div>
      <div className="statusbar__item">
        <span>{itemCount.toLocaleString()} items</span>
      </div>
      {selectedCount > 0 && (
        <div className="statusbar__item">
          <span>{selectedCount} selected</span>
        </div>
      )}
      <div className="statusbar__spacer" />
      <div className="statusbar__item">
        <span>{viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View</span>
      </div>
      <div className="statusbar__item">
        <span>{zoomLevel}%</span>
      </div>
    </div>
  );
};
