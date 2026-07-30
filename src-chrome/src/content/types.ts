export type MediaKind = 'image' | 'video' | 'gif';

export interface AltFormat {
  kind: MediaKind;
  url: string;
}

export interface MediaEntry {
  id: string;
  kind: MediaKind;
  thumbSrc: string;
  bestSrc: string | null;
  resolutionKnown?: { w: number, h: number } | null;
  displaySize: { w: number, h: number };
  filename: string;
  domRef: WeakRef<HTMLElement>;
  sourceContext?: string | null;
  
  // Video specifics
  altFormats?: AltFormat[];
  duration?: number | null;
  isStreamOnly?: boolean;
  unresolvable?: boolean;
  reason?: string;
  
  // Deduplication
  duplicateCount: number;
  pairedWith?: string;
  isNonPrimaryDuplicate?: boolean;
}
