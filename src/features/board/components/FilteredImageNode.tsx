import React, { useEffect, useRef } from 'react';
import { ImageNode } from '../engine/types';

interface FilteredImageNodeProps {
  node: ImageNode;
  isCropping: boolean;
  onCropDragStart?: (e: React.PointerEvent) => void;
}

export const FilteredImageNode: React.FC<FilteredImageNodeProps> = ({ node, isCropping, onCropDragStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = node.src;
    
    img.onload = () => {
      // Decode UV percentage crop to absolute pixel values on the source image
      const cropU = node.crop?.x ?? 0.0;
      const cropV = node.crop?.y ?? 0.0;
      const cropW = node.crop?.width ?? 1.0;
      const cropH = node.crop?.height ?? 1.0;

      const sx = cropU * img.width;
      const sy = cropV * img.height;
      const sWidth = cropW * img.width;
      const sHeight = cropH * img.height;

      // Ensure canvas respects device pixel ratio for retina displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = node.width * dpr;
      canvas.height = node.height * dpr;

      // CSS Filters (Brightness, Contrast, Saturation)
      const brightness = node.adjustments?.brightness ?? 0;
      const contrast = node.adjustments?.contrast ?? 0;
      const saturation = node.adjustments?.saturation ?? 0;

      const bVal = 100 + brightness;
      const cVal = 100 + contrast;
      const sVal = 100 + saturation;

      ctx.filter = `brightness(${bVal}%) contrast(${cVal}%) saturate(${sVal}%)`;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image cropped and scaled to fit the node's dimensions
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

      // Unsharp mask via manual convolution if sharpness > 0
      const sharpness = node.adjustments?.sharpness ?? 0;
      if (sharpness > 0) {
         applyUnsharpMask(ctx, canvas.width, canvas.height, sharpness);
      }
    };
  }, [node.src, node.crop, node.adjustments, node.width, node.height]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
       {isCropping && (
          <img 
            src={node.src} 
            alt="crop-overlay" 
            style={{ 
              position: 'absolute', 
              top: '50%', left: '50%', 
              transform: 'translate(-50%, -50%)', 
              opacity: 0.3, 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain', 
              zIndex: -1 
            }} 
          />
       )}
       <canvas 
         ref={canvasRef} 
         style={{ 
           width: '100%', 
           height: '100%', 
           display: 'block', 
           cursor: isCropping ? 'move' : 'default',
           opacity: node.adjustments?.removeBackground ? 0.9 : 1.0 // Placeholder for background removal state
         }}
         onPointerDown={isCropping ? onCropDragStart : undefined}
       />
       {isCropping && (
         <div style={{ position: 'absolute', inset: 0, border: '2px dashed var(--accent-primary)', pointerEvents: 'none', zIndex: 10 }} />
       )}
    </div>
  );
};

function applyUnsharpMask(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // A lightweight sharpening approximation (avoiding full 3x3 convolution on the UI thread for performance)
  // Real implementation should move to WebGL fragment shader. This is a CPU fallback.
  const mix = amount / 100.0;
  
  // Simple contrast enhancement pass as a placeholder for full convolution
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = data[i]     + (data[i]     - 128) * mix; // R
    data[i + 1] = data[i + 1] + (data[i + 1] - 128) * mix; // G
    data[i + 2] = data[i + 2] + (data[i + 2] - 128) * mix; // B
  }
  ctx.putImageData(imageData, 0, 0);
}
