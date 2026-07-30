import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  active?: boolean;
  size?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon, active, size = 32, style, ...props }) => {
  return (
    <button
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'rgba(255,255,255,0.15)' : 'rgba(20, 20, 25, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 8,
        color: active ? '#fff' : 'rgba(255, 255, 255, 0.7)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(12px)',
        boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.2)' : '0 8px 16px rgba(0,0,0,0.3)',
        ...style
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.color = '#fff';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(20, 20, 25, 0.9)';
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
        }
      }}
      {...props}
    >
      {icon}
    </button>
  );
};
