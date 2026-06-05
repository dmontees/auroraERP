import React, { useState } from 'react';
import { X, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Clock, HardDriveDownload, ShieldCheck, FileStack } from 'lucide-react';
import { storage } from '../../utils/storageManager';
import { downloadCloudBackup, restoreFromBackup } from '../../utils/cloudBackup';
import { downloadAndRestoreDocuments } from '../../utils/pdfSync';
import type { SyncStatus, BackupStatus, DocSyncStatus, DocSyncStats } from '../../hooks/useWebSync';

interface Props {
  status: SyncStatus;
  lastSync: Date | null;
  error: string;
  onSync: () => void;
  onClose: () => void;
  docStatus: DocSyncStatus;
  lastDocSync: Date | null;
  docStats: DocSyncStats | null;
  docError: string;
  backupStatus: BackupStatus;
  lastBackup: Date | null;
  backupError: string;
  onBackup: () => void;
}

const INTERVALS = [
  { value: 5,   label: 'Cada 5 minuts (recomanat)' },
  { value: 15,  label: 'Cada 15 minuts' },
  { value: 30,  label: 'Cada 30 minuts' },
  { value: 60,  label: 'Cada hora' },
  { value: 120, label: 'Cada 2 hores' },
];

export default function WebSyncModal({ status, lastSync, error, onSync, onClose, docStatus, lastDocSync, docStats, docError, backupStatus, lastBackup, backupError, onBackup }: Props) {
  const saved = storage.getWebSyncConfig();
  const [url,      setUrl]      = useState(saved?.url            ?? '');
  const [apiKey,   setApiKey]   = useState(saved?.apiKey         ?? '');
  const [autoSync, setAutoSync] = useState(saved?.autoSync       ?? true);
  const [interval, setInterval] = useState(saved?.intervalMinutes ?? 5);
  const [saved_ok, setSavedOk]  = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreOk, setRestoreOk] = useState(false);

  const isConfigured = !!saved?.url && !!saved?.apiKey;

  function handleSave() {
    storage.setWebSyncConfig({
      url:             url.trim().replace(/\/+$/, ''),
      apiKey:          apiKey.trim(),
      autoSync,
      intervalMinutes: interval,
    });
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  }

  function formatLastSync(d: Date | null): string {
    if (!d) return 'Mai';
    return d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatLastBackup(d: Date | null): string {
    if (!d) return 'Mai';
    const avui = new Date();
    const isAvui = d.toDateString() === avui.toDateString();
    const hora = d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
    if (isAvui) return `Avui a les ${hora}`;
    return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ` a les ${hora}`;
  }

  async function handleRestaurar() {
    if (!saved?.url || !saved?.apiKey) return;
    if (!confirm('Aquesta acció sobreescriurà TOTES les dades actuals amb les de la còpia del núvol.\n\n¿Continues?')) return;
    setRestoring(true);
    setRestoreError(null);
    setRestoreOk(false);
    try {
      // 1. Restaurar dades estructurals (JSON)
      const data = await downloadCloudBackup(saved.url, saved.apiKey);
      await restoreFromBackup(data);
      // 2. Restaurar documents (PDFs, imatges, adjunts de projectes)
      await downloadAndRestoreDocuments(saved.url, saved.apiKey);
      setRestoreOk(true);
      setTimeout(() => alert('Dades i documents restaurats. Tanca i torna a obrir Aurora ERP per aplicar els canvis.'), 100);
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : 'Error desconegut');
    } finally {
      setRestoring(false);
    }
  }

  const statusColor: Record<SyncStatus, string> = {
    idle:    'var(--color-text-secondary)',
    syncing: 'var(--color-info)',
    success: 'var(--color-success)',
    error:   'var(--color-error)',
  };

  const statusLabel: Record<SyncStatus, string> = {
    idle:    isConfigured ? 'Configurat' : 'No configurat',
    syncing: 'Sincronitzant...',
    success: 'Sincronitzat',
    error:   'Error de sincronització',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: 14, width: 480, maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          background: '#f8f9fa',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cloud size={18} color="var(--color-info)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Sincronització Web</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem' }}>

          {/* Estat actual */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: '#f8f9fa', borderRadius: 10, padding: '0.75rem 1rem',
            marginBottom: '1.25rem', border: '1px solid var(--color-border)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: statusColor[status],
              boxShadow: status === 'syncing' ? `0 0 8px ${statusColor[status]}` : 'none',
              flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: statusColor[status] }}>
                {statusLabel[status]}
              </div>
              {error && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: 2 }}>{error}</div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Clock size={11} />
                Última sync: {formatLastSync(lastSync)}
              </div>
            </div>
            <button
              onClick={onSync}
              disabled={status === 'syncing' || !isConfigured}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.875rem',
                background: isConfigured ? '#1e293b' : 'var(--color-border)',
                color: isConfigured ? '#fff' : 'var(--color-text-tertiary)',
                border: 'none', borderRadius: 7,
                fontSize: '0.8rem', fontWeight: 600, cursor: isConfigured ? 'pointer' : 'not-allowed',
              }}
            >
              <RefreshCw size={13} style={{ animation: status === 'syncing' ? 'spin 0.8s linear infinite' : 'none' }} />
              {status === 'syncing' ? 'Sincronitzant...' : 'Sync ara'}
            </button>
          </div>

          {/* Configuració */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                URL de l'API web
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://auroraerp.plateafilms.com/api"
                style={{
                  width: '100%', padding: '0.6rem 0.75rem',
                  border: '1px solid var(--color-border-strong)', borderRadius: 7,
                  fontSize: '0.875rem', outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>
                Sense barra final. Exemple: https://auroraerp.plateafilms.com/api
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                Clau API (SYNC_API_KEY del config.php)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                style={{
                  width: '100%', padding: '0.6rem 0.75rem',
                  border: '1px solid var(--color-border-strong)', borderRadius: 7,
                  fontSize: '0.875rem', outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8f9fa', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sincronització automàtica</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Sincronitza en segon pla periòdicament</div>
              </div>
              <button
                onClick={() => setAutoSync(!autoSync)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: autoSync ? 'var(--color-info)' : 'var(--color-border-strong)',
                  border: 'none', cursor: 'pointer', position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: autoSync ? 23 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>

            {autoSync && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                  Freqüència
                </label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem',
                    border: '1px solid var(--color-border-strong)', borderRadius: 7,
                    fontSize: '0.875rem', outline: 'none', background: '#fff',
                  }}
                >
                  {INTERVALS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>
                  El canvi de freqüència s'aplica en reiniciar l'aplicació.
                </div>
              </div>
            )}

          </div>

          {/* Delta sync de documents */}
          {isConfigured && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f8f9fa', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileStack size={14} style={{ color: 'var(--color-info)' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Documents i adjunts</span>
                </div>
                <span style={{ fontSize: '0.75rem', color:
                  docStatus === 'syncing' ? 'var(--color-info)' :
                  docStatus === 'success' ? 'var(--color-success)' :
                  docStatus === 'error'   ? 'var(--color-error)'   : 'var(--color-text-tertiary)'
                }}>
                  {docStatus === 'syncing' && '⏳ Sincronitzant...'}
                  {docStatus === 'success' && docStats && `✓ +${docStats.uploaded} pujats, -${docStats.deleted} esborrats`}
                  {docStatus === 'success' && !docStats && '✓ Sense canvis'}
                  {docStatus === 'error'   && `⚠ ${docError}`}
                  {docStatus === 'idle'    && lastDocSync && `Última: ${formatLastSync(lastDocSync)}`}
                  {docStatus === 'idle'    && !lastDocSync && 'S\'actualitzen automàticament amb cada sync'}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', margin: '0.4rem 0 0', fontStyle: 'italic' }}>
                Opcional: PDFs de compres, documents de projectes i imatges. Només es pugen els que han canviat.
              </p>
            </div>
          )}

          {/* Còpia de seguretat al núvol */}
          {isConfigured && (
            <div style={{ marginTop: '1.25rem', padding: '0.9rem 1rem', background: '#f8f9fa', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <ShieldCheck size={14} style={{ color: 'var(--color-success, #16a34a)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Còpia de seguretat al núvol</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={11} />
                Última còpia: <strong>{formatLastBackup(lastBackup)}</strong>
                {backupStatus === 'backing-up' && <span style={{ color: 'var(--color-info)' }}> · Guardant...</span>}
                {backupStatus === 'success' && <span style={{ color: 'var(--color-success)' }}> · Guardada ✓</span>}
                {backupStatus === 'error' && <span style={{ color: 'var(--color-error)' }}> · Error: {backupError}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={onBackup}
                  disabled={backupStatus === 'backing-up' || !isConfigured}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', opacity: backupStatus === 'backing-up' ? 0.6 : 1 }}
                >
                  <RefreshCw size={12} style={{ animation: backupStatus === 'backing-up' ? 'spin 0.8s linear infinite' : 'none' }} />
                  {backupStatus === 'backing-up' ? 'Guardant...' : 'Fer còpia ara'}
                </button>
                <button
                  onClick={handleRestaurar}
                  disabled={restoring}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: 'transparent', color: restoreOk ? 'var(--color-success)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border-strong)', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <HardDriveDownload size={12} />
                  {restoring ? 'Restaurant...' : restoreOk ? '✓ Restaurat' : 'Restaurar des del núvol'}
                </button>
              </div>
              {restoreError && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.4rem', marginBottom: 0 }}>
                  ⚠ {restoreError}
                </p>
              )}
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem', marginBottom: 0, fontStyle: 'italic' }}>
                La còpia guarda les dades principals sense PDFs, imatges ni credencials. Es desa automàticament a cada sincronització i no depèn dels documents.
              </p>
            </div>
          )}

          {/* Botons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button onClick={onClose} style={{ padding: '0.6rem 1rem', border: '1px solid var(--color-border-strong)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>
              Tancar
            </button>
            <button
              onClick={handleSave}
              disabled={!url || !apiKey}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.25rem',
                background: saved_ok ? 'var(--color-success)' : '#1e293b',
                color: '#fff', border: 'none', borderRadius: 7,
                fontSize: '0.875rem', fontWeight: 600,
                cursor: (!url || !apiKey) ? 'not-allowed' : 'pointer',
                opacity: (!url || !apiKey) ? 0.5 : 1,
                transition: 'background 0.2s',
              }}
            >
              {saved_ok ? <><CheckCircle size={14} /> Desat</> : 'Desar configuració'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
