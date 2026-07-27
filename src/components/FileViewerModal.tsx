import React, { useEffect, useState } from 'react';
import { Asset } from './Gallery';

interface FileViewerModalProps {
  asset: Asset | null;
  visible: boolean;
  onClose: () => void;
}

// Lightweight Markdown Formatter for native previewing
const renderFormattedMarkdown = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, index) => {
    if (line.startsWith('# ')) return <h1 key={index} style={{ color: 'var(--accent-primary)', fontSize: '1.8rem', margin: '16px 0 8px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4 }}>{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={index} style={{ color: 'var(--text-primary)', fontSize: '1.4rem', margin: '14px 0 6px 0' }}>{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={index} style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: '12px 0 4px 0' }}>{line.slice(4)}</h3>;
    if (line.startsWith('- ') || line.startsWith('* ')) return <li key={index} style={{ marginLeft: 20, marginBottom: 4 }}>{line.slice(2)}</li>;
    if (line.startsWith('> ')) return <blockquote key={index} style={{ borderLeft: '3px solid var(--accent-primary)', margin: '8px 0', paddingLeft: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{line.slice(2)}</blockquote>;
    if (line.startsWith('```')) return <div key={index} style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.85rem' }}>{line}</div>;
    if (!line.trim()) return <div key={index} style={{ height: 12 }} />;
    return <p key={index} style={{ margin: '4px 0', lineHeight: 1.6 }}>{line}</p>;
  });
};

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ asset, visible, onClose }) => {
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (visible && asset && (asset.type.startsWith('text/') || asset.filename.endsWith('.md') || asset.filename.endsWith('.txt'))) {
      fetch(asset.url)
        .then(res => res.text())
        .then(text => setTextContent(text))
        .catch(err => console.error("Failed to fetch text file content", err));
    } else {
      setTextContent(null);
    }
  }, [asset, visible]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible || !asset) return null;

  const isText = asset.type.startsWith('text/') || asset.filename.endsWith('.md') || asset.filename.endsWith('.txt');

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(10px)'
    }} onClick={onClose}>
      
      {/* Top Bar */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
          color: 'white',
          zIndex: 2001
        }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>{asset.title}</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            {asset.filename} • {asset.size}
          </p>
        </div>
        <button 
          className="toolbar__btn" 
          onClick={onClose}
          style={{ width: 40, height: 40, minWidth: 40, background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%' }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Content Area */}
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 40px 40px 40px',
          boxSizing: 'border-box'
        }}
      >
        {asset.type.startsWith('image/') ? (
          <img 
            src={asset.url} 
            alt={asset.title} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              boxShadow: '0 0 40px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : asset.type === 'application/pdf' ? (
          <iframe 
            src={asset.url}
            title={asset.title}
            style={{ width: '100%', height: '100%', border: 'none', background: 'white', borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
        ) : isText ? (
          <div 
            style={{ 
              width: '100%', 
              maxWidth: 900, 
              height: '100%', 
              background: 'var(--bg-base)', 
              color: 'var(--text-primary)',
              borderRadius: 8,
              padding: 40,
              overflowY: 'auto',
              boxSizing: 'border-box',
              lineHeight: 1.6,
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {textContent ? renderFormattedMarkdown(textContent) : 'Loading document content...'}
          </div>
        ) : (
          <div style={{ color: 'white' }}>Unsupported file type: {asset.type}</div>
        )}
      </div>
    </div>
  );
};
