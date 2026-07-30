export interface HoveredImage {
  src: string;
  alt: string;
  rect: DOMRect;
  targetRect?: DOMRect;
}

export interface SiteAdapter {
  /**
   * Returns true if this adapter should run on the current hostname.
   */
  match(hostname: string): boolean;
  
  /**
   * Given a hovered DOM element (which might be an overlay or wrapper),
   * returns the image information if a valid image is found, or null.
   */
  parseHover(target: HTMLElement): HoveredImage | null;
}
