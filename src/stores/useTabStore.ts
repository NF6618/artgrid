import { create } from 'zustand';

export type TabType = 'library' | 'boards' | 'graph' | 'search' | 'favorites' | 'recent' | 'untagged' | 'archive' | 'trash';

export interface AppTab {
  id: string;
  type: TabType;
  title: string;
  collectionId?: string | null;
  tag?: string | null;
  boardId?: string | null;
}

interface TabState {
  tabs: AppTab[];
  activeTabId: string;
  addTab: (tab: Omit<AppTab, 'id'>) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContext: (id: string, context: Partial<AppTab>) => void;
}

export const useTabStore = create<TabState>((set) => ({
  tabs: [{ id: 'default', type: 'library', title: 'Library' }],
  activeTabId: 'default',

  addTab: (tabData) => {
    const id = crypto.randomUUID();
    const newTab: AppTab = { ...tabData, id };
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }));
  },

  closeTab: (id) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      // Ensure at least one tab remains
      if (newTabs.length === 0) {
        const defaultTab: AppTab = { id: 'default', type: 'library', title: 'Library' };
        return { tabs: [defaultTab], activeTabId: 'default' };
      }
      
      let newActiveId = state.activeTabId;
      // If we closed the active tab, switch to the previous one
      if (id === state.activeTabId) {
        const closedIndex = state.tabs.findIndex((t) => t.id === id);
        const nextIndex = Math.max(0, closedIndex - 1);
        newActiveId = newTabs[nextIndex].id;
      }
      return { tabs: newTabs, activeTabId: newActiveId };
    });
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  updateTabContext: (id, context) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...context } : t)),
    }));
  },
}));
