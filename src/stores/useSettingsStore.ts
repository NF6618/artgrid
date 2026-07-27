import { create } from 'zustand';
import { load, Store } from '@tauri-apps/plugin-store';

export interface VaultItem {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
}

export interface AppSettings {
  vaultPath: string | null;
  vaults: VaultItem[];
  theme: 'light' | 'dark' | 'system';
  defaultView: string;
  autoWatch: boolean;
  compactMode: boolean;
  bgBaseColor?: string;
  accentColor?: string;
}

interface SettingsState extends AppSettings {
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  addVault: (name: string, path: string) => Promise<void>;
  removeVault: (id: string) => Promise<void>;
}

let storeInstance: Store | null = null;

const defaultSettings: AppSettings = {
  vaultPath: null,
  vaults: [],
  theme: 'dark',
  defaultView: 'library',
  autoWatch: true,
  compactMode: false,
  bgBaseColor: '#0a0a0f',
  accentColor: '#7c6bf0',
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

      // Apply custom colors
      const bgBase = savedSettings?.bgBaseColor || defaultSettings.bgBaseColor;
      const accent = savedSettings?.accentColor || defaultSettings.accentColor;
      if (bgBase) document.documentElement.style.setProperty('--bg-base', bgBase);
      if (accent) document.documentElement.style.setProperty('--accent-primary', accent);

    } catch (err) {
      console.error('Failed to load settings:', err);
      set({ isLoaded: true });
    }
  },

  updateSettings: async (newSettings) => {
    const current = get();
    const updated = {
      vaultPath: current.vaultPath,
      vaults: current.vaults,
      theme: current.theme,
      defaultView: current.defaultView,
      autoWatch: current.autoWatch,
      compactMode: current.compactMode,
      bgBaseColor: current.bgBaseColor,
      accentColor: current.accentColor,
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

    if (newSettings.bgBaseColor) {
      document.documentElement.style.setProperty('--bg-base', newSettings.bgBaseColor);
    }
    if (newSettings.accentColor) {
      document.documentElement.style.setProperty('--accent-primary', newSettings.accentColor);
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
  },

  addVault: async (name: string, path: string) => {
    const current = get();
    // Check if path already exists
    const existing = current.vaults.find(v => v.path === path);
    if (existing) {
      // Just update lastOpened
      const updatedVaults = current.vaults.map(v => 
        v.path === path ? { ...v, name, lastOpened: Date.now() } : v
      );
      await get().updateSettings({ vaults: updatedVaults });
      return;
    }
    
    const newVault: VaultItem = {
      id: crypto.randomUUID(),
      name,
      path,
      lastOpened: Date.now()
    };
    await get().updateSettings({ vaults: [...current.vaults, newVault] });
  },

  removeVault: async (id: string) => {
    const current = get();
    const updatedVaults = current.vaults.filter(v => v.id !== id);
    await get().updateSettings({ vaults: updatedVaults });
  }
}));
