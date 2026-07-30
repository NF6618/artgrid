import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArtGridNode, Point, ImageNode, NoteNode, TextNode, ShapeNode, ArrowNode, SectionNode } from '../engine/types';
import { drawCanvasGrid, snapToGrid } from '../engine/grid';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useCanvasStore } from '../stores/useCanvasStore';
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
import { useCanvasEvents } from '../hooks/useCanvasEvents';
import { NodeRenderer } from './node-views/NodeRenderer';
import { ConnectorPath } from './ConnectorPath';

interface ArtGridCanvasProps {
  boardId?: string | null;
}

export const ArtGridCanvas: React.FC<ArtGridCanvasProps> = ({ boardId: _boardId }) => {
  const { tldrawTheme, tldrawGridStyle, tldrawSnapToGrid, theme } = useSettingsStore();

  const {
    nodes,
    setNodes,
    activeTool,
    setActiveTool,
    selectedIds,
    setSelectedIds,
    viewport,
    editingNodeId,
    setEditingNodeId,
    croppingNodeId,
    setCroppingNodeId,
    isPanning,
    undo,
    redo,
  } = useCanvasStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update local nodes + store history + sync
  const updateNodes = useCallback((newNodes: ArtGridNode[], recordHistory = true) => {
    setNodes(newNodes, recordHistory);
  }, [setNodes]);

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

  const events = useCanvasEvents(
    containerRef,
    screenToWorld,
    !!tldrawSnapToGrid
  );

  const {
    isMarquee,
    marqueeBox,
    isArrowDrawing,
    arrowStart,
    arrowEnd,
    handleResizeHandleMouseDown,
    setIsDraggingCrop,
    setCropDragStart
  } = events;

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

  // Global Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        if (selectedIds.length === 1) {
          const node = nodes.find(n => n.id === selectedIds[0]);
          if (node && node.type === 'image') {
            setCroppingNodeId(node.id);
          }
        }
      } else if ((e.code === 'KeyZ' || e.key === 'z') && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.code === 'KeyY' || e.key === 'y') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, selectedIds, setCroppingNodeId, undo, redo]);

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
        thumbnailSrc: assetData.thumbnail_url,
        assetId: assetData.id,
        crop: { x: 0, y: 0, width: 1.0, height: 1.0 },
      };

      updateNodes([...nodes, imgNode]);
      setSelectedIds([imgNode.id]);
    } catch (err) {
      console.error('Failed to parse dropped asset', err);
    }
  };

  const handleDeleteSelection = () => {
    if (selectedIds.length === 0) return;
    window.dispatchEvent(new CustomEvent('artgrid-delete-nodes', { detail: { ids: selectedIds } }));
    setSelectedIds([]);
  };

  const handleBringToFront = () => {
    const selected = nodes.filter(n => selectedIds.includes(n.id));
    const remaining = nodes.filter(n => !selectedIds.includes(n.id));
    updateNodes([...remaining, ...selected]);
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

  const handleSendToBack = () => {
    const selected = nodes.filter(n => selectedIds.includes(n.id));
    const remaining = nodes.filter(n => !selectedIds.includes(n.id));
    updateNodes([...selected, ...remaining]);
  };

  const handleToggleLock = () => {
    const anyUnlocked = nodes.some(n => selectedIds.includes(n.id) && !n.locked);
    updateNodes(nodes.map(n => selectedIds.includes(n.id) ? { ...n, locked: anyUnlocked } : n));
  };

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

  // Viewport Culling logic
  const cw = containerRef.current ? containerRef.current.clientWidth : (typeof window !== 'undefined' ? window.innerWidth : 1920);
  const ch = containerRef.current ? containerRef.current.clientHeight : (typeof window !== 'undefined' ? window.innerHeight : 1080);
  const pad = 1000;
  
  const visibleBounds = {
    minX: (-viewport.x - pad) / viewport.zoom,
    minY: (-viewport.y - pad) / viewport.zoom,
    maxX: (-viewport.x + cw + pad) / viewport.zoom,
    maxY: (-viewport.y + ch + pad) / viewport.zoom,
  };

  return (
    <div 
      className="artgrid-canvas-container"
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'transparent',
        touchAction: 'none',
        cursor: activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 
                activeTool === 'eraser' ? 'crosshair' :
                ['note', 'text', 'shape', 'arrow', 'pen'].includes(activeTool) ? 'crosshair' : 
                'default'
      }}
      onPointerDown={(e) => {
        if (editingNodeId) setEditingNodeId(null);
        if (croppingNodeId) setCroppingNodeId(null);
        events.handlePointerDown(e);
      }}
      onPointerMove={events.handlePointerMove}
      onPointerUp={events.handlePointerUp}
      onPointerLeave={events.handlePointerUp}
      onWheel={events.handleWheel}
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
          willChange: 'transform',
        }}
      >
        {/* DYNAMIC CONNECTOR LAYER */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 1 }}>
          {nodes.filter(n => n.type === 'arrow').map(node => (
            <ConnectorPath key={node.id} arrow={node as ArrowNode} nodes={nodes} />
          ))}
        </svg>

        {nodes.filter(n => n.type !== 'arrow').filter(n => (
          n.x < visibleBounds.maxX &&
          (n.x + n.width) > visibleBounds.minX &&
          n.y < visibleBounds.maxY &&
          (n.y + n.height) > visibleBounds.minY
        )).map(node => (
          <NodeRenderer
            key={node.id}
            node={node}
            isSelected={selectedIds.includes(node.id)}
            handleResizeHandleMouseDown={handleResizeHandleMouseDown}
            setIsDraggingCrop={setIsDraggingCrop}
            setCropDragStart={setCropDragStart}
          />
        ))}
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
            left: Math.min(marqueeBox.startX, marqueeBox.endX) * viewport.zoom + viewport.x,
            top: Math.min(marqueeBox.startY, marqueeBox.endY) * viewport.zoom + viewport.y,
            width: Math.abs(marqueeBox.endX - marqueeBox.startX) * viewport.zoom,
            height: Math.abs(marqueeBox.endY - marqueeBox.startY) * viewport.zoom,
            border: '1px dashed var(--accent-primary)',
            background: 'rgba(124, 107, 240, 0.15)',
            pointerEvents: 'none',
            zIndex: 90,
          }}
        />
      )}


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
