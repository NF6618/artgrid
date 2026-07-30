import React, { useState } from 'react';
import { ToolType } from '../engine/types';
import { useCanvasStore } from '../stores/useCanvasStore';
import { 
  IconCursor, 
  IconHand, 
  IconColumns,
  IconStickyNote, 
  IconType, 
  IconSquare, 
  IconArrowUpRight, 
  IconPencil, 
  IconEraser,
  IconRotateCcw, 
  IconRotateCw 
} from '../../../components/Icons';
import { Panel } from '../../../components/ui/Panel';
import { IconButton } from '../../../components/ui/IconButton';

const ToolButton: React.FC<{
  tool: any;
  isActive: boolean;
  onClick: () => void;
}> = ({ tool, isActive, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      {/* Tooltip */}
      <div 
        style={{
          position: 'absolute',
          top: -36,
          background: 'rgba(0,0,0,0.85)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: '11px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.95)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        {tool.label} <span style={{ opacity: 0.5, marginLeft: 4 }}>{tool.shortcut}</span>
      </div>

      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: isActive ? '1px solid rgba(124, 107, 240, 0.4)' : '1px solid transparent',
          background: isActive ? 'var(--accent-primary)' : isHovered ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: isActive ? '#fff' : isHovered ? '#fff' : 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isHovered && !isActive ? 'scale(1.15) translateY(-2px)' : isActive ? 'scale(1.05)' : 'scale(1)',
          boxShadow: isActive ? '0 4px 12px rgba(124, 107, 240, 0.4)' : 'none',
        }}
      >
        {tool.icon}
      </button>
    </div>
  );
};

export const BoardToolbar: React.FC = () => {
  const { activeTool, setActiveTool, canUndo, canRedo, undo, redo, viewport, setViewport } = useCanvasStore();

  const handleResetZoom = () => setViewport({ ...viewport, zoom: 1.0 });

  const tools = [
    { type: 'select', label: 'Select', icon: <IconCursor size={18} />, shortcut: 'V' },
    { type: 'pan', label: 'Hand / Pan', icon: <IconHand size={18} />, shortcut: 'H' },
    { type: 'section', label: 'Section Frame', icon: <IconColumns size={18} />, shortcut: 'S' },
    { type: 'note', label: 'Sticky Note', icon: <IconStickyNote size={18} />, shortcut: 'N' },
    { type: 'text', label: 'Text Box', icon: <IconType size={18} />, shortcut: 'T' },
    { type: 'shape', label: 'Shape', icon: <IconSquare size={18} />, shortcut: 'R' },
    { type: 'arrow', label: 'Connector', icon: <IconArrowUpRight size={18} />, shortcut: 'A' },
    { type: 'pen', label: 'Pen', icon: <IconPencil size={18} />, shortcut: 'P' },
    { type: 'eraser', label: 'Eraser', icon: <IconEraser size={18} />, shortcut: 'E' },
  ];

  return (
    <Panel
      style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 32,
        padding: '8px 16px',
        zIndex: 100,
        userSelect: 'none',
      }}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      {tools.map(t => (
        <ToolButton 
          key={t.type}
          tool={t}
          isActive={activeTool === t.type}
          onClick={() => setActiveTool(t.type as ToolType)}
        />
      ))}

      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: 4 }}>
        <IconButton
          icon={<IconRotateCcw size={16} />}
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          size={36}
          style={{
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            color: canUndo ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
            cursor: canUndo ? 'pointer' : 'default',
          }}
        />
        <IconButton
          icon={<IconRotateCw size={16} />}
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          size={36}
          style={{
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            color: canRedo ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
            cursor: canRedo ? 'pointer' : 'default',
          }}
        />
      </div>

      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

      <button
        onClick={handleResetZoom}
        title="Reset Zoom to 100%"
        style={{
          padding: '6px 12px',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.3)',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
      >
        {Math.round(viewport.zoom * 100)}%
      </button>
    </Panel>
  );
};
