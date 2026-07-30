import React, { useEffect } from 'react';
import { useBoardSync } from '../hooks/useBoardSync';
import { useCanvasStore } from '../stores/useCanvasStore';
import { ArtGridCanvas } from './ArtGridCanvas';
import { BoardToolbar } from './BoardToolbar';
import { BoardPropertyBar } from './BoardPropertyBar';

interface BoardCanvasProps {
  boardId: string;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({ boardId }) => {
  const { isReady, saveNodes } = useBoardSync(boardId);
  const setNodes = useCanvasStore(state => state.setNodes);
  const setSaveNodes = useCanvasStore(state => state.setSaveNodes);
  const clearHistory = useCanvasStore(state => state.clearHistory);

  useEffect(() => {
    if (isReady) {
      setSaveNodes(saveNodes);
      // Initialize store with empty array. useBoardSync will merge tiles in.
      setNodes([], false, true); 
    }
  }, [isReady, setNodes, setSaveNodes, saveNodes]);

  useEffect(() => {
    // When board changes, clear the history stack
    clearHistory();
  }, [boardId, clearHistory]);

  useEffect(() => {
    const handleLayoutSections = (e: any) => {
      const sections = e.detail?.sections as string[];
      if (!sections || sections.length === 0) return;
      
      setTimeout(() => {
        sections.forEach(secId => {
          useCanvasStore.getState().layoutSection(boardId, secId);
        });
      }, 500);
    };
    
    const handleDeleteNodes = (e: any) => {
      const ids = e.detail?.ids as string[];
      if (!ids || ids.length === 0) return;
      useCanvasStore.getState().deleteNodes(boardId, ids);
    };
    
    window.addEventListener('artgrid-layout-sections', handleLayoutSections);
    window.addEventListener('artgrid-delete-nodes', handleDeleteNodes);
    
    return () => {
      window.removeEventListener('artgrid-layout-sections', handleLayoutSections);
      window.removeEventListener('artgrid-delete-nodes', handleDeleteNodes);
    };
  }, [boardId]);

  if (!boardId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No board selected. Please select or create a mood board.
      </div>
    );
  }

  if (!isReady) {
    return <div style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }} />;
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <ArtGridCanvas boardId={boardId} />
      
      {/* UI Overlays */}
      <BoardToolbar />
      <BoardPropertyBar />
    </div>
  );
};
