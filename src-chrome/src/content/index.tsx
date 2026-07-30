import { createRoot } from 'react-dom/client';
import { getActiveAdapter } from './adapters';
import { Overlay } from './Overlay';
import type { HoveredImage } from './Overlay';
// Vite will inject this CSS when building
import '../index.css';

console.log('ArtGrid Extension Content Script Injected');

let hoverTimeout: number | null = null;
let currentTarget: HTMLElement | null = null;
let isHoveringOverlay = false;

const init = () => {
  const rootElement = document.createElement('div');
  rootElement.id = 'artgrid-extension-root';
  // It's critical to make the root container pointer-events-none so it doesn't block the host page,
  // while the overlay child can have pointer-events-auto
  rootElement.style.position = 'fixed';
  rootElement.style.top = '0';
  rootElement.style.left = '0';
  rootElement.style.width = '100vw';
  rootElement.style.height = '100vh';
  rootElement.style.pointerEvents = 'none';
  rootElement.style.zIndex = '2147483647';
  
  const shadowRoot = rootElement.attachShadow({ mode: 'open' });
  
  // Inject Tailwind styles directly into the shadow DOM
  // During dev, Vite handles style injection, but for prod extension we might need to manually inject.
  // For now we assume CRXJS handles it.
  
  const reactContainer = document.createElement('div');
  reactContainer.id = 'artgrid-react-container';
  shadowRoot.appendChild(reactContainer);
  
  document.documentElement.appendChild(rootElement);

  const root = createRoot(reactContainer);
  root.render(<Overlay />);
  
  setupEventDelegation();
};

const dispatchHover = (imageInfo: HoveredImage | null) => {
  window.dispatchEvent(new CustomEvent('artgrid:imageHover', { detail: imageInfo }));
};

const setupEventDelegation = () => {
  const activeAdapter = getActiveAdapter();

  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    let newHoverInfo: HoveredImage | null = null;
    let hoverTarget: HTMLElement | null = null;

    // 1. Try Site-Specific Adapter
    if (activeAdapter) {
      newHoverInfo = activeAdapter.parseHover(target);
      if (newHoverInfo) {
        // Find the topmost container as the target for mouseout to avoid flickering
        hoverTarget = target.closest('[data-test-id="pin"]') || target.closest('.pinWrapper') || target.closest('article') || target;
      }
    }

    // 2. Fallback to standard <img> tag
    if (!newHoverInfo && target.tagName && target.tagName.toLowerCase() === 'img') {
      const img = target as HTMLImageElement;
      
      // Ignore tiny icons or tracking pixels
      if (img.width >= 150 && img.height >= 150) {
        newHoverInfo = {
          src: img.src,
          alt: img.alt || '',
          rect: img.getBoundingClientRect(),
        };
        hoverTarget = img;
      }
    }

    if (newHoverInfo && hoverTarget) {
      currentTarget = hoverTarget;
      
      if (hoverTimeout) clearTimeout(hoverTimeout);
      
      dispatchHover(newHoverInfo);
    }
  }, true);

  document.addEventListener('mouseout', (e) => {
    const target = e.target as HTMLElement;
    if (target === currentTarget) {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      // Give a small grace period to allow moving mouse to the button
      hoverTimeout = window.setTimeout(() => {
        if (!isHoveringOverlay) {
          dispatchHover(null);
          currentTarget = null;
        }
      }, 300) as unknown as number;
    }
  }, true);

  window.addEventListener('artgrid:keepHover' as any, () => {
    isHoveringOverlay = true;
    if (hoverTimeout) clearTimeout(hoverTimeout);
  });
  
  // We need to know when mouse leaves the overlay to hide it
  // But our mouseout above doesn't catch it because it's in shadow DOM.
  // Instead we can listen on document mousemove and see if we are outside both target and button
  document.addEventListener('mousemove', (e) => {
    if (!currentTarget) return;
    
    const rect = currentTarget.getBoundingClientRect();
    const isOverImage = (
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom
    );
    
    // We assume if we are not over image and not triggered 'keepHover' recently, we are out.
    // To handle 'leave button' properly, we reset isHoveringOverlay when moving mouse over document body
    // if it's far from the image.
    if (!isOverImage) {
      // If we are over the button, `isHoveringOverlay` is being actively set.
      // We will reset it via a timeout.
      if (hoverTimeout) clearTimeout(hoverTimeout);
      hoverTimeout = window.setTimeout(() => {
        isHoveringOverlay = false;
        dispatchHover(null);
        currentTarget = null;
      }, 500) as unknown as number;
    } else {
      isHoveringOverlay = false; // back on image
    }
  });
};

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
