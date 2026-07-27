import { useState, useEffect, useCallback } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { Asset } from '../components/Gallery';

export function useLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [vaultPath, setVaultPath] = useState<string | null>(null);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data: Asset[] = await invoke('get_assets');
      
      const now = Date.now();
      // Convert absolute local paths to asset:// protocol URLs for webview display
      const processedData = data.map(asset => ({
        ...asset,
        url: convertFileSrc(asset.url) + `?t=${now}`
      }));
      
      setAssets(processedData);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Listen for file watcher events from the rust backend
    const unlisten = listen('vault-updated', () => {
      console.log('Vault updated event received, reloading assets...');
      loadAssets();
    });
    
    return () => {
      unlisten.then(f => f());
    };
  }, [loadAssets]);

  const loadVault = async (path: string) => {
    try {
      await invoke('open_vault', { path });
      setVaultPath(path);
      await loadAssets();
    } catch (err) {
      console.error('Failed to load vault:', err);
    }
  };

  const openVault = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select ArtGrid Vault Folder',
      });
      
      if (selected && typeof selected === 'string') {
        await loadVault(selected);
      }
    } catch (err) {
      console.error('Failed to open vault:', err);
    }
  };


  const importFiles = async (explicitPaths?: string[]) => {
    try {
      let files: string[] = [];
      if (explicitPaths && explicitPaths.length > 0) {
        files = explicitPaths;
      } else {
        const selected = await open({
          multiple: true,
          filters: [{
            name: 'Media & Documents',
            extensions: ['png', 'jpeg', 'jpg', 'gif', 'webp', 'bmp', 'pdf', 'txt', 'md']
          }]
        });

        if (!selected) return;
        files = Array.isArray(selected) ? selected : [selected];
      }
      
      setIsLoading(true);
      for (const file of files) {
        await invoke('import_file', { filePath: file });
      }
      
      await loadAssets(); 
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
    loadVault,
    loadAssets,
    importFiles,
    setAssets // For optimistic UI updates like toggling favorites
  };
}
