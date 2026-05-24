import type { Projecte, DataRodatge, DataEntrega } from '../types/projecte';
import { storage } from './storageManager';

interface GoogleToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  client_id: string;
  client_secret: string;
  calendar_id: string;
}

interface GoogleEvent {
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  location?: string;
}

export function isGoogleCalendarConnected(): boolean {
  const token = storage.get('googleCalendarToken');
  return !!token?.refresh_token;
}

function getStoredToken(): GoogleToken | null {
  return storage.get('googleCalendarToken') as GoogleToken | null;
}

function updateStoredToken(updates: Partial<GoogleToken>): void {
  const current = getStoredToken();
  if (current) storage.set('googleCalendarToken', { ...current, ...updates });
}

export function getCalendarId(): string {
  return getStoredToken()?.calendar_id || 'primary';
}

export function setCalendarId(calendarId: string): void {
  updateStoredToken({ calendar_id: calendarId });
}

async function getValidAccessToken(): Promise<string | null> {
  const token = getStoredToken();
  if (!token?.refresh_token) return null;

  if (token.access_token && Date.now() < token.expires_at - 60000) {
    return token.access_token;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: token.refresh_token,
        client_id: token.client_id,
        client_secret: token.client_secret,
        grant_type: 'refresh_token'
      }).toString()
    });
    const data = await res.json();
    if (data.error) {
      console.error('❌ Google Calendar refresh failed:', data.error_description || data.error);
      return null;
    }
    updateStoredToken({
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000
    });
    return data.access_token;
  } catch (e) {
    console.error('❌ Error refreshing Google token:', e);
    return null;
  }
}

async function apiRequest(method: string, path: string, body?: any): Promise<any> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  const calId = encodeURIComponent(getCalendarId());
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calId}${path}`;

  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google API ${res.status}: ${JSON.stringify(err?.error?.message || err)}`);
  }
  return res.json();
}

async function createEvent(event: GoogleEvent): Promise<string | null> {
  try {
    const result = await apiRequest('POST', '/events', event);
    return result?.id ?? null;
  } catch (e) {
    console.error('❌ Error creating Google event:', e);
    return null;
  }
}

async function updateEvent(googleId: string, event: GoogleEvent): Promise<void> {
  try {
    await apiRequest('PUT', `/events/${encodeURIComponent(googleId)}`, event);
  } catch (e) {
    console.error('❌ Error updating Google event:', e);
  }
}

export async function deleteGoogleEvent(googleId: string): Promise<void> {
  try {
    await apiRequest('DELETE', `/events/${encodeURIComponent(googleId)}`);
  } catch (e) {
    console.error('❌ Error deleting Google event:', e);
  }
}

function allDayEvent(date: string, summary: string, description?: string): GoogleEvent {
  return { summary, description, start: { date }, end: { date } };
}

function timedOrAllDayEvent(date: string, hora: string | undefined, summary: string, description?: string): GoogleEvent {
  if (!hora) return allDayEvent(date, summary, description);
  const [h, m] = hora.split(':').map(Number);
  const endH = String(h + 1).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return {
    summary,
    description,
    start: { dateTime: `${date}T${hora}:00`, timeZone: 'Europe/Madrid' },
    end: { dateTime: `${date}T${endH}:${mm}:00`, timeZone: 'Europe/Madrid' }
  };
}

// ─── Custom calendar events ───────────────────────────────────────────────────

export async function syncCustomEventToGoogle(ev: any): Promise<string | null> {
  if (!isGoogleCalendarConnected()) return null;

  const desc = [
    ev.descripcio,
    ev.ubicacio ? `📍 ${ev.ubicacio}` : null,
    ev.projecte ? `Projecte: ${ev.projecte}` : null
  ].filter(Boolean).join('\n');

  let googleEvent = timedOrAllDayEvent(ev.data, ev.horaInici, ev.titol, desc || undefined);

  if (googleEvent.start.dateTime && ev.horaFi) {
    googleEvent = {
      ...googleEvent,
      end: { dateTime: `${ev.data}T${ev.horaFi}:00`, timeZone: 'Europe/Madrid' }
    };
  }

  if (ev.googleEventId) {
    await updateEvent(ev.googleEventId, googleEvent);
    return ev.googleEventId;
  }
  return createEvent(googleEvent);
}

// ─── Project dates ────────────────────────────────────────────────────────────

async function syncRodatgeDate(date: DataRodatge, projecte: Projecte, clientNom: string | undefined): Promise<string | null> {
  const desc = [
    `${projecte.codi} – ${projecte.titol}`,
    clientNom ? `Client: ${clientNom}` : null,
    date.nota || null
  ].filter(Boolean).join('\n');

  const ev = timedOrAllDayEvent(date.data, date.hora, `🎬 Rodatge – ${projecte.titol}`, desc);

  if (date.googleEventId) {
    await updateEvent(date.googleEventId, ev);
    return date.googleEventId;
  }
  return createEvent(ev);
}

async function syncEntregaDate(date: DataEntrega, projecte: Projecte, clientNom: string | undefined): Promise<string | null> {
  const desc = [
    `${projecte.codi} – ${projecte.titol}`,
    clientNom ? `Client: ${clientNom}` : null,
    date.nota || null
  ].filter(Boolean).join('\n');

  const ev = allDayEvent(date.data, `📦 Entrega – ${projecte.titol}`, desc);

  if (date.googleEventId) {
    await updateEvent(date.googleEventId, ev);
    return date.googleEventId;
  }
  return createEvent(ev);
}

/**
 * Sync all project dates to Google Calendar.
 * Returns an updated project with googleEventId fields populated.
 * Dates removed since oldProjecte are deleted from Google Calendar.
 */
export async function syncProjectDatesToGoogle(
  projecte: Projecte,
  oldProjecte: Projecte | null,
  clients: { codi: string; nomComercial?: string; nomFiscal?: string }[]
): Promise<Projecte> {
  if (!isGoogleCalendarConnected()) return projecte;

  const client = clients.find(c => c.codi === projecte.client);
  const clientNom = client?.nomComercial || client?.nomFiscal;

  // Delete removed rodatge dates
  if (oldProjecte?.datesRodatge) {
    const newIds = new Set((projecte.datesRodatge || []).map(d => d.id));
    for (const old of oldProjecte.datesRodatge) {
      if (!newIds.has(old.id) && old.googleEventId) {
        await deleteGoogleEvent(old.googleEventId);
      }
    }
  }

  // Delete removed entrega dates
  if (oldProjecte?.datesEntrega) {
    const newIds = new Set((projecte.datesEntrega || []).map(d => d.id));
    for (const old of oldProjecte.datesEntrega) {
      if (!newIds.has(old.id) && old.googleEventId) {
        await deleteGoogleEvent(old.googleEventId);
      }
    }
  }

  // Sync rodatge dates
  const datesRodatge = await Promise.all(
    (projecte.datesRodatge || []).map(async d => {
      if (!d.data) return d;
      const googleEventId = await syncRodatgeDate(d, projecte, clientNom);
      return googleEventId ? { ...d, googleEventId } : d;
    })
  );

  // Sync entrega dates
  const datesEntrega = await Promise.all(
    (projecte.datesEntrega || []).map(async d => {
      if (!d.data) return d;
      const googleEventId = await syncEntregaDate(d, projecte, clientNom);
      return googleEventId ? { ...d, googleEventId } : d;
    })
  );

  return { ...projecte, datesRodatge, datesEntrega };
}

// ─── Calendar list ─────────────────────────────────────────────────────────────

export async function getUserCalendars(): Promise<{ id: string; summary: string }[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return [];
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    return (data.items || [])
      .filter((c: any) => c.accessRole === 'owner' || c.accessRole === 'writer')
      .map((c: any) => ({ id: c.id, summary: c.summary }));
  } catch (e) {
    console.error('❌ Error fetching calendar list:', e);
    return [];
  }
}
