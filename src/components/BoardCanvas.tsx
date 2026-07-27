import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { v4 as uuidv4 } from 'uuid';
import { BoardNode, Position } from '../types/board';
import { ToolType } from '../App';

interface BoardCanvasProps {
  nodes: BoardNode[];
  onNodesChange: (nodes: BoardNode[]) => void;
  activeTool: ToolType;
  onToolChange?: (tool: ToolType) => void;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({ nodes, onNodesChange, activeTool, onToolChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [linkStartNodeId, setLinkStartNodeId] = useState<string | null>(null);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; worldX: number; worldY: number } | null>(null);

  // Active freehand drawing stroke
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Position[]>([]);
  const currentDrawGraphicsRef = useRef<PIXI.Graphics | null>(null);

  // Store persistent display containers by node ID
  const nodeMapRef = useRef<Map<string, PIXI.Container>>(new Map());
  const nodesRef = useRef<BoardNode[]>(nodes);
  nodesRef.current = nodes;

  const onNodesChangeRef = useRef(onNodesChange);
  onNodesChangeRef.current = onNodesChange;

  const onToolChangeRef = useRef(onToolChange);
  onToolChangeRef.current = onToolChange;

  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // 1. Initialize Pixi Application and Viewport on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application({
      resizeTo: containerRef.current,
      backgroundColor: 0x121216,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const viewport = new Viewport({
      screenWidth: containerRef.current.clientWidth,
      screenHeight: containerRef.current.clientHeight,
      worldWidth: 30000,
      worldHeight: 30000,
      events: app.renderer.events as any,
    } as any);

    app.stage.addChild(viewport as any);
    viewportRef.current = viewport;

    viewport
      .drag({ mouseButtons: 'all' })
      .pinch()
      .wheel()
      .decelerate();

    // Draw visible high-contrast dot grid inside viewport
    const gridG = new PIXI.Graphics();
    gridG.name = 'canvasGridDotPattern';
    (gridG as any).eventMode = 'none';
    (gridG as any).interactive = false;
    const DOT_SPACING = 50;
    const GRID_SIZE = 15000;
    gridG.beginFill(0x555566, 0.7);
    for (let x = -GRID_SIZE; x <= GRID_SIZE; x += DOT_SPACING) {
      for (let y = -GRID_SIZE; y <= GRID_SIZE; y += DOT_SPACING) {
        gridG.drawCircle(x, y, 2.5);
      }
    }
    gridG.endFill();
    viewport.addChildAt(gridG as any, 0);

    const handleResize = () => {
      if (containerRef.current && viewportRef.current) {
        viewportRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, []);

  // 2. Control viewport drag tool mode
  useEffect(() => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current;
    const dragPlugin = viewport.plugins.get('drag') as any;

    if (dragPlugin) {
      dragPlugin.options.mouseButtons = activeTool === 'pan' ? 'all' : 'right';
    }

    if (containerRef.current) {
      if (activeTool === 'pan') containerRef.current.style.cursor = 'grab';
      else if (activeTool === 'text') containerRef.current.style.cursor = 'text';
      else if (activeTool === 'shape') containerRef.current.style.cursor = 'crosshair';
      else if (activeTool === 'draw') containerRef.current.style.cursor = 'pencil';
      else if (activeTool === 'link') containerRef.current.style.cursor = 'alias';
      else containerRef.current.style.cursor = 'default';
    }
  }, [activeTool]);

  // 3. Pointer Handlers for Creation & Drawing
  useEffect(() => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current;

    const handlePointerDown = (e: PIXI.FederatedPointerEvent) => {
      if (e.button !== 0) return;
      setContextMenu(null);

      const currentTool = activeToolRef.current;
      const worldPos = viewport.toWorld(e.global);
      const isCanvasClick = !e.target || e.target === viewport || (e.target as any).name === 'canvasGridDotPattern' || !(e.target as any).isCanvasNode;

      if (currentTool === 'text' && isCanvasClick) {
        const textStr = window.prompt("Enter text note:", "Note idea...");
        if (textStr && textStr.trim()) {
          const newNode: BoardNode = {
            id: uuidv4(),
            type: 'text',
            position: { x: worldPos.x, y: worldPos.y },
            dimensions: { width: 220, height: 110 },
            data: {
              text: textStr.trim(),
              fontSize: 14,
              color: '#3b82f6'
            }
          };
          onNodesChangeRef.current([...nodesRef.current, newNode]);
          if (onToolChangeRef.current) onToolChangeRef.current('select');
        }
        return;
      }

      if (currentTool === 'shape' && isCanvasClick) {
        const newNode: BoardNode = {
          id: uuidv4(),
          type: 'shape',
          position: { x: worldPos.x, y: worldPos.y },
          dimensions: { width: 240, height: 160 },
          data: {
            shapeType: 'rectangle',
            strokeColor: '#7c6bf0',
            strokeWidth: 2,
            fillColor: '#7c6bf0',
            fillOpacity: 0.15,
            cornerRadius: 12
          }
        };
        onNodesChangeRef.current([...nodesRef.current, newNode]);
        if (onToolChangeRef.current) onToolChangeRef.current('select');
        return;
      }

      if (currentTool === 'draw') {
        isDrawingRef.current = true;
        viewport.plugins.pause('drag');
        currentStrokeRef.current = [{ x: worldPos.x, y: worldPos.y }];

        const g = new PIXI.Graphics();
        viewport.addChild(g as any);
        currentDrawGraphicsRef.current = g;
        return;
      }

      if (isCanvasClick && currentTool === 'select') {
        setSelectedNodeId(null);
      }
    };

    const handlePointerMove = (e: PIXI.FederatedPointerEvent) => {
      if (!isDrawingRef.current || !currentDrawGraphicsRef.current) return;

      const worldPos = viewport.toWorld(e.global);
      currentStrokeRef.current.push({ x: worldPos.x, y: worldPos.y });

      const g = currentDrawGraphicsRef.current;
      g.clear();
      g.lineStyle(4, 0x7c6bf0, 1);

      const points = currentStrokeRef.current;
      if (points.length > 0) {
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          g.lineTo(points[i].x, points[i].y);
        }
      }
    };

    const handlePointerUp = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        viewport.plugins.resume('drag');

        if (currentDrawGraphicsRef.current) {
          viewport.removeChild(currentDrawGraphicsRef.current as any);
          currentDrawGraphicsRef.current.destroy();
          currentDrawGraphicsRef.current = null;
        }

        const points = currentStrokeRef.current;
        if (points.length > 1) {
          let minX = points[0].x, maxX = points[0].x;
          let minY = points[0].y, maxY = points[0].y;
          points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });

          const newNode: BoardNode = {
            id: uuidv4(),
            type: 'draw',
            position: { x: minX, y: minY },
            dimensions: { width: Math.max(maxX - minX, 20), height: Math.max(maxY - minY, 20) },
            data: {
              strokePoints: points,
              strokeColor: '#7c6bf0',
              strokeWidth: 4
            }
          };
          onNodesChangeRef.current([...nodesRef.current, newNode]);
        }
        currentStrokeRef.current = [];
      }
    };

    viewport.on('pointerdown', handlePointerDown);
    viewport.on('pointermove', handlePointerMove);
    viewport.on('pointerup', handlePointerUp);

    return () => {
      viewport.off('pointerdown', handlePointerDown);
      viewport.off('pointermove', handlePointerMove);
      viewport.off('pointerup', handlePointerUp);
    };
  }, []);

  // 4. Render & Sync Display Objects persistently
  useEffect(() => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current;
    const existingMap = nodeMapRef.current;
    const currentNodesMap = new Map(nodes.map(n => [n.id, n]));

    // Remove deleted containers
    for (const [id, container] of existingMap.entries()) {
      if (!currentNodesMap.has(id)) {
        viewport.removeChild(container as any);
        container.destroy({ children: true });
        existingMap.delete(id);
      }
    }

    // Create or update containers for existing nodes
    nodes.forEach(node => {
      let container = existingMap.get(node.id);
      const isSelected = selectedNodeId === node.id;

      if (!container) {
        container = new PIXI.Container();
        container.x = node.position.x;
        container.y = node.position.y;
        (container as any).isCanvasNode = true;
        (container as any).nodeId = node.id;
        container.eventMode = 'static';
        container.cursor = 'pointer';

        // --- Node Type Renderers ---
        if (node.type === 'image' && node.data.url) {
          const texture = PIXI.Texture.from(node.data.url);
          const sprite = new PIXI.Sprite(texture);
          sprite.name = 'imageSprite';
          sprite.width = node.dimensions.width;
          sprite.height = node.dimensions.height;
          container.addChild(sprite as any);

          if (!texture.baseTexture.valid) {
            texture.baseTexture.once('loaded', () => {
              sprite.width = node.dimensions.width;
              sprite.height = node.dimensions.height;
              appRef.current?.render();
            });
          }
        } else if (node.type === 'text') {
          const cardBg = new PIXI.Graphics();
          cardBg.name = 'cardBg';
          container.addChild(cardBg as any);

          const textStyle = new PIXI.TextStyle({
            fontFamily: 'Inter, sans-serif',
            fontSize: node.data.fontSize || 14,
            fill: '#ffffff',
            wordWrap: true,
            wordWrapWidth: Math.max(node.dimensions.width - 24, 40),
          });

          const pixiText = new PIXI.Text(node.data.text || 'Text Note', textStyle);
          pixiText.name = 'pixiText';
          pixiText.x = 12;
          pixiText.y = 12;
          container.addChild(pixiText as any);

          container.on('dblclick', () => {
            const updatedText = window.prompt("Edit text note:", node.data.text || '');
            if (updatedText !== null) {
              onNodesChangeRef.current(nodesRef.current.map(n =>
                n.id === node.id ? { ...n, data: { ...n.data, text: updatedText } } : n
              ));
            }
          });
        } else if (node.type === 'shape') {
          const shapeG = new PIXI.Graphics();
          shapeG.name = 'shapeG';
          container.addChild(shapeG as any);
        } else if (node.type === 'draw' && node.data.strokePoints) {
          const drawG = new PIXI.Graphics();
          drawG.name = 'drawG';
          container.addChild(drawG as any);
        } else if (node.type === 'link' && node.data.assetId && node.data.connectedNodeId) {
          const arrowG = new PIXI.Graphics();
          arrowG.name = 'arrowG';
          container.addChild(arrowG as any);
        }

        // Pointer Dragging for Node Movement
        let dragging = false;
        let startPos = { x: 0, y: 0 };
        let nodeStartPos = { x: 0, y: 0 };

        container.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
          const currentTool = activeToolRef.current;

          if (currentTool === 'link') {
            e.stopPropagation();
            if (!linkStartNodeId) {
              setLinkStartNodeId(node.id);
            } else if (linkStartNodeId !== node.id) {
              const sourceNode = nodesRef.current.find(n => n.id === linkStartNodeId);
              if (sourceNode) {
                const newLinkNode: BoardNode = {
                  id: uuidv4(),
                  type: 'link',
                  position: { x: sourceNode.position.x, y: sourceNode.position.y },
                  dimensions: { width: 100, height: 100 },
                  data: {
                    assetId: sourceNode.id,
                    connectedNodeId: node.id
                  }
                };
                onNodesChangeRef.current([...nodesRef.current, newLinkNode]);
              }
              setLinkStartNodeId(null);
            }
            return;
          }

          if (e.button === 0 && currentTool === 'select') {
            e.stopPropagation();
            setSelectedNodeId(node.id);
            if (container) {
              dragging = true;
              startPos = { x: e.global.x, y: e.global.y };
              nodeStartPos = { x: container.x, y: container.y };
              viewport.plugins.pause('drag');
            }
          }
        });

        container.on('pointerup', () => {
          if (dragging && container) {
            dragging = false;
            viewport.plugins.resume('drag');
            if (container.x !== nodeStartPos.x || container.y !== nodeStartPos.y) {
              onNodesChangeRef.current(nodesRef.current.map(n =>
                n.id === node.id ? { ...n, position: { x: container!.x, y: container!.y } } : n
              ));
            }
          }
        });

        container.on('pointerupoutside', () => {
          if (dragging) {
            dragging = false;
            viewport.plugins.resume('drag');
          }
        });

        container.on('globalpointermove', (e: PIXI.FederatedPointerEvent) => {
          if (dragging && container) {
            const worldPos = viewport.toWorld(e.global);
            const startWorld = viewport.toWorld(startPos);
            const dx = worldPos.x - startWorld.x;
            const dy = worldPos.y - startWorld.y;

            container.x = nodeStartPos.x + dx;
            container.y = nodeStartPos.y + dy;
          }
        });

        viewport.addChild(container as any);
        existingMap.set(node.id, container);
      } else {
        container.x = node.position.x;
        container.y = node.position.y;
      }

      // Explicit Hit Area for 100% reliable click selection across full shape area
      container.hitArea = new PIXI.Rectangle(0, 0, node.dimensions.width, node.dimensions.height);

      // --- Update Visuals & Dimensions ---
      if (node.type === 'text') {
        const cardBg = container.getChildByName('cardBg') as PIXI.Graphics;
        const pixiText = container.getChildByName('pixiText') as PIXI.Text;
        if (cardBg) {
          cardBg.clear();
          cardBg.beginFill(0x25252a, 0.95);
          cardBg.lineStyle(1.5, 0x3b82f6, 0.8);
          cardBg.drawRoundedRect(0, 0, node.dimensions.width, node.dimensions.height, 8);
          cardBg.endFill();
        }
        if (pixiText) {
          pixiText.style.wordWrapWidth = Math.max(node.dimensions.width - 24, 40);
        }
      } else if (node.type === 'shape') {
        const shapeG = container.getChildByName('shapeG') as PIXI.Graphics;
        if (shapeG) {
          shapeG.clear();
          const strokeColorStr = node.data.strokeColor || '#7c6bf0';
          const strokeColorNum = parseInt(strokeColorStr.replace('#', '0x'), 16);
          const fillColorStr = node.data.fillColor || '#7c6bf0';
          const fillColorNum = parseInt(fillColorStr.replace('#', '0x'), 16);
          const strokeWidth = node.data.strokeWidth !== undefined ? node.data.strokeWidth : 2;
          const fillOpacity = node.data.fillOpacity !== undefined ? node.data.fillOpacity : 0.15;
          const cornerRadius = node.data.cornerRadius !== undefined ? node.data.cornerRadius : 12;

          shapeG.beginFill(fillColorNum, fillOpacity);
          if (strokeWidth > 0) {
            shapeG.lineStyle(strokeWidth, strokeColorNum, 1);
          }
          if (cornerRadius > 0) {
            shapeG.drawRoundedRect(0, 0, node.dimensions.width, node.dimensions.height, cornerRadius);
          } else {
            shapeG.drawRect(0, 0, node.dimensions.width, node.dimensions.height);
          }
          shapeG.endFill();
        }
      } else if (node.type === 'draw') {
        const drawG = container.getChildByName('drawG') as PIXI.Graphics;
        if (drawG) {
          drawG.clear();
          const strokeColorStr = node.data.strokeColor || '#7c6bf0';
          const strokeColorNum = parseInt(strokeColorStr.replace('#', '0x'), 16);
          drawG.lineStyle(node.data.strokeWidth || 4, strokeColorNum, 1);
          const pts = node.data.strokePoints || [];
          if (pts.length > 0) {
            drawG.moveTo(pts[0].x - node.position.x, pts[0].y - node.position.y);
            for (let i = 1; i < pts.length; i++) {
              drawG.lineTo(pts[i].x - node.position.x, pts[i].y - node.position.y);
            }
          }
        }
      } else if (node.type === 'image') {
        const sprite = container.getChildByName('imageSprite') as PIXI.Sprite;
        if (sprite) {
          sprite.width = node.dimensions.width;
          sprite.height = node.dimensions.height;
        }
      }

      // --- Selection Bounding Box & Interactive Corner Resize Handle ---
      let selectionG = container.getChildByName('selectionG') as PIXI.Graphics;
      let handle = container.getChildByName('resizeHandle') as PIXI.Graphics;

      if (isSelected) {
        if (!selectionG) {
          selectionG = new PIXI.Graphics();
          selectionG.name = 'selectionG';
          container.addChild(selectionG as any);
        }
        selectionG.clear();
        selectionG.lineStyle(2, 0x3b82f6, 1);
        selectionG.drawRoundedRect(-4, -4, node.dimensions.width + 8, node.dimensions.height + 8, 6);

        // Add Interactive Bottom-Right Corner Resize Handle
        if (!handle) {
          handle = new PIXI.Graphics();
          handle.name = 'resizeHandle';
          (handle as any).eventMode = 'static';
          handle.cursor = 'nwse-resize';

          let resizing = false;
          let startPointer = { x: 0, y: 0 };
          let startDimensions = { width: 0, height: 0 };

          handle.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
            e.stopPropagation();
            resizing = true;
            startPointer = { x: e.global.x, y: e.global.y };
            startDimensions = { width: node.dimensions.width, height: node.dimensions.height };
            viewport.plugins.pause('drag');
          });

          handle.on('globalpointermove', (e: PIXI.FederatedPointerEvent) => {
            if (resizing) {
              const worldPos = viewport.toWorld(e.global);
              const startWorld = viewport.toWorld(startPointer);
              const dw = worldPos.x - startWorld.x;
              const dh = worldPos.y - startWorld.y;

              const newWidth = Math.max(startDimensions.width + dw, 40);
              const newHeight = Math.max(startDimensions.height + dh, 40);

              onNodesChangeRef.current(nodesRef.current.map(n =>
                n.id === node.id ? { ...n, dimensions: { width: newWidth, height: newHeight } } : n
              ));
            }
          });

          const stopResize = () => {
            if (resizing) {
              resizing = false;
              viewport.plugins.resume('drag');
            }
          };

          handle.on('pointerup', stopResize);
          handle.on('pointerupoutside', stopResize);

          container.addChild(handle as any);
        }

        handle.clear();
        handle.lineStyle(2, 0xffffff, 1);
        handle.beginFill(0x3b82f6, 1);
        handle.drawCircle(0, 0, 7);
        handle.endFill();
        handle.x = node.dimensions.width;
        handle.y = node.dimensions.height;
      } else {
        if (selectionG) {
          container.removeChild(selectionG as any);
          selectionG.destroy();
        }
        if (handle) {
          container.removeChild(handle as any);
          handle.destroy();
        }
      }

      // Re-draw dynamic arrow lines if node is a link
      if (node.type === 'link' && node.data.assetId && node.data.connectedNodeId) {
        const sourceNode = currentNodesMap.get(node.data.assetId);
        const targetNode = currentNodesMap.get(node.data.connectedNodeId);
        const arrowG = container.getChildByName('arrowG') as PIXI.Graphics;

        if (sourceNode && targetNode && arrowG) {
          arrowG.clear();
          const startX = sourceNode.position.x + sourceNode.dimensions.width / 2 - container.x;
          const startY = sourceNode.position.y + sourceNode.dimensions.height / 2 - container.y;
          const endX = targetNode.position.x + targetNode.dimensions.width / 2 - container.x;
          const endY = targetNode.position.y + targetNode.dimensions.height / 2 - container.y;

          arrowG.lineStyle(3, 0x3b82f6, 0.9);
          arrowG.moveTo(startX, startY);
          arrowG.lineTo(endX, endY);

          const angle = Math.atan2(endY - startY, endX - startX);
          const headLen = 12;
          arrowG.beginFill(0x3b82f6, 1);
          arrowG.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
          arrowG.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
          arrowG.lineTo(endX, endY);
          arrowG.endFill();
        }
      }
    });
  }, [nodes, selectedNodeId]);

  // 5. Handle HTML5 Asset Drop from Library Sidebar onto Board Canvas
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!viewportRef.current || !containerRef.current) return;

    let asset: any = null;
    const jsonStr = e.dataTransfer.getData('application/json');
    if (jsonStr) {
      try { asset = JSON.parse(jsonStr); } catch (_) {}
    }

    if (!asset) {
      const url = e.dataTransfer.getData('text/plain');
      if (url) {
        asset = { id: uuidv4(), url, title: 'Dropped Asset', width: 320, height: 240 };
      }
    }

    if (!asset || !asset.url) return;

    try {
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = viewportRef.current.toWorld(screenX, screenY);

      let width = 320;
      let height = 320;
      if (asset.width && asset.height) {
        const aspect = asset.width / asset.height;
        const MAX_DIM = 380;
        if (asset.width > asset.height) {
          width = Math.min(asset.width, MAX_DIM);
          height = width / aspect;
        } else {
          height = Math.min(asset.height, MAX_DIM);
          width = height * aspect;
        }
      }

      const newNode: BoardNode = {
        id: uuidv4(),
        type: 'image',
        position: { x: worldPos.x, y: worldPos.y },
        dimensions: { width, height },
        data: {
          assetId: asset.id,
          url: asset.url,
          text: asset.title
        }
      };

      onNodesChangeRef.current([...nodesRef.current, newNode]);
    } catch (err) {
      console.error("Failed to ingest dropped asset onto canvas:", err);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current || !viewportRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = viewportRef.current.toWorld(screenX, screenY);
    setContextMenu({ x: e.clientX, y: e.clientY, worldX: worldPos.x, worldY: worldPos.y });
  };

  const [zoomScale, setZoomScale] = useState(1);

  useEffect(() => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current;
    const handleZoom = () => {
      setZoomScale(viewport.scale.x);
    };
    viewport.on('zoomed', handleZoom);
    return () => {
      viewport.off('zoomed', handleZoom);
    };
  }, []);

  const handleZoomIn = () => {
    if (viewportRef.current) {
      viewportRef.current.zoomPercent(0.25, true);
      setZoomScale(viewportRef.current.scale.x);
    }
  };

  const handleZoomOut = () => {
    if (viewportRef.current) {
      viewportRef.current.zoomPercent(-0.25, true);
      setZoomScale(viewportRef.current.scale.x);
    }
  };

  const handleZoomReset = () => {
    if (viewportRef.current) {
      viewportRef.current.setZoom(1, true);
      setZoomScale(1);
    }
  };

  // Keyboard Delete & Escape Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIdRef.current) {
        onNodesChangeRef.current(nodesRef.current.filter(n => n.id !== selectedNodeIdRef.current));
        setSelectedNodeId(null);
      } else if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateSelectedNodeData = (newData: Partial<BoardNode['data']>) => {
    if (!selectedNodeId) return;
    onNodesChange(nodes.map(n =>
      n.id === selectedNodeId ? { ...n, data: { ...n.data, ...newData } } : n
    ));
  };

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onContextMenu={handleContextMenu}
      onClick={() => setContextMenu(null)}
    >
      {/* Floating Property Inspector Bar for Selected Shape */}
      {selectedNode && (selectedNode.type === 'shape' || selectedNode.type === 'draw') && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          padding: '6px 14px',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          fontSize: '0.8rem',
          color: 'var(--text-primary)'
        }}>
          {selectedNode.type === 'shape' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <span>Fill:</span>
              <input 
                type="color" 
                value={selectedNode.data.fillColor || '#7c6bf0'}
                onChange={e => updateSelectedNodeData({ fillColor: e.target.value })}
                style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
              />
            </label>
          )}
          {selectedNode.type === 'shape' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Opacity:</span>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={selectedNode.data.fillOpacity ?? 0.15}
                onChange={e => updateSelectedNodeData({ fillOpacity: parseFloat(e.target.value) })}
                style={{ width: 60 }}
              />
            </label>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <span>Border:</span>
            <input 
              type="color" 
              value={selectedNode.data.strokeColor || '#7c6bf0'}
              onChange={e => updateSelectedNodeData({ strokeColor: e.target.value })}
              style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Width:</span>
            <input 
              type="number" min="0" max="20"
              value={selectedNode.data.strokeWidth ?? 2}
              onChange={e => updateSelectedNodeData({ strokeWidth: parseInt(e.target.value) || 0 })}
              style={{ width: 44, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 4, padding: '2px 4px' }}
            />
          </label>
          {selectedNode.type === 'shape' && (
            <button 
              className="btn btn--secondary" 
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
              onClick={() => updateSelectedNodeData({ cornerRadius: selectedNode.data.cornerRadius === 0 ? 16 : 0 })}
            >
              {selectedNode.data.cornerRadius === 0 ? 'Make Rounded ▢' : 'Make Sharp ⬛'}
            </button>
          )}
        </div>
      )}

      {/* Right-Click Context Menu Overlay */}
      {contextMenu && (
        <div style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          zIndex: 100,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          padding: '6px 0',
          minWidth: 160,
          backdropFilter: 'blur(12px)'
        }}>
          <div 
            style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => {
              const textStr = window.prompt("Enter text note:", "Note idea...");
              if (textStr && textStr.trim()) {
                const newNode: BoardNode = {
                  id: uuidv4(),
                  type: 'text',
                  position: { x: contextMenu.worldX, y: contextMenu.worldY },
                  dimensions: { width: 220, height: 110 },
                  data: { text: textStr.trim(), fontSize: 14, color: '#3b82f6' }
                };
                onNodesChange([...nodes, newNode]);
              }
              setContextMenu(null);
            }}
          >
            📝 Add Text Note
          </div>
          <div 
            style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => {
              const newNode: BoardNode = {
                id: uuidv4(),
                type: 'shape',
                position: { x: contextMenu.worldX, y: contextMenu.worldY },
                dimensions: { width: 240, height: 160 },
                data: { shapeType: 'rectangle', strokeColor: '#7c6bf0', strokeWidth: 2, fillColor: '#7c6bf0', fillOpacity: 0.15, cornerRadius: 12 }
              };
              onNodesChange([...nodes, newNode]);
              setContextMenu(null);
            }}
          >
            ⬛ Add Shape Frame
          </div>
          <div 
            style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => {
              if (onToolChange) onToolChange('draw');
              setContextMenu(null);
            }}
          >
            🎨 Freehand Pencil
          </div>
          <div 
            style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => {
              if (onToolChange) onToolChange('link');
              setContextMenu(null);
            }}
          >
            🔗 Connect Arrow Link
          </div>
        </div>
      )}

      {/* Canvas Zoom Controls Overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          padding: '4px 8px',
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          color: 'var(--text-primary)',
          userSelect: 'none'
        }}
      >
        <button className="toolbar__btn" style={{ padding: '2px 8px', fontSize: '14px' }} title="Zoom Out (-)" onClick={handleZoomOut}>-</button>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: 45, textAlign: 'center' }}>{Math.round(zoomScale * 100)}%</span>
        <button className="toolbar__btn" style={{ padding: '2px 8px', fontSize: '14px' }} title="Zoom In (+)" onClick={handleZoomIn}>+</button>
        <button className="btn btn--secondary" style={{ padding: '2px 8px', fontSize: '11px', marginLeft: 4 }} title="Reset Zoom (1:1)" onClick={handleZoomReset}>1:1</button>
      </div>
    </div>
  );
};
