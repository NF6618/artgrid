import { useState, useEffect } from 'react';
import { createTLStore, defaultShapeUtils, TLRecord, TLStore } from 'tldraw';
import { useBoardStore } from '../../../stores/useBoardStore';

export function useBoardSync(boardId: string | null) {
  const [store, setStore] = useState<TLStore | null>(null);
  const boards = useBoardStore(state => state.boards);

  useEffect(() => {
    if (!boardId) {
      setStore(null);
      return;
    }

    const board = boards.find(b => b.id === boardId);
    if (!board) return;

    // Initialize a new store for the current board
    const newStore = createTLStore({
      shapeUtils: defaultShapeUtils,
    });

    // Load existing nodes if they exist
    if (board.nodes && board.nodes.length > 0) {
      // The backend returns an array of TLRecords
      const validRecords = board.nodes.filter(
        (r: any) => r && typeof r === 'object' && r.id && r.typeName
      );
      if (validRecords.length > 0) {
        newStore.put(validRecords as TLRecord[]);
      }
    }

    setStore(newStore);

    // Subscribe to store changes to persist back to SQLite
    const unsubscribe = newStore.listen(
      () => {
        // Only save on user-driven changes (ignore internal ephemeral states if needed)
        debounceSave(boardId, newStore);
      },
      { scope: 'all', source: 'user' }
    );

    return () => {
      unsubscribe();
    };
  }, [boardId]); // Only re-run when the active board changes

  return store;
}

// Simple debounce for saving the store to SQLite
let timeoutId: any;
function debounceSave(boardId: string, store: TLStore) {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    // Get all records in the document
    const records = store.allRecords();
    useBoardStore.getState().updateBoardNodes(boardId, records);
  }, 1000); // 1 second debounce
}
