import { useEffect, useState } from 'react';
import { isGoogleCalendarConnected, syncProjectDatesBidirectional } from '../utils/googleCalendarSync';
import { storage } from '../utils/storageManager';

/** Retry pending calendar changes while Aurora is open, including after reconnecting. */
export function useGoogleCalendarSync() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let running = false;
    const sync = async () => {
      if (running || !isGoogleCalendarConnected() || !navigator.onLine) return;
      running = true;
      try {
        await syncProjectDatesBidirectional(storage.getProjectes(), storage.getClients());
      } catch (cause) {
        console.error('Google Calendar sync failed:', cause);
      } finally {
        running = false;
      }
    };
    const onStatus = (event: Event) => setError((event as CustomEvent).detail.error);
    window.addEventListener('google-calendar-sync-status', onStatus);
    window.addEventListener('online', sync);
    const startup = window.setTimeout(sync, 1000);
    const interval = window.setInterval(sync, 5 * 60 * 1000);
    return () => {
      window.clearTimeout(startup);
      window.clearInterval(interval);
      window.removeEventListener('online', sync);
      window.removeEventListener('google-calendar-sync-status', onStatus);
    };
  }, []);
  return error;
}
