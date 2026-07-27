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
  bgSecondaryColor?: string;
  accentColor?: string;
  textPrimaryColor?: string;
  fontFamily?: string;
  fontSizeScale?: 'sm' | 'md' | 'lg';
  sidebarBgColor?: string;
  sidebarTextColor?: string;
  sidebarFontFamily?: string;
  tldrawTheme?: 'dark' | 'light' | 'match';
  tldrawGridStyle?: 'dots' | 'lines' | 'none';
  tldrawSnapToGrid?: boolean;
  importMode?: 'copy' | 'move';
  enableVerboseLogging?: boolean;
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
  importMode: 'copy',
  enableVerboseLogging: true,
  bgBaseColor: '#0a0a0f',
  bgSecondaryColor: '#16161f',
  accentColor: '#7c6bf0',
  textPrimaryColor: '#e8e8f0',
  fontFamily: 'Inter',
  fontSizeScale: 'md',
  sidebarBgColor: '#0e0e17',
  sidebarTextColor: '#b0b0cc',
  sidebarFontFamily: 'Inter',
  tldrawTheme: 'dark',
  tldrawGridStyle: 'dots',
  tldrawSnapToGrid: true,
};

const applyStyleSettings = (settings: Partial<AppSettings>) => {
  const root = document.documentElement;
  if (settings.bgBaseColor) root.style.setProperty('--bg-base', settings.bgBaseColor);
  if (settings.bgSecondaryColor) root.style.setProperty('--bg-secondary', settings.bgSecondaryColor);
  if (settings.accentColor) root.style.setProperty('--accent-primary', settings.accentColor);
  if (settings.textPrimaryColor) root.style.setProperty('--text-primary', settings.textPrimaryColor);

  if (settings.sidebarBgColor) root.style.setProperty('--sidebar-bg', settings.sidebarBgColor);
  if (settings.sidebarTextColor) root.style.setProperty('--sidebar-text', settings.sidebarTextColor);
  if (settings.sidebarFontFamily) {
    const sidebarFontVal = settings.sidebarFontFamily === 'System Default'
      ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : `'${settings.sidebarFontFamily}', sans-serif`;
    root.style.setProperty('--sidebar-font', sidebarFontVal);
  }

  if (settings.fontFamily) {
    const fontVal = settings.fontFamily === 'System Default'
      ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : `'${settings.fontFamily}', sans-serif`;
    root.style.setProperty('--font-family', fontVal);
  }

  if (settings.fontSizeScale) {
    const sizeMap = { sm: '12px', md: '13px', lg: '14px' };
    root.style.setProperty('--font-size-base', sizeMap[settings.fontSizeScale] || '13px');
  }
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
      const merged = { ...defaultSettings, ...(savedSettings || {}) };
      
      set({ 
        ...merged,
        isLoaded: true 
      });
      
      // Apply theme
      const theme = merged.theme;
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }

      // Apply styles
      applyStyleSettings(merged);

    } catch (err) {
      console.error('Failed to load settings:', err);
      set({ isLoaded: true });
    }
  },

  updateSettings: async (newSettings) => {
    const current = get();
    const updated = {
      ...current,
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

    applyStyleSettings(newSettings);

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
    const existing = current.vaults.find(v => v.path === path);
    if (existing) {
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

