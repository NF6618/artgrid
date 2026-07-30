import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Board } from '../types/board';
import { ArtGridNode } from '../features/board/engine/types';

interface BoardState {
  boards: Board[];
  activeBoardId: string | null;
  isLoading: boolean;

  loadBoards: () => Promise<void>;
  createBoard: (title: string) => Promise<Board | null>;
  updateBoardNodes: (boardId: string, nodes: ArtGridNode[]) => Promise<void>;
  renameBoard: (boardId: string, newTitle: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  setActiveBoard: (boardId: string | null) => void;
  addAssetToBoard: (boardId: string, asset: { id: string; url: string; width?: number; height?: number }) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoardId: null,
  isLoading: false,

  // ── Load ─────────────────────────────────────────────────────────────────
  loadBoards: async () => {
    set({ isLoading: true });
    try {
      const boards = await invoke<Board[]>('get_boards');
      set(state => ({
        boards,
        activeBoardId:
          state.activeBoardId && boards.some(b => b.id === state.activeBoardId)
            ? state.activeBoardId
            : boards.length > 0
            ? boards[0].id
            : null,
        isLoading: false,
      }));
    } catch (err) {
      console.error('Failed to load boards:', err);
      set({ isLoading: false });
    }
  },

  // ── Create ───────────────────────────────────────────────────────────────
  createBoard: async (title: string) => {
    try {
      const newBoard = await invoke<Board>('create_board', { title });
      set(state => ({
        boards: [...state.boards, newBoard],
        activeBoardId: newBoard.id,
      }));
      return newBoard;
    } catch (err) {
      console.error('Failed to create board:', err);
      return null;
    }
  },

  // ── Update Nodes (persist) ──────────────────────────────────
  updateBoardNodes: async (boardId: string, nodes: ArtGridNode[]) => {
    set(state => ({
      boards: state.boards.map(b => (b.id === boardId ? { ...b, nodes } : b)),
    }));

    const board = get().boards.find(b => b.id === boardId);
    if (!board) return;
    try {
      await invoke('save_board', { id: board.id, title: board.title, nodes });
    } catch (err) {
      console.error('Failed to save board:', err);
    }
  },

  // ── Add Asset to Board ──────────────────────────────────────
  addAssetToBoard: async (boardId: string, asset: { id: string; url: string; width?: number; height?: number }) => {
    const board = get().boards.find(b => b.id === boardId);
    if (!board) return;

    let w = asset.width || 360;
    let h = asset.height || 360;
    if (w > 400) {
      const scale = 400 / w;
      w = 400;
      h = h * scale;
    }

    const newNode: ArtGridNode = {
      id: `node_${crypto.randomUUID()}`,
      type: 'image',
      x: 100 + (board.nodes.length * 25) % 300,
      y: 100 + (board.nodes.length * 25) % 300,
      width: w,
      height: h,
      src: asset.url,
      assetId: asset.id,
    };

    const updatedNodes = [...(board.nodes as ArtGridNode[]), newNode];
    await get().updateBoardNodes(boardId, updatedNodes);
  },

  // ── Rename ───────────────────────────────────────────────────────────────
  renameBoard: async (boardId: string, newTitle: string) => {
    set(state => ({
      boards: state.boards.map(b => (b.id === boardId ? { ...b, title: newTitle } : b)),
    }));
    const board = get().boards.find(b => b.id === boardId);
    if (!board) return;
    try {
      await invoke('save_board', { id: board.id, title: newTitle, nodes: board.nodes });
    } catch (err) {
      console.error('Failed to rename board:', err);
    }
  },

  // ── Delete ───────────────────────────────────────────────────────────────
  deleteBoard: async (boardId: string) => {
    try {
      await invoke('delete_board', { id: boardId });
      set(state => ({
        boards: state.boards.filter(b => b.id !== boardId),
        activeBoardId:
          state.activeBoardId === boardId
            ? state.boards.find(b => b.id !== boardId)?.id ?? null
            : state.activeBoardId,
      }));
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  },

  setActiveBoard: boardId => set({ activeBoardId: boardId }),
}));


