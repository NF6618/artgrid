import React from 'react';
import { SectionNode } from '../../engine/types';

interface SectionNodeViewProps {
  node: SectionNode;
  isEditing: boolean;
  editingText: string;
  setEditingText: (text: string) => void;
  onBlur: () => void;
}

export const SectionNodeView: React.FC<SectionNodeViewProps> = ({
  node,
  isEditing,
  editingText,
  setEditingText,
  onBlur,
}) => {
  return (
    <div style={{ width: '100%', height: '100%', border: `1px solid ${node.color || 'rgba(255,255,255,0.1)'}`, borderRadius: 12, background: 'rgba(255, 255, 255, 0.02)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: `linear-gradient(180deg, ${node.color || 'var(--accent-primary)'}15 0%, transparent 40px)` }} />
      <div style={{ position: 'absolute', top: -32, left: -1, background: node.color || 'var(--accent-primary)', color: 'white', padding: '6px 16px', borderTopLeftRadius: 8, borderTopRightRadius: 8, fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', boxShadow: '0 -4px 12px rgba(0,0,0,0.1)' }}>
        {isEditing ? (
          <input 
            autoFocus
            value={editingText}
            onChange={e => setEditingText(e.target.value)}
            onBlur={onBlur}
            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontWeight: 600, fontSize: '13px', width: '100%' }}
          />
        ) : (
          <span>{node.title || 'Workspace Section'}</span>
        )}
      </div>
    </div>
  );
};
