import React from 'react';
import { Asset } from '../Gallery';
import { FileViewerModal } from '../FileViewerModal';
import { DetailPanel } from '../DetailPanel';

interface StandaloneLayoutProps {
  standaloneAsset: Asset | null;
  standaloneAllAssets: Asset[];
  standaloneDetailVisible: boolean;
  setStandaloneAsset: (asset: Asset) => void;
  loadStandaloneAssets: () => Promise<void>;
  setStandaloneDetailVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const StandaloneLayout: React.FC<StandaloneLayoutProps> = ({
  standaloneAsset,
  standaloneAllAssets,
  standaloneDetailVisible,
  setStandaloneAsset,
  loadStandaloneAssets,
  setStandaloneDetailVisible,
}) => {
  const handleStandaloneSelectAsset = (asset: Asset) => {
    setStandaloneAsset(asset);
  };

  const handleStandaloneAssetsUpdated = async () => {
    await loadStandaloneAssets();
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden', display: 'flex' }}>
      {/* Main Viewer Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {standaloneAsset ? (
          <FileViewerModal
            asset={standaloneAsset}
            allAssets={standaloneAllAssets}
            visible={true}
            isPopOutWindow={false}
            onClose={async () => {
              try {
                const { getCurrentWindow } = await import('@tauri-apps/api/window');
                await getCurrentWindow().close();
              } catch (e) {
                window.close();
              }
            }}
            onSelectAsset={handleStandaloneSelectAsset}
            onAssetsUpdated={handleStandaloneAssetsUpdated}
            onToggleDetail={() => setStandaloneDetailVisible(v => !v)}
            showDetailToggle={true}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
            <span>Loading media preview...</span>
          </div>
        )}
      </div>

      {/* Detail Editor Sidebar */}
      {standaloneDetailVisible && (
        <div style={{ width: 300, minWidth: 300, height: '100vh', overflow: 'hidden', borderLeft: '1px solid var(--border-subtle)' }}>
          <DetailPanel
            asset={standaloneAsset}
            visible={true}
            onClose={() => setStandaloneDetailVisible(false)}
            onAssetsUpdated={handleStandaloneAssetsUpdated}
          />
        </div>
      )}
    </div>
  );
};
