import { useState, useEffect, useCallback, useRef } from 'react';
import { useBoardStore } from '../../../stores/useBoardStore';
import { ArtGridNode } from '../engine/types';
import { invoke } from '@tauri-apps/api/core';
import { useCanvasStore } from '../stores/useCanvasStore';

let timeoutId: any;
let lastPendingSave: { boardId: string; nodes: ArtGridNode[] } | null = null;
let fetchTimeoutId: any;

export function useBoardSync(boardId: string | null) {
  const [isReady, setIsReady] = useState<boolean>(false);
  const viewport = useCanvasStore(state => state.viewport);
  const mergeNodes = useCanvasStore(state => state.mergeNodes);
  
  // Track all known nodes in this session to prevent re-upserting identical nodes repeatedly
  const knownNodesRef = useRef<Map<string, ArtGridNode>>(new Map());

  const fetchVisibleNodes = useCallback(async (minX: number, minY: number, maxX: number, maxY: number) => {
    if (!boardId) return;
    try {
      const fetchedNodes = await invoke<ArtGridNode[]>('get_visible_nodes', { 
        boardId, minX, minY, maxX, maxY 
      });
      
      const currentKnown = knownNodesRef.current;
      fetchedNodes.forEach(n => {
        currentKnown.set(n.id, n);
      });
      
      const bounds = { minX, minY, maxX, maxY };
      // Push to Zustand store
      mergeNodes(fetchedNodes, bounds);
      
    } catch (e) {
      console.error('Failed to fetch spatial tiles', e);
    }
  }, [boardId, mergeNodes]);

  // Debounced Viewport Tile Fetching
  useEffect(() => {
    if (!boardId) return;
    
    // We pad the viewport to fetch tiles slightly outside so panning is smooth
    const cw = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const ch = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const pad = 1000;
    
    const minX = (-viewport.x - pad) / viewport.zoom;
    const minY = (-viewport.y - pad) / viewport.zoom;
    const maxX = (-viewport.x + cw + pad) / viewport.zoom;
    const maxY = (-viewport.y + ch + pad) / viewport.zoom;

    clearTimeout(fetchTimeoutId);
    fetchTimeoutId = setTimeout(() => {
      fetchVisibleNodes(minX, minY, maxX, maxY);
    }, 100); // 100ms debounce on spatial fetch

    const handleRefresh = () => {
      fetchVisibleNodes(minX, minY, maxX, maxY);
    };
    
    window.addEventListener('artgrid-refresh-tiles', handleRefresh);
    return () => {
      window.removeEventListener('artgrid-refresh-tiles', handleRefresh);
    };
  }, [boardId, viewport, fetchVisibleNodes]);

  // Initial load
  useEffect(() => {
    if (!boardId) {
      setIsReady(false);
      knownNodesRef.current.clear();
      return;
    }
    
    // We signal that nodes array is "ready" so the loading spinner disappears
    setIsReady(true); 

    return () => {
      // Flush pending save immediately on unmount or board change
      if (timeoutId && lastPendingSave) {
        clearTimeout(timeoutId);
        invoke('upsert_nodes', { boardId: lastPendingSave.boardId, nodes: lastPendingSave.nodes });
        lastPendingSave = null;
      }
    };
  }, [boardId]);

  const saveNodes = useCallback((newNodes: ArtGridNode[]) => {
    if (!boardId) return;
    
    // Find which nodes changed
    const changed: ArtGridNode[] = [];
    newNodes.forEach(n => {
       const prev = knownNodesRef.current.get(n.id);
       if (!prev || JSON.stringify(prev) !== JSON.stringify(n)) {
          changed.push(n);
          knownNodesRef.current.set(n.id, n);
       }
    });
    
    if (changed.length > 0) {
      debounceBackendSave(boardId, changed);
    }
  }, [boardId]);

  return {
    isReady,
    saveNodes
  };
}

function debounceBackendSave(boardId: string, changedNodes: ArtGridNode[]) {
  // merge pending changes
  if (lastPendingSave && lastPendingSave.boardId === boardId) {
     const merged = new Map(lastPendingSave.nodes.map(n => [n.id, n]));
     changedNodes.forEach(n => merged.set(n.id, n));
     lastPendingSave.nodes = Array.from(merged.values());
  } else {
     lastPendingSave = { boardId, nodes: changedNodes };
  }
  
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    invoke('upsert_nodes', { boardId: lastPendingSave!.boardId, nodes: lastPendingSave!.nodes }).catch(console.error);
    lastPendingSave = null;
  }, 400);
}
