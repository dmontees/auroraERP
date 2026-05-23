import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [readyToInstall, setReadyToInstall] = useState(false);

  useEffect(() => {
    // Solo en Electron
    if (typeof window !== 'undefined' && (window as any).electron) {
      const api = (window as any).electron;

      api.onUpdateAvailable((info: any) => {
        setUpdateInfo(info);
        setDownloading(true);
      });

      api.onDownloadProgress((percent: number) => {
        setDownloadProgress(percent);
      });

      api.onUpdateDownloaded((info: any) => {
        setDownloading(false);
        setReadyToInstall(true);
      });
    }
  }, []);

  if (!updateInfo) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      background: 'var(--color-bg-secondary)',
      border: '2px solid var(--color-accent-primary)',
      borderRadius: '12px',
      padding: '1.5rem',
      maxWidth: '400px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      zIndex: 9999
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Download size={24} color="var(--color-accent-primary)" />
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
          {readyToInstall ? '✅ Actualització llesta' : '🔄 Actualització disponible'}
        </h3>
      </div>

      <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
        {readyToInstall 
          ? `Aurora ${updateInfo.version} està llesta per instal·lar. Les teves dades es conservaran.`
          : `Versió ${updateInfo.version} disponible. Descarregant...`
        }
      </p>

      {downloading && (
        <div style={{
          width: '100%',
          height: '8px',
          background: 'var(--color-bg-tertiary)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '1rem'
        }}>
          <div style={{
            width: `${downloadProgress}%`,
            height: '100%',
            background: 'var(--color-accent-primary)',
            transition: 'width 0.3s'
          }} />
        </div>
      )}

      {readyToInstall && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setUpdateInfo(null)}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            Més tard
          </button>
          <button
            onClick={() => (window as any).electron.installUpdate()}
            className="btn-primary"
            style={{ flex: 1 }}
          >
            Instal·lar ara
          </button>
        </div>
      )}
    </div>
  );
}