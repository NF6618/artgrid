import React, { useState } from 'react';
import { ArtGridNode, SectionNode, TextNode, ShapeNode, PenNode, NoteNode, ImageNode } from '../../engine/types';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { SectionNodeView } from './SectionNodeView';
import { TextNodeView } from './TextNodeView';
import { ShapeNodeView } from './ShapeNodeView';
import { PenNodeView } from './PenNodeView';
import { NoteNodeView } from './NoteNodeView';
import { SelectionOverlay } from './SelectionOverlay';
import { FilteredImageNode } from '../FilteredImageNode';
import { Point } from '../../engine/types';

interface NodeRendererProps {
  node: ArtGridNode;
  isSelected: boolean;
  handleResizeHandleMouseDown: (e: React.PointerEvent, handle: string, node: ArtGridNode) => void;
  setIsDraggingCrop: (v: boolean) => void;
  setCropDragStart: (p: Point) => void;
}

export const NodeRenderer: React.FC<NodeRendererProps> = ({
  node,
  isSelected,
  handleResizeHandleMouseDown,
  setIsDraggingCrop,
  setCropDragStart,
}) => {
  const { 
    croppingNodeId, 
    setCroppingNodeId,
    editingNodeId,
    setEditingNodeId,
    nodes,
    setNodes,
    viewport
  } = useCanvasStore();

  const [editingText, setEditingText] = useState('');

  const updateNodes = (newNodes: ArtGridNode[], recordHistory = true) => {
    setNodes(newNodes, recordHistory);
  };

  const showResizeHandles = isSelected && !node.locked && node.type !== 'section';
  const isLOD = viewport.zoom < 0.5;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'note' || node.type === 'text' || node.type === 'section') {
      setEditingNodeId(node.id);
      setEditingText((node as any).title || (node as any).text || '');
    } else if (node.type === 'image' && !node.locked) {
      setCroppingNodeId(node.id);
      if (!(node as ImageNode).crop) {
        const updatedNode = { ...node, crop: { x: 0, y: 0, width: 1.0, height: 1.0 } };
        updateNodes(nodes.map(n => n.id === node.id ? updatedNode : n), false);
      }
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
        boxShadow: isLOD ? 'none' : (isSelected ? '0 0 0 2px var(--accent-primary), 0 16px 40px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.2)'),
        borderRadius: isLOD ? 0 : (node.type === 'note' ? 2 : (node.type === 'image' ? 8 : 4)),
        cursor: node.locked ? 'not-allowed' : 'move',
        transition: 'box-shadow 0.2s ease',
        opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
        display: node.visible === false ? 'none' : 'block',
        contentVisibility: 'auto'
      }}
      onDoubleClick={handleDoubleClick}
    >
      {node.type === 'section' && (
        <SectionNodeView
          node={node as SectionNode}
          isEditing={editingNodeId === node.id}
          editingText={editingText}
          setEditingText={setEditingText}
          onBlur={() => {
            updateNodes(nodes.map(n => n.id === node.id ? { ...n, title: editingText } : n));
            setEditingNodeId(null);
          }}
        />
      )}

      {node.type === 'image' && (
        <FilteredImageNode
          node={node as ImageNode}
          isCropping={croppingNodeId === node.id}
          isLOD={isLOD}
          onCropDragStart={(e) => {
            e.stopPropagation();
            setIsDraggingCrop(true);
            setCropDragStart({ x: e.clientX, y: e.clientY });
          }}
        />
      )}

      {node.type === 'note' && (
        <NoteNodeView
          node={node as NoteNode}
          isEditing={editingNodeId === node.id}
          editingText={editingText}
          setEditingText={setEditingText}
          onBlur={() => {
            updateNodes(nodes.map(n => n.id === node.id ? { ...n, text: editingText } : n));
            setEditingNodeId(null);
          }}
        />
      )}

      {node.type === 'text' && (
        <TextNodeView
          node={node as TextNode}
          isEditing={editingNodeId === node.id}
          editingText={editingText}
          setEditingText={setEditingText}
          onBlur={() => {
            updateNodes(nodes.map(n => n.id === node.id ? { ...n, text: editingText } : n));
            setEditingNodeId(null);
          }}
        />
      )}

      {node.type === 'shape' && <ShapeNodeView node={node as ShapeNode} />}

      {node.type === 'pen' && <PenNodeView node={node as PenNode} />}

      {showResizeHandles && (
        <SelectionOverlay
          node={node}
          onResizeHandleDown={handleResizeHandleMouseDown}
        />
      )}
    </div>
  );
};
