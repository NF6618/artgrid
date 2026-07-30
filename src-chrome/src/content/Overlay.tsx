import { useState, useEffect } from 'react';
import { extractPageMetadata } from './metadata';

export interface HoveredImage {
  src: string;
  alt: string;
  rect: DOMRect;
  targetRect?: DOMRect; // Optional explicit rect to position the button over
}

export function Overlay() {
  const [hoveredImage, setHoveredImage] = useState<HoveredImage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const handleImageHover = (e: CustomEvent<HoveredImage | null>) => {
      setHoveredImage(e.detail);
      if (!e.detail) {
        setSaveStatus('idle'); // reset status when hover leaves
      }
    };

    window.addEventListener('artgrid:imageHover' as any, handleImageHover);
    
    // Hide overlay on scroll to prevent detached floating buttons
    const handleScroll = () => setHoveredImage(null);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('artgrid:imageHover' as any, handleImageHover);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!hoveredImage || isSaving) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const pageMetadata = extractPageMetadata();
      
      const response = await fetch('http://localhost:1430/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: hoveredImage.src,
          source: window.location.href,
          metadata: {
            alt: hoveredImage.alt,
            ...pageMetadata
          }
        }),
      });

      if (response.ok) {
        setSaveStatus('success');
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('ArtGrid save error:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      // Hide success message after 2s
      setTimeout(() => setHoveredImage(null), 2000);
    }
  };

  if (!hoveredImage) return null;

  // Calculate position
  // If targetRect is provided (e.g. replacing a specific button), center exactly over it
  // Otherwise, default to top-left of the image
  const useTargetRect = hoveredImage.targetRect && 
                        (hoveredImage.targetRect.width > 0 || hoveredImage.targetRect.height > 0) &&
                        !(hoveredImage.targetRect.top === 0 && hoveredImage.targetRect.left === 0);

  const topPos = useTargetRect 
    ? hoveredImage.targetRect!.top + (hoveredImage.targetRect!.height / 2) - 22
    : hoveredImage.rect.top + 16;
    
  const leftPos = useTargetRect
    ? hoveredImage.targetRect!.left + (hoveredImage.targetRect!.width / 2) - 22
    : hoveredImage.rect.left + 16;

  return (
    <div
      className="fixed z-[2147483647] pointer-events-auto transition-opacity duration-200"
      style={{ top: `${topPos}px`, left: `${leftPos}px` }}
      onMouseEnter={() => {
        // Keep it visible if we hover over the button itself
        const event = new CustomEvent('artgrid:keepHover');
        window.dispatchEvent(event);
      }}
    >
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center justify-center w-11 h-11 text-white bg-black transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-2xl border border-white/20 hover:bg-zinc-900 group"
        title="Save to ArtGrid Vault"
      >
        {isSaving ? (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : saveStatus === 'success' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ) : saveStatus === 'error' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg className="transition-transform group-hover:translate-y-[2px]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        )}
      </button>
    </div>
  );
}
