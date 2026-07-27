import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { ViewerProps } from './ViewerTypes';

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

export const TextViewer: React.FC<ViewerProps & { isDocx?: boolean }> = ({ asset, resolvedUrl, isDocx = false, setViewerControls }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  useEffect(() => {
    // Clear previous viewer controls
    if (setViewerControls) setViewerControls(null);

    if (isDocx && resolvedUrl) {
      fetch(resolvedUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => mammoth.convertToHtml({ arrayBuffer: buffer }))
        .then(result => setDocxHtml(result.value))
        .catch(err => console.error("Failed to parse DOCX document", err));
    } else if (resolvedUrl) {
      fetch(resolvedUrl)
        .then(res => res.text())
        .then(text => setTextContent(text))
        .catch(err => console.error("Failed to fetch text content", err));
    }
  }, [resolvedUrl, isDocx, setViewerControls]);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'auto', position: 'relative' }}>
      {isDocx ? (
        <div 
          style={{ width: '100%', maxWidth: 850, height: '100%', background: 'var(--bg-base)', color: 'var(--text-primary)', borderRadius: 8, padding: 40, overflowY: 'auto', border: '1px solid var(--border-subtle)' }}
          dangerouslySetInnerHTML={{ __html: docxHtml || 'Loading DOCX document...' }}
        />
      ) : (
        <div style={{ width: '100%', maxWidth: 850, height: '100%', background: 'var(--bg-base)', color: 'var(--text-primary)', borderRadius: 8, padding: 40, overflowY: 'auto', border: '1px solid var(--border-subtle)' }}>
          {textContent ? renderFormattedMarkdown(textContent) : 'Loading document content...'}
        </div>
      )}
    </div>
  );
};
