import React, { useEffect } from 'react';
import { useBoardSync } from '../hooks/useBoardSync';
import { useBoardStore } from '../../../stores/useBoardStore';
import { useCanvasStore } from '../stores/useCanvasStore';
import { ArtGridCanvas } from './ArtGridCanvas';
import { BoardToolbar } from './BoardToolbar';
import { BoardPropertyBar } from './BoardPropertyBar';

export const BoardCanvas: React.FC = () => {
  const activeBoardId = useBoardStore(state => state.activeBoardId);
  const { nodes, saveNodes } = useBoardSync(activeBoardId);
  const { setNodes, setSaveNodes, clearHistory } = useCanvasStore();

  useEffect(() => {
    if (nodes) {
      setNodes(nodes, false);
      setSaveNodes(saveNodes);
    }
  }, [nodes, setNodes, setSaveNodes]);

  useEffect(() => {
    // When board changes, clear the history stack
    clearHistory();
  }, [activeBoardId, clearHistory]);

  if (!activeBoardId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No board selected. Please select or create a mood board.
      </div>
    );
  }

  if (nodes === null) {
    return <div style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }} />;
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <ArtGridCanvas boardId={activeBoardId} />
      
      {/* UI Overlays */}
      <BoardToolbar />
      <BoardPropertyBar />
    </div>
  );
};
