import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { v4 as uuidv4 } from 'uuid';
import { BoardNode, Position } from '../types/board';

import { ToolType } from '../App';

interface BoardCanvasProps {
  nodes: BoardNode[];
  onNodesChange: (nodes: BoardNode[]) => void;
  activeTool: ToolType;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({ nodes, onNodesChange, activeTool }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize Pixi Application
    const app = new PIXI.Application({
      resizeTo: containerRef.current,
      backgroundColor: 0x1e1e1e, // Match var(--bg-base) or dark theme
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    // Ensure we are mounting properly (Pixi v7 returns view as HTMLCanvasElement)
    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    // 2. Initialize Viewport
    const viewport = new Viewport({
      screenWidth: containerRef.current.clientWidth,
      screenHeight: containerRef.current.clientHeight,
      worldWidth: 10000,
      worldHeight: 10000,
      events: app.renderer.events, // Pixi v7 event system
    });

    app.stage.addChild(viewport);
    viewportRef.current = viewport;

    // 3. Configure Viewport Interactions
    viewport
      .drag({ mouseButtons: 'right' }) // Always drag with right click
      .pinch()
      .wheel()
      .decelerate();

    // Fix for middle mouse button panning
    viewport.on('pointerdown', (e) => {
      if (e.data.originalEvent.button === 1) { // Middle click
        viewport.plugins.get('drag')?.resume();
      }
    });

    // 4. Handle window resize
    const handleResize = () => {
      if (containerRef.current) {
        viewport.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, []); // Run once on mount

  // Sync tool behavior to viewport
  useEffect(() => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current;
    
    const dragPlugin = viewport.plugins.get('drag');
    if (dragPlugin) {
       // If tool is pan, allow left click (mouseButtons: 'left') panning, otherwise only right click
       dragPlugin.options.mouseButtons = activeTool === 'pan' ? 'left' : 'right';
    }
    
    // Change cursor
    if (containerRef.current) {
      containerRef.current.style.cursor = activeTool === 'pan' ? 'grab' : 'default';
    }
  }, [activeTool]);

  // Sync nodes to Pixi Sprites
  useEffect(() => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current;

    // Clear existing children (naive sync for now, can be optimized later)
    viewport.removeChildren();

    // Re-render all nodes
    nodes.forEach(node => {
      if (node.type === 'image' && node.data.url) {
        // Load image as sprite
        const texture = PIXI.Texture.from(node.data.url);
        const sprite = new PIXI.Sprite(texture);
        
        sprite.x = node.position.x;
        sprite.y = node.position.y;
        
        // Wait for texture to load to set dimensions properly, or use predefined
        if (texture.baseTexture.valid) {
           sprite.width = node.dimensions.width;
           sprite.height = node.dimensions.height;
        } else {
           texture.baseTexture.once('loaded', () => {
             sprite.width = node.dimensions.width;
             sprite.height = node.dimensions.height;
           });
        }

        // Enable interaction
        sprite.eventMode = 'static'; // Pixi v7 interactivity
        sprite.cursor = 'pointer';

        // Selection highlight
        if (selectedNodeId === node.id) {
          sprite.tint = 0xaaaaff; // simple tint to show selection
        }

        // Dragging Logic
        let dragging = false;
        let dragData: PIXI.FederatedPointerEvent | null = null;
        let startPosition = { x: 0, y: 0 };

        sprite.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
          if (e.button === 0 && activeTool === 'select') { // Left click & select tool
            e.stopPropagation(); // Prevent viewport drag
            setSelectedNodeId(node.id);
            dragging = true;
            dragData = e;
            startPosition = { x: sprite.x, y: sprite.y };
            viewport.plugins.pause('drag');
          }
        });

        sprite.on('pointerup', () => {
          dragging = false;
          dragData = null;
          viewport.plugins.resume('drag');
          
          // Emit updated node position
          if (sprite.x !== startPosition.x || sprite.y !== startPosition.y) {
            onNodesChange(nodes.map(n => 
              n.id === node.id 
                ? { ...n, position: { x: sprite.x, y: sprite.y } }
                : n
            ));
          }
        });

        sprite.on('pointerupoutside', () => {
          dragging = false;
          dragData = null;
          viewport.plugins.resume('drag');
        });

        sprite.on('globalpointermove', (e: PIXI.FederatedPointerEvent) => {
          if (dragging) {
             const newPosition = e.global;
             // Convert screen position to world coordinates
             const worldPos = viewport.toWorld(newPosition);
             // Adjust by sprite's anchor/offset (if we want center drag, etc. For now top-left)
             sprite.x = worldPos.x - sprite.width / 2;
             sprite.y = worldPos.y - sprite.height / 2;
          }
        });

        viewport.addChild(sprite);
      }
    });

    // Deselect if clicking on empty viewport (only in select mode)
    viewport.on('pointerdown', (e) => {
      if (e.target === viewport && activeTool === 'select' && e.data.originalEvent.button === 0) {
        setSelectedNodeId(null);
      }
    });

  }, [nodes, selectedNodeId, activeTool, onNodesChange]);

  // Handle HTML5 Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!viewportRef.current) return;

    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const asset = JSON.parse(data);
      
      // Calculate world position based on mouse drop screen coordinates
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      
      const worldPos = viewportRef.current.toWorld(screenX, screenY);
      
      const newNode: BoardNode = {
        id: uuidv4(),
        type: 'image',
        position: { x: worldPos.x, y: worldPos.y },
        dimensions: { width: 300, height: 300 }, // Default size for now
        data: {
          assetId: asset.id,
          url: asset.url
        }
      };

      onNodesChange([...nodes, newNode]);
    } catch (err) {
      console.error("Failed to parse dropped asset:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Required to allow drop
    e.dataTransfer.dropEffect = 'copy';
  };

  // Keyboard Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        onNodesChange(nodes.filter(n => n.id !== selectedNodeId));
        setSelectedNodeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, nodes, onNodesChange]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    />
  );
};
