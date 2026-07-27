import React from 'react';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  vaultPath: string | null;
  onChangeVault: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  vaultPath,
  onChangeVault
}) => {
  if (!visible) return null;

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
          width: 500,
          backgroundColor: 'var(--bg-base)',
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
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
        
        <div style={{ padding: '24px' }}>
          
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vault Location
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
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Your vault is a local folder where ArtGrid stores all your images and the SQLite database. You can safely sync this folder using Dropbox, Google Drive, or OneDrive.
            </p>
          </div>
          
          <div style={{ marginBottom: 24 }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Theme
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--secondary">Dark (Default)</button>
              <button className="btn btn--secondary" disabled style={{ opacity: 0.5 }}>Light (Coming Soon)</button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
