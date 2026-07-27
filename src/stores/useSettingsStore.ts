import { create } from 'zustand';
import { load, Store } from '@tauri-apps/plugin-store';

export interface AppSettings {
  vaultPath: string | null;
  theme: 'light' | 'dark' | 'system';
  defaultView: string;
  autoWatch: boolean;
  compactMode: boolean;
}

interface SettingsState extends AppSettings {
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

let storeInstance: Store | null = null;

const defaultSettings: AppSettings = {
  vaultPath: null,
  theme: 'dark',
  defaultView: 'library',
  autoWatch: true,
  compactMode: false,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultSettings,
  isLoaded: false,

  loadSettings: async () => {
    try {
      if (!storeInstance) {
        storeInstance = await load('settings.json', { autoSave: true });
      }
      
      const savedSettings = await storeInstance.get<Partial<AppSettings>>('app_settings');
      
      set({ 
        ...defaultSettings,
        ...(savedSettings || {}),
        isLoaded: true 
      });
      
      // Apply theme
      const theme = savedSettings?.theme || defaultSettings.theme;
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }

    } catch (err) {
      console.error('Failed to load settings:', err);
      set({ isLoaded: true });
    }
  },

  updateSettings: async (newSettings) => {
    const current = get();
    const updated = {
      vaultPath: current.vaultPath,
      theme: current.theme,
      defaultView: current.defaultView,
      autoWatch: current.autoWatch,
      compactMode: current.compactMode,
      ...newSettings,
    };
    
    set(updated);
    
    // Apply theme changes dynamically
    if (newSettings.theme) {
      const theme = newSettings.theme;
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }

    try {
      if (!storeInstance) {
        storeInstance = await load('settings.json', { autoSave: true });
      }
      await storeInstance.set('app_settings', updated);
      await storeInstance.save();
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }
}));
