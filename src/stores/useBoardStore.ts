import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Board, BoardNode } from '../types/board';

interface BoardState {
  boards: Board[];
  activeBoardId: string | null;
  isLoading: boolean;
  
  loadBoards: () => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  updateBoardNodes: (boardId: string, nodes: BoardNode[]) => Promise<void>;
  renameBoard: (boardId: string, newTitle: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  setActiveBoard: (boardId: string | null) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoardId: null,
  isLoading: false,

  loadBoards: async () => {
    set({ isLoading: true });
    try {
      const boards = await invoke<Board[]>('get_boards');
      set({ boards, isLoading: false });
    } catch (err) {
      console.error('Failed to load boards:', err);
      set({ isLoading: false });
    }
  },

  createBoard: async (title: string) => {
    try {
      const newBoard = await invoke<Board>('create_board', { title });
      set(state => ({ 
        boards: [...state.boards, newBoard],
        activeBoardId: newBoard.id 
      }));
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  },

  updateBoardNodes: async (boardId: string, nodes: BoardNode[]) => {
    // Optimistic update
    set(state => ({
      boards: state.boards.map(b => 
        b.id === boardId ? { ...b, nodes } : b
      )
    }));

    // Persist to backend
    const board = get().boards.find(b => b.id === boardId);
    if (!board) return;

    try {
      await invoke('save_board', { 
        id: board.id, 
        title: board.title, 
        nodes 
      });
    } catch (err) {
      console.error('Failed to save board nodes:', err);
    }
  },

  renameBoard: async (boardId: string, newTitle: string) => {
    // Optimistic update
    set(state => ({
      boards: state.boards.map(b => 
        b.id === boardId ? { ...b, title: newTitle } : b
      )
    }));

    const board = get().boards.find(b => b.id === boardId);
    if (!board) return;

    try {
      await invoke('save_board', { 
        id: board.id, 
        title: newTitle, 
        nodes: board.nodes 
      });
    } catch (err) {
      console.error('Failed to rename board:', err);
      // Revert could be added here
    }
  },

  deleteBoard: async (boardId: string) => {
    try {
      await invoke('delete_board', { id: boardId });
      set(state => ({
        boards: state.boards.filter(b => b.id !== boardId),
        activeBoardId: state.activeBoardId === boardId ? null : state.activeBoardId
      }));
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  },

  setActiveBoard: (boardId: string | null) => {
    set({ activeBoardId: boardId });
  }
}));
