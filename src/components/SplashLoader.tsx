import React from 'react';

interface SplashLoaderProps {
  visible: boolean;
  statusText?: string;
  subText?: string;
  logs?: string[];
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({
  visible,
  statusText = 'Initializing Xios Vault...',
  subText = 'Loading media workspace & indexing local assets',
  logs = [],
}) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(8, 8, 14, 0.96)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-family, system-ui, sans-serif)',
        color: '#e8e8f0',
        userSelect: 'none',
      }}
    >
      {/* Radial Glow */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124, 107, 240, 0.2) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          maxWidth: 440,
          width: '90%',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        {/* Animated App Icon Ring */}
        <div
          style={{
            position: 'relative',
            width: 72,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: 'var(--accent-primary, #7c6bf0)',
              borderRightColor: 'rgba(124, 107, 240, 0.4)',
              animation: 'splashSpin 1s linear infinite',
            }}
          />
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #7c6bf0 0%, #5842db 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(124, 107, 240, 0.5)',
              fontWeight: 800,
              fontSize: '20px',
              color: '#ffffff',
            }}
          >
            AG
          </div>
        </div>

        {/* Status Headings */}
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
            {statusText}
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
            {subText}
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div
          style={{
            width: '100%',
            height: 4,
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '40%',
              background: 'linear-gradient(90deg, #7c6bf0, #38bdf8)',
              borderRadius: 4,
              animation: 'splashBar 1.6s ease-in-out infinite',
            }}
          />
        </div>

        {/* Live Log Tooltip Box */}
        {logs.length > 0 && (
          <div
            style={{
              width: '100%',
              background: 'rgba(15, 15, 24, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '10px 14px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: 'var(--text-secondary, #cbd5e1)',
              textAlign: 'left',
              maxHeight: 90,
              overflowY: 'auto',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
            }}
          >
            {logs.slice(-4).map((log, idx) => (
              <div key={idx} style={{ opacity: idx === logs.length - 1 ? 1 : 0.6, marginBottom: 2 }}>
                <span style={{ color: 'var(--accent-primary, #7c6bf0)', marginRight: 6 }}>►</span>
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes splashSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes splashBar {
          0% { left: -40%; }
          50% { left: 60%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
};
