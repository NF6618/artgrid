import React from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

interface LargeFileWarningModalProps {
  visible: boolean;
  fileCount: number;
  onChoice: (moveFiles: boolean) => void;
  onCancel: () => void;
}

export const LargeFileWarningModal: React.FC<LargeFileWarningModalProps> = ({
  visible,
  fileCount,
  onChoice,
  onCancel,
}) => {
  const { updateSettings } = useSettingsStore();
  const [rememberChoice, setRememberChoice] = React.useState(false);

  if (!visible) return null;

  const handleSelect = (move: boolean) => {
    if (rememberChoice && move) {
      updateSettings({ importMode: 'move' });
    }
    onChoice(move);
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
        zIndex: 9500,
        backdropFilter: 'blur(10px)',
        fontFamily: 'var(--font-family, system-ui, sans-serif)',
        color: '#e8e8f0',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: 480,
          background: 'var(--bg-secondary, #16161f)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
            }}
          >
            ⚡
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Large Media Import Detected
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Preparing to import {fileCount} media file{fileCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, background: 'rgba(15, 15, 24, 0.6)', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          You are currently in <strong>Copy Mode</strong>. For large files or bulk photo/video imports, <strong>Move Mode</strong> transfers files instantly without doubling disk usage.
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rememberChoice}
            onChange={e => setRememberChoice(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Set "Move Files" as my default setting in preferences
        </label>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            className="btn btn--secondary"
            onClick={() => handleSelect(false)}
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            Copy Files (Duplicate)
          </button>
          <button
            className="btn btn--primary"
            onClick={() => handleSelect(true)}
            style={{ padding: '8px 18px', fontSize: '12px', background: 'linear-gradient(135deg, #7c6bf0, #5842db)', fontWeight: 600 }}
          >
            Move Files (Recommended)
          </button>
        </div>
      </div>
    </div>
  );
};
