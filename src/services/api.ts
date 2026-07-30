import { invoke } from '@tauri-apps/api/core';

import { Asset, Folder } from '../components/Gallery';

export const api = {
  // Library operations
  getAssets: async (): Promise<Asset[]> => await invoke('get_assets'),
  getFolders: async (): Promise<Folder[]> => await invoke('get_folders'),
  importFromUrl: async (url: string) => await invoke('import_from_url', { url }),
  toggleFavorite: async (id: string) => await invoke('toggle_favorite', { id }),
  renameAsset: async (id: string, newTitle: string, newFilename: string) => 
    await invoke('rename_asset', { id, newTitle, newFilename }),
  trashAsset: async (id: string, trashed: boolean) => 
    await invoke('trash_asset', { id, trashed }),
  archiveAsset: async (id: string, archived: boolean) =>
    await invoke('archive_asset', { id, archived }),
  
  // Folder operations
  createFolder: async (name: string, parentId: string | null) => 
    await invoke('create_folder', { name, parentId }),
  
  // Vault operations
  createVault: async (path: string) => await invoke('create_vault', { path }),
  openVault: async (path: string) => 
    await invoke('open_vault', { path }),
  openVaultWithOptions: async (path: string, resetSchema: boolean) => 
    await invoke('open_vault_with_options', { path, resetSchema }),
  scanVaultMedia: async (): Promise<number> => await invoke('scan_vault_media'),
  importBatchFiles: async (files: string[], moveFiles: boolean, folderId: string | null) =>
    await invoke('import_batch_files', { files, moveFiles, folderId }),

  
  // Metadata operations
  addTag: async (assetId: string, tag: string) => await invoke('add_tag', { assetId, tag }),
  removeTag: async (assetId: string, tag: string) => await invoke('remove_tag', { assetId, tag }),
  updateNotes: async (assetId: string, notes: string) => await invoke('update_notes', { assetId, notes }),
  searchAssets: async (query: string, limit: number = 50): Promise<any[]> => 
    await invoke('search_assets', { query, limit }),
};
