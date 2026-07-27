import React, { useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { open } from '@tauri-apps/plugin-dialog';

interface ImportVaultModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmImport: (targetVaultPath: string) => void;
}

export const ImportVaultModal: React.FC<ImportVaultModalProps> = ({
  visible,
  onClose,
  onConfirmImport
}) => {
  const { vaultPath, vaults } = useSettingsStore();
  const [selectedVault, setSelectedVault] = useState<string>(vaultPath || '');

  if (!visible) return null;

  const handleBrowseCustomVault = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Destination Vault Folder',
      });
      if (selected && typeof selected === 'string') {
        setSelectedVault(selected);
      }
    } catch (e) {
      console.error('Failed to select vault folder:', e);
    }
  };

  const handleProceed = () => {
    if (selectedVault) {
      onConfirmImport(selectedVault);
      onClose();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2500,
        backdropFilter: 'blur(8px)',
        fontFamily: 'var(--font-family)'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: 480,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Import Media to Vault
          </h3>
          <button className="toolbar__btn" onClick={onClose} style={{ width: 28, height: 28 }}>✕</button>
        </div>

        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Select the destination Vault folder where imported media, documents, and extracted metadata should be stored:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Target Vault Destination:
          </label>
          <select 
            value={selectedVault} 
            onChange={e => setSelectedVault(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: 6, 
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            {vaultPath && <option value={vaultPath}>Current Vault ({vaultPath})</option>}
            {vaults.filter(v => v.path !== vaultPath).map(v => (
              <option key={v.id} value={v.path}>{v.name} ({v.path})</option>
            ))}
          </select>

          <button 
            className="btn btn--secondary" 
            onClick={handleBrowseCustomVault}
            style={{ padding: '6px 12px', fontSize: '11px', alignSelf: 'flex-start' }}
          >
            📁 Choose Different Vault Folder...
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleProceed} disabled={!selectedVault}>
            Select Files & Import
          </button>
        </div>
      </div>
    </div>
  );
};
