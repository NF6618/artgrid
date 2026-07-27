export type Position = {
  x: number;
  y: number;
};

export type Dimensions = {
  width: number;
  height: number;
};

export type NodeType = 'image' | 'text' | 'shape';

export interface BoardNode {
  id: string;
  type: NodeType;
  position: Position;
  dimensions: Dimensions;
  
  // Node-specific data
  data: {
    // For images, this links back to an asset in the library
    assetId?: string;
    url?: string;
    
    // For text nodes
    text?: string;
    fontSize?: number;
    color?: string;
    
    // For shapes
    shapeType?: 'rectangle' | 'circle' | 'line';
  };
}

export interface Board {
  id: string;
  title: string;
  nodes: BoardNode[];
  createdAt: number;
  updatedAt: number;
}
