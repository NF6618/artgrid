import React from 'react';
import { ShapeNode } from '../../engine/types';

export const ShapeNodeView: React.FC<{ node: ShapeNode }> = ({ node }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: node.fillColor || 'transparent',
        border: `2px solid ${node.strokeColor || 'var(--accent-primary)'}`,
        borderRadius: node.shapeType === 'ellipse' ? '50%' : 6,
      }}
    />
  );
};
