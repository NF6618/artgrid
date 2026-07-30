import React from 'react';
import { ArtGridNode } from '../../engine/types';
import { Asset } from '../../../../components/Gallery';
import { IconPencil } from '../../../../components/Icons';

interface LayersTabProps {
  nodes: ArtGridNode[];
  assets: Asset[];
  standaloneAllAssets: Asset[];
}

export const LayersTab: React.FC<LayersTabProps> = ({
  nodes,
  assets,
  standaloneAllAssets,
}) => {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Active Layers ({nodes.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {nodes.map(node => (
          <div key={node.id} style={{ 
            padding: '10px 14px', 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: '10px', 
            fontSize: '13px', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255,255,255,0.05)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: node.type === 'section' ? '#7c6bf0' : node.type === 'image' ? '#22d3ee' : '#fef08a' }} />
              <span style={{ fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.type.charAt(0).toUpperCase() + node.type.slice(1)} {(node as any).title ? `- ${(node as any).title}` : (node as any).text ? `- ${(node as any).text}` : ''}
              </span>
            </div>
            {node.type === 'image' && (node as any).assetId && (
              <button 
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '11px', 
                  background: 'rgba(124, 107, 240, 0.15)', 
                  color: '#a78bfa', 
                  border: 'none', 
                  borderRadius: 6, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4,
                  cursor: 'pointer',
                }} 
                onClick={(e) => {
                  e.stopPropagation();
                  const ast = assets.find(a => a.id === (node as any).assetId) || standaloneAllAssets.find(a => a.id === (node as any).assetId);
                  if (ast && (window as any).__artgridOpenPreviewAsset) {
                    (window as any).__artgridOpenPreviewAsset(ast, node.id);
                  }
                }}
              >
                <IconPencil size={12} /> Studio
              </button>
            )}
          </div>
        ))}
        {nodes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            No layers on this board.
          </div>
        )}
      </div>
    </div>
  );
};
