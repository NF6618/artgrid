import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';
import { Board, BoardNode } from '../types/board';

const MAX_HISTORY = 50;

interface HistorySlot {
  past: BoardNode[][];
  future: BoardNode[][];
}

interface BoardState {
  boards: Board[];
  activeBoardId: string | null;
  isLoading: boolean;
  history: Record<string, HistorySlot>;

  loadBoards: () => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  updateBoardNodes: (boardId: string, nodes: BoardNode[], addToHistory?: boolean) => Promise<void>;
  renameBoard: (boardId: string, newTitle: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  setActiveBoard: (boardId: string | null) => void;

  // History
  undoNodes: (boardId: string) => void;
  redoNodes: (boardId: string) => void;

  // Node-level operations
  duplicateNode: (boardId: string, nodeId: string) => Promise<void>;
  updateNode: (boardId: string, nodeId: string, patch: Partial<BoardNode>) => Promise<void>;
  moveNodeToFront: (boardId: string, nodeId: string) => Promise<void>;
  moveNodeToBack: (boardId: string, nodeId: string) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoardId: null,
  isLoading: false,
  history: {},

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

  // ── Update Nodes (optimistic + persist) ──────────────────────────────────
  updateBoardNodes: async (boardId: string, nodes: BoardNode[], addToHistory = true) => {
    const currentBoard = get().boards.find(b => b.id === boardId);

    if (addToHistory && currentBoard) {
      set(state => {
        const slot = state.history[boardId] ?? { past: [], future: [] };
        return {
          history: {
            ...state.history,
            [boardId]: {
              past: [...slot.past, currentBoard.nodes].slice(-MAX_HISTORY),
              future: [], // new action clears redo stack
            },
          },
        };
      });
    }

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

  // ── Undo ─────────────────────────────────────────────────────────────────
  undoNodes: (boardId: string) => {
    const { boards, history } = get();
    const slot = history[boardId];
    if (!slot || slot.past.length === 0) return;

    const currentBoard = boards.find(b => b.id === boardId);
    const past = [...slot.past];
    const previousNodes = past.pop()!;

    set(state => ({
      boards: state.boards.map(b => (b.id === boardId ? { ...b, nodes: previousNodes } : b)),
      history: {
        ...state.history,
        [boardId]: {
          past,
          future: currentBoard
            ? [currentBoard.nodes, ...slot.future].slice(0, MAX_HISTORY)
            : slot.future,
        },
      },
    }));

    const board = get().boards.find(b => b.id === boardId);
    if (board) invoke('save_board', { id: board.id, title: board.title, nodes: previousNodes }).catch(console.error);
  },

  // ── Redo ─────────────────────────────────────────────────────────────────
  redoNodes: (boardId: string) => {
    const { boards, history } = get();
    const slot = history[boardId];
    if (!slot || slot.future.length === 0) return;

    const currentBoard = boards.find(b => b.id === boardId);
    const future = [...slot.future];
    const nextNodes = future.shift()!;

    set(state => ({
      boards: state.boards.map(b => (b.id === boardId ? { ...b, nodes: nextNodes } : b)),
      history: {
        ...state.history,
        [boardId]: {
          past: currentBoard
            ? [...slot.past, currentBoard.nodes].slice(-MAX_HISTORY)
            : slot.past,
          future,
        },
      },
    }));

    const board = get().boards.find(b => b.id === boardId);
    if (board) invoke('save_board', { id: board.id, title: board.title, nodes: nextNodes }).catch(console.error);
  },

  // ── Duplicate Node ────────────────────────────────────────────────────────
  duplicateNode: async (boardId: string, nodeId: string) => {
    const board = get().boards.find(b => b.id === boardId);
    if (!board) return;
    const src = board.nodes.find(n => n.id === nodeId);
    if (!src) return;

    const copy: BoardNode = {
      ...src,
      id: uuidv4(),
      position: { x: src.position.x + 24, y: src.position.y + 24 },
      zIndex: src.zIndex + 1,
      data: { ...src.data },
    };

    await get().updateBoardNodes(boardId, [...board.nodes, copy]);
  },

  // ── Update single node properties ─────────────────────────────────────────
  updateNode: async (boardId: string, nodeId: string, patch: Partial<BoardNode>) => {
    const board = get().boards.find(b => b.id === boardId);
    if (!board) return;
    const nodes = board.nodes.map(n => (n.id === nodeId ? { ...n, ...patch } : n));
    // Don't push to history for minor property tweaks
    await get().updateBoardNodes(boardId, nodes, false);
  },

  // ── Layer Z-order ─────────────────────────────────────────────────────────
  moveNodeToFront: async (boardId: string, nodeId: string) => {
    const board = get().boards.find(b => b.id === boardId);
    if (!board) return;
    const maxZ = board.nodes.reduce((m, n) => Math.max(m, n.zIndex ?? 0), 0);
    await get().updateNode(boardId, nodeId, { zIndex: maxZ + 1 });
  },

  moveNodeToBack: async (boardId: string, nodeId: string) => {
    const board = get().boards.find(b => b.id === boardId);
    if (!board) return;
    const node = board.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const isSection = node.type === 'section';
    const minZ = isSection ? -10 : 1;
    await get().updateNode(boardId, nodeId, { zIndex: minZ });
  },
}));
