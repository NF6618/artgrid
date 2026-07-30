import { useState, useCallback } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Point } from '../../engine/types';

export const useNodeSelection = (
  screenToWorld: (x: number, y: number) => Point
) => {
  const { nodes, activeTool, selectedIds, setSelectedIds } = useCanvasStore();

  const [isMarquee, setIsMarquee] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<Point>({ x: 0, y: 0 });
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || activeTool !== 'select') return false;

    const world = screenToWorld(e.clientX, e.clientY);

    const clickedNode = [...nodes].reverse().find(n => (
      world.x >= n.x && world.x <= n.x + n.width &&
      world.y >= n.y && world.y <= n.y + n.height
    ));

    if (clickedNode) {
      if (e.shiftKey) {
        setSelectedIds(prev => prev.includes(clickedNode.id) 
          ? prev.filter(id => id !== clickedNode.id) 
          : [...prev, clickedNode.id]);
      } else {
        if (!selectedIds.includes(clickedNode.id)) {
          setSelectedIds([clickedNode.id]);
        }
      }
      return false; // Let dragging handle it if they move mouse
    } else {
      // Clicked on empty space -> start marquee
      setSelectedIds([]);
      setIsMarquee(true);
      setMarqueeStart(world);
      setMarqueeBox({
        startX: world.x,
        startY: world.y,
        endX: world.x,
        endY: world.y
      });
      return true; // handled marquee
    }
  }, [activeTool, nodes, selectedIds, screenToWorld, setSelectedIds]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isMarquee) {
      const currentWorld = screenToWorld(e.clientX, e.clientY);
      setMarqueeBox({
        startX: marqueeStart.x,
        startY: marqueeStart.y,
        endX: currentWorld.x,
        endY: currentWorld.y
      });

      // Calculate intersection
      const minX = Math.min(marqueeStart.x, currentWorld.x);
      const maxX = Math.max(marqueeStart.x, currentWorld.x);
      const minY = Math.min(marqueeStart.y, currentWorld.y);
      const maxY = Math.max(marqueeStart.y, currentWorld.y);

      const newlySelected = nodes.filter(n => (
        n.x < maxX && n.x + n.width > minX &&
        n.y < maxY && n.y + n.height > minY
      )).map(n => n.id);

      setSelectedIds(newlySelected);
      return true; // handled
    }
    return false;
  }, [isMarquee, marqueeStart, nodes, screenToWorld, setSelectedIds]);

  const handlePointerUp = useCallback(() => {
    if (isMarquee) {
      setIsMarquee(false);
      setMarqueeBox(null);
      return true;
    }
    return false;
  }, [isMarquee]);

  return { handlePointerDown, handlePointerMove, handlePointerUp, isMarquee, marqueeBox };
};
