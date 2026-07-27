import { useState, useEffect } from 'react';
import { useBoardStore } from '../../../stores/useBoardStore';
import { ArtGridNode } from '../engine/types';

export function useBoardSync(boardId: string | null) {
  const [nodes, setNodes] = useState<ArtGridNode[] | null>(null);
  const boards = useBoardStore(state => state.boards);

  useEffect(() => {
    if (!boardId) {
      setNodes(null);
      return;
    }

    const board = boards.find(b => b.id === boardId);
    if (!board) return;

    if (board.nodes && Array.isArray(board.nodes)) {
      setNodes(board.nodes as ArtGridNode[]);
    } else {
      setNodes([]);
    }
  }, [boardId]);

  return {
    nodes,
    saveNodes: (newNodes: ArtGridNode[]) => {
      if (!boardId) return;
      setNodes(newNodes);
      debounceSave(boardId, newNodes);
    }
  };
}

let timeoutId: any;
function debounceSave(boardId: string, nodes: ArtGridNode[]) {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    useBoardStore.getState().updateBoardNodes(boardId, nodes);
  }, 800);
}
