import React from 'react';
import { ToolType } from '../engine/types';
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

interface BoardToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onResetZoom: () => void;
  zoomLevel: number;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  activeTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onResetZoom,
  zoomLevel,
}) => {
  const tools: { type: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { type: 'select', label: 'Select Tool', icon: <IconCursor size={16} />, shortcut: 'V' },
    { type: 'pan', label: 'Hand / Pan Tool', icon: <IconHand size={16} />, shortcut: 'H' },
    { type: 'section', label: 'Workspace Section', icon: <IconColumns size={16} />, shortcut: 'S' },
    { type: 'note', label: 'Sticky Note', icon: <IconStickyNote size={16} />, shortcut: 'N' },
    { type: 'text', label: 'Text Box', icon: <IconType size={16} />, shortcut: 'T' },
    { type: 'shape', label: 'Rectangle Shape', icon: <IconSquare size={16} />, shortcut: 'R' },
    { type: 'arrow', label: 'Arrow / Connector', icon: <IconArrowUpRight size={16} />, shortcut: 'A' },
    { type: 'pen', label: 'Sketch / Pen Tool', icon: <IconPencil size={16} />, shortcut: 'P' },
    { type: 'eraser', label: 'Eraser Tool', icon: <IconEraser size={16} />, shortcut: 'E' },
  ];

  return (
    <div 
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 30,
        padding: '6px 14px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        userSelect: 'none',
      }}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      {tools.map(t => (
        <button
          key={t.type}
          onClick={() => onSelectTool(t.type)}
          title={`${t.label} (${t.shortcut})`}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: activeTool === t.type ? 'var(--accent-primary)' : 'transparent',
            color: activeTool === t.type ? 'white' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          {t.icon}
        </button>
      ))}

      <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: canUndo ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: canUndo ? 'pointer' : 'default',
          opacity: canUndo ? 1 : 0.4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconRotateCcw size={15} />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: canRedo ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: canRedo ? 'pointer' : 'default',
          opacity: canRedo ? 1 : 0.4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconRotateCw size={15} />
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />

      <button
        onClick={onResetZoom}
        title="Reset Zoom to 100%"
        style={{
          padding: '4px 8px',
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {Math.round(zoomLevel * 100)}%
      </button>
    </div>
  );
};
