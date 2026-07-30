import React from 'react';
import { NoteNode } from '../../engine/types';

interface NoteNodeViewProps {
  node: NoteNode;
  isEditing: boolean;
  editingText: string;
  setEditingText: (text: string) => void;
  onBlur: () => void;
}

const getNoteBgColor = (color: string) => {
  switch (color) {
    case 'yellow': return '#fef08a';
    case 'blue': return '#bae6fd';
    case 'green': return '#bbf7d0';
    case 'pink': return '#fbcfe8';
    case 'purple': return '#e9d5ff';
    case 'dark': return '#1f2937';
    default: return '#fef08a';
  }
};

export const NoteNodeView: React.FC<NoteNodeViewProps> = ({
  node,
  isEditing,
  editingText,
  setEditingText,
  onBlur,
}) => {
  const bgColor = getNoteBgColor(node.color);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${bgColor} 88%, transparent 88%, transparent 100%)`,
        color: node.color === 'dark' ? '#f8fafc' : '#1e293b',
        padding: 16,
        boxSizing: 'border-box',
        fontSize: '15px',
        fontWeight: 500,
        borderRadius: 2,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
        position: 'relative',
        display: 'flex',
      }}
    >
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '12%',
        height: '12%',
        background: `linear-gradient(to top left, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 50%)`,
        backgroundColor: bgColor,
        borderTopLeftRadius: 4,
        boxShadow: '-2px -2px 6px rgba(0,0,0,0.15)',
        filter: 'brightness(0.92)'
      }} />
      {isEditing ? (
        <textarea
          autoFocus
          value={editingText}
          onChange={e => setEditingText(e.target.value)}
          onBlur={onBlur}
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            color: 'inherit',
            zIndex: 2,
          }}
        />
      ) : (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', zIndex: 2, width: '100%' }}>
          {node.text || 'Double-click to edit'}
        </div>
      )}
    </div>
  );
};
