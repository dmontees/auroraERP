import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

type UpdateState = 'idle' | 'downloading' | 'ready' | 'manual';

interface UpdateInfo {
  version: string;
  downloadUrl?: string;
  releaseUrl?: string;
  assetName?: string | null;
}

export default function UpdateNotification() {
  const [state, setState] = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [openError, setOpenError] = useState('');

  useEffect(() => {
    const api = typeof window !== 'undefined' ? (window as any).electron : null;
    if (!api) return;

    const showUpdate = (info: UpdateInfo) => {
      setOpenError('');
      setUpdateInfo(info);
      setState(info.downloadUrl || info.releaseUrl ? 'manual' : 'downloading');
      window.dispatchEvent(new CustomEvent('aurora:update-available', { detail: info }));
    };

    api.getPendingUpdate?.().then((info: UpdateInfo | null) => {
      if (info) showUpdate(info);
    });

    api.onUpdateAvailable(showUpdate);

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

  const handleDownload = async () => {
    const url = updateInfo?.downloadUrl || updateInfo?.releaseUrl;
    if (!url) return;

    try {
      const result = await (window as any).electron.openExternal(url);
      if (result && result.success === false) {
        setOpenError(result.error || "No s'ha pogut obrir l'enllac de descarrega.");
      }
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "No s'ha pogut obrir l'enllac de descarrega.");
    }
  };

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
          {state === 'ready' ? 'Actualitzacio llesta' : 'Nova versio disponible'}
        </h3>
      </div>

      <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
        {state === 'manual' && `Aurora ${updateInfo?.version} ja esta disponible.`}
        {state === 'downloading' && `Versio ${updateInfo?.version} disponible. Descarregant...`}
        {state === 'ready' && `Aurora ${updateInfo?.version} esta llesta per instal-lar. Les teves dades es conservaran.`}
      </p>

      {state === 'manual' && updateInfo?.assetName && (
        <p style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
          Fitxer: {updateInfo.assetName}
        </p>
      )}

      {openError && (
        <p style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--color-error)' }}>
          {openError}
        </p>
      )}

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
          Mes tard
        </button>
        {state === 'manual' && (
          <button
            onClick={handleDownload}
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
            Instal-lar ara
          </button>
        )}
      </div>
    </div>
  );
}
