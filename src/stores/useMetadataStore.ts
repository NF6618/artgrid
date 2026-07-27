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
  collection_id?: string | null;
}

interface MetadataState {
  collections: Collection[];
  tags: Tag[];
  tagCategoryMap: Record<string, string>; // Maps tagName -> collectionId
  isLoading: boolean;
  loadMetadata: () => Promise<void>;
  createCollection: (name: string, color: string, parent_id?: string) => Promise<Collection>;
  createTag: (name: string, collectionId?: string) => Promise<Tag>;
  associateTagWithCollection: (tagName: string, collectionId: string | null) => void;
  addTagToAsset: (assetId: string, tagName: string) => Promise<Tag>;
  removeTagFromAsset: (assetId: string, tagName: string) => Promise<void>;
  addAssetToCollection: (assetId: string, collectionId: string) => Promise<void>;
  removeAssetFromCollection: (assetId: string, collectionId: string) => Promise<void>;
}

export const useMetadataStore = create<MetadataState>((set, get) => ({
  collections: [],
  tags: [],
  tagCategoryMap: {},
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

  createTag: async (name, collectionId) => {
    const tag: Tag = await invoke('add_tag_to_asset', { assetId: '', tagName: name });
    if (collectionId) {
      get().associateTagWithCollection(name, collectionId);
    }
    await get().loadMetadata();
    return tag;
  },

  associateTagWithCollection: (tagName, collectionId) => {
    set(state => {
      const updatedMap = { ...state.tagCategoryMap };
      if (collectionId) {
        updatedMap[tagName] = collectionId;
      } else {
        delete updatedMap[tagName];
      }
      return { tagCategoryMap: updatedMap };
    });
  },

  addTagToAsset: async (assetId, tagName) => {
    const tag: Tag = await invoke('add_tag_to_asset', { assetId, tagName });
    await get().loadMetadata();
    return tag;
  },

  removeTagFromAsset: async (assetId, tagName) => {
    await invoke('remove_tag_from_asset', { assetId, tagName });
    await get().loadMetadata();
  },

  addAssetToCollection: async (assetId, collectionId) => {
    await invoke('add_asset_to_collection', { assetId, collectionId });
    await get().loadMetadata();
  },

  removeAssetFromCollection: async (assetId, collectionId) => {
    await invoke('remove_asset_from_collection', { assetId, collectionId });
    await get().loadMetadata();
  }
}));

function buildCollectionTree(collections: Collection[]): Collection[] {
  const map = new Map<string, Collection>();
  const roots: Collection[] = [];

  collections.forEach(col => {
    map.set(col.id, { ...col, children: [] });
  });

  collections.forEach(col => {
    const node = map.get(col.id)!;
    if (col.parent_id && map.has(col.parent_id)) {
      map.get(col.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
