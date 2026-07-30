import { extractPageMetadata } from './metadata';
import { MediaSidebar } from './sidebar';
import { scanPageMedia } from './scanner';

console.log('ArtGrid Extension Content Script Injected');

let sidebarInstance: MediaSidebar;

function debounce(func: Function, wait: number) {
  let timeout: number | undefined;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
  };
}

const savedPins = new Set<string>();

function markButtonAsSaved(btn: HTMLButtonElement) {
  btn.innerHTML = '✓';
  btn.style.backgroundColor = '#4ade80';
  btn.style.borderColor = '#4ade80';
  btn.style.pointerEvents = 'none';
  btn.onmouseenter = null;
  btn.onmouseleave = null;
  btn.style.transform = 'scale(1)';
}

function getBestImageUrl(imgEl: HTMLImageElement): string {
  const srcset = imgEl.getAttribute('srcset');
  if (!srcset) return imgEl.src;
  const candidates = srcset.split(',').map(s => s.trim().split(' ')[0]);
  const originals = candidates.find(url => url.includes('/originals/'));
  if (originals) return originals;
  
  // Fallback: construct the originals URL
  if (imgEl.src) {
    const constructed = imgEl.src.replace(/\/(236x|474x|736x)\//, '/originals/');
    // Returning the constructed URL (we rely on the backend to fallback if it 404s, 
    // or we can just return it and let the backend try fetching it).
    // The user's snippet suggested falling back, but returning it is standard.
    return constructed;
  }
  
  return candidates[candidates.length - 1]; // last listed is usually highest-res non-original
}

function sendToLocalApp(imageUrl: string, pinId: string | undefined, btn: HTMLButtonElement) {
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite;">↻</span>`;
  btn.style.pointerEvents = 'none';

  const pageMetadata = extractPageMetadata();

  chrome.runtime.sendMessage(
    {
      type: 'SAVE_IMAGE',
      payload: {
        url: imageUrl,
        source: window.location.href,
        metadata: {
          ...pageMetadata,
          pinId: pinId || '',
          capturedAt: Date.now()
        }
      }
    },
    (res) => {
        btn.style.pointerEvents = 'auto';
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        btn.innerHTML = '❌';
        setTimeout(() => btn.innerHTML = originalHtml, 2000);
      } else if (res && res.success) {
        if (pinId) savedPins.add(pinId);
        markButtonAsSaved(btn);
      } else {
        btn.innerHTML = '❌';
        btn.style.backgroundColor = '#f87171'; // error red
        btn.style.borderColor = '#f87171';
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }, 2000);
      }
    }
  );
}

function createButtonHTML(): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
}

function injectDownloadButton(container: HTMLElement) {
  if (container.querySelector('.artgrid-dl-btn')) return; // avoid duplicates
  
  // Find the image wrapper
  let imgWrapper: HTMLElement | null = container.querySelector('[data-test-id="pinrep-image"]');
  
  // For closeup view, the container itself might be the wrapper
  if (!imgWrapper) {
    if (container.getAttribute('data-test-id') === 'closeup-body-image-container' || 
        container.getAttribute('data-test-id') === 'story-pin-image-block') {
      imgWrapper = container;
    }
  }

  if (!imgWrapper) return;

  const btn = document.createElement('button');
  btn.className = 'artgrid-dl-btn';
  btn.style.cssText = `
    position: absolute; 
    top: 12px; 
    left: 12px; 
    z-index: 99999;
    opacity: 1; 
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    backdrop-filter: blur(4px);
  `;
  btn.innerHTML = createButtonHTML();
  
  const pinId = container.closest('[data-test-pin-id]')?.getAttribute('data-test-pin-id');
  
  if (pinId && savedPins.has(pinId)) {
    markButtonAsSaved(btn);
  } else {
    // Hover effects only if not saved
    btn.onmouseenter = () => {
      btn.style.transform = 'scale(1.1)';
      btn.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'scale(1)';
      btn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    };
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const img = imgWrapper?.querySelector('img');
    if (!img) return;
    const url = getBestImageUrl(img);
    sendToLocalApp(url, pinId || undefined, btn);
  });
  
  // Ensure container can hold absolute children so the button positions correctly
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  
  container.appendChild(btn);
}

function scanAndInject(root: HTMLElement | Document = document) {
  // Grid pins
  root.querySelectorAll('[data-test-id="pin"]').forEach(el => injectDownloadButton(el as HTMLElement));
  
  // Closeup view main image
  const closeupImg = root.querySelector(
    '[data-test-id="closeup-body-image-container"], [data-test-id="story-pin-image-block"]'
  ) as HTMLElement;
  if (closeupImg) {
    const container = closeupImg.closest('[data-test-id="closeup-body-image-container"]') || closeupImg;
    injectDownloadButton(container as HTMLElement);
  }
}

// Add CSS animation for spinning
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

const observer = new MutationObserver((mutations) => {
  let hasElement = false;
  for (const m of mutations) {
    if (m.addedNodes.length) {
      if (Array.from(m.addedNodes).some(n => n.nodeType === Node.ELEMENT_NODE)) {
        hasElement = true;
        break;
      }
    }
  }
  if (hasElement) {
    scanAndInject(document);
    rescanMedia();
  }
});

const rescanMedia = debounce(() => {
  if (sidebarInstance) {
    const fresh = scanPageMedia();
    sidebarInstance.mergeNewItems(fresh);
  }
}, 800);

function initObserver() {
  sidebarInstance = new MediaSidebar(() => {
    const fresh = scanPageMedia();
    sidebarInstance.mergeNewItems(fresh);
  });
  
  // Initial scan
  setTimeout(() => {
    const fresh = scanPageMedia();
    sidebarInstance.mergeNewItems(fresh);
  }, 1000);

  chrome.runtime.sendMessage({ type: 'GET_SAVED_PINS' }, (response) => {
    if (response && response.success && response.savedPins) {
      response.savedPins.forEach((id: string) => savedPins.add(id));
    }
    observer.observe(document.body, { childList: true, subtree: true });
    scanAndInject(document); // initial pass
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initObserver);
} else {
  initObserver();
}
