import React, { useState } from 'react';
import { Board } from '../types/board';
import { IconGrid, IconList, IconPlus, IconTrash, IconBoard, IconSearch } from './Icons';
import { CreateBoardModal } from './CreateBoardModal';

interface BoardsGalleryProps {
  boards: Board[];
  onOpenBoard: (boardId: string) => void;
  onCreateBoard: (title: string) => void;
  onRenameBoard: (boardId: string, newTitle: string) => void;
  onDeleteBoard: (boardId: string) => void;
}

export const BoardsGallery: React.FC<BoardsGalleryProps> = ({
  boards,
  onOpenBoard,
  onCreateBoard,
  onRenameBoard,
  onDeleteBoard,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingText, setRenamingText] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredBoards = boards.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    setIsCreateModalOpen(true);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', overflow: 'hidden' }}>
      
      {/* Boards Directory Top Toolbar */}
      <div 
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconBoard size={20} className="text-accent" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Project Boards
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {boards.length} total boards
            </span>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="search-bar" style={{ maxWidth: 360 }}>
          <IconSearch size={14} className="search-bar__icon" />
          <input
            type="text"
            className="search-bar__input"
            placeholder="Search project boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Right: View Mode & Create New Board */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="segmented-control">
            <button
              className={`segmented-control__btn ${viewMode === 'grid' ? 'segmented-control__btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <IconGrid size={15} />
            </button>
            <button
              className={`segmented-control__btn ${viewMode === 'list' ? 'segmented-control__btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <IconList size={15} />
            </button>
          </div>

          <button className="btn btn--primary" onClick={handleCreateNew}>
            <IconPlus size={15} /> New Board
          </button>
        </div>
      </div>

      {/* Main Boards Gallery Container */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {filteredBoards.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--text-muted)', gap: 12 }}>
            <div style={{ opacity: 0.4 }}>
              <IconBoard size={48} />
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {searchQuery ? 'No matching boards found' : 'No project boards created yet'}
            </div>
            <button className="btn btn--primary" onClick={handleCreateNew} style={{ marginTop: 8 }}>
              <IconPlus size={15} /> Create Your First Board
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Layout */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filteredBoards.map(board => {
              const nodeCount = Array.isArray(board.nodes) ? board.nodes.length : 0;
              const images = Array.isArray(board.nodes) 
                ? board.nodes.filter((n: any) => n.type === 'image' || n.typeName === 'image' || (n.props && n.type === 'image')) 
                : [];

              return (
                <div
                  key={board.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onClick={() => onOpenBoard(board.id)}
                >
                  {/* Board Preview Thumbnail Card */}
                  <div
                    style={{
                      height: 160,
                      background: 'linear-gradient(135deg, rgba(22,22,31,0.9) 0%, rgba(124,107,240,0.15) 100%)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    {images.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: images.length === 1 ? '1fr' : '1fr 1fr', gap: 4, width: '100%', height: '100%' }}>
                        {images.slice(0, 4).map((img: any, idx: number) => {
                          const src = img.src || img.props?.src || img.url;
                          return (
                            <div key={idx} style={{ background: '#0a0a0f', borderRadius: 6, overflow: 'hidden' }}>
                              {src && <img src={src} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                        <div style={{ opacity: 0.5 }}>
                          <IconBoard size={32} />
                        </div>
                        <span style={{ fontSize: '11px' }}>Empty Board Canvas</span>
                      </div>
                    )}

                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 10, fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {nodeCount} items
                    </div>
                  </div>

                  {/* Card Content & Title */}
                  <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, overflow: 'hidden', paddingRight: 8 }}>
                      {renamingId === board.id ? (
                        <input
                          autoFocus
                          value={renamingText}
                          onChange={e => setRenamingText(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onBlur={() => {
                            if (renamingText.trim()) onRenameBoard(board.id, renamingText.trim());
                            setRenamingId(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (renamingText.trim()) onRenameBoard(board.id, renamingText.trim());
                              setRenamingId(null);
                            }
                          }}
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: '14px', width: '90%' }}
                        />
                      ) : (
                        <h4 
                          style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(board.id);
                            setRenamingText(board.title);
                          }}
                        >
                          {board.title}
                        </h4>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Created {new Date(board.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button
                        className="toolbar__btn"
                        onClick={() => {
                          setRenamingId(board.id);
                          setRenamingText(board.title);
                        }}
                        title="Rename Board"
                        style={{ padding: 4 }}
                      >
                        ✏️
                      </button>
                      <button
                        className="toolbar__btn"
                        onClick={() => {
                          if (window.confirm(`Delete mood board "${board.title}"?`)) {
                            onDeleteBoard(board.id);
                          }
                        }}
                        title="Delete Board"
                        style={{ padding: 4, color: '#f06b8e' }}
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View Layout */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredBoards.map(board => {
              const nodeCount = Array.isArray(board.nodes) ? board.nodes.length : 0;
              return (
                <div
                  key={board.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => onOpenBoard(board.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <IconBoard size={18} className="text-accent" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{board.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{nodeCount} items placed</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(board.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                    <button
                      className="btn btn--secondary"
                      onClick={() => onOpenBoard(board.id)}
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                    >
                      Open Board
                    </button>
                    <button
                      className="toolbar__btn"
                      onClick={() => {
                        if (window.confirm(`Delete mood board "${board.title}"?`)) {
                          onDeleteBoard(board.id);
                        }
                      }}
                      style={{ color: '#f06b8e' }}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateBoardModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSubmit={(title) => {
          onCreateBoard(title);
        }} 
      />
    </div>
  );
};
