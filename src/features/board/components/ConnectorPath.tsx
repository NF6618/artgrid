import React from 'react';
import { ArrowNode, ArtGridNode, Point } from '../engine/types';

interface ConnectorPathProps {
  arrow: ArrowNode;
  nodes: ArtGridNode[];
}

export const ConnectorPath: React.FC<ConnectorPathProps> = ({ arrow, nodes }) => {
  // Compute start and end points based on anchored nodes if they exist
  let startP = arrow.startPoint;
  let endP = arrow.endPoint;

  if (arrow.startNodeId) {
    const startNode = nodes.find(n => n.id === arrow.startNodeId);
    if (startNode) {
      startP = getAnchorPoint(startNode, arrow.startAnchor || 'center');
    }
  }

  if (arrow.endNodeId) {
    const endNode = nodes.find(n => n.id === arrow.endNodeId);
    if (endNode) {
      endP = getAnchorPoint(endNode, arrow.endAnchor || 'center');
    }
  }

  // Calculate Bezier control points for a smooth cubic curve
  // We use a simple heuristic: control points extend horizontally or vertically
  // depending on the relative positions to create an elegant routing.
  const dx = endP.x - startP.x;
  const dy = endP.y - startP.y;
  
  // Factor controls how "bendy" the curve is. 
  // We use 0.5 of the distance to give a nice S-curve.
  const curveFactor = Math.max(Math.abs(dx), Math.abs(dy)) * 0.4;
  
  // Decide routing direction (horizontal vs vertical S-curve)
  const isHorizontal = Math.abs(dx) > Math.abs(dy);
  
  let cp1x = startP.x, cp1y = startP.y;
  let cp2x = endP.x, cp2y = endP.y;

  if (isHorizontal) {
    cp1x += curveFactor * Math.sign(dx);
    cp2x -= curveFactor * Math.sign(dx);
  } else {
    cp1y += curveFactor * Math.sign(dy);
    cp2y -= curveFactor * Math.sign(dy);
  }

  const d = `M ${startP.x} ${startP.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endP.x} ${endP.y}`;

  const color = arrow.color || '#e2e8f0';
  const strokeWidth = arrow.strokeWidth || 2;

  return (
    <g className="connector-path">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Arrowhead at the end */}
      {arrow.arrowHead !== 'none' && (
        <path
          d={getArrowheadPath(cp2x, cp2y, endP.x, endP.y, strokeWidth)}
          fill={color}
        />
      )}
      {/* Optional start arrowhead */}
      {arrow.arrowHead === 'both' && (
        <path
          d={getArrowheadPath(cp1x, cp1y, startP.x, startP.y, strokeWidth)}
          fill={color}
        />
      )}
    </g>
  );
};

function getAnchorPoint(node: ArtGridNode, anchor: 'top' | 'right' | 'bottom' | 'left' | 'center'): Point {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  
  switch (anchor) {
    case 'top': return { x: cx, y: node.y };
    case 'bottom': return { x: cx, y: node.y + node.height };
    case 'left': return { x: node.x, y: cy };
    case 'right': return { x: node.x + node.width, y: cy };
    case 'center':
    default:
      return { x: cx, y: cy };
  }
}

function getArrowheadPath(cx: number, cy: number, ex: number, ey: number, strokeWidth: number): string {
  // Calculate angle of the curve as it approaches the end point
  const angle = Math.atan2(ey - cy, ex - cx);
  const size = 6 + strokeWidth * 2;
  
  // Point 1 (tip)
  const tipX = ex;
  const tipY = ey;
  
  // Point 2 (left wing)
  const leftAngle = angle - Math.PI / 6;
  const leftX = ex - size * Math.cos(leftAngle);
  const leftY = ey - size * Math.sin(leftAngle);
  
  // Point 3 (right wing)
  const rightAngle = angle + Math.PI / 6;
  const rightX = ex - size * Math.cos(rightAngle);
  const rightY = ey - size * Math.sin(rightAngle);
  
  return `M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
}
