import { useState, useEffect } from 'react';
import { useBoardStore } from '../../../stores/useBoardStore';
import { ArtGridNode } from '../engine/types';

let timeoutId: any;
let lastPendingSave: { boardId: string; nodes: ArtGridNode[] } | null = null;

export function useBoardSync(boardId: string | null) {
  const [nodes, setNodes] = useState<ArtGridNode[] | null>(null);
  const boards = useBoardStore(state => state.boards);

  useEffect(() => {
    if (!boardId) {
      setNodes(null);
      return;
    }

    const board = boards.find(b => b.id === boardId);
    if (board && board.nodes && Array.isArray(board.nodes)) {
      setNodes(board.nodes as ArtGridNode[]);
    } else {
      setNodes([]);
    }

    return () => {
      // Flush pending save immediately on unmount or board change
      if (timeoutId && lastPendingSave) {
        clearTimeout(timeoutId);
        useBoardStore.getState().updateBoardNodes(lastPendingSave.boardId, lastPendingSave.nodes);
        lastPendingSave = null;
      }
    };
  }, [boardId]);

  return {
    nodes,
    saveNodes: (newNodes: ArtGridNode[]) => {
      if (!boardId) return;
      setNodes(newNodes);
      // Immediately update Zustand store in memory so state is always current
      useBoardStore.setState(state => ({
        boards: state.boards.map(b => (b.id === boardId ? { ...b, nodes: newNodes } : b)),
      }));
      debounceBackendSave(boardId, newNodes);
    }
  };
}

function debounceBackendSave(boardId: string, nodes: ArtGridNode[]) {
  lastPendingSave = { boardId, nodes };
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    useBoardStore.getState().updateBoardNodes(boardId, nodes);
    lastPendingSave = null;
  }, 400);
}
