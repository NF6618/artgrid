import React from 'react';
import { ArtGridNode } from '../../engine/types';

interface SelectionOverlayProps {
  node: ArtGridNode;
  onResizeHandleDown: (e: React.PointerEvent, handle: string, node: ArtGridNode) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ node, onResizeHandleDown }) => {
  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  return (
    <>
      {handles.map(handle => {
        let cursor = 'nwse-resize';
        let top: number | string = 0;
        let left: number | string = 0;

        if (handle === 'nw') { top = -6; left = -6; cursor = 'nwse-resize'; }
        if (handle === 'n') { top = -6; left = '50%'; cursor = 'ns-resize'; }
        if (handle === 'ne') { top = -6; left = '100%'; cursor = 'nesw-resize'; }
        if (handle === 'e') { top = '50%'; left = '100%'; cursor = 'ew-resize'; }
        if (handle === 'se') { top = '100%'; left = '100%'; cursor = 'nwse-resize'; }
        if (handle === 's') { top = '100%'; left = '50%'; cursor = 'ns-resize'; }
        if (handle === 'sw') { top = '100%'; left = -6; cursor = 'nesw-resize'; }
        if (handle === 'w') { top = '50%'; left = -6; cursor = 'ew-resize'; }

        return (
          <div
            key={handle}
            onPointerDown={e => onResizeHandleDown(e, handle, node)}
            style={{
              position: 'absolute',
              top,
              left,
              transform: 'translate(-50%, -50%)',
              width: 12,
              height: 12,
              background: '#fff',
              border: '2px solid var(--accent-primary)',
              borderRadius: '50%',
              cursor,
              zIndex: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              transition: 'transform 0.1s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.3)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
          />
        );
      })}
    </>
  );
};
