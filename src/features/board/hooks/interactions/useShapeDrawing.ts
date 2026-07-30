import { useState, useCallback } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Point, SectionNode, NoteNode, TextNode, ShapeNode, PenNode, ArrowNode } from '../../engine/types';
import { snapToGrid } from '../../engine/grid';

export const useShapeDrawing = (
  screenToWorld: (x: number, y: number) => Point,
  tldrawSnapToGrid: boolean
) => {
  const { nodes, setNodes, activeTool, setActiveTool, setSelectedIds } = useCanvasStore();

  const [isPenDrawing, setIsPenDrawing] = useState(false);
  const [currentPenPoints, setCurrentPenPoints] = useState<Point[]>([]);

  const [isArrowDrawing, setIsArrowDrawing] = useState(false);
  const [arrowStart, setArrowStart] = useState<Point | null>(null);
  const [arrowEnd, setArrowEnd] = useState<Point | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return false;
    const world = screenToWorld(e.clientX, e.clientY);
    const snX = tldrawSnapToGrid ? snapToGrid(world.x) : world.x;
    const snY = tldrawSnapToGrid ? snapToGrid(world.y) : world.y;

    if (activeTool === 'eraser') {
      const clickedNode = [...nodes].reverse().find(n => (
        world.x >= n.x && world.x <= n.x + n.width &&
        world.y >= n.y && world.y <= n.y + n.height
      ));
      if (clickedNode) {
        setNodes(nodes.filter(n => n.id !== clickedNode.id), true);
        setSelectedIds(prev => prev.filter(id => id !== clickedNode.id));
      }
      return true;
    }

    if (activeTool === 'arrow') {
      setIsArrowDrawing(true);
      setArrowStart(world);
      setArrowEnd(world);
      return true;
    }

    if (activeTool === 'pen') {
      setIsPenDrawing(true);
      setCurrentPenPoints([world]);
      return true;
    }

    if (activeTool === 'section') {
      const newNode: SectionNode = {
        id: `node_${crypto.randomUUID()}`,
        type: 'section',
        x: snX, y: snY,
        width: 480, height: 360,
        title: 'Workspace Section',
        color: 'var(--accent-primary)',
      };
      setNodes([newNode, ...nodes], true);
      setSelectedIds([newNode.id]);
      setActiveTool('select');
      return true;
    }

    if (activeTool === 'note') {
      const newNode: NoteNode = {
        id: `node_${crypto.randomUUID()}`,
        type: 'note',
        x: snX, y: snY,
        width: 180, height: 180,
        text: 'New Note',
        color: 'yellow',
      };
      setNodes([...nodes, newNode], true);
      setSelectedIds([newNode.id]);
      setActiveTool('select');
      return true;
    }

    if (activeTool === 'text') {
      const newNode: TextNode = {
        id: `node_${crypto.randomUUID()}`,
        type: 'text',
        x: snX, y: snY,
        width: 160, height: 40,
        text: 'Text Label',
        color: '#e8e8f0',
      };
      setNodes([...nodes, newNode], true);
      setSelectedIds([newNode.id]);
      setActiveTool('select');
      return true;
    }

    if (activeTool === 'shape') {
      const newNode: ShapeNode = {
        id: `node_${crypto.randomUUID()}`,
        type: 'shape',
        shapeType: 'rectangle',
        x: snX, y: snY,
        width: 200, height: 150,
        strokeColor: 'var(--accent-primary)',
        fillColor: 'rgba(124, 107, 240, 0.1)',
      };
      setNodes([...nodes, newNode], true);
      setSelectedIds([newNode.id]);
      setActiveTool('select');
      return true;
    }

    return false;
  }, [activeTool, nodes, screenToWorld, tldrawSnapToGrid, setNodes, setSelectedIds, setActiveTool]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isArrowDrawing && arrowStart) {
      setArrowEnd(screenToWorld(e.clientX, e.clientY));
      return true;
    }

    if (isPenDrawing) {
      setCurrentPenPoints(prev => [...prev, screenToWorld(e.clientX, e.clientY)]);
      return true;
    }

    return false;
  }, [isArrowDrawing, arrowStart, isPenDrawing, screenToWorld]);

  const handlePointerUp = useCallback(() => {
    let handled = false;

    if (isArrowDrawing && arrowStart && arrowEnd) {
      const dx = arrowEnd.x - arrowStart.x;
      const dy = arrowEnd.y - arrowStart.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        const newNode: ArrowNode = {
          id: `node_${crypto.randomUUID()}`,
          type: 'arrow',
          x: Math.min(arrowStart.x, arrowEnd.x),
          y: Math.min(arrowStart.y, arrowEnd.y),
          width: Math.abs(dx),
          height: Math.abs(dy),
          color: '#e2e8f0',
          startNodeId: undefined,
          endNodeId: undefined,
          startAnchor: 'center',
          endAnchor: 'center',
          startPoint: { x: arrowStart.x - Math.min(arrowStart.x, arrowEnd.x), y: arrowStart.y - Math.min(arrowStart.y, arrowEnd.y) },
          endPoint: { x: arrowEnd.x - Math.min(arrowStart.x, arrowEnd.x), y: arrowEnd.y - Math.min(arrowStart.y, arrowEnd.y) },
          strokeWidth: 3,
          arrowHead: 'end',
        };
        setNodes(prev => [...prev, newNode], true);
      }
      setIsArrowDrawing(false);
      setArrowStart(null);
      setArrowEnd(null);
      setActiveTool('select');
      handled = true;
    }

    if (isPenDrawing && currentPenPoints.length > 0) {
      if (currentPenPoints.length > 2) {
        const xs = currentPenPoints.map(p => p.x);
        const ys = currentPenPoints.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        const localPoints = currentPenPoints.map(p => ({ x: p.x - minX, y: p.y - minY }));
        
        const newNode: PenNode = {
          id: `node_${crypto.randomUUID()}`,
          type: 'pen',
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          points: localPoints,
          color: '#e2e8f0',
          strokeWidth: 4,
        };
        setNodes(prev => [...prev, newNode], true);
      }
      setIsPenDrawing(false);
      setCurrentPenPoints([]);
      setActiveTool('select');
      handled = true;
    }

    return handled;
  }, [isArrowDrawing, arrowStart, arrowEnd, isPenDrawing, currentPenPoints, setNodes, setActiveTool]);

  return { 
    handlePointerDown, 
    handlePointerMove, 
    handlePointerUp,
    // Provide temporary drawing states to render overlay
    isPenDrawing, currentPenPoints,
    isArrowDrawing, arrowStart, arrowEnd
  };
};
