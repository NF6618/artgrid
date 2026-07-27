import { useState, useEffect, useCallback } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Asset } from '../components/Gallery';

export function useLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [vaultPath, setVaultPath] = useState<string | null>(null);

  const openVault = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select ArtGrid Vault Folder',
      });
      
      if (selected && typeof selected === 'string') {
        await invoke('open_vault', { path: selected });
        setVaultPath(selected);
        await loadAssets();
      }
    } catch (err) {
      console.error('Failed to open vault:', err);
    }
  };

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data: Asset[] = await invoke('get_assets');
      
      // Convert absolute local paths to asset:// protocol URLs for webview display
      const processedData = data.map(asset => ({
        ...asset,
        url: convertFileSrc(asset.url)
      }));
      
      setAssets(processedData);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpeg', 'jpg', 'gif', 'webp', 'bmp']
        }]
      });

      if (!selected) return;
      
      const files = Array.isArray(selected) ? selected : [selected];
      
      setIsLoading(true);
      for (const file of files) {
        await invoke('import_file', { filePath: file });
      }
      
      await loadAssets(); // Refresh library after import
    } catch (err) {
      console.error('Failed to import files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    assets,
    isLoading,
    vaultPath,
    openVault,
    loadAssets,
    importFiles,
    setAssets // For optimistic UI updates like toggling favorites
  };
}
