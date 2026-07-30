import React from 'react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  blur?: boolean;
}

export const Panel: React.FC<PanelProps> = ({ children, blur = true, style, ...props }) => {
  return (
    <div
      style={{
        background: 'rgba(20, 20, 25, 0.75)',
        backdropFilter: blur ? 'blur(32px) saturate(150%)' : 'none',
        WebkitBackdropFilter: blur ? 'blur(32px) saturate(150%)' : 'none',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};
