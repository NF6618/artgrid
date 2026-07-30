import React, { useEffect, useRef, useState } from 'react';
import { ViewerProps } from './ViewerTypes';
import { useSettingsStore } from '../../stores/useSettingsStore';

export const VideoViewer: React.FC<ViewerProps> = ({ asset, resolvedUrl, setViewerControls }) => {
  const { mediaGlobalMute } = useSettingsStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [resolvedUrl]);

  useEffect(() => {
    if (setViewerControls) {
      setViewerControls(
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
           <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Video Player</span>
        </div>
      );
    }
  }, [setViewerControls]);

  useEffect(() => {
    if (videoRef.current) {
        videoRef.current.muted = mediaGlobalMute ?? true;
    }
  }, [mediaGlobalMute]);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden', position: 'relative' }}>
        {videoError ? (
            <div style={{ padding: '30px 40px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'white', maxWidth: 500 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#f06b8e', fontSize: '1.1rem' }}>Unable to Render Video</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px 0', wordBreak: 'break-all' }}>
                <strong>File:</strong> {asset.filename}<br />
                <strong>Resolved Path:</strong> {resolvedUrl}
                </p>
            </div>
        ) : (
            <video 
                ref={videoRef}
                src={resolvedUrl} 
                controls
                autoPlay
                loop
                muted={mediaGlobalMute ?? true}
                onError={(err) => {
                    console.error("Failed to load video preview:", resolvedUrl, err);
                    setVideoError(true);
                }}
                style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%', 
                    objectFit: 'contain',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
                    borderRadius: 8
                }}
            />
        )}
    </div>
  );
};
