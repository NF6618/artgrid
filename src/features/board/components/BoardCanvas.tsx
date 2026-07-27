import React from 'react';
import { useBoardSync } from '../hooks/useBoardSync';
import { useBoardStore } from '../../../stores/useBoardStore';
import { ArtGridCanvas } from './ArtGridCanvas';

export const BoardCanvas: React.FC = () => {
  const activeBoardId = useBoardStore(state => state.activeBoardId);
  const { nodes, saveNodes } = useBoardSync(activeBoardId);

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
      <ArtGridCanvas
        initialNodes={nodes}
        onNodesChange={saveNodes}
      />
    </div>
  );
};
