import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

type UpdateState = 'idle' | 'downloading' | 'ready' | 'manual';

interface UpdateInfo {
  version: string;
  downloadUrl?: string; // macOS only — user downloads DMG manually
}

export default function UpdateNotification() {
  const [state, setState] = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? (window as any).electron : null;
    if (!api) return;

    api.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateInfo(info);
      setState(info.downloadUrl ? 'manual' : 'downloading');
      window.dispatchEvent(new CustomEvent('aurora:update-available', { detail: info }));
    });

    api.onDownloadProgress((percent: number) => {
      setDownloadProgress(percent);
    });

    api.onUpdateDownloaded((info: UpdateInfo) => {
      setUpdateInfo(info);
      setState('ready');
    });

    api.onUpdateNotAvailable(() => {
      window.dispatchEvent(new CustomEvent('aurora:update-not-available'));
    });
  }, []);

  if (state === 'idle') return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      background: 'var(--color-bg-secondary)',
      border: '2px solid var(--color-accent-primary)',
      borderRadius: '12px',
      padding: '1.5rem',
      maxWidth: '360px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      zIndex: 9999
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <Download size={22} color="var(--color-accent-primary)" />
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
          {state === 'ready' ? '✅ Actualització llesta' : '🔄 Nova versió disponible'}
        </h3>
      </div>

      <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
        {state === 'manual' && `Aurora ${updateInfo?.version} ja està disponible.`}
        {state === 'downloading' && `Versió ${updateInfo?.version} disponible. Descarregant...`}
        {state === 'ready' && `Aurora ${updateInfo?.version} està llesta per instal·lar. Les teves dades es conservaran.`}
      </p>

      {state === 'downloading' && (
        <div style={{
          width: '100%', height: '8px',
          background: 'var(--color-bg-tertiary)',
          borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem'
        }}>
          <div style={{
            width: `${downloadProgress}%`, height: '100%',
            background: 'var(--color-accent-primary)',
            transition: 'width 0.3s'
          }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setState('idle')} className="btn-secondary" style={{ flex: 1 }}>
          Més tard
        </button>
        {state === 'manual' && (
          <button
            onClick={() => (window as any).electron.openExternal(updateInfo?.downloadUrl)}
            className="btn-primary"
            style={{ flex: 1 }}
          >
            Descarregar
          </button>
        )}
        {state === 'ready' && (
          <button
            onClick={() => (window as any).electron.installUpdate()}
            className="btn-primary"
            style={{ flex: 1 }}
          >
            Instal·lar ara
          </button>
        )}
      </div>
    </div>
  );
}
