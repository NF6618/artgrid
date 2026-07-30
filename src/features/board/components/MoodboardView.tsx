import React from 'react';
import { BoardMediaDrawer } from './BoardMediaDrawer';
import { BoardCanvas } from './BoardCanvas';

interface MoodboardViewProps {
  boards: any[];
  currentBoardId: string | null;
  activeTabId: string;
  updateTabContext: (tabId: string, context: any) => void;
  setActiveBoard: (boardId: string) => void;
  boardFilteredAssets: any[];
  collections: any[];
  boardSearchQuery: string;
  setBoardSearchQuery: (query: string) => void;
  boardCategoryFilter: string;
  setBoardCategoryFilter: (filter: string) => void;
  boardSortBy: string;
  setBoardSortBy: (sort: string) => void;
  standaloneAllAssets: any[];
  assets: any[];
}

export const MoodboardView: React.FC<MoodboardViewProps> = ({
  boards,
  currentBoardId,
  activeTabId,
  updateTabContext,
  setActiveBoard,
  boardFilteredAssets,
  collections,
  boardSearchQuery,
  setBoardSearchQuery,
  boardCategoryFilter,
  setBoardCategoryFilter,
  boardSortBy,
  setBoardSortBy,
  standaloneAllAssets,
  assets,
}) => {
  return (
    <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* Absolute floating media drawer */}
      {currentBoardId && (
        <BoardMediaDrawer
          boards={boards}
          currentBoardId={currentBoardId}
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
      )}

      {/* Main Canvas Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Canvas Header & Board Tabs (Floating at the top, frosted glass) */}
        <div 
          style={{ 
            position: 'absolute', 
            top: 20, 
            left: 20, 
            right: 20,
            height: 48, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 16, 
            padding: '0 16px',
            background: 'rgba(20, 20, 25, 0.75)',
            backdropFilter: 'blur(24px) saturate(150%)',
            WebkitBackdropFilter: 'blur(24px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
            zIndex: 800,
            pointerEvents: 'auto',
          }}
        >
          <button 
            style={{ 
              padding: '6px 12px', 
              fontSize: '12px', 
              background: 'transparent',
              color: '#e2e8f0',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              setActiveBoard('');
              updateTabContext(activeTabId, { boardId: null });
            }}
          >
            ← Back
          </button>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

          <div style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto', alignItems: 'center' }} className="hide-scrollbar">
            {boards.map(b => (
              <button
                key={b.id}
                onClick={() => {
                  setActiveBoard(b.id);
                  updateTabContext(activeTabId, { boardId: b.id });
                }}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: b.id === currentBoardId ? 'var(--accent-primary)' : 'transparent',
                  color: b.id === currentBoardId ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: b.id === currentBoardId ? '0 4px 12px rgba(124, 107, 240, 0.4)' : 'none',
                }}
                onMouseEnter={e => { if (b.id !== currentBoardId) e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { if (b.id !== currentBoardId) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* The Board Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <BoardCanvas />
        </div>
      </div>
    </div>
  );
};
