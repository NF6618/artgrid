/**
 * BoardCanvas.tsx
 * 
 * GPU-accelerated infinite canvas built on PixiJS + pixi-viewport.
 * 
 * Architecture principles:
 *  - Containers are created ONCE and updated in-place (no destroy/recreate on render).
 *  - All PIXI event handlers read from refs, never from captured closure values.
 *  - Drag and resize update PIXI directly during motion; React state commits on release.
 *  - Sections always render behind all other node types (zIndex 0).
 *  - Asset drag-drop uses both dataTransfer AND a window global as fallback (Tauri compat).
 */

import React, {
  useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef,
} from 'react';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { v4 as uuidv4 } from 'uuid';
import { BoardNode, Position, NodeType, NODE_DEFAULT_Z } from '../types/board';
import { ToolType } from '../App';

// ─── Public handle exposed via forwardRef ────────────────────────────────────

export interface BoardCanvasHandle {
  jumpToNode: (nodeId: string) => void;
  resetView: () => void;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface BoardCanvasProps {
  nodes: BoardNode[];
  onNodesChange: (nodes: BoardNode[]) => void;
  activeTool: ToolType;
  onToolChange?: (tool: ToolType) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: (nodeId: string) => void;
  onMoveToFront?: (nodeId: string) => void;
  onMoveToBack?: (nodeId: string) => void;
}

// ─── Context menu state ───────────────────────────────────────────────────────

interface CtxMenu {
  x: number; y: number;       // screen coords for the DOM menu
  worldX: number; worldY: number; // world coords for node placement
  nodeId?: string;            // if right-clicked on a node
}

// ─── Sticky colour palette ────────────────────────────────────────────────────

const STICKY_COLORS = ['#f9de70', '#f9a8d4', '#6ee7b7', '#93c5fd', '#c4b5fd', '#fdba74'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToNum(hex: string): number {
  return parseInt((hex || '#7c6bf0').replace('#', ''), 16);
}

function drawSelectionRing(g: PIXI.Graphics, w: number, h: number) {
  g.clear();
  g.lineStyle(2, 0x3b82f6, 1);
  g.drawRoundedRect(-4, -4, w + 8, h + 8, 6);
}

function drawResizeHandle(g: PIXI.Graphics) {
  g.clear();
  g.lineStyle(2, 0xffffff, 1);
  g.beginFill(0x3b82f6, 1);
  g.drawCircle(0, 0, 7);
  g.endFill();
}

/** Redraw type-specific visuals given current node dimensions */
function redrawVisuals(
  container: PIXI.Container,
  node: BoardNode,
  overrideW?: number,
  overrideH?: number,
) {
  const w = overrideW ?? node.dimensions.width;
  const h = overrideH ?? node.dimensions.height;

  switch (node.type) {
    case 'text': {
      const bg = container.getChildByName('bg') as PIXI.Graphics | null;
      const txt = container.getChildByName('content') as PIXI.Text | null;
      if (bg) {
        bg.clear();
        bg.beginFill(0x25252a, 0.95);
        bg.lineStyle(1.5, 0x3b82f6, 0.8);
        bg.drawRoundedRect(0, 0, w, h, 8);
        bg.endFill();
      }
      if (txt) {
        (txt.style as any).wordWrapWidth = Math.max(w - 24, 40);
        txt.text = node.data.text ?? 'Text note';
      }
      break;
    }

    case 'sticky': {
      const bg = container.getChildByName('bg') as PIXI.Graphics | null;
      const content = container.getChildByName('content') as PIXI.Text | null;
      const emojiTxt = container.getChildByName('emoji') as PIXI.Text | null;
      const colorNum = hexToNum(node.data.stickyColor ?? '#f9de70');
      if (bg) {
        bg.clear();
        bg.beginFill(colorNum, 1);
        bg.drawRoundedRect(0, 0, w, h, 8);
        bg.endFill();
        // Fold effect in top-right corner
        bg.beginFill(0x000000, 0.12);
        bg.moveTo(w - 20, 0);
        bg.lineTo(w, 0);
        bg.lineTo(w, 20);
        bg.endFill();
      }
      if (emojiTxt) {
        emojiTxt.text = node.data.emoji ?? '';
        emojiTxt.x = 10;
        emojiTxt.y = 8;
      }
      if (content) {
        (content.style as any).wordWrapWidth = Math.max(w - 20, 40);
        content.text = node.data.text ?? 'Add note...';
        content.y = node.data.emoji ? 36 : 14;
      }
      break;
    }

    case 'shape': {
      const g = container.getChildByName('shapeG') as PIXI.Graphics | null;
      if (g) {
        g.clear();
        const sc = hexToNum(node.data.strokeColor ?? '#7c6bf0');
        const fc = hexToNum(node.data.fillColor ?? '#7c6bf0');
        const sw = node.data.strokeWidth ?? 2;
        const fo = node.data.fillOpacity ?? 0.15;
        const cr = node.data.cornerRadius ?? 12;
        g.beginFill(fc, fo);
        if (sw > 0) g.lineStyle(sw, sc, 1);
        if (node.data.shapeType === 'circle') {
          g.drawEllipse(w / 2, h / 2, w / 2, h / 2);
        } else if (cr > 0) {
          g.drawRoundedRect(0, 0, w, h, cr);
        } else {
          g.drawRect(0, 0, w, h);
        }
        g.endFill();
      }
      break;
    }

    case 'section': {
      const bg = container.getChildByName('bg') as PIXI.Graphics | null;
      const header = container.getChildByName('header') as PIXI.Graphics | null;
      const labelTxt = container.getChildByName('label') as PIXI.Text | null;
      const HEADER_H = 36;
      const colorNum = hexToNum(node.data.sectionColor ?? '#7c6bf0');

      if (header) {
        header.clear();
        header.beginFill(colorNum, 0.85);
        header.drawRoundedRect(0, 0, w, HEADER_H, 8);
        header.endFill();
      }
      if (bg) {
        bg.clear();
        bg.lineStyle(2, colorNum, 0.5);
        bg.beginFill(colorNum, 0.04);
        bg.drawRoundedRect(0, 0, w, h, 8);
        bg.endFill();
      }
      if (labelTxt) {
        labelTxt.text = node.data.text ?? 'Section';
        labelTxt.x = 12;
        labelTxt.y = 9;
      }
      break;
    }

    case 'image': {
      const sprite = container.getChildByName('sprite') as PIXI.Sprite | null;
      const borderG = container.getChildByName('imageBorder') as PIXI.Graphics | null;
      if (sprite) {
        sprite.width = w;
        sprite.height = h;
      }
      if (borderG) {
        borderG.clear();
        borderG.lineStyle(1, 0xffffff, 0.15);
        borderG.drawRoundedRect(0, 0, w, h, 4);
      }
      break;
    }

    case 'draw': {
      const g = container.getChildByName('drawG') as PIXI.Graphics | null;
      if (g) {
        g.clear();
        const sc = hexToNum(node.data.strokeColor ?? '#7c6bf0');
        const sw = node.data.strokeWidth ?? 4;
        g.lineStyle(sw, sc, 1);
        const pts = node.data.strokePoints ?? [];
        if (pts.length > 1) {
          g.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        }
      }
      break;
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const BoardCanvas = forwardRef<BoardCanvasHandle, BoardCanvasProps>(
  (
    {
      nodes,
      onNodesChange,
      activeTool,
      onToolChange,
      onUndo,
      onRedo,
      onDuplicate,
      onMoveToFront,
      onMoveToBack,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const viewportRef = useRef<Viewport | null>(null);

    // Persistent PIXI container map — never cleared, only grown and pruned
    const nodeMapRef = useRef<Map<string, PIXI.Container>>(new Map());

    // ── Closure-safe refs (all event handlers read from these) ──────────────
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;
    const onNodesChangeRef = useRef(onNodesChange);
    onNodesChangeRef.current = onNodesChange;
    const onToolChangeRef = useRef(onToolChange);
    onToolChangeRef.current = onToolChange;
    const activeToolRef = useRef(activeTool);
    activeToolRef.current = activeTool;
    const selectedNodeIdRef = useRef<string | null>(null);
    const rightClickedNodeIdRef = useRef<string | null>(null);

    // ── React state (drives HTML overlays only) ─────────────────────────────
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<CtxMenu | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [drawColor] = useState('#7c6bf0');

    // keep ref in sync for keyboard handler
    useEffect(() => {
      selectedNodeIdRef.current = selectedNodeId;
    }, [selectedNodeId]);

    const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

    // ── Freehand drawing ────────────────────────────────────────────────────
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef<Position[]>([]);
    const currentDrawGRef = useRef<PIXI.Graphics | null>(null);

    // ─── Imperative handle ─────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      jumpToNode: (nodeId: string) => {
        const node = nodesRef.current.find(n => n.id === nodeId);
        const vp = viewportRef.current;
        if (!node || !vp) return;
        vp.animate({
          position: new PIXI.Point(
            node.position.x + node.dimensions.width / 2,
            node.position.y + node.dimensions.height / 2,
          ),
          time: 500,
          ease: 'easeInOutQuad',
          removeOnComplete: true,
        } as any);
      },
      resetView: () => {
        const vp = viewportRef.current;
        if (!vp) return;
        vp.setZoom(1, true);
        vp.moveCenter(0, 0);
        setZoomScale(1);
      },
    }));

    // ── 1. PIXI Init (once) ────────────────────────────────────────────────
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
        worldWidth: 40000,
        worldHeight: 40000,
        events: app.renderer.events as any,
      } as any);

      app.stage.addChild(viewport as any);
      viewportRef.current = viewport;

      viewport.sortableChildren = true;

      viewport
        .drag({ mouseButtons: 'right' })
        .pinch()
        .wheel()
        .decelerate();

      // ── Efficient dot-grid via TilingSprite ──────────────────────────────
      const TILE = 50;
      const dotG = new PIXI.Graphics();
      dotG.beginFill(0x555566, 0.8);
      dotG.drawCircle(TILE / 2, TILE / 2, 2);
      dotG.endFill();
      const rt = PIXI.RenderTexture.create({ width: TILE, height: TILE });
      app.renderer.render(dotG, { renderTexture: rt });
      dotG.destroy();

      const grid = new PIXI.TilingSprite(rt, 40000, 40000);
      grid.position.set(-20000, -20000);
      (grid as any).eventMode = 'none';
      (grid as any).interactive = false;
      grid.zIndex = -100;
      viewport.addChild(grid as any);

      // ── Resize handler ───────────────────────────────────────────────────
      const handleResize = () => {
        if (containerRef.current && viewportRef.current) {
          viewportRef.current.resize(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight,
          );
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        app.destroy(true, { children: true, texture: true, baseTexture: true });
      };
    }, []);

    // ── 2. Tool mode (cursor + drag mode) ─────────────────────────────────
    useEffect(() => {
      const vp = viewportRef.current;
      if (!vp) return;
      const drag = vp.plugins.get('drag') as any;
      if (drag) {
        drag.options.mouseButtons = activeTool === 'pan' ? 'all' : 'right';
      }
      if (containerRef.current) {
        const cursors: Record<string, string> = {
          pan: 'grab',
          text: 'text',
          shape: 'crosshair',
          sticky: 'cell',
          section: 'crosshair',
          draw: 'crosshair',
          link: 'alias',
        };
        containerRef.current.style.cursor = cursors[activeTool] ?? 'default';
      }
    }, [activeTool]);

    // ── 3. Viewport-level pointer handlers (creation + drawing) ───────────
    useEffect(() => {
      const vp = viewportRef.current;
      if (!vp) return;

      const onDown = (e: PIXI.FederatedPointerEvent) => {
        if (e.button !== 0) return;
        setContextMenu(null);

        const tool = activeToolRef.current;
        const worldPos = vp.toWorld(e.global.x, e.global.y);

        // Determine if click is on empty canvas (not on an existing node)
        const target = e.target as any;
        const onCanvas =
          !target ||
          target === vp ||
          target.name === '__grid' ||
          !target.isCanvasNode;

        if (!onCanvas) return; // let node containers handle it

        if (tool === 'text' && onCanvas) {
          const textStr = window.prompt('Enter text note:', '');
          if (textStr?.trim()) {
            const n: BoardNode = {
              id: uuidv4(), type: 'text',
              position: { x: worldPos.x, y: worldPos.y },
              dimensions: { width: 220, height: 110 },
              zIndex: NODE_DEFAULT_Z.text, locked: false, hidden: false,
              data: { text: textStr.trim(), fontSize: 14, fontColor: '#ffffff' },
            };
            onNodesChangeRef.current([...nodesRef.current, n]);
            if (onToolChangeRef.current) onToolChangeRef.current('select');
          }
          return;
        }

        if (tool === 'shape' && onCanvas) {
          const n: BoardNode = {
            id: uuidv4(), type: 'shape',
            position: { x: worldPos.x, y: worldPos.y },
            dimensions: { width: 240, height: 160 },
            zIndex: NODE_DEFAULT_Z.shape, locked: false, hidden: false,
            data: {
              shapeType: 'rectangle',
              strokeColor: '#7c6bf0', strokeWidth: 2,
              fillColor: '#7c6bf0', fillOpacity: 0.15, cornerRadius: 12,
            },
          };
          onNodesChangeRef.current([...nodesRef.current, n]);
          if (onToolChangeRef.current) onToolChangeRef.current('select');
          return;
        }

        if (tool === 'sticky' && onCanvas) {
          const color = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
          const textStr = window.prompt('Sticky note text:', '');
          const n: BoardNode = {
            id: uuidv4(), type: 'sticky',
            position: { x: worldPos.x, y: worldPos.y },
            dimensions: { width: 200, height: 200 },
            zIndex: NODE_DEFAULT_Z.sticky, locked: false, hidden: false,
            data: { text: textStr ?? 'Note...', stickyColor: color, fontSize: 13 },
          };
          onNodesChangeRef.current([...nodesRef.current, n]);
          if (onToolChangeRef.current) onToolChangeRef.current('select');
          return;
        }

        if (tool === 'section' && onCanvas) {
          const label = window.prompt('Section name:', 'New Section');
          const n: BoardNode = {
            id: uuidv4(), type: 'section',
            position: { x: worldPos.x, y: worldPos.y },
            dimensions: { width: 700, height: 500 },
            zIndex: NODE_DEFAULT_Z.section, locked: false, hidden: false,
            data: { text: label ?? 'New Section', sectionColor: '#7c6bf0' },
          };
          onNodesChangeRef.current([...nodesRef.current, n]);
          if (onToolChangeRef.current) onToolChangeRef.current('select');
          return;
        }

        if (tool === 'draw') {
          isDrawingRef.current = true;
          vp.plugins.pause('drag');
          currentStrokeRef.current = [{ x: worldPos.x, y: worldPos.y }];
          const g = new PIXI.Graphics();
          (g as any).zIndex = 999;
          vp.addChild(g as any);
          currentDrawGRef.current = g;
          return;
        }

        // Deselect on empty canvas click
        if (tool === 'select' && onCanvas) {
          setSelectedNodeId(null);
        }
      };

      const onMove = (e: PIXI.FederatedPointerEvent) => {
        if (!isDrawingRef.current || !currentDrawGRef.current) return;
        const worldPos = vp.toWorld(e.global.x, e.global.y);
        currentStrokeRef.current.push({ x: worldPos.x, y: worldPos.y });
        const g = currentDrawGRef.current;
        g.clear();
        g.lineStyle(4, hexToNum(drawColor), 1);
        const pts = currentStrokeRef.current;
        if (pts.length > 1) {
          g.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        }
      };

      const onUp = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        vp.plugins.resume('drag');

        if (currentDrawGRef.current) {
          vp.removeChild(currentDrawGRef.current as any);
          currentDrawGRef.current.destroy();
          currentDrawGRef.current = null;
        }

        const pts = currentStrokeRef.current;
        if (pts.length > 1) {
          // Compute bounding box and convert to relative coords
          let minX = pts[0].x, maxX = pts[0].x;
          let minY = pts[0].y, maxY = pts[0].y;
          pts.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });
          // Store relative to minX/minY so rendering doesn't offset
          const relativePts = pts.map(p => ({ x: p.x - minX, y: p.y - minY }));

          const n: BoardNode = {
            id: uuidv4(), type: 'draw',
            position: { x: minX, y: minY },
            dimensions: { width: Math.max(maxX - minX, 4), height: Math.max(maxY - minY, 4) },
            zIndex: NODE_DEFAULT_Z.draw, locked: false, hidden: false,
            data: { strokePoints: relativePts, strokeColor: drawColor, strokeWidth: 4 },
          };
          onNodesChangeRef.current([...nodesRef.current, n]);
        }
        currentStrokeRef.current = [];
      };

      vp.on('pointerdown', onDown);
      vp.on('pointermove', onMove);
      vp.on('pointerup', onUp);
      vp.on('pointerupoutside', onUp);

      return () => {
        vp.off('pointerdown', onDown);
        vp.off('pointermove', onMove);
        vp.off('pointerup', onUp);
        vp.off('pointerupoutside', onUp);
      };
    }, [drawColor]);

    // ── 4. Node sync — create once, update in-place ────────────────────────
    useEffect(() => {
      const vp = viewportRef.current;
      if (!vp) return;
      const existing = nodeMapRef.current;
      const currentIds = new Set(nodes.map(n => n.id));

      // Prune deleted containers
      for (const [id, c] of existing.entries()) {
        if (!currentIds.has(id)) {
          vp.removeChild(c as any);
          c.destroy({ children: true });
          existing.delete(id);
        }
      }

      // Sort nodes: sections first, then by zIndex
      const sorted = [...nodes].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

      sorted.forEach(node => {
        const isSelected = node.id === selectedNodeId;
        let container = existing.get(node.id);

        // ── CREATE container (runs once per node) ───────────────────────────
        if (!container) {
          container = new PIXI.Container();
          (container as any).isCanvasNode = true;
          (container as any).nodeId = node.id;
          container.eventMode = 'static';
          container.cursor = 'pointer';

          const nodeId = node.id; // immutable capture for closures

          // Type-specific child creation
          switch (node.type) {
            case 'image': {
              const sprite = PIXI.Sprite.from(node.data.url ?? '');
              sprite.name = 'sprite';
              sprite.width = node.dimensions.width;
              sprite.height = node.dimensions.height;
              container.addChild(sprite as any);
              const borderG = new PIXI.Graphics(); borderG.name = 'imageBorder';
              container.addChild(borderG as any);
              // Reload when texture resolves
              if (!sprite.texture.baseTexture.valid) {
                sprite.texture.baseTexture.on('loaded', () => {
                  sprite.width = node.dimensions.width;
                  sprite.height = node.dimensions.height;
                });
              }
              break;
            }
            case 'text': {
              const bg = new PIXI.Graphics(); bg.name = 'bg';
              container.addChild(bg as any);
              const txtStyle = new PIXI.TextStyle({
                fontFamily: 'Inter, sans-serif',
                fontSize: node.data.fontSize ?? 14,
                fill: node.data.fontColor ?? '#ffffff',
                wordWrap: true,
                wordWrapWidth: Math.max(node.dimensions.width - 24, 40),
              });
              const txt = new PIXI.Text(node.data.text ?? 'Text note', txtStyle);
              txt.name = 'content'; txt.x = 12; txt.y = 12;
              container.addChild(txt as any);
              container.on('dblclick', () => {
                const cur = nodesRef.current.find(n => n.id === nodeId);
                const updated = window.prompt('Edit text:', cur?.data.text ?? '');
                if (updated !== null) {
                  onNodesChangeRef.current(
                    nodesRef.current.map(n => n.id === nodeId ? { ...n, data: { ...n.data, text: updated } } : n),
                  );
                }
              });
              break;
            }
            case 'sticky': {
              const bg = new PIXI.Graphics(); bg.name = 'bg';
              container.addChild(bg as any);
              const emojiTxt = new PIXI.Text('', { fontFamily: 'serif', fontSize: 20 });
              emojiTxt.name = 'emoji';
              container.addChild(emojiTxt as any);
              const contentStyle = new PIXI.TextStyle({
                fontFamily: 'Inter, sans-serif',
                fontSize: node.data.fontSize ?? 13,
                fill: '#1a1a1a',
                wordWrap: true,
                wordWrapWidth: Math.max(node.dimensions.width - 20, 40),
              });
              const contentTxt = new PIXI.Text('', contentStyle);
              contentTxt.name = 'content'; contentTxt.x = 10;
              container.addChild(contentTxt as any);
              container.on('dblclick', () => {
                const cur = nodesRef.current.find(n => n.id === nodeId);
                const updated = window.prompt('Edit sticky note:', cur?.data.text ?? '');
                if (updated !== null) {
                  onNodesChangeRef.current(
                    nodesRef.current.map(n => n.id === nodeId ? { ...n, data: { ...n.data, text: updated } } : n),
                  );
                }
              });
              break;
            }
            case 'shape': {
              const g = new PIXI.Graphics(); g.name = 'shapeG';
              container.addChild(g as any);
              break;
            }
            case 'section': {
              const bg = new PIXI.Graphics(); bg.name = 'bg';
              container.addChild(bg as any);
              const header = new PIXI.Graphics(); header.name = 'header';
              container.addChild(header as any);
              const labelStyle = new PIXI.TextStyle({
                fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 'bold',
                fill: '#ffffff',
              });
              const labelTxt = new PIXI.Text('', labelStyle);
              labelTxt.name = 'label';
              container.addChild(labelTxt as any);
              container.on('dblclick', () => {
                const cur = nodesRef.current.find(n => n.id === nodeId);
                const updated = window.prompt('Section name:', cur?.data.text ?? '');
                if (updated !== null) {
                  onNodesChangeRef.current(
                    nodesRef.current.map(n => n.id === nodeId ? { ...n, data: { ...n.data, text: updated } } : n),
                  );
                }
              });
              break;
            }
            case 'draw': {
              const g = new PIXI.Graphics(); g.name = 'drawG';
              container.addChild(g as any);
              break;
            }
          }

          // Always-present selection ring + resize handle (initially hidden)
          const selG = new PIXI.Graphics(); selG.name = 'sel'; selG.visible = false;
          container.addChild(selG as any);

          const handle = new PIXI.Graphics();
          handle.name = 'handle';
          handle.visible = false;
          (handle as any).eventMode = 'static';
          handle.cursor = 'nwse-resize';
          container.addChild(handle as any);

          // ── Drag state (local to this container) ─────────────────────────
          let dragging = false;
          let startGlobal = { x: 0, y: 0 };
          let startContainerPos = { x: 0, y: 0 };

          // ── Resize state ──────────────────────────────────────────────────
          let resizing = false;
          let resizeStartGlobal = { x: 0, y: 0 };
          let resizeStartDim = { width: 0, height: 0 };
          let resizeCurrent = { width: 0, height: 0 };

          // ── Node pointer events ───────────────────────────────────────────
          container.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
            const currentNode = nodesRef.current.find(n => n.id === nodeId);
            if (!currentNode || currentNode.locked) return;

            if (e.button === 2) {
              rightClickedNodeIdRef.current = nodeId;
              return;
            }

            if (e.button !== 0) return;
            const tool = activeToolRef.current;

            if (tool === 'link') {
              e.stopPropagation();
              // Link tool handled by App level for now
              return;
            }

            if (tool === 'select') {
              e.stopPropagation();
              setSelectedNodeId(nodeId);
              selectedNodeIdRef.current = nodeId;
              dragging = true;
              startGlobal = { x: e.global.x, y: e.global.y };
              startContainerPos = { x: container!.x, y: container!.y };
              viewportRef.current?.plugins.pause('drag');
            }
          });

          container.on('globalpointermove', (e: PIXI.FederatedPointerEvent) => {
            if (!dragging || !container) return;
            const vp = viewportRef.current; if (!vp) return;
            const world = vp.toWorld(e.global.x, e.global.y);
            const startWorld = vp.toWorld(startGlobal.x, startGlobal.y);
            container.x = startContainerPos.x + (world.x - startWorld.x);
            container.y = startContainerPos.y + (world.y - startWorld.y);
          });

          container.on('pointerup', () => {
            if (!dragging) return;
            dragging = false;
            viewportRef.current?.plugins.resume('drag');
            const cx = container!.x; const cy = container!.y;
            if (cx !== startContainerPos.x || cy !== startContainerPos.y) {
              onNodesChangeRef.current(
                nodesRef.current.map(n =>
                  n.id === nodeId ? { ...n, position: { x: cx, y: cy } } : n,
                ),
              );
            }
          });

          container.on('pointerupoutside', () => {
            if (!dragging) return;
            dragging = false;
            viewportRef.current?.plugins.resume('drag');
          });

          // ── Resize handle events ──────────────────────────────────────────
          handle.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
            e.stopPropagation();
            const cur = nodesRef.current.find(n => n.id === nodeId);
            if (!cur) return;
            resizing = true;
            resizeStartGlobal = { x: e.global.x, y: e.global.y };
            resizeStartDim = { ...cur.dimensions };
            resizeCurrent = { ...cur.dimensions };
            viewportRef.current?.plugins.pause('drag');
          });

          handle.on('globalpointermove', (e: PIXI.FederatedPointerEvent) => {
            if (!resizing) return;
            const vp = viewportRef.current; if (!vp) return;
            const world = vp.toWorld(e.global.x, e.global.y);
            const startWorld = vp.toWorld(resizeStartGlobal.x, resizeStartGlobal.y);
            const nw = Math.max(resizeStartDim.width + (world.x - startWorld.x), 40);
            const nh = Math.max(resizeStartDim.height + (world.y - startWorld.y), 40);
            resizeCurrent = { width: nw, height: nh };
            // Direct PIXI update for smooth feedback
            const cur = nodesRef.current.find(n => n.id === nodeId);
            if (cur) {
              container!.hitArea = new PIXI.Rectangle(0, 0, nw, nh);
              handle.x = nw; handle.y = nh;
              const selG = container!.getChildByName('sel') as PIXI.Graphics | null;
              if (selG) drawSelectionRing(selG, nw, nh);
              redrawVisuals(container!, cur, nw, nh);
            }
          });

          const stopResize = () => {
            if (!resizing) return;
            resizing = false;
            viewportRef.current?.plugins.resume('drag');
            if (resizeCurrent.width > 0) {
              onNodesChangeRef.current(
                nodesRef.current.map(n =>
                  n.id === nodeId ? { ...n, dimensions: resizeCurrent } : n,
                ),
              );
            }
            resizeCurrent = { width: 0, height: 0 };
          };

          handle.on('pointerup', stopResize);
          handle.on('pointerupoutside', stopResize);

          vp.addChild(container as any);
          existing.set(nodeId, container);
        }

        // ── UPDATE (runs every render for every node) ───────────────────────
        container.x = node.position.x;
        container.y = node.position.y;
        container.visible = !node.hidden;
        container.alpha = node.locked ? 0.65 : 1;
        container.zIndex = node.zIndex ?? NODE_DEFAULT_Z[node.type];
        container.hitArea = new PIXI.Rectangle(0, 0, node.dimensions.width, node.dimensions.height);

        // Redraw type-specific visuals
        redrawVisuals(container, node);

        // Selection ring
        const selG = container.getChildByName('sel') as PIXI.Graphics | null;
        if (selG) {
          selG.visible = isSelected;
          if (isSelected) drawSelectionRing(selG, node.dimensions.width, node.dimensions.height);
        }

        // Resize handle
        const handle = container.getChildByName('handle') as PIXI.Graphics | null;
        if (handle) {
          handle.visible = isSelected;
          if (isSelected) {
            drawResizeHandle(handle);
            handle.x = node.dimensions.width;
            handle.y = node.dimensions.height;
          }
        }
      });
    }, [nodes, selectedNodeId]);

    // ── 5. Zoom sync ───────────────────────────────────────────────────────
    useEffect(() => {
      const vp = viewportRef.current;
      if (!vp) return;
      const onZoom = () => setZoomScale(vp.scale.x);
      vp.on('zoomed', onZoom);
      return () => { vp.off('zoomed', onZoom); };
    }, []);

    // ── 6. Keyboard shortcuts ──────────────────────────────────────────────
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const sel = selectedNodeIdRef.current;
        const meta = e.ctrlKey || e.metaKey;

        // Undo / Redo
        if (meta && e.key === 'z' && !e.shiftKey) { onUndo?.(); return; }
        if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { onRedo?.(); return; }

        // Duplicate
        if (meta && e.key === 'd' && sel) { e.preventDefault(); onDuplicate?.(sel); return; }

        // Delete selected node
        if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
          // Don't delete if user is typing in an input
          if (['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)) return;
          onNodesChangeRef.current(nodesRef.current.filter(n => n.id !== sel));
          setSelectedNodeId(null);
          return;
        }

        // Escape
        if (e.key === 'Escape') { setContextMenu(null); setSelectedNodeId(null); }

        // Layer shortcuts
        if (meta && e.key === ']' && sel) { onMoveToFront?.(sel); }
        if (meta && e.key === '[' && sel) { onMoveToBack?.(sel); }

        // Tool shortcuts
        if (!meta && !e.shiftKey) {
          if (e.key === 'v') onToolChangeRef.current?.('select');
          if (e.key === 'h') onToolChangeRef.current?.('pan');
          if (e.key === 't') onToolChangeRef.current?.('text');
          if (e.key === 's') onToolChangeRef.current?.('shape');
          if (e.key === 'd') onToolChangeRef.current?.('draw');
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onUndo, onRedo, onDuplicate, onMoveToFront, onMoveToBack]);

    // ── Drag-drop handler (fixed for Tauri webview) ────────────────────────
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const vp = viewportRef.current;
      const div = containerRef.current;
      if (!vp || !div) return;

      // Try global fallback first (most reliable in Tauri)
      let asset: any = (window as any).__artgridDragAsset ?? null;
      if (!asset) {
        const jsonStr = e.dataTransfer.getData('application/json');
        if (jsonStr) try { asset = JSON.parse(jsonStr); } catch (_) { /* ignore */ }
      }
      if (!asset) {
        const url = e.dataTransfer.getData('text/plain');
        if (url) asset = { id: uuidv4(), url, title: 'Dropped Image', width: 400, height: 300 };
      }
      (window as any).__artgridDragAsset = null;

      if (!asset?.url) return;

      const rect = div.getBoundingClientRect();
      const worldPos = vp.toWorld(e.clientX - rect.left, e.clientY - rect.top);

      let w = 380, h = 380;
      if (asset.width && asset.height) {
        const aspect = asset.width / asset.height;
        const MAX = 480;
        if (aspect > 1) { w = Math.min(asset.width, MAX); h = w / aspect; }
        else { h = Math.min(asset.height, MAX); w = h * aspect; }
      }

      const n: BoardNode = {
        id: uuidv4(), type: 'image',
        position: { x: worldPos.x - w / 2, y: worldPos.y - h / 2 },
        dimensions: { width: w, height: h },
        zIndex: NODE_DEFAULT_Z.image, locked: false, hidden: false,
        data: { assetId: asset.id, url: asset.url, text: asset.title, cropMode: 'cover' },
      };
      onNodesChangeRef.current([...nodesRef.current, n]);
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };

    // ── Context menu ───────────────────────────────────────────────────────
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      const vp = viewportRef.current;
      const div = containerRef.current;
      if (!vp || !div) return;
      const rect = div.getBoundingClientRect();
      const worldPos = vp.toWorld(e.clientX - rect.left, e.clientY - rect.top);
      setContextMenu({
        x: e.clientX, y: e.clientY,
        worldX: worldPos.x, worldY: worldPos.y,
        nodeId: rightClickedNodeIdRef.current ?? undefined,
      });
      rightClickedNodeIdRef.current = null;
    };

    const addNodeFromMenu = (type: NodeType) => {
      if (!contextMenu) return;
      const { worldX: wx, worldY: wy } = contextMenu;

      if (type === 'text') {
        const textStr = window.prompt('Text note:', '');
        if (!textStr?.trim()) { setContextMenu(null); return; }
        const n: BoardNode = {
          id: uuidv4(), type: 'text',
          position: { x: wx, y: wy }, dimensions: { width: 220, height: 110 },
          zIndex: NODE_DEFAULT_Z.text, locked: false, hidden: false,
          data: { text: textStr.trim(), fontSize: 14, fontColor: '#ffffff' },
        };
        onNodesChangeRef.current([...nodesRef.current, n]);
      } else if (type === 'shape') {
        const n: BoardNode = {
          id: uuidv4(), type: 'shape',
          position: { x: wx, y: wy }, dimensions: { width: 240, height: 160 },
          zIndex: NODE_DEFAULT_Z.shape, locked: false, hidden: false,
          data: { shapeType: 'rectangle', strokeColor: '#7c6bf0', strokeWidth: 2, fillColor: '#7c6bf0', fillOpacity: 0.15, cornerRadius: 12 },
        };
        onNodesChangeRef.current([...nodesRef.current, n]);
      } else if (type === 'sticky') {
        const color = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
        const textStr = window.prompt('Sticky note:', '');
        const n: BoardNode = {
          id: uuidv4(), type: 'sticky',
          position: { x: wx, y: wy }, dimensions: { width: 200, height: 200 },
          zIndex: NODE_DEFAULT_Z.sticky, locked: false, hidden: false,
          data: { text: textStr ?? 'Note...', stickyColor: color, fontSize: 13 },
        };
        onNodesChangeRef.current([...nodesRef.current, n]);
      } else if (type === 'section') {
        const label = window.prompt('Section name:', 'New Section');
        const n: BoardNode = {
          id: uuidv4(), type: 'section',
          position: { x: wx - 40, y: wy - 20 }, dimensions: { width: 700, height: 500 },
          zIndex: NODE_DEFAULT_Z.section, locked: false, hidden: false,
          data: { text: label ?? 'New Section', sectionColor: '#7c6bf0' },
        };
        onNodesChangeRef.current([...nodesRef.current, n]);
      }
      setContextMenu(null);
    };

    const performNodeAction = (action: string) => {
      const nodeId = contextMenu?.nodeId;
      if (!nodeId) { setContextMenu(null); return; }
      switch (action) {
        case 'duplicate': onDuplicate?.(nodeId); break;
        case 'front': onMoveToFront?.(nodeId); break;
        case 'back': onMoveToBack?.(nodeId); break;
        case 'lock': {
          const n = nodesRef.current.find(x => x.id === nodeId);
          if (n) onNodesChangeRef.current(nodesRef.current.map(x => x.id === nodeId ? { ...x, locked: !x.locked } : x));
          break;
        }
        case 'hide': {
          const n = nodesRef.current.find(x => x.id === nodeId);
          if (n) onNodesChangeRef.current(nodesRef.current.map(x => x.id === nodeId ? { ...x, hidden: !x.hidden } : x));
          break;
        }
        case 'delete': {
          onNodesChangeRef.current(nodesRef.current.filter(x => x.id !== nodeId));
          setSelectedNodeId(null);
          break;
        }
      }
      setContextMenu(null);
    };

    const updateSelectedNodeData = (patch: Partial<BoardNode['data']>) => {
      if (!selectedNodeId) return;
      onNodesChange(nodes.map(n =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n,
      ));
    };

    // ── Zoom controls ──────────────────────────────────────────────────────
    const zoom = (delta: number) => {
      const vp = viewportRef.current; if (!vp) return;
      vp.zoomPercent(delta, true);
      setZoomScale(vp.scale.x);
    };

    // ─── Render ────────────────────────────────────────────────────────────
    const ctxNode = contextMenu?.nodeId ? nodes.find(n => n.id === contextMenu.nodeId) : undefined;

    return (
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onContextMenu={handleContextMenu}
        onClick={() => setContextMenu(null)}
      >
        {/* ── Shape / Draw Property Inspector ─────────────────────────────── */}
        {selectedNode && (selectedNode.type === 'shape' || selectedNode.type === 'draw' || selectedNode.type === 'sticky' || selectedNode.type === 'section') && (
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 60, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            padding: '6px 14px', borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontSize: '0.78rem', color: 'var(--text-primary)',
            fontFamily: 'var(--font-family)',
          }}>
            {(selectedNode.type === 'shape') && (<>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ opacity: 0.7 }}>Fill</span>
                <input type="color" value={selectedNode.data.fillColor ?? '#7c6bf0'}
                  onChange={e => updateSelectedNodeData({ fillColor: e.target.value })}
                  style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ opacity: 0.7 }}>Opacity</span>
                <input type="range" min={0} max={1} step={0.05}
                  value={selectedNode.data.fillOpacity ?? 0.15}
                  onChange={e => updateSelectedNodeData({ fillOpacity: parseFloat(e.target.value) })}
                  style={{ width: 70 }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ opacity: 0.7 }}>Border</span>
                <input type="color" value={selectedNode.data.strokeColor ?? '#7c6bf0'}
                  onChange={e => updateSelectedNodeData({ strokeColor: e.target.value })}
                  style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ opacity: 0.7 }}>Width</span>
                <input type="number" min={0} max={20} value={selectedNode.data.strokeWidth ?? 2}
                  onChange={e => updateSelectedNodeData({ strokeWidth: parseInt(e.target.value) || 0 })}
                  style={{ width: 46, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 4, padding: '2px 4px' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ opacity: 0.7 }}>Radius</span>
                <input type="number" min={0} max={80} value={selectedNode.data.cornerRadius ?? 12}
                  onChange={e => updateSelectedNodeData({ cornerRadius: parseInt(e.target.value) || 0 })}
                  style={{ width: 46, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 4, padding: '2px 4px' }} />
              </label>
              <select value={selectedNode.data.shapeType ?? 'rectangle'}
                onChange={e => updateSelectedNodeData({ shapeType: e.target.value as any })}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 4, padding: '2px 4px', fontSize: '0.75rem' }}>
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle / Ellipse</option>
              </select>
            </>)}

            {selectedNode.type === 'section' && (<>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ opacity: 0.7 }}>Colour</span>
                <input type="color" value={selectedNode.data.sectionColor ?? '#7c6bf0'}
                  onChange={e => updateSelectedNodeData({ sectionColor: e.target.value })}
                  style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
              </label>
            </>)}

            {selectedNode.type === 'sticky' && (<>
              <span style={{ opacity: 0.7 }}>Colour:</span>
              {STICKY_COLORS.map(c => (
                <button key={c} onClick={() => updateSelectedNodeData({ stickyColor: c })}
                  style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: selectedNode.data.stickyColor === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
              ))}
            </>)}

            <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />
            <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>
              {Math.round(selectedNode.dimensions.width)} × {Math.round(selectedNode.dimensions.height)}
            </span>
          </div>
        )}

        {/* ── Right-Click Context Menu ───────────────────────────────────── */}
        {contextMenu && (
          <div
            style={{
              position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 200,
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              padding: '6px 0', minWidth: 170,
              backdropFilter: 'blur(16px)', fontFamily: 'var(--font-family)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {contextMenu.nodeId ? (
              // Node-level actions
              <>
                <CtxItem icon="⿻" label="Duplicate" shortcut="⌘D" onClick={() => performNodeAction('duplicate')} />
                <CtxItem icon="⬆" label="Bring to Front" shortcut="⌘]" onClick={() => performNodeAction('front')} />
                <CtxItem icon="⬇" label="Send to Back" shortcut="⌘[" onClick={() => performNodeAction('back')} />
                <CtxDivider />
                <CtxItem icon={ctxNode?.locked ? '🔓' : '🔒'} label={ctxNode?.locked ? 'Unlock' : 'Lock'} onClick={() => performNodeAction('lock')} />
                <CtxItem icon={ctxNode?.hidden ? '👁' : '🙈'} label={ctxNode?.hidden ? 'Show' : 'Hide'} onClick={() => performNodeAction('hide')} />
                <CtxDivider />
                <CtxItem icon="🗑" label="Delete" danger onClick={() => performNodeAction('delete')} />
              </>
            ) : (
              // Canvas-level quick-add
              <>
                <div style={{ padding: '4px 12px 6px', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
                  Add to Board
                </div>
                <CtxItem icon="📝" label="Text Note" onClick={() => addNodeFromMenu('text')} />
                <CtxItem icon="⬛" label="Shape Frame" onClick={() => addNodeFromMenu('shape')} />
                <CtxItem icon="📌" label="Sticky Note" onClick={() => addNodeFromMenu('sticky')} />
                <CtxItem icon="📐" label="Section" onClick={() => addNodeFromMenu('section')} />
                <CtxDivider />
                <CtxItem icon="✏️" label="Freehand Draw" onClick={() => { onToolChangeRef.current?.('draw'); setContextMenu(null); }} />
                <CtxItem icon="🔗" label="Connect Arrow" onClick={() => { onToolChangeRef.current?.('link'); setContextMenu(null); }} />
              </>
            )}
          </div>
        )}

        {/* ── Zoom Controls ─────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 20, right: 20, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--bg-surface)', backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)', borderRadius: 8,
          padding: '4px 8px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          userSelect: 'none', fontFamily: 'var(--font-family)',
        }}>
          <button className="toolbar__btn" style={{ padding: '2px 8px' }} onClick={() => zoom(-0.25)} title="Zoom Out">−</button>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, minWidth: 44, textAlign: 'center', color: 'var(--text-primary)' }}>
            {Math.round(zoomScale * 100)}%
          </span>
          <button className="toolbar__btn" style={{ padding: '2px 8px' }} onClick={() => zoom(0.25)} title="Zoom In">+</button>
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)', margin: '0 2px' }} />
          <button className="toolbar__btn" style={{ padding: '2px 8px', fontSize: '0.72rem' }}
            onClick={() => { const vp = viewportRef.current; if (vp) { vp.setZoom(1, true); setZoomScale(1); } }}
            title="Reset zoom">1:1
          </button>
        </div>
      </div>
    );
  },
);

BoardCanvas.displayName = 'BoardCanvas';

// ─── Context menu helper components ──────────────────────────────────────────

const CtxItem: React.FC<{
  icon: string; label: string; shortcut?: string; onClick: () => void; danger?: boolean;
}> = ({ icon, label, shortcut, onClick, danger }) => (
  <div
    onClick={onClick}
    style={{
      padding: '7px 14px', fontSize: '0.83rem', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 8,
      color: danger ? '#f87171' : 'var(--text-primary)',
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
  >
    <span style={{ fontSize: '14px', width: 16, textAlign: 'center' }}>{icon}</span>
    <span style={{ flex: 1 }}>{label}</span>
    {shortcut && <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>{shortcut}</span>}
  </div>
);

const CtxDivider: React.FC = () => (
  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
);
