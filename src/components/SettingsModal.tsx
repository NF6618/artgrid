import React, { useState, useEffect } from 'react';
import { useSettingsStore, AppSettings } from '../stores/useSettingsStore';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  vaultPath: string | null;
  onChangeVault: () => void;
}

type SettingsTab = 'general' | 'vaults' | 'appearance' | 'keybinds' | 'data';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  vaultPath,
  onChangeVault
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [hasChanges, setHasChanges] = useState(false);

  const { theme, defaultView, autoWatch, compactMode, updateSettings } = useSettingsStore();

  const [settings, setSettings] = useState<Partial<AppSettings>>({
    theme,
    defaultView,
    autoWatch,
    compactMode
  });

  useEffect(() => {
    if (visible) {
      setSettings({ theme, defaultView, autoWatch, compactMode });
      setHasChanges(false);
    }
  }, [visible, theme, defaultView, autoWatch, compactMode]);

  if (!visible) return null;

  const handleSave = async () => {
    await updateSettings(settings);
    setHasChanges(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      
      <div 
        style={{
          width: 700,
          height: 550,
          backgroundColor: 'var(--bg-base)',
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Settings</h2>
          <button 
            className="toolbar__btn" 
            onClick={onClose}
            style={{ width: 28, height: 28, minWidth: 28 }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Sidebar Tabs */}
          <div style={{ 
            width: 200, 
            borderRight: '1px solid var(--border-subtle)',
            padding: '16px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            {[
              { id: 'general', label: 'General' },
              { id: 'vaults', label: 'Vaults' },
              { id: 'appearance', label: 'Appearance' },
              { id: 'keybinds', label: 'Keybinds' },
              { id: 'data', label: 'Data Management' },
            ].map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                style={{
                  padding: '8px 24px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderLeft: `3px solid ${activeTab === tab.id ? 'var(--accent-color, #3b82f6)' : 'transparent'}`,
                  fontWeight: activeTab === tab.id ? 500 : 400
                }}
              >
                {tab.label}
              </div>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            
            {activeTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Startup
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <span style={{ flex: 1 }}>Default View on Launch</span>
                      <select 
                        style={{ padding: '6px 12px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'white' }}
                        value={settings.defaultView}
                        onChange={(e) => { setSettings({...settings, defaultView: e.target.value}); setHasChanges(true); }}
                      >
                        <option value="library">Library</option>
                        <option value="boards">Mood Boards</option>
                        <option value="recent">Recent Imports</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    File System
                  </h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={settings.autoWatch} 
                      onChange={(e) => { setSettings({...settings, autoWatch: e.target.checked}); setHasChanges(true); }}
                      style={{ cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>Auto-watch Vault Folder</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automatically import new files dropped into the vault's media folder</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'vaults' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active Vault
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      wordBreak: 'break-all',
                      paddingRight: 16
                    }}>
                      {vaultPath || 'No vault loaded.'}
                    </div>
                    <button className="btn btn--secondary" onClick={onChangeVault}>
                      Switch Vault
                    </button>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Known Vaults
                  </h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    Multiple vault tracking will appear here in Phase 5.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Theme
                  </h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      className={`btn ${settings.theme === 'dark' ? 'btn--primary' : 'btn--secondary'}`}
                      onClick={() => { setSettings({...settings, theme: 'dark'}); setHasChanges(true); }}
                    >
                      Dark
                    </button>
                    <button 
                      className={`btn ${settings.theme === 'light' ? 'btn--primary' : 'btn--secondary'}`}
                      onClick={() => { setSettings({...settings, theme: 'light'}); setHasChanges(true); }}
                    >
                      Light
                    </button>
                    <button 
                      className={`btn ${settings.theme === 'system' ? 'btn--primary' : 'btn--secondary'}`}
                      onClick={() => { setSettings({...settings, theme: 'system'}); setHasChanges(true); }}
                    >
                      System
                    </button>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Custom Colors
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input type="color" defaultValue="#0a0a0f" onChange={(e) => document.documentElement.style.setProperty('--bg-base', e.target.value)} />
                      <span>Background Base</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input type="color" defaultValue="#7c6bf0" onChange={(e) => document.documentElement.style.setProperty('--accent-primary', e.target.value)} />
                      <span>Accent Color</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Layout
                  </h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={settings.compactMode} 
                      onChange={(e) => { setSettings({...settings, compactMode: e.target.checked}); setHasChanges(true); }}
                      style={{ cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>Compact Mode</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reduce spacing in the sidebar and gallery for smaller screens</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Database Operations
                  </h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn--secondary" onClick={() => alert('Exporting Database...')}>
                      Export DB Backup
                    </button>
                    <button className="btn btn--secondary" onClick={() => alert('Importing Database...')}>
                      Import DB Backup
                    </button>
                    <button className="btn btn--secondary" style={{ color: 'var(--color-error)' }} onClick={() => alert('Clearing Cache...')}>
                      Clear Cache
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keybinds' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Shortcuts
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Import Files', keys: ['Ctrl', 'I'] },
                    { label: 'Search', keys: ['Ctrl', 'F'] },
                    { label: 'Toggle Sidebar', keys: ['Ctrl', '\\'] },
                    { label: 'Toggle Detail Panel', keys: ['Ctrl', ']'] },
                    { label: 'Preview Selected', keys: ['Space'] },
                  ].map((kb, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                      <span>{kb.label}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {kb.keys.map((k, j) => (
                          <kbd key={j} style={{ 
                            background: 'var(--bg-surface)', 
                            border: '1px solid var(--border-subtle)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)'
                          }}>{k}</kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ 
          padding: '16px 24px', 
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          background: 'rgba(0,0,0,0.1)'
        }}>
          <button className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn--primary" 
            onClick={handleSave}
            disabled={!hasChanges}
            style={{ opacity: hasChanges ? 1 : 0.5 }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
