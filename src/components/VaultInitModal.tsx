import React, { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

interface VaultInitModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateVault: (path: string) => void;
  onOpenVault: (path: string, resetSchema: boolean) => void;
}

export const VaultInitModal: React.FC<VaultInitModalProps> = ({
  visible,
  onClose,
  onCreateVault,
  onOpenVault,
}) => {
  const [mode, setMode] = useState<'open' | 'create'>('open');
  const [selectedPath, setSelectedPath] = useState('');
  const [resetSchema, setResetSchema] = useState(false);

  if (!visible) return null;

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: mode === 'create' ? 'Select Folder for New Vault' : 'Select Existing Vault Folder',
      });
      if (selected && typeof selected === 'string') {
        setSelectedPath(selected);
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
    }
  };

  const handleConfirm = () => {
    if (!selectedPath) return;
    if (mode === 'create') {
      onCreateVault(selectedPath);
    } else {
      onOpenVault(selectedPath, resetSchema);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2600,
        backdropFilter: 'blur(8px)',
        fontFamily: 'var(--font-family, system-ui, sans-serif)',
        color: '#e8e8f0',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          background: 'var(--bg-secondary, #16161f)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
            Vault Setup & Initialization
          </h3>
          <button className="toolbar__btn" onClick={onClose} style={{ width: 28, height: 28 }}>✕</button>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-tertiary, #0e0e17)', borderRadius: 8, padding: 4, gap: 4 }}>
          <button
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: mode === 'open' ? 'var(--accent-primary, #7c6bf0)' : 'transparent',
              color: mode === 'open' ? '#ffffff' : 'var(--text-muted, #94a3b8)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
            onClick={() => setMode('open')}
          >
            Open Existing Vault
          </button>
          <button
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: mode === 'create' ? 'var(--accent-primary, #7c6bf0)' : 'transparent',
              color: mode === 'create' ? '#ffffff' : 'var(--text-muted, #94a3b8)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
            onClick={() => setMode('create')}
          >
            Create New Vault
          </button>
        </div>

        {/* Path Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
            {mode === 'create' ? 'Vault Location Directory:' : 'Existing Vault Directory:'}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={selectedPath}
              onChange={e => setSelectedPath(e.target.value)}
              placeholder="Click Browse to select folder..."
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'var(--bg-surface, #0f0f18)',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                borderRadius: 6,
                color: '#ffffff',
                fontSize: '0.85rem',
              }}
            />
            <button
              className="btn btn--secondary"
              onClick={handleBrowse}
              style={{ padding: '8px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              Browse…
            </button>
          </div>
        </div>

        {/* Schema Reset Option for Existing Vaults */}
        {mode === 'open' && (
          <div style={{ background: 'rgba(124, 107, 240, 0.08)', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(124, 107, 240, 0.2)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={resetSchema}
                onChange={e => setResetSchema(e.target.checked)}
                style={{ marginTop: 2, cursor: 'pointer' }}
              />
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: 2 }}>
                  Update & Re-index Database Schema
                </div>
                If opening an older vault or folder with existing files, enable this to update the DB schema. Existing media files in <code>artgrid/media</code> will be preserved and scanned into the pipeline.
              </div>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button className="btn btn--secondary" onClick={onClose} style={{ padding: '8px 16px', fontSize: '12px' }}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            disabled={!selectedPath}
            onClick={handleConfirm}
            style={{ padding: '8px 20px', fontSize: '12px', opacity: selectedPath ? 1 : 0.5 }}
          >
            {mode === 'create' ? 'Create Vault' : 'Open Vault'}
          </button>
        </div>
      </div>
    </div>
  );
};
