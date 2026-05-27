import { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '../utils/storageManager';
import { syncToWeb } from '../utils/webSync';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface WebSyncState {
  status: SyncStatus;
  lastSync: Date | null;
  error: string;
  sync: () => Promise<void>;
}

export function useWebSync(): WebSyncState {
  const [status, setStatus]   = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError]     = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

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
      // Torna a idle als 3 segons
      setTimeout(() => {
        if (isMounted.current) setStatus('idle');
      }, 3000);
    } catch (e) {
      if (!isMounted.current) return;
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Error desconegut');
    }
  }, []);

  // Auto-sync: sincronitza en arrencar i cada N minuts
  useEffect(() => {
    const config = storage.getWebSyncConfig();
    if (!config?.autoSync || !config?.url || !config?.apiKey) return;

    // Sync inicial (retard de 5s per deixar que l'app carregui)
    const initialTimer = setTimeout(() => { sync(); }, 5000);

    const intervalMs = (config.intervalMinutes ?? 30) * 60 * 1000;
    const intervalTimer = setInterval(() => { sync(); }, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Només en muntar — si l'usuari canvia config ha de reiniciar l'app

  return { status, lastSync, error, sync };
}
