import React, { useState } from 'react';
import { X, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { storage } from '../../utils/storageManager';
import type { SyncStatus } from '../../hooks/useWebSync';

interface Props {
  status: SyncStatus;
  lastSync: Date | null;
  error: string;
  onSync: () => void;
  onClose: () => void;
}

const INTERVALS = [
  { value: 15,  label: 'Cada 15 minuts' },
  { value: 30,  label: 'Cada 30 minuts' },
  { value: 60,  label: 'Cada hora' },
  { value: 120, label: 'Cada 2 hores' },
];

export default function WebSyncModal({ status, lastSync, error, onSync, onClose }: Props) {
  const saved = storage.getWebSyncConfig();
  const [url,      setUrl]      = useState(saved?.url            ?? '');
  const [apiKey,   setApiKey]   = useState(saved?.apiKey         ?? '');
  const [autoSync, setAutoSync] = useState(saved?.autoSync       ?? true);
  const [interval, setInterval] = useState(saved?.intervalMinutes ?? 30);
  const [saved_ok, setSavedOk]  = useState(false);

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

  const statusColor: Record<SyncStatus, string> = {
    idle:    '#6b7280',
    syncing: '#3b82f6',
    success: '#10b981',
    error:   '#ef4444',
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
          borderBottom: '1px solid #e5e7eb',
          background: '#f8f9fa',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cloud size={18} color="#3b82f6" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Sincronització Web</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem' }}>

          {/* Estat actual */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: '#f8f9fa', borderRadius: 10, padding: '0.75rem 1rem',
            marginBottom: '1.25rem', border: '1px solid #e5e7eb',
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
                <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2 }}>{error}</div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
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
                background: isConfigured ? '#1e293b' : '#e5e7eb',
                color: isConfigured ? '#fff' : '#9ca3af',
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
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.3rem' }}>
                URL de l'API web
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://auroraerp.plateafilms.com/api"
                style={{
                  width: '100%', padding: '0.6rem 0.75rem',
                  border: '1px solid #d1d5db', borderRadius: 7,
                  fontSize: '0.875rem', outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                Sense barra final. Exemple: https://auroraerp.plateafilms.com/api
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.3rem' }}>
                Clau API (SYNC_API_KEY del config.php)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                style={{
                  width: '100%', padding: '0.6rem 0.75rem',
                  border: '1px solid #d1d5db', borderRadius: 7,
                  fontSize: '0.875rem', outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8f9fa', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sincronització automàtica</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Sincronitza en segon pla periòdicament</div>
              </div>
              <button
                onClick={() => setAutoSync(!autoSync)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: autoSync ? '#3b82f6' : '#d1d5db',
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
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.3rem' }}>
                  Freqüència
                </label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem',
                    border: '1px solid #d1d5db', borderRadius: 7,
                    fontSize: '0.875rem', outline: 'none', background: '#fff',
                  }}
                >
                  {INTERVALS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                  El canvi de freqüència s'aplica en reiniciar l'aplicació.
                </div>
              </div>
            )}

          </div>

          {/* Botons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <button onClick={onClose} style={{ padding: '0.6rem 1rem', border: '1px solid #d1d5db', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>
              Tancar
            </button>
            <button
              onClick={handleSave}
              disabled={!url || !apiKey}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.25rem',
                background: saved_ok ? '#10b981' : '#1e293b',
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
