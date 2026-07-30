import { create } from 'zustand';
import { ToolType, Viewport, ArtGridNode } from '../engine/types';
import { HistoryManager } from '../engine/history';

// Singleton history manager for the canvas store
const historyManager = new HistoryManager();

interface CanvasState {
  // Viewport & Tools
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  
  viewport: Viewport;
  setViewport: (viewport: Viewport | ((prev: Viewport) => Viewport)) => void;
  
  isPanning: boolean;
  setIsPanning: (isPanning: boolean) => void;

  // Selection & Active States
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  
  editingNodeId: string | null;
  setEditingNodeId: (id: string | null) => void;

  croppingNodeId: string | null;
  setCroppingNodeId: (id: string | null) => void;
  
  // Nodes (Local fast state)
  nodes: ArtGridNode[];
  setNodes: (nodes: ArtGridNode[] | ((prev: ArtGridNode[]) => ArtGridNode[]), recordHistory?: boolean) => void;
  
  // Syncing
  saveNodes: (nodes: ArtGridNode[]) => void;
  setSaveNodes: (fn: (nodes: ArtGridNode[]) => void) => void;

  // History state exposure
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  viewport: { x: 0, y: 0, zoom: 1.0 },
  setViewport: (viewport) => set((state) => ({
    viewport: typeof viewport === 'function' ? viewport(state.viewport) : viewport
  })),

  isPanning: false,
  setIsPanning: (isPanning) => set({ isPanning }),

  selectedIds: [],
  setSelectedIds: (ids) => set((state) => ({
    selectedIds: typeof ids === 'function' ? ids(state.selectedIds) : ids
  })),

  editingNodeId: null,
  setEditingNodeId: (id) => set({ editingNodeId: id }),

  croppingNodeId: null,
  setCroppingNodeId: (id) => set({ croppingNodeId: id }),

  nodes: [],
  setNodes: (nodes, recordHistory = false) => set((state) => {
    const newNodes = typeof nodes === 'function' ? nodes(state.nodes) : nodes;
    
    if (recordHistory) {
      historyManager.pushState(state.nodes);
    }
    
    // Call the external sync save
    if (state.saveNodes) {
      state.saveNodes(newNodes);
    }
    
    return { 
      nodes: newNodes,
      canUndo: historyManager.canUndo(),
      canRedo: historyManager.canRedo()
    };
  }),

  saveNodes: () => {},
  setSaveNodes: (fn) => set({ saveNodes: fn }),

  canUndo: false,
  canRedo: false,
  undo: () => set((state) => {
    const prev = historyManager.undo(state.nodes);
    if (prev) {
      if (state.saveNodes) state.saveNodes(prev);
      return { nodes: prev, canUndo: historyManager.canUndo(), canRedo: historyManager.canRedo() };
    }
    return state;
  }),
  redo: () => set((state) => {
    const next = historyManager.redo(state.nodes);
    if (next) {
      if (state.saveNodes) state.saveNodes(next);
      return { nodes: next, canUndo: historyManager.canUndo(), canRedo: historyManager.canRedo() };
    }
    return state;
  }),
  clearHistory: () => {
    historyManager.clear();
    set({ canUndo: false, canRedo: false });
  }
}));
