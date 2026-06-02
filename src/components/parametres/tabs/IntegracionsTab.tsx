import React, { useState, useEffect } from 'react';
import { getUserCalendars, setCalendarId, getCalendarId, isGoogleCalendarConnected } from '../../../utils/googleCalendarSync';
import { storage } from '../../../utils/storageManager';

type Status = 'idle' | 'connecting' | 'success' | 'error';

export default function IntegracionsTab() {
  const [clientId, setClientIdState] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [calendars, setCalendars] = useState<{ id: string; summary: string }[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    const isConn = isGoogleCalendarConnected();
    setConnected(isConn);
    const store = (window as any).electronStore;
    const token = store?.get('googleCalendarToken');
    if (token?.client_id) setClientIdState(token.client_id);
    if (token?.calendar_id) setSelectedCalendar(token.calendar_id);
    if (isConn) loadCalendars();
  }, []);

  const loadCalendars = async () => {
    const list = await getUserCalendars();
    setCalendars(list);
  };

  const handleConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setStatus('error');
      setStatusMsg('Cal introduir el Client ID i el Client Secret.');
      return;
    }

    const electron = (window as any).electron;
    if (!electron?.startGoogleAuth) {
      setStatus('error');
      setStatusMsg('Funcionalitat no disponible en mode web (cal l\'app d\'escriptori).');
      return;
    }

    setStatus('connecting');
    setStatusMsg('S\'ha obert el navegador per autenticar-se. Torna aquí un cop hagis acceptat.');

    try {
      const result = await electron.startGoogleAuth(clientId.trim(), clientSecret.trim());
      if (result?.token) {
        storage.set('googleCalendarToken', result.token);
      }
      setConnected(true);
      setStatus('success');
      setStatusMsg('Connexió establerta correctament!');
      await loadCalendars();
    } catch (e: any) {
      setStatus('error');
      setStatusMsg(`Error en la connexió: ${e?.message || 'desconegut'}`);
    }
  };

  const handleDisconnect = async () => {
    const electron = (window as any).electron;
    await electron?.disconnectGoogle?.();
    storage.set('googleCalendarToken', null);
    setConnected(false);
    setCalendars([]);
    setClientSecret('');
    setStatus('idle');
    setStatusMsg('');
    setSelectedCalendar('primary');
  };

  const handleCalendarChange = (calId: string) => {
    setSelectedCalendar(calId);
    setCalendarId(calId);
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        Google Calendar
      </h3>

      {/* Instructions */}
      {!connected && (
        <div style={{
          background: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '0.88rem',
          lineHeight: 1.6
        }}>
          <strong>Com obtenir les credencials:</strong>
          <ol style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', marginBottom: 0 }}>
            <li>Ves a <strong>console.cloud.google.com</strong> i crea un projecte nou (o selecciona'n un).</li>
            <li>Activa l'<strong>API Google Calendar</strong> (Biblioteques → cerca "Google Calendar API").</li>
            <li>Ves a <strong>APIs i serveis → Credencials → Crear credencials → ID de client OAuth 2.0</strong>.</li>
            <li>Tipus d'aplicació: <strong>Aplicació d'escriptori</strong>.</li>
            <li>Copia el <strong>Client ID</strong> i el <strong>Client Secret</strong> i enganxa'ls aquí.</li>
          </ol>
        </div>
      )}

      {/* Connection status badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.9rem',
        borderRadius: '999px',
        background: connected ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
        color: connected ? 'var(--color-success-dark)' : 'var(--color-error-darker)',
        fontWeight: 600,
        fontSize: '0.85rem',
        marginBottom: '1.5rem'
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? 'var(--color-success)' : 'var(--color-error)',
          flexShrink: 0
        }} />
        {connected ? 'Connectat' : 'No connectat'}
      </div>

      {/* Credentials form */}
      {!connected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Client ID</label>
            <input
              type="text"
              className="form-input"
              value={clientId}
              onChange={e => setClientIdState(e.target.value)}
              placeholder="123456789-abc123.apps.googleusercontent.com"
              autoComplete="off"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Client Secret</span>
              <button
                type="button"
                onClick={() => setShowSecret(s => !s)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.8rem', color: 'var(--color-text-tertiary)', padding: 0
                }}
              >
                {showSecret ? 'Amagar' : 'Mostrar'}
              </button>
            </label>
            <input
              type={showSecret ? 'text' : 'password'}
              className="form-input"
              value={clientSecret}
              onChange={e => setClientSecret(e.target.value)}
              placeholder="GOCSPX-..."
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {/* Calendar selector (after connecting) */}
      {connected && calendars.length > 0 && (
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label>Calendari de destinació</label>
          <select
            className="form-input"
            value={selectedCalendar}
            onChange={e => handleCalendarChange(e.target.value)}
          >
            {calendars.map(c => (
              <option key={c.id} value={c.id}>{c.summary}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
            Els nous esdeveniments es crearan en aquest calendari.
          </span>
        </div>
      )}

      {/* Status message */}
      {statusMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.88rem',
          background: status === 'success' ? 'var(--color-success-bg)' : status === 'error' ? 'var(--color-error-bg)' : 'var(--color-info-bg-light)',
          color: status === 'success' ? 'var(--color-success-dark)' : status === 'error' ? 'var(--color-error-darker)' : 'var(--color-info-dark)',
          border: `1px solid ${status === 'success' ? 'var(--color-success-border)' : status === 'error' ? 'var(--color-error-border)' : 'var(--color-info-border-strong)'}`
        }}>
          {statusMsg}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {!connected ? (
          <button
            type="button"
            className="btn-primary"
            onClick={handleConnect}
            disabled={status === 'connecting'}
          >
            {status === 'connecting' ? 'Connectant...' : 'Connectar amb Google Calendar'}
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            onClick={handleDisconnect}
            style={{ borderColor: 'var(--color-error-dark)', color: 'var(--color-error-dark)' }}
          >
            Desconnectar
          </button>
        )}
      </div>

      {/* What gets synced */}
      {connected && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem 1.25rem',
          background: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          fontSize: '0.88rem',
          lineHeight: 1.6
        }}>
          <strong>Què es sincronitza automàticament:</strong>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', marginBottom: 0 }}>
            <li>Esdeveniments personalitzats del Calendari (crear, editar, eliminar)</li>
            <li>Dates de rodatge dels projectes</li>
            <li>Dates d'entrega dels projectes</li>
          </ul>
          <p style={{ marginTop: '0.75rem', marginBottom: 0, color: 'var(--color-text-tertiary)' }}>
            La sincronització és en una direcció: Aurora ERP → Google Calendar.
          </p>
        </div>
      )}
    </div>
  );
}
