import { useState, useCallback } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Point } from '../../engine/types';

export const usePanZoom = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  screenToWorld: (x: number, y: number) => Point
) => {
  const { viewport, setViewport, activeTool, isPanning, setIsPanning } = useCanvasStore();
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(0.1, viewport.zoom * zoomFactor), 5.0);

    const worldPoint = screenToWorld(e.clientX, e.clientY);
    const newX = mouseX - worldPoint.x * newZoom;
    const newY = mouseY - worldPoint.y * newZoom;

    setViewport({ x: newX, y: newY, zoom: newZoom });
  }, [containerRef, viewport.zoom, screenToWorld, setViewport]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return true; // handled
    }
    return false;
  }, [activeTool, viewport.x, viewport.y, setIsPanning]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      setViewport({ ...viewport, x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return true; // handled
    }
    return false;
  }, [isPanning, viewport, panStart, setViewport]);

  const handlePointerUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return true; // handled
    }
    return false;
  }, [isPanning, setIsPanning]);

  return { handleWheel, handlePointerDown, handlePointerMove, handlePointerUp };
};
