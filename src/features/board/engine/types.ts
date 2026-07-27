export type NodeType = 'image' | 'note' | 'text' | 'shape' | 'arrow' | 'pen' | 'section';

export type ShapeType = 'rectangle' | 'ellipse' | 'rounded';

export type NoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'dark' | 'glass';

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number; // 0.1 to 5.0 (10% to 500%)
}

export type ToolType = 'select' | 'pan' | 'section' | 'note' | 'text' | 'shape' | 'arrow' | 'pen' | 'eraser';

export interface BaseNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees 0-360
  zIndex?: number;
  locked?: boolean;
}

export interface SectionNode extends BaseNode {
  type: 'section';
  title: string;
  color?: string;
  description?: string;
}

export interface ImageNode extends BaseNode {
  type: 'image';
  src: string;
  assetId?: string;
  originalWidth?: number;
  originalHeight?: number;
  crop?: { x: number; y: number; width: number; height: number };
}

export interface NoteNode extends BaseNode {
  type: 'note';
  text: string;
  color: NoteColor;
  fontSize?: number;
}

export interface TextNode extends BaseNode {
  type: 'text';
  text: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
}

export interface ShapeNode extends BaseNode {
  type: 'shape';
  shapeType: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface ArrowNode extends BaseNode {
  type: 'arrow';
  startPoint: Point;
  endPoint: Point;
  color?: string;
  strokeWidth?: number;
  arrowHead?: 'end' | 'both' | 'none';
}

export interface PenNode extends BaseNode {
  type: 'pen';
  points: Point[];
  color: string;
  strokeWidth: number;
}

export type ArtGridNode = ImageNode | NoteNode | TextNode | ShapeNode | ArrowNode | PenNode | SectionNode;

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
