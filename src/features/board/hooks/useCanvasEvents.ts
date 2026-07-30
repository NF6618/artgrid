
import { useCanvasStore } from '../stores/useCanvasStore';
import { usePanZoom } from './interactions/usePanZoom';
import { useNodeSelection } from './interactions/useNodeSelection';
import { useShapeDrawing } from './interactions/useShapeDrawing';
import { useNodeDragTransform } from './interactions/useNodeDragTransform';
import { useImageCrop } from './interactions/useImageCrop';
import { Point } from '../engine/types';

export const useCanvasEvents = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  screenToWorld: (x: number, y: number) => Point,
  tldrawSnapToGrid: boolean
) => {
  const panZoom = usePanZoom(containerRef, screenToWorld);
  const nodeSelection = useNodeSelection(screenToWorld);
  const shapeDrawing = useShapeDrawing(screenToWorld, tldrawSnapToGrid);
  const dragTransform = useNodeDragTransform(screenToWorld, tldrawSnapToGrid);
  const imageCrop = useImageCrop(useCanvasStore.getState().viewport);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Pipeline of event handlers. First one to handle it returns true.
    if (panZoom.handlePointerDown(e)) return;
    if (imageCrop.handlePointerDown(e)) return;
    if (shapeDrawing.handlePointerDown(e)) return;
    if (dragTransform.handlePointerDown(e)) return;
    if (nodeSelection.handlePointerDown(e)) return;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (panZoom.handlePointerMove(e)) return;
    if (imageCrop.handlePointerMove(e)) return;
    if (shapeDrawing.handlePointerMove(e)) return;
    if (dragTransform.handlePointerMove(e)) return;
    if (nodeSelection.handlePointerMove(e)) return;
  };

  const handlePointerUp = () => {
    panZoom.handlePointerUp();
    imageCrop.handlePointerUp();
    shapeDrawing.handlePointerUp();
    dragTransform.handlePointerUp();
    nodeSelection.handlePointerUp();
  };

  const handleWheel = panZoom.handleWheel;

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    
    // Pass-through state needed by canvas renderer (temporary drawing overlays)
    isMarquee: nodeSelection.isMarquee,
    marqueeBox: nodeSelection.marqueeBox,
    isPenDrawing: shapeDrawing.isPenDrawing,
    currentPenPoints: shapeDrawing.currentPenPoints,
    isArrowDrawing: shapeDrawing.isArrowDrawing,
    arrowStart: shapeDrawing.arrowStart,
    arrowEnd: shapeDrawing.arrowEnd,
    handleResizeHandleMouseDown: dragTransform.handleResizeHandleMouseDown,
    
    // Image Crop State
    setIsDraggingCrop: imageCrop.setIsDraggingCrop,
    setCropDragStart: imageCrop.setCropDragStart
  };
};
