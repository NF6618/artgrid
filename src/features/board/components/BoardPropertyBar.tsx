import React from 'react';
import { ArtGridNode, NoteColor, TextNode, ShapeNode, PenNode, ArrowNode, SectionNode } from '../engine/types';
import { IconCopy, IconTrash, IconLock, IconUnlock } from '../../../components/Icons';

interface BoardPropertyBarProps {
  selectedNodes: ArtGridNode[];
  onDelete: () => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onChangeColor?: (color: NoteColor) => void;
  onChangeFontFamily?: (fontFamily: string) => void;
  onChangeFontSize?: (fontSize: number) => void;
  onChangeTextColor?: (color: string) => void;
  onChangeShapeFill?: (color: string) => void;
  onChangeShapeStroke?: (color: string) => void;
  onChangeShapeType?: (type: 'rectangle' | 'ellipse') => void;
  onChangePenColor?: (color: string) => void;
  onChangePenWidth?: (width: number) => void;
  onChangeArrowColor?: (color: string) => void;
  onChangeSectionColor?: (color: string) => void;
  onToggleLock: () => void;
}

export const BoardPropertyBar: React.FC<BoardPropertyBarProps> = ({
  selectedNodes,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onChangeColor,
  onChangeFontFamily,
  onChangeFontSize,
  onChangeTextColor,
  onChangeShapeFill,
  onChangeShapeStroke,
  onChangeShapeType,
  onChangePenColor,
  onChangePenWidth,
  onChangeArrowColor,
  onChangeSectionColor,
  onToggleLock,
}) => {
  if (selectedNodes.length === 0) return null;

  const firstNode = selectedNodes[0];
  const isSingle = selectedNodes.length === 1;
  const isNote = isSingle && firstNode.type === 'note';
  const isText = isSingle && firstNode.type === 'text';
  const isShape = isSingle && firstNode.type === 'shape';
  const isPen = isSingle && firstNode.type === 'pen';
  const isArrow = isSingle && firstNode.type === 'arrow';
  const isSection = isSingle && firstNode.type === 'section';
  const isLocked = selectedNodes.some(n => n.locked);

  const colors: { name: NoteColor; hex: string }[] = [
    { name: 'yellow', hex: '#fef08a' },
    { name: 'blue', hex: '#bae6fd' },
    { name: 'green', hex: '#bbf7d0' },
    { name: 'pink', hex: '#fbcfe8' },
    { name: 'purple', hex: '#e9d5ff' },
    { name: 'dark', hex: '#1f2937' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '6px 14px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        userSelect: 'none',
      }}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
        {selectedNodes.length} selected
      </span>

      <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />

      {/* Sticky Note Color Palette */}
      {isNote && onChangeColor && (
        <>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {colors.map(c => (
              <div
                key={c.name}
                onClick={() => onChangeColor(c.name)}
                title={`Note color: ${c.name}`}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: c.hex,
                  border: '1px solid rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
        </>
      )}

      {/* Text Box Font Family & Size Selector */}
      {isText && (
        <>
          {onChangeFontFamily && (
            <select
              value={(firstNode as TextNode).fontFamily || 'Inter'}
              onChange={e => onChangeFontFamily(e.target.value)}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Outfit">Outfit</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
              <option value="Playfair Display">Playfair Display</option>
              <option value="System Default">System Default</option>
            </select>
          )}

          {onChangeFontSize && (
            <select
              value={(firstNode as TextNode).fontSize || 18}
              onChange={e => onChangeFontSize(Number(e.target.value))}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            >
              <option value={12}>12px</option>
              <option value={14}>14px</option>
              <option value={18}>18px</option>
              <option value={24}>24px</option>
              <option value={32}>32px</option>
              <option value={48}>48px</option>
              <option value={64}>64px</option>
              <option value={72}>72px</option>
            </select>
          )}

          {onChangeTextColor && (
            <input 
              type="color" 
              value={(firstNode as TextNode).color || '#e8e8f0'} 
              onChange={e => onChangeTextColor(e.target.value)}
              title="Text Color"
              style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          )}

          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
        </>
      )}

      {/* Shape Node Properties */}
      {isShape && (
        <>
          {onChangeShapeType && (
            <select
              value={(firstNode as ShapeNode).shapeType || 'rectangle'}
              onChange={e => onChangeShapeType(e.target.value as 'rectangle' | 'ellipse')}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            >
              <option value="rectangle">Rectangle</option>
              <option value="ellipse">Ellipse</option>
            </select>
          )}
          {onChangeShapeFill && (
            <input
              type="color"
              value={(firstNode as ShapeNode).fillColor || '#7c6bf0'}
              onChange={e => onChangeShapeFill(e.target.value)}
              title="Fill Color"
              style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          )}
          {onChangeShapeStroke && (
            <input
              type="color"
              value={(firstNode as ShapeNode).strokeColor || '#7c6bf0'}
              onChange={e => onChangeShapeStroke(e.target.value)}
              title="Stroke Color"
              style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          )}
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
        </>
      )}

      {/* Pen Node Properties */}
      {isPen && (
        <>
          {onChangePenColor && (
            <input
              type="color"
              value={(firstNode as PenNode).color || '#7c6bf0'}
              onChange={e => onChangePenColor(e.target.value)}
              title="Stroke Color"
              style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          )}
          {onChangePenWidth && (
            <select
              value={(firstNode as PenNode).strokeWidth || 4}
              onChange={e => onChangePenWidth(Number(e.target.value))}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            >
              <option value={2}>Thin (2px)</option>
              <option value={4}>Medium (4px)</option>
              <option value={8}>Thick (8px)</option>
              <option value={14}>Bold (14px)</option>
            </select>
          )}
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
        </>
      )}

      {/* Arrow Node Properties */}
      {isArrow && (
        <>
          {onChangeArrowColor && (
            <input
              type="color"
              value={(firstNode as ArrowNode).color || '#7c6bf0'}
              onChange={e => onChangeArrowColor(e.target.value)}
              title="Arrow Color"
              style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          )}
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
        </>
      )}

      {/* Section Node Properties */}
      {isSection && (
        <>
          {onChangeSectionColor && (
            <input
              type="color"
              value={(firstNode as SectionNode).color || '#7c6bf0'}
              onChange={e => onChangeSectionColor(e.target.value)}
              title="Section Header Color"
              style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          )}
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
        </>
      )}

      <button
        className="btn btn--secondary"
        onClick={onBringToFront}
        title="Bring to Front"
        style={{ padding: '4px 8px', fontSize: '11px' }}
      >
        Front
      </button>

      <button
        className="btn btn--secondary"
        onClick={onSendToBack}
        title="Send to Back"
        style={{ padding: '4px 8px', fontSize: '11px' }}
      >
        Back
      </button>

      <button
        className="btn btn--secondary"
        onClick={onDuplicate}
        title="Duplicate Element (Ctrl+D)"
        style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <IconCopy size={13} /> Duplicate
      </button>

      <button
        className="btn btn--secondary"
        onClick={onToggleLock}
        title={isLocked ? "Unlock Element" : "Lock Element"}
        style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        {isLocked ? <IconUnlock size={13} /> : <IconLock size={13} />}
        {isLocked ? 'Unlock' : 'Lock'}
      </button>

      <button
        className="btn btn--secondary"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDelete();
        }}
        title="Delete Selection (Delete / Backspace)"
        style={{ padding: '4px 8px', fontSize: '11px', color: '#f06b8e', borderColor: 'rgba(240, 107, 142, 0.3)', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <IconTrash size={13} /> Delete
      </button>
    </div>
  );
};
