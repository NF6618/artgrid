import { useState, useCallback } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Point } from '../../engine/types';

export const useImageCrop = (
  viewport: { zoom: number }
) => {
  const { nodes, setNodes, croppingNodeId } = useCanvasStore();
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropDragStart, setCropDragStart] = useState<Point>({ x: 0, y: 0 });

  const handlePointerDown = useCallback((_e: React.PointerEvent) => {
    // This is a placeholder hook for future Crop functionality expansion
    return false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDraggingCrop && croppingNodeId) {
      const dx = (e.clientX - cropDragStart.x) / viewport.zoom;
      const dy = (e.clientY - cropDragStart.y) / viewport.zoom;
      
      setNodes(prev => prev.map(n => {
        if (n.id === croppingNodeId && n.type === 'image') {
          const crop = n.crop || { x: 0, y: 0, width: n.width, height: n.height };
          return { ...n, crop: { ...crop, x: crop.x + dx, y: crop.y + dy } };
        }
        return n;
      }), false);
      setCropDragStart({ x: e.clientX, y: e.clientY });
      return true;
    }
    return false;
  }, [isDraggingCrop, croppingNodeId, cropDragStart, viewport.zoom, setNodes]);

  const handlePointerUp = useCallback(() => {
    if (isDraggingCrop) {
      setIsDraggingCrop(false);
      setNodes(nodes, true); // save state
      return true;
    }
    return false;
  }, [isDraggingCrop, nodes, setNodes]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDraggingCrop,
    setIsDraggingCrop,
    cropDragStart,
    setCropDragStart
  };
};
