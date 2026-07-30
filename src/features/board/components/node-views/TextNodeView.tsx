import React from 'react';
import { TextNode } from '../../engine/types';

interface TextNodeViewProps {
  node: TextNode;
  isEditing: boolean;
  editingText: string;
  setEditingText: (text: string) => void;
  onBlur: () => void;
}

export const TextNodeView: React.FC<TextNodeViewProps> = ({
  node,
  isEditing,
  editingText,
  setEditingText,
  onBlur,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        color: node.color || 'var(--text-primary)',
        fontSize: `${node.fontSize || 18}px`,
        fontFamily: node.fontFamily === 'System Default'
          ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          : node.fontFamily ? `'${node.fontFamily}', sans-serif` : 'var(--font-family)',
        fontWeight: 600,
        padding: 4,
        boxSizing: 'border-box',
      }}
    >
      {isEditing ? (
        <input
          autoFocus
          value={editingText}
          onChange={e => setEditingText(e.target.value)}
          onBlur={onBlur}
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--accent-primary)',
            borderRadius: 4,
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            color: 'inherit',
            padding: '2px 6px',
          }}
        />
      ) : (
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.text || 'Click to type text'}
        </div>
      )}
    </div>
  );
};
