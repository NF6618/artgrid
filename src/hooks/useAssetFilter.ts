import { useMemo, useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { api } from '../services/api';
import { Asset } from '../components/Gallery';
import { TabType } from '../stores/useTabStore';

interface UseAssetFilterProps {
  assets: Asset[];
  activeView: TabType;
  activeCollection: string | null;
  activeTag: string | null;
  filterType: string;
  colorFilter: string;
  sortBy: string;
  searchQuery: string;
  boardSearchQuery: string;
  boardCategoryFilter: string;
  boardSortBy: string;
}

export const useAssetFilter = ({
  assets,
  activeView,
  activeCollection,
  activeTag,
  filterType,
  colorFilter,
  sortBy,
  searchQuery,
  boardSearchQuery,
  boardCategoryFilter,
  boardSortBy,
}: UseAssetFilterProps) => {
  const [backendSearchResults, setBackendSearchResults] = useState<Asset[] | null>(null);

  useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) {
      setBackendSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const rawResults = await api.searchAssets(searchQuery.trim(), 50);
        const now = Date.now();
        const processed: Asset[] = rawResults.map((item: any) => ({
          ...item,
          url: item.url ? convertFileSrc(item.url) + `?t=${now}` : '',
          thumbnail_url: item.thumbnail_url ? convertFileSrc(item.thumbnail_url) + `?t=${now}` : undefined,
        }));
        setBackendSearchResults(processed);
      } catch (err) {
        console.error('Failed to execute search:', err);
        setBackendSearchResults(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredAssets = useMemo(() => {
    let result = backendSearchResults !== null ? backendSearchResults : assets;

    if (activeView === 'trash') {
      result = result.filter(a => a.trashed);
    } else if (activeView === 'archive') {
      result = result.filter(a => a.archived && !a.trashed);
    } else {
      result = result.filter(a => !a.trashed && !a.archived);
    }

    if (activeCollection) {
      result = result.filter(a => a.collections && a.collections.includes(activeCollection));
    }
    
    if (activeTag) {
      result = result.filter(a => a.tags && a.tags.includes(activeTag));
    }

    if (filterType !== 'all') {
      if (filterType === 'image') result = result.filter(a => a.type && a.type.startsWith('image/'));
      else if (filterType === 'pdf') result = result.filter(a => a.type && (a.type === 'application/pdf' || a.filename.toLowerCase().endsWith('.pdf')));
      else if (filterType === 'text') result = result.filter(a => a.type && a.type.startsWith('text/'));
    }

    if (colorFilter !== 'all') {
      result = result.filter(a => {
        if (!(a as any).color_profile) return false;
        try {
          const parsed = JSON.parse((a as any).color_profile);
          return parsed.temperature === colorFilter;
        } catch {
          return false;
        }
      });
    }
    
    if (activeView === 'favorites') {
      result = result.filter(a => a.favorite);
    } else if (activeView === 'untagged') {
      result = result.filter(a => !a.tags || a.tags.length === 0);
    } else if (activeView === 'recent') {
      result = [...result].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    }

    if (backendSearchResults === null) {
      if (sortBy === 'name') {
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === 'size') {
        result = [...result].sort((a, b) => (parseFloat(b.size) || 0) - (parseFloat(a.size) || 0));
      } else if (sortBy === 'dimensions') {
        result = [...result].sort((a, b) => (b.width * b.height) - (a.width * a.height));
      }

      if (searchQuery) {
        result = result.filter(a =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.tags && a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) ||
          a.filename.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }

    return result;
  }, [assets, backendSearchResults, activeView, activeCollection, activeTag, filterType, colorFilter, sortBy, searchQuery]);

  const boardFilteredAssets = useMemo(() => {
    let result = assets.filter(a => !a.trashed && !a.archived);
    if (boardSearchQuery) {
      result = result.filter(a =>
        a.title.toLowerCase().includes(boardSearchQuery.toLowerCase()) ||
        a.filename.toLowerCase().includes(boardSearchQuery.toLowerCase()) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(boardSearchQuery.toLowerCase())))
      );
    }
    if (boardCategoryFilter !== 'all') {
      result = result.filter(a => a.collections && a.collections.includes(boardCategoryFilter));
    }
    if (boardSortBy === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (boardSortBy === 'size') {
      result = [...result].sort((a, b) => (parseFloat(b.size) || 0) - (parseFloat(a.size) || 0));
    } else {
      result = [...result].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    }
    return result;
  }, [assets, boardSearchQuery, boardCategoryFilter, boardSortBy]);

  return { filteredAssets, boardFilteredAssets };
};

