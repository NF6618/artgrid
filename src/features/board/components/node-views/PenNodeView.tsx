import React from 'react';
import { PenNode } from '../../engine/types';
import { Point } from '../../engine/types';

export const PenNodeView: React.FC<{ node: PenNode }> = ({ node }) => {
  return (
    <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <path
        d={`M ${node.points.map((p: Point) => `${p.x},${p.y}`).join(' L ')}`}
        stroke={node.color || 'var(--accent-primary)'}
        strokeWidth={node.strokeWidth || 4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
