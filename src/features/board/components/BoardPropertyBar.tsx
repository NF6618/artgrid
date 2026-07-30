import React from 'react';
import { ArtGridNode, NoteColor, TextNode, ShapeNode, PenNode, ArrowNode, SectionNode, ImageNode } from '../engine/types';
import { IconCopy, IconTrash, IconLock, IconUnlock, IconPencil } from '../../../components/Icons';

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
  onChangeNodeSize?: (width: number, height: number) => void;
  onToggleLock: () => void;
}

const ColorPicker: React.FC<{ value: string; onChange: (v: string) => void; title: string }> = ({ value, onChange, title }) => (
  <div 
    title={title}
    style={{ 
      position: 'relative', 
      width: 24, 
      height: 24, 
      borderRadius: '50%', 
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      cursor: 'pointer'
    }}
  >
    <div style={{ position: 'absolute', inset: 0, background: value }} />
    <input 
      type="color" 
      value={value} 
      onChange={e => onChange(e.target.value)}
      style={{ opacity: 0, position: 'absolute', inset: -10, width: 50, height: 50, cursor: 'pointer' }}
    />
  </div>
);

const Divider = () => <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />;

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
  onChangeNodeSize,
  onToggleLock,
}) => {
  const [isRatioLocked, setIsRatioLocked] = React.useState(true);

  if (selectedNodes.length === 0) return null;

  const firstNode = selectedNodes[0];
  const isSingle = selectedNodes.length === 1;
  const isNote = isSingle && firstNode.type === 'note';
  const isText = isSingle && firstNode.type === 'text';
  const isShape = isSingle && firstNode.type === 'shape';
  const isPen = isSingle && firstNode.type === 'pen';
  const isArrow = isSingle && firstNode.type === 'arrow';
  const isSection = isSingle && firstNode.type === 'section';
  const isImage = isSingle && firstNode.type === 'image';
  const isLocked = selectedNodes.some(n => n.locked);

  const noteColors: { name: NoteColor; hex: string }[] = [
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
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(20, 20, 25, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 14,
        padding: '8px 16px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
        zIndex: 100,
        backdropFilter: 'blur(32px) saturate(150%)',
        WebkitBackdropFilter: 'blur(32px) saturate(150%)',
        userSelect: 'none',
      }}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {selectedNodes.length} {selectedNodes.length === 1 ? 'item' : 'items'}
      </span>

      <Divider />

      {/* Sticky Note Color Palette */}
      {isNote && onChangeColor && (
        <>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {noteColors.map(c => {
              const active = (firstNode as any).color === c.name;
              return (
                <div
                  key={c.name}
                  onClick={() => onChangeColor(c.name)}
                  title={`Note color: ${c.name}`}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: c.hex,
                    border: active ? '2px solid #fff' : '1px solid rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.2)' : '0 2px 4px rgba(0,0,0,0.2)',
                    transform: active ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.2s ease'
                  }}
                />
              );
            })}
          </div>
          <Divider />
        </>
      )}

      {/* Image Node Properties */}
      {isImage && (firstNode as ImageNode).assetId && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const assetId = (firstNode as ImageNode).assetId;
              if (assetId && (window as any).__artgridOpenPreviewAsset) {
                const mockAsset = { id: assetId, title: 'Image.png', type: 'image/png', url: (firstNode as ImageNode).src } as any;
                (window as any).__artgridOpenPreviewAsset(mockAsset);
              }
            }}
            style={{ 
              padding: '6px 12px', 
              fontSize: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              fontWeight: 600, 
              color: 'var(--accent-primary)',
              background: 'rgba(124, 107, 240, 0.1)',
              border: '1px solid rgba(124, 107, 240, 0.2)',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(124, 107, 240, 0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(124, 107, 240, 0.1)'}
          >
            <IconPencil size={14} /> Studio Tools
          </button>
          <Divider />
        </>
      )}

      {/* Resize Inputs */}
      {isSingle && !isLocked && onChangeNodeSize && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600 }}>
            W
            <input
              type="number"
              value={Math.round(firstNode.width)}
              onChange={e => {
                const newW = Number(e.target.value) || firstNode.width;
                if (isRatioLocked) {
                  const ratio = firstNode.height / firstNode.width;
                  onChangeNodeSize(newW, newW * ratio);
                } else {
                  onChangeNodeSize(newW, firstNode.height);
                }
              }}
              style={{
                width: 48,
                padding: '4px 6px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                fontVariantNumeric: 'tabular-nums'
              }}
            />
          </label>
          <button
            onClick={() => setIsRatioLocked(!isRatioLocked)}
            title={isRatioLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isRatioLocked ? '#fff' : 'rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s'
            }}
          >
            {isRatioLocked ? <IconLock size={12} /> : <IconUnlock size={12} />}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600 }}>
            H
            <input
              type="number"
              value={Math.round(firstNode.height)}
              onChange={e => {
                const newH = Number(e.target.value) || firstNode.height;
                if (isRatioLocked) {
                  const ratio = firstNode.width / firstNode.height;
                  onChangeNodeSize(newH * ratio, newH);
                } else {
                  onChangeNodeSize(firstNode.width, newH);
                }
              }}
              style={{
                width: 48,
                padding: '4px 6px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                fontVariantNumeric: 'tabular-nums'
              }}
            />
          </label>
          <Divider />
        </div>
      )}

      {/* Text Box Props */}
      {isText && (
        <>
          {onChangeFontFamily && (
            <select
              value={(firstNode as TextNode).fontFamily || 'Inter'}
              onChange={e => onChangeFontFamily(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
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
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {[12, 14, 18, 24, 32, 48, 64, 72].map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
          )}

          {onChangeTextColor && (
            <ColorPicker value={(firstNode as TextNode).color || '#e8e8f0'} onChange={onChangeTextColor} title="Text Color" />
          )}
          <Divider />
        </>
      )}

      {/* Shape Properties */}
      {isShape && (
        <>
          {onChangeShapeType && (
            <select
              value={(firstNode as ShapeNode).shapeType || 'rectangle'}
              onChange={e => onChangeShapeType(e.target.value as 'rectangle' | 'ellipse')}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="rectangle">Rectangle</option>
              <option value="ellipse">Ellipse</option>
            </select>
          )}
          {onChangeShapeFill && (
            <ColorPicker value={(firstNode as ShapeNode).fillColor || '#7c6bf0'} onChange={onChangeShapeFill} title="Fill Color" />
          )}
          {onChangeShapeStroke && (
            <ColorPicker value={(firstNode as ShapeNode).strokeColor || '#7c6bf0'} onChange={onChangeShapeStroke} title="Stroke Color" />
          )}
          <Divider />
        </>
      )}

      {/* Pen/Arrow Properties */}
      {(isPen || isArrow) && (
        <>
          {isPen && onChangePenColor && <ColorPicker value={(firstNode as PenNode).color || '#7c6bf0'} onChange={onChangePenColor} title="Stroke Color" />}
          {isArrow && onChangeArrowColor && <ColorPicker value={(firstNode as ArrowNode).color || '#7c6bf0'} onChange={onChangeArrowColor} title="Arrow Color" />}
          
          {isPen && onChangePenWidth && (
            <select
              value={(firstNode as PenNode).strokeWidth || 4}
              onChange={e => onChangePenWidth(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={2}>Thin</option>
              <option value={4}>Medium</option>
              <option value={8}>Thick</option>
              <option value={14}>Bold</option>
            </select>
          )}
          <Divider />
        </>
      )}

      {/* Section Properties */}
      {isSection && (
        <>
          {onChangeSectionColor && <ColorPicker value={(firstNode as SectionNode).color || '#7c6bf0'} onChange={onChangeSectionColor} title="Header Color" />}
          <Divider />
        </>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onBringToFront}
          title="Bring to Front"
          style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6, cursor: 'pointer' }}
        >
          Front
        </button>

        <button
          onClick={onSendToBack}
          title="Send to Back"
          style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6, cursor: 'pointer' }}
        >
          Back
        </button>
      </div>

      <Divider />

      <button
        onClick={onDuplicate}
        title="Duplicate (Ctrl+D)"
        style={{ padding: '6px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        <IconCopy size={16} />
      </button>

      <button
        onClick={onToggleLock}
        title={isLocked ? "Unlock Element" : "Lock Element"}
        style={{ padding: '6px', background: 'transparent', border: 'none', color: isLocked ? 'var(--accent-primary)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        {isLocked ? <IconLock size={16} /> : <IconUnlock size={16} />}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDelete();
        }}
        title="Delete (Backspace)"
        style={{ padding: '6px', background: 'transparent', border: 'none', color: '#f06b8e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        <IconTrash size={16} />
      </button>
    </div>
  );
};
