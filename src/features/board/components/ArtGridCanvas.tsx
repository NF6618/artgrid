import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArtGridNode, Viewport, ToolType, Point, NoteColor, ImageNode, NoteNode, TextNode, ShapeNode, PenNode, ArrowNode, SectionNode } from '../engine/types';
import { drawCanvasGrid, snapToGrid } from '../engine/grid';
import { HistoryManager } from '../engine/history';
import { BoardToolbar } from './BoardToolbar';
import { BoardPropertyBar } from './BoardPropertyBar';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import {
  IconScissors,
  IconCopy,
  IconLock,
  IconUnlock,
  IconTrash,
  IconType,
  IconStickyNote,
  IconBoard,
  IconSquare,
  IconPencil,
  IconChevronRight,
  IconChevronDown,
} from '../../../components/Icons';

interface ArtGridCanvasProps {
  boardId?: string | null;
  initialNodes: ArtGridNode[];
  onNodesChange: (nodes: ArtGridNode[]) => void;
}

export const ArtGridCanvas: React.FC<ArtGridCanvasProps> = ({
  boardId,
  initialNodes,
  onNodesChange,
}) => {
  const { tldrawTheme, tldrawGridStyle, tldrawSnapToGrid, theme } = useSettingsStore();

  const [nodes, setNodes] = useState<ArtGridNode[]>(initialNodes);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1.0 });
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Inline text editing
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // History Manager
  const historyRef = useRef<HistoryManager>(new HistoryManager());
  const [, setHistoryTick] = useState(0);

  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [nodeStartPositions, setNodeStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Marquee selection state
  const [isMarquee, setIsMarquee] = useState(false);
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  // Pen Drawing state
  const [isPenDrawing, setIsPenDrawing] = useState(false);
  const [currentPenPoints, setCurrentPenPoints] = useState<Point[]>([]);

  // Arrow Drawing state
  const [isArrowDrawing, setIsArrowDrawing] = useState(false);
  const [arrowStart, setArrowStart] = useState<Point | null>(null);
  const [arrowEnd, setArrowEnd] = useState<Point | null>(null);

  // Canvas Ref
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync initial nodes when switching active board
  useEffect(() => {
    setNodes(initialNodes);
    historyRef.current.clear();
    setSelectedIds([]);
  }, [boardId]);

  // Update parent on nodes change
  const updateNodes = useCallback((newNodes: ArtGridNode[], recordHistory = true) => {
    if (recordHistory) {
      historyRef.current.pushState(nodes);
      setHistoryTick(t => t + 1);
    }
    setNodes(newNodes);
    onNodesChange(newNodes);
  }, [nodes, onNodesChange]);

  // Screen to Canvas World coordinate conversion
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = screenX - rect.left;
    const relativeY = screenY - rect.top;
    return {
      x: (relativeX - viewport.x) / viewport.zoom,
      y: (relativeY - viewport.y) / viewport.zoom,
    };
  }, [viewport]);

  // Draw Grid Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = tldrawTheme === 'light' ? false : (tldrawTheme === 'dark' || theme === 'dark');
    ctx.clearRect(0, 0, width, height);

    drawCanvasGrid(ctx, width, height, viewport, tldrawGridStyle || 'dots', isDark);
  }, [viewport, tldrawGridStyle, tldrawTheme, theme]);

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
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
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    if (editingNodeId) setEditingNodeId(null);

    // Pan with Middle Mouse or Hand tool
    if (e.button === 1 || activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    if (e.button !== 0) return;
    const world = screenToWorld(e.clientX, e.clientY);

    // Eraser Tool
    if (activeTool === 'eraser') {
      const clickedNode = [...nodes].reverse().find(n => (
        world.x >= n.x && world.x <= n.x + n.width &&
        world.y >= n.y && world.y <= n.y + n.height
      ));
      if (clickedNode) {
        updateNodes(nodes.filter(n => n.id !== clickedNode.id));
        setSelectedIds(prev => prev.filter(id => id !== clickedNode.id));
      }
      return;
    }

    // Arrow / Connector Tool
    if (activeTool === 'arrow') {
      setIsArrowDrawing(true);
      setArrowStart(world);
      setArrowEnd(world);
      return;
    }

    // Pen Tool Drawing
    if (activeTool === 'pen') {
      setIsPenDrawing(true);
      setCurrentPenPoints([world]);
      return;
    }

    // Creating Section Workspace Frame
    if (activeTool === 'section') {
      const newNode: SectionNode = {
        id: `node_${crypto.randomUUID()}`,
        type: 'section',
        x: tldrawSnapToGrid ? snapToGrid(world.x) : world.x,
        y: tldrawSnapToGrid ? snapToGrid(world.y) : world.y,
        width: 480,
        height: 360,
        title: 'Workspace Section',
        color: 'var(--accent-primary)',
      };
      // Place section at beginning of nodes array so it renders behind other elements
      updateNodes([newNode, ...nodes]);
      setSelectedIds([newNode.id]);
      setActiveTool('select');
      return;
    }

    // Creating Sticky Note
    if (activeTool === 'note') {
      const newNode: NoteNode = {
        id: `node_${crypto.randomUUID()}`,
        type: 'note',
        x: tldrawSnapToGrid ? snapToGrid(world.x) : world.x,
        y: tldrawSnapToGrid ? snapToGrid(world.y) : world.y,
        width: 180,
        height: 180,
        text: 'New Note',
        color: 'yellow',
      };
      updateNodes([...nodes, newNode]);
      setSelectedIds([newNode.id]);
      setActiveTool('select');
      return;
    }

    // Creating Text
    if (activeTool === 'text') {
      const newNode: TextNode = {
        id: `node_${crypto.randomUUID()}`,
        type: 'text',
        x: tldrawSnapToGrid ? snapToGrid(world.x) : world.x,
        y: tldrawSnapToGrid ? snapToGrid(world.y) : world.y,
        width: 160,
        height: 40,
        text: 'Text Label',
        color: '#e8e8f0',
      };
      updateNodes([...nodes, newNode]);
      setSelectedIds([newNode.id]);
      setActiveTool('select');
      return;
    }

    // Creating Shape
    if (activeTool === 'shape') {
      const newNode: ShapeNode = {
        id: `node_${crypto.randomUUID()}`,
        type: 'shape',
        shapeType: 'rectangle',
        x: tldrawSnapToGrid ? snapToGrid(world.x) : world.x,
        y: tldrawSnapToGrid ? snapToGrid(world.y) : world.y,
        width: 200,
        height: 150,
        strokeColor: 'var(--accent-primary)',
        fillColor: 'rgba(124, 107, 240, 0.1)',
      };
      updateNodes([...nodes, newNode]);
      setSelectedIds([newNode.id]);
      setActiveTool('select');
      return;
    }

    // Check hit test on nodes (reverse order for top-most)
    const clickedNode = [...nodes].reverse().find(n => (
      world.x >= n.x && world.x <= n.x + n.width &&
      world.y >= n.y && world.y <= n.y + n.height
    ));

    if (clickedNode) {
      if (e.shiftKey) {
        setSelectedIds(prev => prev.includes(clickedNode.id) ? prev.filter(id => id !== clickedNode.id) : [...prev, clickedNode.id]);
      } else {
        if (!selectedIds.includes(clickedNode.id)) {
          setSelectedIds([clickedNode.id]);
        }
      }

      setIsDraggingNode(true);
      setDragStart({ x: e.clientX, y: e.clientY });

      const startMap = new Map();
      const idsToMove = selectedIds.includes(clickedNode.id) ? selectedIds : [clickedNode.id];
      nodes.filter(n => idsToMove.includes(n.id)).forEach(n => startMap.set(n.id, { x: n.x, y: n.y }));
      setNodeStartPositions(startMap);
    } else {
      // Clicked background -> start marquee selection
      setSelectedIds([]);
      setIsMarquee(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setMarqueeBox({
          startX: e.clientX - rect.left,
          startY: e.clientY - rect.top,
          endX: e.clientX - rect.left,
          endY: e.clientY - rect.top,
        });
      }
    }
  };

  // Resize handle interaction state
  const [resizingHandle, setResizingHandle] = useState<string | null>(null);
  const [resizeStartNode, setResizeStartNode] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [resizeMouseStart, setResizeMouseStart] = useState<Point>({ x: 0, y: 0 });

  // Keyboard Shortcuts (Undo, Redo, Delete, Duplicate, Tool Shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if active element is an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((document.activeElement?.tagName || ''))) return;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          // Redo
          const next = historyRef.current.redo(nodes);
          if (next) { setNodes(next); onNodesChange(next); setHistoryTick(t => t + 1); }
        } else {
          // Undo
          const prev = historyRef.current.undo(nodes);
          if (prev) { setNodes(prev); onNodesChange(prev); setHistoryTick(t => t + 1); }
        }
        return;
      }

      if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        const next = historyRef.current.redo(nodes);
        if (next) { setNodes(next); onNodesChange(next); setHistoryTick(t => t + 1); }
        return;
      }

      if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelection();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelection();
        return;
      }

      // Quick Tool Shortcuts
      if (!isCmdOrCtrl) {
        if (e.key.toLowerCase() === 'v') setActiveTool('select');
        if (e.key.toLowerCase() === 'h') setActiveTool('pan');
        if (e.key.toLowerCase() === 's') setActiveTool('section');
        if (e.key.toLowerCase() === 'n') setActiveTool('note');
        if (e.key.toLowerCase() === 't') setActiveTool('text');
        if (e.key.toLowerCase() === 'r') setActiveTool('shape');
        if (e.key.toLowerCase() === 'a') setActiveTool('arrow');
        if (e.key.toLowerCase() === 'p') setActiveTool('pen');
        if (e.key.toLowerCase() === 'e') setActiveTool('eraser');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, selectedIds, onNodesChange]);

  // Handle Resize Mouse Down
  const handleResizeHandleMouseDown = (e: React.PointerEvent, handle: string, node: ArtGridNode) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingHandle(handle);
    setResizeStartNode({ x: node.x, y: node.y, width: node.width, height: node.height });
    setResizeMouseStart({ x: e.clientX, y: e.clientY });
  };

  // Pointer Move with Resize Handler
  const handlePointerMove = (e: React.PointerEvent) => {
    if (resizingHandle && resizeStartNode && selectedIds.length === 1) {
      const dx = (e.clientX - resizeMouseStart.x) / viewport.zoom;
      const dy = (e.clientY - resizeMouseStart.y) / viewport.zoom;

      setNodes(prev => prev.map(n => {
        if (n.id !== selectedIds[0]) return n;

        let newX = resizeStartNode.x;
        let newY = resizeStartNode.y;
        let newW = resizeStartNode.width;
        let newH = resizeStartNode.height;

        if (resizingHandle.includes('e')) newW = Math.max(30, resizeStartNode.width + dx);
        if (resizingHandle.includes('s')) newH = Math.max(30, resizeStartNode.height + dy);
        if (resizingHandle.includes('w')) {
          const w = Math.max(30, resizeStartNode.width - dx);
          newX = resizeStartNode.x + (resizeStartNode.width - w);
          newW = w;
        }
        if (resizingHandle.includes('n')) {
          const h = Math.max(30, resizeStartNode.height - dy);
          newY = resizeStartNode.y + (resizeStartNode.height - h);
          newH = h;
        }

        if (tldrawSnapToGrid) {
          newX = snapToGrid(newX);
          newY = snapToGrid(newY);
          newW = snapToGrid(newW);
          newH = snapToGrid(newH);
        }

        return { ...n, x: newX, y: newY, width: newW, height: newH };
      }));
      return;
    }

    if (isPanning) {
      setViewport(v => ({ ...v, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
      return;
    }

    if (isArrowDrawing && arrowStart) {
      const world = screenToWorld(e.clientX, e.clientY);
      setArrowEnd(world);
      return;
    }

    if (isPenDrawing) {
      const world = screenToWorld(e.clientX, e.clientY);
      setCurrentPenPoints(prev => [...prev, world]);
      return;
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
      }));
      return;
    }

    if (isMarquee && marqueeBox && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      setMarqueeBox(prev => prev ? { ...prev, endX, endY } : null);

      // Calculate marquee box bounds in world coords
      const wStart = screenToWorld(marqueeBox.startX + rect.left, marqueeBox.startY + rect.top);
      const wEnd = screenToWorld(endX + rect.left, endY + rect.top);

      const minX = Math.min(wStart.x, wEnd.x);
      const maxX = Math.max(wStart.x, wEnd.x);
      const minY = Math.min(wStart.y, wEnd.y);
      const maxY = Math.max(wStart.y, wEnd.y);

      const selected = nodes.filter(n => (
        n.x + n.width >= minX && n.x <= maxX &&
        n.y + n.height >= minY && n.y <= maxY
      )).map(n => n.id);

      setSelectedIds(selected);
    }
  };

  // Pointer Up
  const handlePointerUp = () => {
    if (resizingHandle) {
      setResizingHandle(null);
      setResizeStartNode(null);
      updateNodes(nodes, true);
    }

    if (isPanning) setIsPanning(false);

    if (isArrowDrawing && arrowStart && arrowEnd) {
      setIsArrowDrawing(false);
      const minX = Math.min(arrowStart.x, arrowEnd.x);
      const minY = Math.min(arrowStart.y, arrowEnd.y);
      const maxX = Math.max(arrowStart.x, arrowEnd.x);
      const maxY = Math.max(arrowStart.y, arrowEnd.y);

      const dx = arrowEnd.x - arrowStart.x;
      const dy = arrowEnd.y - arrowStart.y;
      if (Math.hypot(dx, dy) > 10) {
        const arrowNode: ArrowNode = {
          id: `node_${crypto.randomUUID()}`,
          type: 'arrow',
          x: minX - 10,
          y: minY - 10,
          width: Math.max(30, maxX - minX + 20),
          height: Math.max(30, maxY - minY + 20),
          startPoint: { x: arrowStart.x - (minX - 10), y: arrowStart.y - (minY - 10) },
          endPoint: { x: arrowEnd.x - (minX - 10), y: arrowEnd.y - (minY - 10) },
          color: 'var(--accent-primary)',
          strokeWidth: 3,
          arrowHead: 'end',
        };
        updateNodes([...nodes, arrowNode]);
        setSelectedIds([arrowNode.id]);
      }
      setArrowStart(null);
      setArrowEnd(null);
      setActiveTool('select');
    }

    if (isPenDrawing) {
      setIsPenDrawing(false);
      if (currentPenPoints.length > 1) {
        const xs = currentPenPoints.map(p => p.x);
        const ys = currentPenPoints.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const penNode: PenNode = {
          id: `node_${crypto.randomUUID()}`,
          type: 'pen',
          x: minX,
          y: minY,
          width: Math.max(20, maxX - minX),
          height: Math.max(20, maxY - minY),
          points: currentPenPoints.map(p => ({ x: p.x - minX, y: p.y - minY })),
          color: 'var(--accent-primary)',
          strokeWidth: 4,
        };
        updateNodes([...nodes, penNode]);
      }
      setCurrentPenPoints([]);
      setActiveTool('select');
    }

    if (isDraggingNode) {
      setIsDraggingNode(false);
      updateNodes(nodes, true);
    }

    if (isMarquee) {
      setIsMarquee(false);
      setMarqueeBox(null);
    }
  };

  // Drag & Drop media assets directly from ArtGrid gallery onto canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      let assetData: any = null;
      if (!dataStr) {
        assetData = (window as any).__artgridDragAsset;
      } else {
        assetData = JSON.parse(dataStr);
      }

      if (!assetData || !assetData.url) return;

      const world = screenToWorld(e.clientX, e.clientY);
      let w = assetData.width || 360;
      let h = assetData.height || 360;
      if (w > 400) {
        const scale = 400 / w;
        w = 400;
        h = h * scale;
      }

      const imgNode: ImageNode = {
        id: `node_${crypto.randomUUID()}`,
        type: 'image',
        x: tldrawSnapToGrid ? snapToGrid(world.x - w / 2) : world.x - w / 2,
        y: tldrawSnapToGrid ? snapToGrid(world.y - h / 2) : world.y - h / 2,
        width: w,
        height: h,
        src: assetData.url,
        assetId: assetData.id,
      };

      updateNodes([...nodes, imgNode]);
      setSelectedIds([imgNode.id]);
    } catch (err) {
      console.error('Failed to parse dropped asset', err);
    }
  };

  // Node Property Bar Handlers
  const handleDeleteSelection = () => {
    if (selectedIds.length === 0) return;
    updateNodes(nodes.filter(n => !selectedIds.includes(n.id)), true);
    setSelectedIds([]);
  };

  const handleDuplicateSelection = () => {
    const toDuplicate = nodes.filter(n => selectedIds.includes(n.id));
    const newDuplicates = toDuplicate.map(n => ({
      ...JSON.parse(JSON.stringify(n)),
      id: `node_${crypto.randomUUID()}`,
      x: n.x + 30,
      y: n.y + 30,
    }));
    updateNodes([...nodes, ...newDuplicates]);
    setSelectedIds(newDuplicates.map(n => n.id));
  };

  const handleBringToFront = () => {
    const selected = nodes.filter(n => selectedIds.includes(n.id));
    const remaining = nodes.filter(n => !selectedIds.includes(n.id));
    updateNodes([...remaining, ...selected]);
  };

  const handleSendToBack = () => {
    const selected = nodes.filter(n => selectedIds.includes(n.id));
    const remaining = nodes.filter(n => !selectedIds.includes(n.id));
    updateNodes([...selected, ...remaining]);
  };

  const handleChangeNoteColor = (color: NoteColor) => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'note' ? { ...n, color } : n));
  };

  const handleToggleLock = () => {
    const anyUnlocked = nodes.some(n => selectedIds.includes(n.id) && !n.locked);
    updateNodes(nodes.map(n => selectedIds.includes(n.id) ? { ...n, locked: anyUnlocked } : n));
  };

  const getNoteBgColor = (color: NoteColor) => {
    switch (color) {
      case 'yellow': return '#fef08a';
      case 'blue': return '#bae6fd';
      case 'green': return '#bbf7d0';
      case 'pink': return '#fbcfe8';
      case 'purple': return '#e9d5ff';
      case 'dark': return '#1f2937';
      default: return '#fef08a';
    }
  };

  const handleChangeFontFamily = (fontFamily: string) => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'text' ? { ...n, fontFamily } : n));
  };

  const handleChangeFontSize = (fontSize: number) => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'text' ? { ...n, fontSize } : n));
  };

  const handleChangeTextColor = (color: string) => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'text' ? { ...n, color } : n));
  };

  const handleChangeShapeFill = (fillColor: string) => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'shape' ? { ...n, fillColor } : n));
  };

  const handleChangeShapeStroke = (strokeColor: string) => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'shape' ? { ...n, strokeColor } : n));
  };

  const handleChangeShapeType = (shapeType: 'rectangle' | 'ellipse') => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'shape' ? { ...n, shapeType } : n));
  };

  const handleChangePenColor = (color: string) => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'pen' ? { ...n, color } : n));
  };

  const handleChangePenWidth = (strokeWidth: number) => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'pen' ? { ...n, strokeWidth } : n));
  };

  const handleChangeArrowColor = (color: string) => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'arrow' ? { ...n, color } : n));
  };

  const handleChangeSectionColor = (color: string) => {
    updateNodes(nodes.map(n => selectedIds.includes(n.id) && n.type === 'section' ? { ...n, color } : n));
  };

  const selectedNodes = nodes.filter(n => selectedIds.includes(n.id));

  // Right-click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    worldPos: Point;
    targetNode: ArtGridNode | null;
  } | null>(null);

  // Handle Right Click Context Menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const world = screenToWorld(e.clientX, e.clientY);
    const clickedNode = [...nodes].reverse().find(n => (
      world.x >= n.x && world.x <= n.x + n.width &&
      world.y >= n.y && world.y <= n.y + n.height
    ));

    if (clickedNode) {
      if (!selectedIds.includes(clickedNode.id)) {
        setSelectedIds([clickedNode.id]);
      }
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      worldPos: world,
      targetNode: clickedNode || null,
    });
  };

  // Close context menu on left click anywhere
  useEffect(() => {
    const handleCloseContextMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseContextMenu);
    return () => window.removeEventListener('click', handleCloseContextMenu);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: tldrawTheme === 'light' ? '#f8fafc' : 'var(--bg-base)',
        cursor: isPanning ? 'grabbing' : activeTool === 'pan' ? 'grab' : activeTool === 'pen' || activeTool === 'arrow' ? 'crosshair' : activeTool === 'eraser' ? 'not-allowed' : 'default',
        userSelect: 'none',
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Background Grid Canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* World Layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '0 0',
          transform: `matrix(${viewport.zoom}, 0, 0, ${viewport.zoom}, ${viewport.x}, ${viewport.y})`,
        }}
      >
        {nodes.map(node => {
          const isSelected = selectedIds.includes(node.id);
          const showResizeHandles = isSelected && selectedIds.length === 1 && !node.locked;

          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
                boxShadow: isSelected ? '0 0 0 2px var(--accent-primary), 0 10px 30px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.3)',
                borderRadius: node.type === 'note' ? 8 : (node.type === 'image' ? 6 : 4),
                overflow: 'visible',
                border: isSelected ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                cursor: node.locked ? 'not-allowed' : 'move',
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (node.type === 'note' || node.type === 'text' || node.type === 'section') {
                  setEditingNodeId(node.id);
                  setEditingText((node as any).title || (node as any).text || '');
                }
              }}
            >
              {/* SECTION WORKSPACE FRAME NODE */}
              {node.type === 'section' && (
                <div style={{ width: '100%', height: '100%', border: `2px dashed ${(node as SectionNode).color || 'var(--accent-primary)'}`, borderRadius: 8, background: 'rgba(124, 107, 240, 0.04)', position: 'relative' }}>
                  <div style={{ background: (node as SectionNode).color || 'var(--accent-primary)', color: 'white', padding: '4px 12px', borderTopLeftRadius: 6, borderTopRightRadius: 6, fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {editingNodeId === node.id ? (
                      <input 
                        autoFocus
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onBlur={() => {
                          updateNodes(nodes.map(n => n.id === node.id ? { ...n, title: editingText } : n));
                          setEditingNodeId(null);
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontWeight: 600, fontSize: '12px', width: '100%' }}
                      />
                    ) : (
                      <span>{(node as SectionNode).title || 'Workspace Section'}</span>
                    )}
                  </div>
                </div>
              )}

              {/* IMAGE NODE */}
              {node.type === 'image' && (
                <img
                  src={(node as ImageNode).src}
                  alt="board asset"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', display: 'block', borderRadius: 6 }}
                />
              )}

              {/* STICKY NOTE NODE */}
              {node.type === 'note' && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: getNoteBgColor((node as NoteNode).color),
                    color: (node as NoteNode).color === 'dark' ? '#f8fafc' : '#1e293b',
                    padding: 14,
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    fontWeight: 500,
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  {editingNodeId === node.id ? (
                    <textarea
                      autoFocus
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      onBlur={() => {
                        updateNodes(nodes.map(n => n.id === node.id ? { ...n, text: editingText } : n));
                        setEditingNodeId(null);
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        color: 'inherit',
                      }}
                    />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {(node as NoteNode).text || 'Double-click to edit'}
                    </div>
                  )}
                </div>
              )}

              {/* REFINED TEXT BOX NODE */}
              {node.type === 'text' && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    color: (node as TextNode).color || 'var(--text-primary)',
                    fontSize: `${(node as TextNode).fontSize || 18}px`,
                    fontFamily: (node as TextNode).fontFamily === 'System Default'
                      ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      : (node as TextNode).fontFamily ? `'${(node as TextNode).fontFamily}', sans-serif` : 'var(--font-family)',
                    fontWeight: 600,
                    padding: 4,
                    boxSizing: 'border-box',
                  }}
                >
                  {editingNodeId === node.id ? (
                    <input
                      autoFocus
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      onBlur={() => {
                        updateNodes(nodes.map(n => n.id === node.id ? { ...n, text: editingText } : n));
                        setEditingNodeId(null);
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--accent-primary)',
                        borderRadius: 4,
                        outline: 'none',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        color: 'inherit',
                        padding: '2px 6px',
                      }}
                    />
                  ) : (
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(node as TextNode).text || 'Click to type text'}
                    </div>
                  )}
                </div>
              )}

              {/* RECTANGLE / SHAPE NODE */}
              {node.type === 'shape' && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: (node as ShapeNode).fillColor || 'transparent',
                    border: `2px solid ${(node as ShapeNode).strokeColor || 'var(--accent-primary)'}`,
                    borderRadius: (node as ShapeNode).shapeType === 'ellipse' ? '50%' : 6,
                  }}
                />
              )}

              {/* ARROW / CONNECTOR NODE */}
              {node.type === 'arrow' && (
                <svg style={{ width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                  <defs>
                    <marker
                      id={`arrowhead_${node.id}`}
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill={(node as ArrowNode).color || 'var(--accent-primary)'}
                      />
                    </marker>
                  </defs>
                  <line
                    x1={(node as ArrowNode).startPoint.x}
                    y1={(node as ArrowNode).startPoint.y}
                    x2={(node as ArrowNode).endPoint.x}
                    y2={(node as ArrowNode).endPoint.y}
                    stroke={(node as ArrowNode).color || 'var(--accent-primary)'}
                    strokeWidth={(node as ArrowNode).strokeWidth || 3}
                    markerEnd={`url(#arrowhead_${node.id})`}
                  />
                </svg>
              )}

              {/* SKETCH PEN NODE */}
              {node.type === 'pen' && (
                <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <path
                    d={`M ${(node as PenNode).points.map(p => `${p.x},${p.y}`).join(' L ')}`}
                    stroke={(node as PenNode).color || 'var(--accent-primary)'}
                    strokeWidth={(node as PenNode).strokeWidth || 4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* 8-POINT INTERACTIVE RESIZE HANDLES */}
              {showResizeHandles && (
                <>
                  {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(handle => {
                    let cursor = 'nwse-resize';
                    let top: number | string = 0;
                    let left: number | string = 0;

                    if (handle === 'nw') { top = -5; left = -5; cursor = 'nwse-resize'; }
                    if (handle === 'n') { top = -5; left = '50%'; cursor = 'ns-resize'; }
                    if (handle === 'ne') { top = -5; left = '100%'; cursor = 'nesw-resize'; }
                    if (handle === 'e') { top = '50%'; left = '100%'; cursor = 'ew-resize'; }
                    if (handle === 'se') { top = '100%'; left = '100%'; cursor = 'nwse-resize'; }
                    if (handle === 's') { top = '100%'; left = '50%'; cursor = 'ns-resize'; }
                    if (handle === 'sw') { top = '100%'; left = -5; cursor = 'nesw-resize'; }
                    if (handle === 'w') { top = '50%'; left = -5; cursor = 'ew-resize'; }

                    return (
                      <div
                        key={handle}
                        onPointerDown={e => handleResizeHandleMouseDown(e, handle, node)}
                        style={{
                          position: 'absolute',
                          top,
                          left,
                          transform: 'translate(-50%, -50%)',
                          width: 10,
                          height: 10,
                          background: '#ffffff',
                          border: '2px solid var(--accent-primary)',
                          borderRadius: '50%',
                          cursor,
                          zIndex: 10,
                        }}
                      />
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Arrow Drawing Overlay */}
      {isArrowDrawing && arrowStart && arrowEnd && (
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 95 }}>
          <defs>
            <marker id="preview_arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-primary)" />
            </marker>
          </defs>
          <line
            x1={arrowStart.x * viewport.zoom + viewport.x}
            y1={arrowStart.y * viewport.zoom + viewport.y}
            x2={arrowEnd.x * viewport.zoom + viewport.x}
            y2={arrowEnd.y * viewport.zoom + viewport.y}
            stroke="var(--accent-primary)"
            strokeWidth={3}
            strokeDasharray="6,4"
            markerEnd="url(#preview_arrowhead)"
          />
        </svg>
      )}

      {/* Marquee Drag Selection Overlay */}
      {isMarquee && marqueeBox && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(marqueeBox.startX, marqueeBox.endX),
            top: Math.min(marqueeBox.startY, marqueeBox.endY),
            width: Math.abs(marqueeBox.endX - marqueeBox.startX),
            height: Math.abs(marqueeBox.endY - marqueeBox.startY),
            border: '1px dashed var(--accent-primary)',
            background: 'rgba(124, 107, 240, 0.15)',
            pointerEvents: 'none',
            zIndex: 90,
          }}
        />
      )}

      {/* Property Bar for Selected Elements */}
      <BoardPropertyBar
        selectedNodes={selectedNodes}
        onDelete={handleDeleteSelection}
        onDuplicate={handleDuplicateSelection}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
        onChangeColor={handleChangeNoteColor}
        onChangeFontFamily={handleChangeFontFamily}
        onChangeFontSize={handleChangeFontSize}
        onChangeTextColor={handleChangeTextColor}
        onChangeShapeFill={handleChangeShapeFill}
        onChangeShapeStroke={handleChangeShapeStroke}
        onChangeShapeType={handleChangeShapeType}
        onChangePenColor={handleChangePenColor}
        onChangePenWidth={handleChangePenWidth}
        onChangeArrowColor={handleChangeArrowColor}
        onChangeSectionColor={handleChangeSectionColor}
        onToggleLock={handleToggleLock}
      />

      {/* Floating Canvas Toolbar */}
      <BoardToolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        canUndo={historyRef.current.canUndo()}
        canRedo={historyRef.current.canRedo()}
        onUndo={() => {
          const prev = historyRef.current.undo(nodes);
          if (prev) {
            setNodes(prev);
            onNodesChange(prev);
            setHistoryTick(t => t + 1);
          }
        }}
        onRedo={() => {
          const next = historyRef.current.redo(nodes);
          if (next) {
            setNodes(next);
            onNodesChange(next);
            setHistoryTick(t => t + 1);
          }
        }}
        onResetZoom={() => setViewport({ x: 0, y: 0, zoom: 1.0 })}
        zoomLevel={viewport.zoom}
      />

      {/* Right-Click Asset Creation & Editing Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 260),
            width: 210,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 6,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.7)',
            zIndex: 1000,
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.targetNode ? (
            /* Asset Node Editing Actions */
            <>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase' }}>
                Element Actions
              </div>

              {contextMenu.targetNode.type === 'image' && (
                <button
                  className="btn btn--secondary"
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={() => {
                    const imgNode = contextMenu.targetNode as ImageNode;
                    const pseudoAsset = {
                      id: imgNode.assetId || imgNode.id,
                      title: 'Canvas Asset',
                      filename: 'canvas_image.png',
                      filepath: imgNode.src,
                      type: 'image/png',
                      size: '1.0 MB',
                      width: imgNode.width,
                      height: imgNode.height,
                      favorite: false,
                      date_added: new Date().toISOString(),
                      url: imgNode.src,
                    };
                    (window as any).__artgridOpenPreviewAsset?.(pseudoAsset);
                    setContextMenu(null);
                  }}
                >
                  <IconScissors size={14} /> Crop / Edit Media Studio
                </button>
              )}

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => { handleDuplicateSelection(); setContextMenu(null); }}
              >
                <IconCopy size={14} /> Duplicate Node
              </button>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => { handleBringToFront(); setContextMenu(null); }}
              >
                <IconChevronRight size={14} style={{ transform: 'rotate(-90deg)' }} /> Bring to Front
              </button>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => { handleSendToBack(); setContextMenu(null); }}
              >
                <IconChevronDown size={14} /> Send to Back
              </button>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => { handleToggleLock(); setContextMenu(null); }}
              >
                {contextMenu.targetNode.locked ? <IconUnlock size={14} /> : <IconLock size={14} />}
                {contextMenu.targetNode.locked ? 'Unlock Position' : 'Lock Position'}
              </button>

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', color: '#f06b8e', borderColor: 'rgba(240, 107, 142, 0.3)', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => { handleDeleteSelection(); setContextMenu(null); }}
              >
                <IconTrash size={14} /> Delete Element
              </button>
            </>
          ) : (
            /* Canvas Background Creation Actions */
            <>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase' }}>
                Create Asset
              </div>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  const newNode: TextNode = {
                    id: `node_${crypto.randomUUID()}`,
                    type: 'text',
                    x: contextMenu.worldPos.x,
                    y: contextMenu.worldPos.y,
                    width: 180,
                    height: 44,
                    text: 'New Text Box',
                    color: '#e8e8f0',
                  };
                  updateNodes([...nodes, newNode]);
                  setSelectedIds([newNode.id]);
                  setContextMenu(null);
                }}
              >
                <IconType size={14} /> Add Text Box
              </button>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  const newNode: NoteNode = {
                    id: `node_${crypto.randomUUID()}`,
                    type: 'note',
                    x: contextMenu.worldPos.x,
                    y: contextMenu.worldPos.y,
                    width: 180,
                    height: 180,
                    text: 'Sticky Note',
                    color: 'yellow',
                  };
                  updateNodes([...nodes, newNode]);
                  setSelectedIds([newNode.id]);
                  setContextMenu(null);
                }}
              >
                <IconStickyNote size={14} /> Add Sticky Note
              </button>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  const newNode: SectionNode = {
                    id: `node_${crypto.randomUUID()}`,
                    type: 'section',
                    x: contextMenu.worldPos.x,
                    y: contextMenu.worldPos.y,
                    width: 480,
                    height: 360,
                    title: 'New Section Frame',
                    color: 'var(--accent-primary)',
                  };
                  updateNodes([newNode, ...nodes]);
                  setSelectedIds([newNode.id]);
                  setContextMenu(null);
                }}
              >
                <IconBoard size={14} /> Add Section Frame
              </button>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  const newNode: ShapeNode = {
                    id: `node_${crypto.randomUUID()}`,
                    type: 'shape',
                    shapeType: 'rectangle',
                    x: contextMenu.worldPos.x,
                    y: contextMenu.worldPos.y,
                    width: 200,
                    height: 150,
                    strokeColor: 'var(--accent-primary)',
                    fillColor: 'rgba(124, 107, 240, 0.1)',
                  };
                  updateNodes([...nodes, newNode]);
                  setSelectedIds([newNode.id]);
                  setContextMenu(null);
                }}
              >
                <IconSquare size={14} /> Add Shape
              </button>

              <button
                className="btn btn--secondary"
                style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  setActiveTool('pen');
                  setContextMenu(null);
                }}
              >
                <IconPencil size={14} /> Draw with Pen Tool
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
