import React, { useState, useEffect } from 'react';
import { IconClose, IconBoard } from './Icons';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (isOpen) setTitle('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title.trim());
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        fontFamily: 'var(--font-family)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 400,
          background: 'var(--bg-surface)',
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconBoard size={18} className="text-accent" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Create New Board
            </h3>
          </div>
          <button
            className="toolbar__btn"
            onClick={onClose}
            style={{ width: 28, height: 28, minWidth: 28, padding: 0 }}
          >
            <IconClose size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Board Title
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Concept Art, Character References..."
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              style={{ padding: '8px 16px', fontSize: '0.9rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!title.trim()}
              style={{ padding: '8px 16px', fontSize: '0.9rem', opacity: !title.trim() ? 0.5 : 1 }}
            >
              Create Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
