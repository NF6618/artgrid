import { useState, useCallback } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Point, ArtGridNode } from '../../engine/types';
import { snapToGrid } from '../../engine/grid';

export const useNodeDragTransform = (
  screenToWorld: (x: number, y: number) => Point,
  tldrawSnapToGrid: boolean
) => {
  const { nodes, setNodes, selectedIds, viewport } = useCanvasStore();

  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [nodeStartPositions, setNodeStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  const [resizingHandle, setResizingHandle] = useState<string | null>(null);
  const [resizeStartNode, setResizeStartNode] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [resizeMouseStart, setResizeMouseStart] = useState<Point>({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Check if clicked inside a selected node to start dragging
    if (e.button !== 0) return false;
    
    // We assume marquee or selection logic happens first. 
    // If we click on a selected node, start drag.
    const world = screenToWorld(e.clientX, e.clientY);
    const clickedNode = [...nodes].reverse().find(n => (
      world.x >= n.x && world.x <= n.x + n.width &&
      world.y >= n.y && world.y <= n.y + n.height
    ));

    if (clickedNode && selectedIds.includes(clickedNode.id)) {
      setIsDraggingNode(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      const starts = new Map();
      nodes.forEach(n => {
        if (selectedIds.includes(n.id)) starts.set(n.id, { x: n.x, y: n.y });
      });
      setNodeStartPositions(starts);
      return true; // handled
    }
    
    return false;
  }, [nodes, selectedIds, screenToWorld]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (resizingHandle && resizeStartNode && selectedIds.length === 1) {
      const dx = (e.clientX - resizeMouseStart.x) / viewport.zoom;
      const dy = (e.clientY - resizeMouseStart.y) / viewport.zoom;

      setNodes(prev => prev.map(n => {
        if (n.id !== selectedIds[0]) return n;

        let newX = resizeStartNode.x;
        let newY = resizeStartNode.y;
        let newW = resizeStartNode.width;
        let newH = resizeStartNode.height;

        if (e.shiftKey && ['nw', 'ne', 'se', 'sw'].includes(resizingHandle)) {
          const ratio = resizeStartNode.width / resizeStartNode.height;
          const useDx = Math.abs(dx) > Math.abs(dy);
          
          if (resizingHandle === 'se') {
            if (useDx) {
              newW = Math.max(30, resizeStartNode.width + dx);
              newH = newW / ratio;
            } else {
              newH = Math.max(30, resizeStartNode.height + dy);
              newW = newH * ratio;
            }
          } else if (resizingHandle === 'nw') {
            if (useDx) {
              newW = Math.max(30, resizeStartNode.width - dx);
              newH = newW / ratio;
            } else {
              newH = Math.max(30, resizeStartNode.height - dy);
              newW = newH * ratio;
            }
            newX = resizeStartNode.x + (resizeStartNode.width - newW);
            newY = resizeStartNode.y + (resizeStartNode.height - newH);
          } else if (resizingHandle === 'ne') {
            if (useDx) {
              newW = Math.max(30, resizeStartNode.width + dx);
              newH = newW / ratio;
            } else {
              newH = Math.max(30, resizeStartNode.height - dy);
              newW = newH * ratio;
            }
            newY = resizeStartNode.y + (resizeStartNode.height - newH);
          } else if (resizingHandle === 'sw') {
            if (useDx) {
              newW = Math.max(30, resizeStartNode.width - dx);
              newH = newW / ratio;
            } else {
              newH = Math.max(30, resizeStartNode.height + dy);
              newW = newH * ratio;
            }
            newX = resizeStartNode.x + (resizeStartNode.width - newW);
          }
        } else {
          if (resizingHandle.includes('e')) newW = Math.max(30, resizeStartNode.width + dx);
          if (resizingHandle.includes('s')) newH = Math.max(30, resizeStartNode.height + dy);
          if (resizingHandle.includes('w')) {
            newW = Math.max(30, resizeStartNode.width - dx);
            newX = resizeStartNode.x + dx;
          }
          if (resizingHandle.includes('n')) {
            newH = Math.max(30, resizeStartNode.height - dy);
            newY = resizeStartNode.y + dy;
          }
        }

        if (tldrawSnapToGrid) {
          newX = snapToGrid(newX);
          newY = snapToGrid(newY);
          newW = snapToGrid(newW);
          newH = snapToGrid(newH);
        }

        return { ...n, x: newX, y: newY, width: newW, height: newH };
      }), false); // dont save to history while moving
      return true;
    }

    if (isDraggingNode) {
      const dx = (e.clientX - dragStart.x) / viewport.zoom;
      const dy = (e.clientY - dragStart.y) / viewport.zoom;

      setNodes(prev => prev.map(n => {
        if (nodeStartPositions.has(n.id) && !n.locked) {
          const start = nodeStartPositions.get(n.id)!;
          let newX = start.x + dx;
          let newY = start.y + dy;
          if (tldrawSnapToGrid) {
            newX = snapToGrid(newX);
            newY = snapToGrid(newY);
          }
          return { ...n, x: newX, y: newY };
        }
        return n;
      }), false);
      return true;
    }
    
    return false;
  }, [resizingHandle, resizeStartNode, selectedIds, viewport, setNodes, isDraggingNode, dragStart, nodeStartPositions, tldrawSnapToGrid]);

  const handlePointerUp = useCallback(() => {
    let handled = false;
    
    if (resizingHandle) {
      setResizingHandle(null);
      setResizeStartNode(null);
      setNodes(nodes, true); // record history on drop
      handled = true;
    }

    if (isDraggingNode) {
      setIsDraggingNode(false);
      setNodeStartPositions(new Map());
      setNodes(nodes, true);
      handled = true;
    }

    return handled;
  }, [resizingHandle, isDraggingNode, nodes, setNodes]);

  const handleResizeHandleMouseDown = (e: React.PointerEvent, handle: string, node: ArtGridNode) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingHandle(handle);
    setResizeStartNode({ x: node.x, y: node.y, width: node.width, height: node.height });
    setResizeMouseStart({ x: e.clientX, y: e.clientY });
  };

  return { 
    handlePointerDown, 
    handlePointerMove, 
    handlePointerUp,
    handleResizeHandleMouseDown
  };
};
