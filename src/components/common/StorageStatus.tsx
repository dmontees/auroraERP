import { useEffect, useState } from 'react';

export default function StorageStatus() {
  const [status, setStatus] = useState<{ pending: boolean; error: string | null }>({ pending: false, error: null });
  useEffect(() => {
    const api = window.electron;
    if (!api?.onStoreStatus) return;
    let active = true;
    let receivedEvent = false;
    const unsubscribe = api.onStoreStatus(next => {
      receivedEvent = true;
      if (active) setStatus(next);
    });
    api.getStoreStatus().then(next => {
      if (active && !receivedEvent) setStatus(next);
    }).catch(error => { if (active) setStatus({ pending: true, error: String(error) }); });
    return () => { active = false; unsubscribe(); };
  }, []);

  if (!status.pending && !status.error) return null;
  return (
    <div role={status.error ? 'alert' : 'status'} style={{ padding: '0.5rem 1rem', color: status.error ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
      {status.error ? (
        <>
          No s’han pogut guardar els canvis: {status.error}. Mantén Aurora obert fins que es guardin.{' '}
          <button type="button" onClick={() => { window.electron?.flushStore(true).catch(error => setStatus({ pending: true, error: String(error) })); }}>
            Reintentar el guardat
          </button>
        </>
      ) : 'Desant canvis…'}
    </div>
  );
}
