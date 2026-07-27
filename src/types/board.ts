export type Position = { x: number; y: number };
export type Dimensions = { width: number; height: number };

export type NodeType =
  | 'image'    // Placed media asset (linked, not duplicated)
  | 'text'     // Rich text note / annotation
  | 'shape'    // Rectangle, circle, polygon
  | 'draw'     // Freehand stroke
  | 'link'     // Arrow connection between nodes
  | 'sticky'   // Post-it sticky note
  | 'section'; // Named region / logical workspace section

// zIndex defaults per type — determines render order
export const NODE_DEFAULT_Z: Record<NodeType, number> = {
  section: 0,
  shape:   5,
  image:   10,
  text:    12,
  sticky:  15,
  draw:    20,
  link:    25,
};

export interface BoardNode {
  id: string;
  type: NodeType;
  position: Position;
  dimensions: Dimensions;
  zIndex: number;
  locked: boolean;
  hidden: boolean;

  data: {
    // ── Image ──────────────────────────────────────────────────────────
    assetId?: string;
    url?: string;
    cropMode?: 'cover' | 'contain';

    // ── Text / Sticky / Section title ──────────────────────────────────
    text?: string;
    fontSize?: number;
    fontColor?: string;
    fontBold?: boolean;
    fontItalic?: boolean;

    // ── Shapes & Section borders ───────────────────────────────────────
    shapeType?: 'rectangle' | 'circle' | 'triangle';
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
    fillOpacity?: number;
    cornerRadius?: number;

    // ── Sticky Note ───────────────────────────────────────────────────
    stickyColor?: string;   // hex: '#f9de70', '#f9a8d4', '#6ee7b7', …
    emoji?: string;

    // ── Section specific ──────────────────────────────────────────────
    sectionColor?: string;     // accent colour of the section border/header
    sectionDescription?: string;

    // ── Freehand drawing ──────────────────────────────────────────────
    strokePoints?: Position[];  // stored RELATIVE to node.position (no offset needed)

    // ── Arrow / connection ────────────────────────────────────────────
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
