import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface Collection {
  id: string;
  name: string;
  color: string;
  parent_id?: string;
  count?: number; 
  children?: Collection[];
}

export interface Tag {
  id: string;
  name: string;
}

interface MetadataState {
  collections: Collection[];
  tags: Tag[];
  isLoading: boolean;
  loadMetadata: () => Promise<void>;
  createCollection: (name: string, color: string, parent_id?: string) => Promise<Collection>;
  addTagToAsset: (assetId: string, tagName: string) => Promise<Tag>;
}

export const useMetadataStore = create<MetadataState>((set, get) => ({
  collections: [],
  tags: [],
  isLoading: false,

  loadMetadata: async () => {
    set({ isLoading: true });
    try {
      const collections: Collection[] = await invoke('get_collections');
      const tags: Tag[] = await invoke('get_tags');
      
      const collectionTree = buildCollectionTree(collections);

      set({ collections: collectionTree, tags, isLoading: false });
    } catch (err) {
      console.error('Failed to load metadata', err);
      set({ isLoading: false });
    }
  },

  createCollection: async (name, color, parent_id) => {
    const newCollection: Collection = await invoke('create_collection', { name, color, parentId: parent_id });
    await get().loadMetadata();
    return newCollection;
  },

  addTagToAsset: async (assetId, tagName) => {
    const tag: Tag = await invoke('add_tag_to_asset', { assetId, tagName });
    await get().loadMetadata();
    return tag;
  }
}));

function buildCollectionTree(collections: Collection[]): Collection[] {
  const map = new Map<string, Collection>();
  const roots: Collection[] = [];

  collections.forEach(c => {
    map.set(c.id, { ...c, children: [], count: 0 }); // Default count to 0
  });

  collections.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
