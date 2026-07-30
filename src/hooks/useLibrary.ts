import { useState, useEffect, useCallback } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { api } from '../services/api';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { Asset, Folder } from '../components/Gallery';
import { useSettingsStore } from '../stores/useSettingsStore';

import { useBoardStore } from '../stores/useBoardStore';
import { useMetadataStore } from '../stores/useMetadataStore';

export function useLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [vaultPath, setVaultPath] = useState<string | null>(null);

  const loadAssets = useCallback(async (isBackground: boolean = false) => {
    if (isBackground) setIsBackgroundRefreshing(true);
    else setIsLoading(true);
    
    try {
      const data: Asset[] = await api.getAssets();
      const folderData: Folder[] = await api.getFolders();
      
      const now = Date.now();
      // Convert absolute local paths to asset:// protocol URLs for webview display
      const processedData = data.map(asset => ({
        ...asset,
        url: convertFileSrc(asset.url) + `?t=${now}`,
        thumbnail_url: asset.thumbnail_url ? convertFileSrc(asset.thumbnail_url) + `?t=${now}` : undefined
      }));
      
      setAssets(processedData);
      setFolders(folderData);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      if (isBackground) setIsBackgroundRefreshing(false);
      else setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let timeoutId: number | undefined;
    
    // Listen for file watcher events from the rust backend
    const unlisten = listen('vault-updated', () => {
      console.log('Vault updated event received, queuing asset reload...');
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        loadAssets(true); // background refresh
      }, 500);
    });
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      unlisten.then(f => f());
    };
  }, [loadAssets]);

  const loadVault = useCallback(async (path: string, resetSchema = false) => {
    setIsLoading(true);
    try {
      if (resetSchema) {
        await api.openVaultWithOptions(path, true);
      } else {
        await api.openVault(path);
      }
      setVaultPath(path);
      await loadAssets();
      useBoardStore.getState().loadBoards();
      useMetadataStore.getState().loadMetadata();
    } catch (err) {
      console.error('Failed to load vault:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadAssets]);

  const createVault = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      await api.createVault(path);
      setVaultPath(path);
      await loadAssets();
    } catch (err) {
      console.error('Failed to create vault:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadAssets]);

  const openVault = useCallback(async () => {
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
  }, [loadVault]);

  const scanVaultMedia = useCallback(async () => {
    try {
      const added: number = await api.scanVaultMedia();
      if (added > 0) {
        await loadAssets();
      }
      return added;
    } catch (err) {
      console.error('Failed to scan vault media:', err);
      return 0;
    }
  }, [loadAssets]);

  const importFiles = async (explicitPaths?: string[], targetVaultPath?: string, targetFolderId?: string) => {
    try {
      if (targetVaultPath && targetVaultPath !== vaultPath) {
        await loadVault(targetVaultPath);
      }

      let files: string[] = [];
      if (explicitPaths && explicitPaths.length > 0) {
        files = explicitPaths;
      } else {
        const selected = await open({
          multiple: true,
          filters: [{
            name: 'Media & Documents',
            extensions: ['png', 'jpeg', 'jpg', 'gif', 'webp', 'bmp', 'pdf', 'txt', 'md', 'docx', 'doc']
          }]
        });

        if (!selected) return;
        files = Array.isArray(selected) ? selected : [selected];
      }
      
      if (files.length === 0) return;

      setIsLoading(true);
      const moveFiles = useSettingsStore.getState().importMode === 'move';

      await api.importBatchFiles(files, moveFiles, targetFolderId || null);

      await loadAssets(); 
    } catch (err) {
      console.error('Failed to import files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    assets,
    folders,
    isLoading,
    isBackgroundRefreshing,
    vaultPath,
    openVault,
    createVault,
    loadVault,
    loadAssets,
    scanVaultMedia,
    importFiles,
    setAssets,
    setVaultPath
  };
}
