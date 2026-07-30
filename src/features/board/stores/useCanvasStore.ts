import { create } from 'zustand';
import { ToolType, Viewport, ArtGridNode } from '../engine/types';
import { HistoryManager } from '../engine/history';
import { invoke } from '@tauri-apps/api/core';

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
  setNodes: (nodes: ArtGridNode[] | ((prev: ArtGridNode[]) => ArtGridNode[]), recordHistory?: boolean, skipSave?: boolean) => void;
  mergeNodes: (incomingNodes: ArtGridNode[], viewportBounds?: {minX: number, minY: number, maxX: number, maxY: number}) => void;
  layoutSection: (boardId: string, sectionId: string) => Promise<void>;
  deleteNodes: (boardId: string, nodeIds: string[]) => Promise<void>;
  
  saveNodes?: (nodes: ArtGridNode[]) => void;
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
  setNodes: (nodes, recordHistory = false, skipSave = false) => set((state) => {
    const newNodes = typeof nodes === 'function' ? nodes(state.nodes) : nodes;
    
    if (recordHistory) {
      historyManager.pushState(state.nodes);
    }
    
    // Call the external sync save
    if (!skipSave && state.saveNodes) {
      state.saveNodes(newNodes);
    }
    
    return { 
      nodes: newNodes,
      canUndo: historyManager.canUndo(),
      canRedo: historyManager.canRedo()
    };
  }),

  mergeNodes: (incomingNodes: ArtGridNode[], viewportBounds?: {minX: number, minY: number, maxX: number, maxY: number}) => set((state) => {
    const merged = new Map(state.nodes.map(n => [n.id, n]));
    incomingNodes.forEach(n => merged.set(n.id, n));
    
    let finalNodes = Array.from(merged.values());
    if (viewportBounds) {
      const pad = 2000;
      finalNodes = finalNodes.filter(n => {
        return n.x >= viewportBounds.minX - pad && n.x + n.width <= viewportBounds.maxX + pad &&
               n.y >= viewportBounds.minY - pad && n.y + n.height <= viewportBounds.maxY + pad;
      });
    }
    
    return { nodes: finalNodes };
  }),

  layoutSection: async (boardId: string, sectionId: string) => {
    try {
      await invoke('layout_section', { boardId, sectionId });
      window.dispatchEvent(new CustomEvent('artgrid-refresh-tiles'));
    } catch (e) {
      console.error('Failed to run layout_section:', e);
    }
  },

  deleteNodes: async (boardId: string, nodeIds: string[]) => {
    try {
      await invoke('delete_nodes', { boardId, nodeIds });
      set((state) => {
        const newNodes = state.nodes.filter(n => !nodeIds.includes(n.id));
        historyManager.pushState(newNodes);
        return { 
          nodes: newNodes, 
          canUndo: historyManager.canUndo(), 
          canRedo: historyManager.canRedo() 
        };
      });
    } catch (e) {
      console.error('Failed to delete nodes:', e);
    }
  },

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
