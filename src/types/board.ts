export type Position = {
  x: number;
  y: number;
};

export type Dimensions = {
  width: number;
  height: number;
};

export type NodeType = 'image' | 'text' | 'shape' | 'draw' | 'link';

export interface BoardNode {
  id: string;
  type: NodeType;
  position: Position;
  dimensions: Dimensions;
  
  // Node-specific data
  data: {
    // For images
    assetId?: string;
    url?: string;
    
    // For text nodes
    text?: string;
    fontSize?: number;
    color?: string;
    
    // For shapes
    shapeType?: 'rectangle' | 'circle';
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
    fillOpacity?: number;
    cornerRadius?: number;
    
    // For freehand drawing
    strokePoints?: Position[];
    
    // For arrow/edge connections
    connectedNodeId?: string;
  };
}

export interface Board {
  id: string;
  title: string;
  nodes: BoardNode[];
  createdAt: number;
  updatedAt: number;
}
