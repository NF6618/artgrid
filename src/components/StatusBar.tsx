import React from 'react';

interface StatusBarProps {
  itemCount: number;
  selectedCount: number;
  viewMode: string;
  zoomLevel?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  itemCount,
  selectedCount,
  viewMode,
  zoomLevel = 100,
}) => {
  return (
    <div className="statusbar">
      <div className="statusbar__item">
        <div className="statusbar__dot" />
        <span>Ready</span>
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
