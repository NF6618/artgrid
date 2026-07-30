import React, { useState, useEffect } from 'react';
import { useSettingsStore, AppSettings } from '../stores/useSettingsStore';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  vaultPath: string | null;
  onChangeVault: () => void;
}

type SettingsTab = 'general' | 'vaults' | 'appearance' | 'bulk' | 'keybinds' | 'data';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  vaultPath,
  onChangeVault
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [hasChanges, setHasChanges] = useState(false);

  const { theme, defaultView, autoWatch, compactMode, importMode, enableAiModels, mediaAutoplay, mediaAudioOnHover, mediaGlobalMute, vaults, updateSettings, removeVault } = useSettingsStore();

  const [settings, setSettings] = useState<Partial<AppSettings>>({
    theme,
    defaultView,
    autoWatch,
    compactMode,
    importMode,
    enableAiModels,
    mediaAutoplay,
    mediaAudioOnHover,
    mediaGlobalMute
  });

  useEffect(() => {
    if (visible) {
      setSettings({ theme, defaultView, autoWatch, compactMode, importMode, enableAiModels, mediaAutoplay, mediaAudioOnHover, mediaGlobalMute });
      setHasChanges(false);
    }
  }, [visible, theme, defaultView, autoWatch, compactMode, importMode, enableAiModels, mediaAutoplay, mediaAudioOnHover, mediaGlobalMute]);

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
              { id: 'bulk', label: 'Bulk Collections & Tags' },
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
                  borderLeft: `3px solid ${activeTab === tab.id ? 'var(--accent-primary, #3b82f6)' : 'transparent'}`,
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
                        <option value="boards">Project Boards</option>
                        <option value="recent">Recent Imports</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    File System & Import
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={settings.autoWatch} 
                        onChange={(e) => { setSettings({...settings, autoWatch: e.target.checked}); setHasChanges(true); }}
                        style={{ cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500 }}>Auto-watch Vault Folder</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automatically import new files dropped into the vault's xios/media folder</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginTop: 4 }}>
                      <span style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>Default File Import Action</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose whether imported files are copied or moved into the vault</div>
                      </span>
                      <select 
                        style={{ padding: '6px 12px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'white' }}
                        value={settings.importMode || 'copy'}
                        onChange={(e) => { setSettings({...settings, importMode: e.target.value as 'copy' | 'move'}); setHasChanges(true); }}
                      >
                        <option value="copy">Copy Files to Vault (Default)</option>
                        <option value="move">Move Files to Vault (Frees Space)</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginTop: 8 }}>
                      <input 
                        type="checkbox" 
                        checked={settings.enableVerboseLogging ?? true} 
                        onChange={(e) => { setSettings({...settings, enableVerboseLogging: e.target.checked}); setHasChanges(true); }}
                        style={{ cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500 }}>Enable Verbose Logging on Startup</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Opens dedicated log stream window showing console errors, network traffic, IPC calls, and Rust traces</div>
                      </div>
                    </label>

                    <div style={{ fontSize: '11px', color: '#cbd5e1', background: 'rgba(124, 107, 240, 0.1)', padding: '10px 14px', borderRadius: 6, border: '1px solid rgba(124, 107, 240, 0.25)', lineHeight: 1.4 }}>
                      💡 <strong>Tip for Large Imports:</strong> When importing 100MB+ files or multi-gigabyte collections, select <strong>Move Files</strong> to transfer files instantly without taking up double disk space.
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Advanced Features
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={settings.enableAiModels ?? true} 
                        onChange={(e) => { setSettings({...settings, enableAiModels: e.target.checked}); setHasChanges(true); }}
                        style={{ cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500 }}>Enable AI Models</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Allow downloading models for Background Removal and Upscaling locally in browser</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Media & Playback
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={settings.mediaAutoplay ?? true} 
                        onChange={(e) => { setSettings({...settings, mediaAutoplay: e.target.checked}); setHasChanges(true); }}
                        style={{ cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500 }}>Autoplay Media on Canvas</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automatically play GIFs and videos when visible on the board</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={settings.mediaGlobalMute ?? true} 
                        onChange={(e) => { setSettings({...settings, mediaGlobalMute: e.target.checked}); setHasChanges(true); }}
                        style={{ cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500 }}>Global Audio Mute</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mute all video audio by default across the application</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', opacity: settings.mediaGlobalMute ? 0.5 : 1 }}>
                      <input 
                        type="checkbox" 
                        checked={settings.mediaAudioOnHover ?? false} 
                        onChange={(e) => { setSettings({...settings, mediaAudioOnHover: e.target.checked}); setHasChanges(true); }}
                        disabled={settings.mediaGlobalMute}
                        style={{ cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500 }}>Play Audio on Hover</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Only play audio when hovering over the video on the canvas</div>
                      </div>
                    </label>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'vaults' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Known Vaults
                  </h3>
                  <button className="btn btn--primary" onClick={onChangeVault} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    + Add / Switch Vault
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {vaults && vaults.length > 0 ? vaults.map(v => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-secondary)', borderRadius: 6, border: v.path === vaultPath ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {v.name} 
                          {v.path === vaultPath && <span style={{ fontSize: '10px', background: 'var(--accent-primary)', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>ACTIVE</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{v.path}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {v.path !== vaultPath && (
                          <button className="btn btn--secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={async () => {
                            await updateSettings({ vaultPath: v.path });
                            window.location.reload();
                          }}>Open</button>
                        )}
                        <button className="btn btn--secondary" style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--color-error)' }} onClick={() => {
                          if (window.confirm(`Remove vault "${v.name}" from the list? This will not delete your files.`)) {
                            removeVault(v.id);
                          }
                        }}>Remove</button>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: 24 }}>No saved vaults.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Theme Presets */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Color Presets
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      { name: 'Dark Obsidian', bg: '#0a0a0f', sec: '#16161f', accent: '#7c6bf0', text: '#e8e8f0', sBg: '#0e0e17', sText: '#b0b0cc' },
                      { name: 'Midnight Blue', bg: '#0b132b', sec: '#1c2541', accent: '#4ecdc4', text: '#e0e6ed', sBg: '#0f172a', sText: '#94a3b8' },
                      { name: 'Cyberpunk Neon', bg: '#0d021a', sec: '#1f0a38', accent: '#ff007f', text: '#f3e8ff', sBg: '#120324', sText: '#d8b4fe' },
                      { name: 'Emerald Dark', bg: '#061a14', sec: '#0e2e24', accent: '#10b981', text: '#e6f7f2', sBg: '#0a231b', sText: '#a7f3d0' },
                      { name: 'Light Studio', bg: '#f8fafc', sec: '#ffffff', accent: '#2563eb', text: '#0f172a', sBg: '#ffffff', sText: '#334155' },
                    ].map(preset => (
                      <div 
                        key={preset.name}
                        onClick={() => {
                          const isLight = preset.name.startsWith('Light');
                          setSettings({
                            ...settings,
                            bgBaseColor: preset.bg,
                            bgSecondaryColor: preset.sec,
                            accentColor: preset.accent,
                            textPrimaryColor: preset.text,
                            sidebarBgColor: preset.sBg,
                            sidebarTextColor: preset.sText,
                            theme: isLight ? 'light' : 'dark'
                          });
                          setHasChanges(true);

                          // Live DOM update
                          const root = document.documentElement;
                          root.style.setProperty('--bg-base', preset.bg);
                          root.style.setProperty('--bg-secondary', preset.sec);
                          root.style.setProperty('--accent-primary', preset.accent);
                          root.style.setProperty('--text-primary', preset.text);
                          root.style.setProperty('--sidebar-bg', preset.sBg);
                          root.style.setProperty('--sidebar-text', preset.sText);
                          root.setAttribute('data-theme', isLight ? 'light' : 'dark');
                        }}
                        style={{
                          padding: 10,
                          borderRadius: 6,
                          background: preset.bg,
                          border: `1px solid ${settings.bgBaseColor === preset.bg ? preset.accent : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 600, color: preset.text }}>{preset.name}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: preset.accent }} />
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: preset.sec }} />
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: preset.sBg, border: '1px solid rgba(255,255,255,0.2)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fine-Tuning Colors */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Custom Color Scheme
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="color" 
                        value={settings.bgBaseColor || '#0a0a0f'} 
                        onChange={(e) => { 
                          setSettings({...settings, bgBaseColor: e.target.value}); 
                          setHasChanges(true); 
                          document.documentElement.style.setProperty('--bg-base', e.target.value);
                        }} 
                      />
                      <span>Background Base</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="color" 
                        value={settings.accentColor || '#7c6bf0'} 
                        onChange={(e) => { 
                          setSettings({...settings, accentColor: e.target.value}); 
                          setHasChanges(true); 
                          document.documentElement.style.setProperty('--accent-primary', e.target.value);
                        }} 
                      />
                      <span>Accent Color</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="color" 
                        value={settings.bgSecondaryColor || '#16161f'} 
                        onChange={(e) => { 
                          setSettings({...settings, bgSecondaryColor: e.target.value}); 
                          setHasChanges(true); 
                          document.documentElement.style.setProperty('--bg-secondary', e.target.value);
                        }} 
                      />
                      <span>Surface Background</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="color" 
                        value={settings.textPrimaryColor || '#e8e8f0'} 
                        onChange={(e) => { 
                          setSettings({...settings, textPrimaryColor: e.target.value}); 
                          setHasChanges(true); 
                          document.documentElement.style.setProperty('--text-primary', e.target.value);
                        }} 
                      />
                      <span>Text Primary</span>
                    </label>
                  </div>
                </div>

                {/* Sidebar Color & Font Customization */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Sidebar Customization
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="color" 
                        value={settings.sidebarBgColor || '#0e0e17'} 
                        onChange={(e) => { 
                          setSettings({...settings, sidebarBgColor: e.target.value}); 
                          setHasChanges(true); 
                          document.documentElement.style.setProperty('--sidebar-bg', e.target.value);
                        }} 
                      />
                      <span>Sidebar Background</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="color" 
                        value={settings.sidebarTextColor || '#b0b0cc'} 
                        onChange={(e) => { 
                          setSettings({...settings, sidebarTextColor: e.target.value}); 
                          setHasChanges(true); 
                          document.documentElement.style.setProperty('--sidebar-text', e.target.value);
                        }} 
                      />
                      <span>Sidebar Text Color</span>
                    </label>
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: '0.8rem' }}>Sidebar Font Family</span>
                    <select 
                      style={{ padding: '6px 12px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'white' }}
                      value={settings.sidebarFontFamily || 'Inter'}
                      onChange={(e) => { 
                        setSettings({...settings, sidebarFontFamily: e.target.value}); 
                        setHasChanges(true); 
                        const fontVal = e.target.value === 'System Default'
                          ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          : `'${e.target.value}', sans-serif`;
                        document.documentElement.style.setProperty('--sidebar-font', fontVal);
                      }}
                    >
                      <option value="Inter">Inter (Default)</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Outfit">Outfit</option>
                      <option value="JetBrains Mono">JetBrains Mono</option>
                      <option value="System Default">System Default</option>
                    </select>
                  </label>
                </div>

                {/* Font Settings */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Typography & Fonts
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '0.8rem' }}>Font Family</span>
                      <select 
                        style={{ padding: '6px 12px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'white' }}
                        value={settings.fontFamily || 'Inter'}
                        onChange={(e) => { setSettings({...settings, fontFamily: e.target.value}); setHasChanges(true); }}
                      >
                        <option value="Inter">Inter (Default)</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Outfit">Outfit</option>
                        <option value="JetBrains Mono">JetBrains Mono</option>
                        <option value="System Default">System Default</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '0.8rem' }}>Font Size Scale</span>
                      <select 
                        style={{ padding: '6px 12px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'white' }}
                        value={settings.fontSizeScale || 'md'}
                        onChange={(e) => { setSettings({...settings, fontSizeScale: e.target.value as any}); setHasChanges(true); }}
                      >
                        <option value="sm">Small (12px)</option>
                        <option value="md">Standard (13px)</option>
                        <option value="lg">Large (14px)</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* TLDraw Canvas Board Preferences */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TLDraw Canvas Board Settings
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Board Canvas Theme</span>
                      <select 
                        style={{ padding: '6px 12px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'white' }}
                        value={settings.tldrawTheme || 'dark'}
                        onChange={(e) => { setSettings({...settings, tldrawTheme: e.target.value as any}); setHasChanges(true); }}
                      >
                        <option value="dark">Dark Mode</option>
                        <option value="light">Light Mode</option>
                        <option value="match">Match App Theme</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Board Grid Style</span>
                      <select 
                        style={{ padding: '6px 12px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'white' }}
                        value={settings.tldrawGridStyle || 'dots'}
                        onChange={(e) => { setSettings({...settings, tldrawGridStyle: e.target.value as any}); setHasChanges(true); }}
                      >
                        <option value="dots">Dot Matrix Grid</option>
                        <option value="lines">Line Grid</option>
                        <option value="none">No Grid</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={settings.tldrawSnapToGrid !== false} 
                        onChange={(e) => { setSettings({...settings, tldrawSnapToGrid: e.target.checked}); setHasChanges(true); }}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Snap Shapes & Images to Grid</span>
                    </label>
                  </div>
                </div>

                {/* Layout */}
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

            {activeTab === 'bulk' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Bulk Create Collections
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Type or paste collection names line-by-line. Use <code style={{ background: 'var(--bg-surface)', padding: '2px 4px', borderRadius: 4 }}>Parent &gt; Subcollection</code> syntax for nested collections (e.g. <strong>Medieval &gt; Cyberpunk</strong>).
                  </p>
                  <textarea 
                    placeholder={`Medieval > Cyberpunk\nMedieval > Gothic\nSci-Fi > Space Art\nCharacters`}
                    id="bulkCollectionsInput"
                    style={{ width: '100%', height: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 6, padding: 10, fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                  <button 
                    className="btn btn--primary" 
                    style={{ marginTop: 8 }}
                    onClick={async () => {
                      const input = (document.getElementById('bulkCollectionsInput') as HTMLTextAreaElement)?.value;
                      if (input && input.trim()) {
                        try {
                          const { invoke } = await import('@tauri-apps/api/core');
                          await invoke('bulk_create_collections', { rawInput: input, defaultColor: '#3b82f6' });
                          alert('Bulk collections created successfully!');
                          (document.getElementById('bulkCollectionsInput') as HTMLTextAreaElement).value = '';
                          window.location.reload();
                        } catch (e: any) {
                          alert('Failed to bulk create collections: ' + e);
                        }
                      }
                    }}
                  >
                    Create Collections
                  </button>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Bulk Create Tags
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Type or paste tag names line-by-line or comma-separated.
                  </p>
                  <textarea 
                    placeholder={`concept, 3d, character, armor, environment`}
                    id="bulkTagsInput"
                    style={{ width: '100%', height: 90, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 6, padding: 10, fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                  <button 
                    className="btn btn--primary" 
                    style={{ marginTop: 8 }}
                    onClick={async () => {
                      const input = (document.getElementById('bulkTagsInput') as HTMLTextAreaElement)?.value;
                      if (input && input.trim()) {
                        try {
                          const { invoke } = await import('@tauri-apps/api/core');
                          await invoke('bulk_create_tags', { rawInput: input });
                          alert('Bulk tags created successfully!');
                          (document.getElementById('bulkTagsInput') as HTMLTextAreaElement).value = '';
                          window.location.reload();
                        } catch (e: any) {
                          alert('Failed to bulk create tags: ' + e);
                        }
                      }
                    }}
                  >
                    Create Tags
                  </button>
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
                    <button 
                      className="btn btn--secondary" 
                      onClick={async () => {
                        try {
                          const { save } = await import('@tauri-apps/plugin-dialog');
                          const dest = await save({ defaultPath: 'xios_backup.db', title: 'Export Database Backup' });
                          if (dest) {
                            const { invoke } = await import('@tauri-apps/api/core');
                            await invoke('export_db_backup', { destinationPath: dest });
                            alert('Database backup exported successfully!');
                          }
                        } catch (e: any) {
                          alert('Failed to export backup: ' + e);
                        }
                      }}
                    >
                      Export DB Backup
                    </button>
                    <button 
                      className="btn btn--secondary" 
                      onClick={async () => {
                        try {
                          const { open } = await import('@tauri-apps/plugin-dialog');
                          const src = await open({ title: 'Import Database Backup', multiple: false });
                          if (src && typeof src === 'string') {
                            const { invoke } = await import('@tauri-apps/api/core');
                            await invoke('import_db_backup', { sourcePath: src });
                            alert('Database backup imported successfully! Reloading...');
                            window.location.reload();
                          }
                        } catch (e: any) {
                          alert('Failed to import backup: ' + e);
                        }
                      }}
                    >
                      Import DB Backup
                    </button>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cache & Fresh Data Reset
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--bg-secondary)', borderRadius: 6 }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>Clear Temporary Cache</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Removes WebView2 render cache and cleans missing database entries</div>
                      </div>
                      <button 
                        className="btn btn--secondary" 
                        onClick={async () => {
                          try {
                            const { invoke } = await import('@tauri-apps/api/core');
                            const msg = await invoke('clear_temp_cache');
                            alert(msg);
                          } catch (e: any) {
                            alert('Failed to clear cache: ' + e);
                          }
                        }}
                      >
                        Quick Cache Clear
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'rgba(240, 107, 107, 0.08)', border: '1px solid rgba(240, 107, 107, 0.2)', borderRadius: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-error)' }}>Fresh App Data Reset</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Purges all cached data, WebView2 files, settings, and vault DB (matches dev fresh reset command)</div>
                      </div>
                      <button 
                        className="btn btn--primary" 
                        style={{ background: 'var(--color-error)', border: 'none' }}
                        onClick={async () => {
                          if (window.confirm("ARE YOU SURE? This will purge all application cache, WebView data, settings, and reset the vault DB. This action cannot be undone.")) {
                            try {
                              const { invoke } = await import('@tauri-apps/api/core');
                              await invoke('purge_all_data');
                              alert('App data reset complete. Reloading application...');
                              window.location.reload();
                            } catch (e: any) {
                              alert('Failed to purge data: ' + e);
                            }
                          }
                        }}
                      >
                        Full Fresh Reset
                      </button>
                    </div>
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
