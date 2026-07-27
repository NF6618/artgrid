import React from 'react';

export interface ImportProgressData {
  current: number;
  total: number;
  current_file: string;
  phase: string;
  percent: number;
}

interface ImportProgressModalProps {
  visible: boolean;
  progress: ImportProgressData | null;
  onCancel?: () => void;
}

export const ImportProgressModal: React.FC<ImportProgressModalProps> = ({
  visible,
  progress,
}) => {
  if (!visible || !progress) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 380,
        zIndex: 9000,
        background: 'var(--bg-secondary, rgba(22, 22, 31, 0.95))',
        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(16px)',
        fontFamily: 'var(--font-family, system-ui, sans-serif)',
        color: 'var(--text-primary, #e8e8f0)',
        userSelect: 'none',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#38bdf8',
              boxShadow: '0 0 10px #38bdf8',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Importing Media Assets
          </span>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary, #7c6bf0)' }}>
          {progress.current} of {progress.total} ({Math.round(progress.percent)}%)
        </span>
      </div>

      {/* Progress Bar Container */}
      <div
        style={{
          width: '100%',
          height: 6,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, progress.percent))}%`,
            background: 'linear-gradient(90deg, #7c6bf0, #38bdf8)',
            borderRadius: 4,
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      {/* Active File & Phase Log */}
      <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
          <span style={{ color: 'var(--text-secondary, #cbd5e1)' }}>File:</span> {progress.current_file}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>
          Status: {progress.phase}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};
