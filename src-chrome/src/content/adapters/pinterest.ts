import type { SiteAdapter } from './types';
import type { HoveredImage } from '../Overlay';

export const PinterestAdapter: SiteAdapter = {
  match(hostname: string) {
    return hostname.includes('pinterest.'); // matches pinterest.com, pinterest.co.uk, br.pinterest.com, etc.
  },
  
  parseHover(target: HTMLElement): HoveredImage | null {
    // On Pinterest, the user often hovers over a clickable overlay div, not the image itself.
    // The closest wrapper for a pin is often [data-test-id="pin"] or a specific class.
    // We can also just look for the closest container that holds an image.
    const pinContainer = target.closest('[data-test-id="pin"]') || target.closest('.pinWrapper') || target.closest('[data-test-id="pin-visual-wrapper"]');
    
    if (!pinContainer) return null;

    const img = pinContainer.querySelector('img') as HTMLImageElement;
    if (!img || !img.src) return null;

    // Convert Pinterest thumbnail URL to high-res original
    // e.g., https://i.pinimg.com/236x/ab/cd/ef/... -> https://i.pinimg.com/originals/ab/cd/ef/...
    const rect = img.getBoundingClientRect();
    
    // Ignore tiny images
    if (rect.width < 100 || rect.height < 100) return null;

    // Pinterest provides multiple resolutions in srcset.
    // Example: "https://i.pinimg.com/736x/... 736w, https://i.pinimg.com/1200x/... 1200w"
    let highResUrl = img.src;
    
    if (img.srcset) {
      const sources = img.srcset.split(',').map(s => s.trim().split(' '));
      // Sort by width descending
      sources.sort((a, b) => {
        const widthA = parseInt(a[1]) || 0;
        const widthB = parseInt(b[1]) || 0;
        return widthB - widthA;
      });
      if (sources.length > 0 && sources[0][0]) {
        highResUrl = sources[0][0];
      }
    } else {
      // Fallback: guess the original URL if srcset is missing
      highResUrl = img.src.replace(/\/(236x|474x|736x)\//, '/originals/');
    }

    // Pinterest alt tags usually contain the pin description
    const alt = img.alt || img.getAttribute('title') || '';

    // If we can find the "View larger" button or "Save" button wrapper, use it for exact positioning
    const viewLargerBtn = pinContainer.querySelector('[data-test-id="media-viewer-button"], [aria-label="View larger"]') as HTMLElement;
    let targetRect = undefined;
    
    if (viewLargerBtn) {
      targetRect = viewLargerBtn.getBoundingClientRect();
      // If it's 0 width/height (hidden by animation), walk up to a visible parent
      if (targetRect.width === 0 || targetRect.height === 0) {
        const parent = viewLargerBtn.parentElement;
        if (parent) {
           const parentRect = parent.getBoundingClientRect();
           if (parentRect.width > 0 && parentRect.height > 0) {
             targetRect = parentRect;
           }
        }
      }
    }

    return {
      src: highResUrl,
      alt,
      rect,
      targetRect
    };
  }
};
