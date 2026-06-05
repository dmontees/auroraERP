import { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '../utils/storageManager';
import { syncToWeb } from '../utils/webSync';
import { syncDocuments } from '../utils/pdfSync';
import { uploadCloudBackup } from '../utils/cloudBackup';

export type SyncStatus    = 'idle' | 'syncing'    | 'success' | 'error';
export type DocSyncStatus = 'idle' | 'syncing'    | 'success' | 'error';
export type BackupStatus  = 'idle' | 'backing-up' | 'success' | 'error';

export interface DocSyncStats { uploaded: number; deleted: number }

export interface WebSyncState {
  status: SyncStatus;
  lastSync: Date | null;
  error: string;
  sync: () => Promise<void>;
  docStatus: DocSyncStatus;
  lastDocSync: Date | null;
  docStats: DocSyncStats | null;
  docError: string;
  backupStatus: BackupStatus;
  lastBackup: Date | null;
  backupError: string;
  backup: () => Promise<void>;
}

export function useWebSync(): WebSyncState {
  const [status,   setStatus]   = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error,    setError]    = useState('');

  const [docStatus,   setDocStatus]   = useState<DocSyncStatus>('idle');
  const [lastDocSync, setLastDocSync] = useState<Date | null>(null);
  const [docStats,    setDocStats]    = useState<DocSyncStats | null>(null);
  const [docError,    setDocError]    = useState('');

  const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle');
  const [lastBackup,   setLastBackup]   = useState<Date | null>(() => {
    const s = storage.getLastCloudBackup();
    return s ? new Date(s) : null;
  });
  const [backupError, setBackupError] = useState('');

  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  // ── Backup slim (post-sync, sense binaris) ───────────────────────────────────
  const backup = useCallback(async () => {
    const config = storage.getWebSyncConfig();
    if (!config?.url || !config?.apiKey) return;
    if (!isMounted.current) return;

    setBackupStatus('backing-up');
    setBackupError('');
    try {
      const result = await uploadCloudBackup(config.url, config.apiKey);
      if (!isMounted.current) return;
      setBackupStatus('success');
      setLastBackup(new Date(result.savedAt));
      setTimeout(() => { if (isMounted.current) setBackupStatus('idle'); }, 3000);
    } catch (e) {
      if (!isMounted.current) return;
      setBackupStatus('error');
      setBackupError(e instanceof Error ? e.message : 'Error desconegut');
    }
  }, []);

  // ── Delta sync de documents ──────────────────────────────────────────────────
  const syncDocs = useCallback(async () => {
    const config = storage.getWebSyncConfig();
    if (!config?.url || !config?.apiKey) return;
    if (!isMounted.current) return;

    setDocStatus('syncing');
    setDocError('');
    try {
      const stats = await syncDocuments(config.url, config.apiKey);
      if (!isMounted.current) return;
      setDocStatus('success');
      setDocStats(stats);
      setLastDocSync(new Date());
      setTimeout(() => { if (isMounted.current) setDocStatus('idle'); }, 3000);
    } catch (e) {
      if (!isMounted.current) return;
      setDocStatus('error');
      setDocError(e instanceof Error ? e.message : 'Error desconegut');
    }
  }, []);

  // ── Sync de dades ────────────────────────────────────────────────────────────
  const sync = useCallback(async () => {
    const config = storage.getWebSyncConfig();
    if (!config?.url || !config?.apiKey) return;
    if (!isMounted.current) return;

    setStatus('syncing');
    setError('');
    try {
      await syncToWeb(config.url, config.apiKey);
      if (!isMounted.current) return;
      setStatus('success');
      setLastSync(new Date());
      setTimeout(() => { if (isMounted.current) setStatus('idle'); }, 3000);

      // En segon pla: delta sync docs + backup slim
      syncDocs().catch(e => console.warn('[webSync] docSync:', e));
      backup().catch(e => console.warn('[webSync] backup:', e));
    } catch (e) {
      if (!isMounted.current) return;
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Error desconegut');
    }
  }, [syncDocs, backup]);

  // ── Auto-sync periòdic ───────────────────────────────────────────────────────
  useEffect(() => {
    const config = storage.getWebSyncConfig();
    if (!config?.autoSync || !config?.url || !config?.apiKey) return;

    const initialTimer = setTimeout(() => { sync(); }, 5000);
    const intervalMs = (config.intervalMinutes ?? 5) * 60 * 1000;
    const intervalTimer = setInterval(() => { sync(); }, intervalMs);

    return () => { clearTimeout(initialTimer); clearInterval(intervalTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync al tancar l'app (Electron) ─────────────────────────────────────────
  useEffect(() => {
    const electronAPI = (window as any).electron;
    if (!electronAPI?.onAppWillClose || !electronAPI?.confirmClose) return;

    const config = storage.getWebSyncConfig();
    if (!config?.url || !config?.apiKey) return;

    electronAPI.onAppWillClose(async () => {
      try {
        await syncToWeb(config.url, config.apiKey);
        const results = await Promise.allSettled([
          syncDocuments(config.url, config.apiKey),
          uploadCloudBackup(config.url, config.apiKey),
        ]);
        for (const result of results) {
          if (result.status === 'rejected') {
            console.warn('[webSync] Error en tasca secundaria al tancar:', result.reason);
          }
        }
      } catch (e) {
        console.warn('[webSync] Error al tancar:', e);
      } finally {
        electronAPI.confirmClose();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status, lastSync, error, sync,
    docStatus, lastDocSync, docStats, docError,
    backupStatus, lastBackup, backupError, backup,
  };
}
