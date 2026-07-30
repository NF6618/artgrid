import { useState, useCallback } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Point, ArtGridNode, SectionNode } from '../../engine/types';
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
      
      const starts = new Map<string, { x: number, y: number }>();
      
      // Helper to add a node and all its children to the starts map
      const addWithChildren = (nodeId: string) => {
        if (starts.has(nodeId)) return;
        const n = nodes.find(x => x.id === nodeId);
        if (!n) return;
        starts.set(n.id, { x: n.x, y: n.y });
        
        if (n.type === 'section') {
          nodes.filter(child => child.parentId === n.id).forEach(child => {
            addWithChildren(child.id);
          });
        }
      };

      selectedIds.forEach(id => addWithChildren(id));
      
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
      }), false, true); // dont save to history or backend while moving
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
      }), false, true); // skip save while dragging
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
      
      let layoutNeededSections = new Set<string>();

      // Auto-parenting: Check if any dragged nodes center-points are inside a Section
      let updatedNodes = [...nodes];
      const sections = updatedNodes.filter(n => n.type === 'section') as SectionNode[];

      updatedNodes = updatedNodes.map(n => {
        // Only consider nodes that were actually dragged
        if (!nodeStartPositions.has(n.id)) return n;
        // Don't parent sections to sections (for now, keep it simple)
        if (n.type === 'section') return n;
        
        const centerX = n.x + n.width / 2;
        const centerY = n.y + n.height / 2;

        // Find which section its center is inside of, taking the top-most one
        const parentSection = [...sections].reverse().find(s => (
          centerX >= s.x && 
          centerY >= s.y && 
          centerX <= s.x + s.width && 
          centerY <= s.y + s.height
        ));

        const newParentId = parentSection ? parentSection.id : undefined;
        
        if (n.parentId !== newParentId) {
            if (n.parentId) layoutNeededSections.add(n.parentId);
            if (newParentId) layoutNeededSections.add(newParentId);
        } else if (newParentId) {
            // Moved inside the same section
            layoutNeededSections.add(newParentId);
        }

        return {
          ...n,
          parentId: newParentId
        };
      });

      setNodes(updatedNodes, true);
      
      if (layoutNeededSections.size > 0) {
        // Find the active board ID from the URL or a board store.
        // Actually, BoardCanvas passes boardId to components, or we can get it from document.location / route.
        // But useCanvasStore doesn't know boardId natively.
        // Let's fire a custom event that BoardCanvas can pick up, OR we can just grab boardId from window.
        // Let's dispatch an event with the section IDs.
        window.dispatchEvent(new CustomEvent('artgrid-layout-sections', { 
            detail: { sections: Array.from(layoutNeededSections) } 
        }));
      }

      handled = true;
    }

    return handled;
  }, [resizingHandle, isDraggingNode, nodes, setNodes, nodeStartPositions]);

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
