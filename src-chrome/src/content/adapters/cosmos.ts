import type { SiteAdapter, HoveredImage } from './types';

export const CosmosAdapter: SiteAdapter = {
  match(hostname: string) {
    return hostname === 'cosmos.so' || hostname.endsWith('.cosmos.so');
  },
  
  parseHover(target: HTMLElement): HoveredImage | null {
    // Cosmos might use complex shadow DOMs or custom elements, but usually images are standard.
    // We look for a card wrapper or just fallback to image.
    const card = target.closest('[data-cosmos-element]') || target.closest('.element-card') || target.closest('article');
    
    if (!card) return null;

    const img = card.querySelector('img') as HTMLImageElement;
    if (!img || !img.src) return null;

    const rect = img.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 100) return null;

    const alt = img.alt || '';

    // If we can find the Cosmos native quick add button, position exactly over it
    const quickAddBtn = card.querySelector('[data-testid="cosmos-quick-add-button"]') as HTMLElement;
    let targetRect = undefined;
    
    if (quickAddBtn) {
      targetRect = quickAddBtn.getBoundingClientRect();
      
      // Sometimes Cosmos hides buttons with visibility: hidden or opacity: 0 but the rect is still valid.
      // If width/height is 0, we can fall back
      if (targetRect.width === 0 || targetRect.height === 0) {
        const parent = quickAddBtn.parentElement;
        if (parent) {
           const parentRect = parent.getBoundingClientRect();
           if (parentRect.width > 0 && parentRect.height > 0) {
             targetRect = parentRect;
           }
        }
      }
    }

    return {
      src: img.src,
      alt,
      rect,
      targetRect
    };
  }
};
