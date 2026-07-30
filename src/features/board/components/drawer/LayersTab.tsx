import React, { useState } from 'react';
import { ArtGridNode, SectionNode } from '../../engine/types';
import { Asset } from '../../../../components/Gallery';
import { IconPencil, IconEye, IconEyeOff } from '../../../../components/Icons';
import { useCanvasStore } from '../../stores/useCanvasStore';

interface LayersTabProps {
  assets: Asset[];
  standaloneAllAssets: Asset[];
}

export const LayersTab: React.FC<LayersTabProps> = ({
  assets,
  standaloneAllAssets,
}) => {
  const { nodes, setNodes, selectedIds, setSelectedIds } = useCanvasStore();
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleToggleVisible = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNodes(nodes.map(n => n.id === id ? { ...n, visible: n.visible === false ? true : false } : n), true);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedNodeId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedNodeId !== targetId) {
      setDropTargetId(targetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);

    if (!draggedNodeId) return;
    if (draggedNodeId === targetId) return;

    const draggedIndex = nodes.findIndex(n => n.id === draggedNodeId);
    if (draggedIndex === -1) return;

    let newNodes = [...nodes];
    const draggedNode = newNodes[draggedIndex];

    if (targetId === null) {
      // Dropped on empty space -> unparent, move to very top
      draggedNode.parentId = undefined;
      newNodes.splice(draggedIndex, 1);
      newNodes.push(draggedNode);
    } else {
      const targetNode = newNodes.find(n => n.id === targetId);
      if (!targetNode) return;

      if (targetNode.type === 'section') {
        // Dropped ON a section -> parent to it
        if (draggedNode.type !== 'section') {
          draggedNode.parentId = targetNode.id;
        }
        const tIndex = newNodes.findIndex(n => n.id === targetId);
        newNodes.splice(draggedIndex, 1);
        newNodes.splice(tIndex + 1, 0, draggedNode);
      } else {
        // Dropped on a node -> take its parent
        if (draggedNode.type !== 'section') {
          draggedNode.parentId = targetNode.parentId;
        }
        
        newNodes.splice(draggedIndex, 1);
        const newTargetIndex = newNodes.findIndex(n => n.id === targetId);
        newNodes.splice(newTargetIndex + 1, 0, draggedNode);
      }
    }

    setNodes(newNodes, true);
    setDraggedNodeId(null);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDropTargetId(null);
  };

  const childMap = new Map<string, ArtGridNode[]>();
  const rootNodes: ArtGridNode[] = [];
  
  nodes.forEach((n) => {
    if (n.parentId) {
      if (!childMap.has(n.parentId)) childMap.set(n.parentId, []);
      childMap.get(n.parentId)!.push(n);
    } else {
      rootNodes.push(n);
    }
  });

  const [editingSidebarNodeId, setEditingSidebarNodeId] = useState<string | null>(null);
  const [editingSidebarText, setEditingSidebarText] = useState('');

  const handleDoubleClick = (e: React.MouseEvent, node: ArtGridNode) => {
    e.stopPropagation();
    if (node.type === 'section') {
      setEditingSidebarNodeId(node.id);
      setEditingSidebarText((node as SectionNode).title || '');
    }
  };

  const handleRenameSubmit = (nodeId: string) => {
    if (editingSidebarNodeId === nodeId) {
      setNodes(nodes.map(n => n.id === nodeId ? { ...n, title: editingSidebarText } : n), true);
      setEditingSidebarNodeId(null);
    }
  };

  const renderNodeItem = (node: ArtGridNode, isChild: boolean = false) => {
    const isSelected = selectedIds.includes(node.id);
    const isVisible = node.visible !== false;
    const isDropTarget = dropTargetId === node.id;

    return (
      <div 
        key={node.id} 
        draggable
        onDragStart={(e) => handleDragStart(e, node.id)}
        onDragOver={(e) => handleDragOver(e, node.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, node.id)}
        onDragEnd={handleDragEnd}
        onClick={() => setSelectedIds([node.id])}
        style={{ 
          padding: '8px 12px', 
          marginLeft: isChild ? 24 : 0,
          background: isDropTarget ? 'rgba(124, 107, 240, 0.4)' : isSelected ? 'rgba(124, 107, 240, 0.2)' : 'rgba(0,0,0,0.2)', 
          borderRadius: '8px', 
          fontSize: '13px', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          border: `1px solid ${isDropTarget ? '#a78bfa' : isSelected ? 'rgba(124, 107, 240, 0.4)' : 'rgba(255,255,255,0.05)'}`,
          transition: 'all 0.2s ease',
          cursor: 'grab',
          opacity: isVisible ? (draggedNodeId === node.id ? 0.5 : 1) : 0.5
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
          <div style={{ minWidth: 8, height: 8, borderRadius: '50%', background: node.type === 'section' ? '#7c6bf0' : node.type === 'image' ? '#22d3ee' : '#fef08a' }} />
          {editingSidebarNodeId === node.id ? (
            <input
              autoFocus
              value={editingSidebarText}
              onChange={(e) => setEditingSidebarText(e.target.value)}
              onBlur={() => handleRenameSubmit(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit(node.id);
                if (e.key === 'Escape') setEditingSidebarNodeId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid #7c6bf0',
                color: '#fff',
                outline: 'none',
                fontWeight: 500,
                fontSize: '13px',
                padding: '2px 4px',
                borderRadius: '4px',
                width: '100%'
              }}
            />
          ) : (
            <span 
              onDoubleClick={(e) => handleDoubleClick(e, node)}
              style={{ fontWeight: 500, color: isSelected ? '#fff' : '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: node.type === 'section' ? 'text' : 'inherit' }}
              title={node.type === 'section' ? "Double-click to rename" : undefined}
            >
              {node.type.charAt(0).toUpperCase() + node.type.slice(1)} {(node as any).title ? `- ${(node as any).title}` : (node as any).text ? `- ${(node as any).text}` : ''}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {node.type === 'image' && (node as any).assetId && (
            <button 
              style={{ 
                padding: '4px 6px', 
                fontSize: '11px', 
                background: 'rgba(124, 107, 240, 0.15)', 
                color: '#a78bfa', 
                border: 'none', 
                borderRadius: 4, 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
              }} 
              onClick={(e) => {
                e.stopPropagation();
                const ast = assets.find(a => a.id === (node as any).assetId) || standaloneAllAssets.find(a => a.id === (node as any).assetId);
                if (ast && (window as any).__artgridOpenPreviewAsset) {
                  (window as any).__artgridOpenPreviewAsset(ast, node.id);
                }
              }}
              title="Studio"
            >
              <IconPencil size={12} />
            </button>
          )}

          <button 
            onClick={(e) => handleToggleVisible(e, node.id)}
            style={{ background: 'none', border: 'none', color: isVisible ? 'rgba(255,255,255,0.6)' : '#f06b8e', cursor: 'pointer', display: 'flex', padding: 2 }}
            title={isVisible ? 'Hide Layer' : 'Show Layer'}
          >
            {isVisible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
          </button>
        </div>
      </div>
    );
  };

  const reversedRootNodes = [...rootNodes].reverse();

  return (
    <div 
      style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: '100%' }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => handleDrop(e, null)}
    >
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Active Layers ({nodes.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {reversedRootNodes.map(node => {
          if (node.type === 'section') {
            const children = childMap.get(node.id) || [];
            return (
              <React.Fragment key={node.id}>
                {renderNodeItem(node, false)}
                {children.slice().reverse().map(child => (
                  renderNodeItem(child, true)
                ))}
              </React.Fragment>
            );
          }
          return renderNodeItem(node, false);
        })}

        {nodes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            No layers on this board.
          </div>
        )}
      </div>
    </div>
  );
};
