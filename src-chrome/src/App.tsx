import { useState, useEffect } from 'react';
import './App.css'; // Standard Vite CSS if it exists

function App() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // Get current active tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        setCurrentUrl(tabs[0].url);
      }
    });
  }, []);

  const handleAutoCollect = async () => {
    if (!currentUrl) return;
    setStatus('loading');
    
    try {
      const response = await fetch('http://localhost:1430/api/auto-collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl }),
      });
      
      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div className="w-80 p-4 bg-zinc-950 text-white font-sans rounded-xl border border-white/10 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
        </div>
        <h1 className="text-lg font-semibold tracking-tight">ArtGrid Vault</h1>
      </div>
      
      <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
        The vault overlay is active on this page. Hover over images to save them natively.
      </p>

      <button
        onClick={handleAutoCollect}
        disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-black hover:bg-zinc-200 transition-colors font-medium rounded-lg disabled:opacity-50"
      >
        {status === 'loading' ? (
          <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        ) : status === 'success' ? (
          <span className="text-green-600 font-bold">✓ Collection Started</span>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Auto-Collect this Board
          </>
        )}
      </button>
      
      {status === 'error' && (
        <p className="text-xs text-red-400 mt-2 text-center">
          Could not connect to local ArtGrid Vault. Is the app open?
        </p>
      )}
    </div>
  );
}

export default App;
