import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Board } from '../types/board';
import { ArtGridNode } from '../features/board/engine/types';

interface BoardState {
  boards: Board[];
  activeBoardId: string | null;
  isLoading: boolean;

  loadBoards: () => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  updateBoardNodes: (boardId: string, nodes: ArtGridNode[]) => Promise<void>;
  renameBoard: (boardId: string, newTitle: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  setActiveBoard: (boardId: string | null) => void;
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
    } catch (err) {
      console.error('Failed to create board:', err);
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

