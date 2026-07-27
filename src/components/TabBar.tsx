import React from 'react';
import { useTabStore, AppTab } from '../stores/useTabStore';
import { IconClose, IconMaximize } from './Icons';

interface TabBarProps {
  onPopOutTab: (tab: AppTab) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ onPopOutTab }) => {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabStore();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        height: '36px',
        overflowX: 'auto',
        overflowY: 'hidden',
        flexShrink: 0,
        // Make it draggable for Tauri
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              padding: '0 12px',
              minWidth: '120px',
              maxWidth: '200px',
              borderRight: '1px solid var(--border-subtle)',
              background: isActive ? 'var(--bg-base)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              // Disable drag on the tab itself so click works reliably
              WebkitAppRegion: 'no-drag',
              position: 'relative',
              userSelect: 'none',
              transition: 'background 0.2s',
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
            title={tab.title}
          >
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {tab.title}
            </span>

            <div style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: isActive ? 1 : 0.4 }}>
              {isActive && (
                <button
                  className="toolbar__btn"
                  title="Pop Out Tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPopOutTab(tab);
                  }}
                  style={{ width: 20, height: 20, minWidth: 20, padding: 0 }}
                >
                  <IconMaximize size={12} />
                </button>
              )}
              <button
                className="toolbar__btn"
                title="Close Tab"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                style={{ width: 20, height: 20, minWidth: 20, padding: 0 }}
              >
                <IconClose size={12} />
              </button>
            </div>
            
            {/* Active tab indicator strip */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'var(--accent-primary)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
