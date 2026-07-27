import { Asset } from '../Gallery';
import { ReactNode } from 'react';

export interface ViewerProps {
  asset: Asset;
  resolvedUrl: string;
  onAssetsUpdated?: () => void;
  // Viewers can expose their specific toolbar controls here
  setViewerControls?: (controls: ReactNode) => void;
}
