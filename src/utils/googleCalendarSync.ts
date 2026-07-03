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
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

interface GoogleCalendarEventResponse extends GoogleEvent {
  id: string;
  status?: string;
}

type AutoEventExtras = Record<string, { ubicacio?: string; horaInici?: string; horaFi?: string; enllac?: string }>;

const AURORA_SOURCE = 'aurora-erp';
const TIME_ZONE = 'Europe/Madrid';

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
      console.error('Google Calendar refresh failed:', data.error_description || data.error);
      return null;
    }
    updateStoredToken({
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000
    });
    return data.access_token;
  } catch (e) {
    console.error('Error refreshing Google token:', e);
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
    console.error('Error creating Google event:', e);
    return null;
  }
}

async function updateEvent(googleId: string, event: GoogleEvent): Promise<boolean> {
  try {
    await apiRequest('PUT', `/events/${encodeURIComponent(googleId)}`, event);
    return true;
  } catch (e) {
    console.error('Error updating Google event:', e);
    return false;
  }
}

export async function deleteGoogleEvent(googleId: string): Promise<void> {
  try {
    await apiRequest('DELETE', `/events/${encodeURIComponent(googleId)}`);
  } catch (e) {
    console.error('Error deleting Google event:', e);
  }
}

function nextDateStr(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const dt = new Date(year, month - 1, day + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function allDayEvent(date: string, summary: string, description?: string): GoogleEvent {
  return { summary, description, start: { date }, end: { date: nextDateStr(date) } };
}

function timedOrAllDayEvent(date: string, hora: string | undefined, summary: string, description?: string): GoogleEvent {
  if (!hora) return allDayEvent(date, summary, description);
  const [h, m] = hora.split(':').map(Number);
  const endH = String(h + 1).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return {
    summary,
    description,
    start: { dateTime: `${date}T${hora}:00`, timeZone: TIME_ZONE },
    end: { dateTime: `${date}T${endH}:${mm}:00`, timeZone: TIME_ZONE }
  };
}

function applyCustomEventEndDate(event: GoogleEvent, ev: any): GoogleEvent {
  if (!ev.dataFi || ev.dataFi <= ev.data || event.start.dateTime) return event;
  return {
    ...event,
    end: { date: nextDateStr(ev.dataFi) }
  };
}

export function getRodatgeAutoEventId(projecte: Projecte, date: DataRodatge, index: number): string {
  return `proj-inici-${projecte.codi}-${date.id || index}`;
}

export function getEntregaAutoEventId(projecte: Projecte, date: DataEntrega, index: number): string {
  return `proj-entrega-${projecte.codi}-${date.id || index}`;
}

function getLegacyAutoEventId(projecte: Projecte, kind: 'rodatge' | 'entrega', index: number): string {
  return kind === 'rodatge'
    ? `proj-inici-${projecte.codi}-${index}`
    : `proj-entrega-${projecte.codi}-${index}`;
}

function normalizeProjectDates(projecte: Projecte): Projecte {
  const datesRodatge =
    projecte.datesRodatge && projecte.datesRodatge.length > 0
      ? projecte.datesRodatge.map((d, index) => ({ ...d, id: d.id || `rod-${projecte.codi}-${index}` }))
      : projecte.dataInici
        ? [{ id: `rod-${projecte.codi}-legacy`, data: projecte.dataInici, hora: '', nota: '' }]
        : [];

  const datesEntrega =
    projecte.datesEntrega && projecte.datesEntrega.length > 0
      ? projecte.datesEntrega.map((d, index) => ({ ...d, id: d.id || `ent-${projecte.codi}-${index}` }))
      : projecte.dataEntrega
        ? [{ id: `ent-${projecte.codi}-legacy`, data: projecte.dataEntrega, nota: '' }]
        : [];

  return { ...projecte, datesRodatge, datesEntrega };
}

function withAuroraMetadata(
  event: GoogleEvent,
  projecte: Projecte,
  dateId: string,
  kind: 'rodatge' | 'entrega',
  extras?: AutoEventExtras[string]
): GoogleEvent {
  return {
    ...event,
    location: extras?.ubicacio || event.location,
    extendedProperties: {
      private: {
        auroraSource: AURORA_SOURCE,
        auroraType: 'project-date',
        auroraProjectCodi: projecte.codi,
        auroraDateId: dateId,
        auroraDateKind: kind
      }
    }
  };
}

// Custom calendar events
export async function syncCustomEventToGoogle(ev: any): Promise<string | null> {
  if (!isGoogleCalendarConnected()) return null;

  const desc = [
    ev.descripcio,
    ev.projecte ? `Projecte: ${ev.projecte}` : null,
    ev.enllac ? `Enllac: ${ev.enllac}` : null
  ].filter(Boolean).join('\n');

  let googleEvent = timedOrAllDayEvent(ev.data, ev.horaInici, ev.titol, desc || undefined);
  googleEvent = {
    ...applyCustomEventEndDate(googleEvent, ev),
    location: ev.ubicacio || undefined,
    extendedProperties: {
      private: {
        auroraSource: AURORA_SOURCE,
        auroraType: 'custom-event',
        auroraCustomEventId: String(ev.id)
      }
    }
  };

  if (googleEvent.start.dateTime && ev.horaFi) {
    googleEvent = {
      ...googleEvent,
      end: { dateTime: `${ev.data}T${ev.horaFi}:00`, timeZone: TIME_ZONE }
    };
  }

  if (ev.googleEventId) {
    const updated = await updateEvent(ev.googleEventId, googleEvent);
    if (updated) return ev.googleEventId;
  }
  return createEvent(googleEvent);
}

async function syncRodatgeDate(
  date: DataRodatge,
  projecte: Projecte,
  clientNom: string | undefined,
  extras?: AutoEventExtras[string]
): Promise<string | null> {
  const desc = [
    `${projecte.codi} - ${projecte.titol}`,
    clientNom ? `Client: ${clientNom}` : null,
    date.nota || null
  ].filter(Boolean).join('\n');

  let ev = timedOrAllDayEvent(date.data, extras?.horaInici || date.hora, `Rodatge - ${projecte.titol}`, desc);
  if (ev.start.dateTime && extras?.horaFi) {
    ev = { ...ev, end: { dateTime: `${date.data}T${extras.horaFi}:00`, timeZone: TIME_ZONE } };
  }
  ev = withAuroraMetadata(ev, projecte, date.id, 'rodatge', extras);

  if (date.googleEventId) {
    const updated = await updateEvent(date.googleEventId, ev);
    if (updated) return date.googleEventId;
  }
  return createEvent(ev);
}

async function syncEntregaDate(
  date: DataEntrega,
  projecte: Projecte,
  clientNom: string | undefined,
  extras?: AutoEventExtras[string]
): Promise<string | null> {
  const desc = [
    `${projecte.codi} - ${projecte.titol}`,
    clientNom ? `Client: ${clientNom}` : null,
    date.nota || null
  ].filter(Boolean).join('\n');

  let ev = extras?.horaInici
    ? timedOrAllDayEvent(date.data, extras.horaInici, `Entrega - ${projecte.titol}`, desc)
    : allDayEvent(date.data, `Entrega - ${projecte.titol}`, desc);
  if (ev.start.dateTime && extras?.horaFi) {
    ev = { ...ev, end: { dateTime: `${date.data}T${extras.horaFi}:00`, timeZone: TIME_ZONE } };
  }
  ev = withAuroraMetadata(ev, projecte, date.id, 'entrega', extras);

  if (date.googleEventId) {
    const updated = await updateEvent(date.googleEventId, ev);
    if (updated) return date.googleEventId;
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
  clients: { codi: string; nomComercial?: string; nomFiscal?: string }[],
  extresEsdevenimentsAuto: AutoEventExtras = {}
): Promise<Projecte> {
  if (!isGoogleCalendarConnected()) return projecte;

  const normalizedProjecte = normalizeProjectDates(projecte);
  const normalizedOldProjecte = oldProjecte ? normalizeProjectDates(oldProjecte) : null;
  const client = clients.find(c => c.codi === normalizedProjecte.client);
  const clientNom = client?.nomComercial || client?.nomFiscal;

  if (normalizedOldProjecte?.datesRodatge) {
    const newIds = new Set((normalizedProjecte.datesRodatge || []).map(d => d.id));
    for (const old of normalizedOldProjecte.datesRodatge) {
      if (!newIds.has(old.id) && old.googleEventId) {
        await deleteGoogleEvent(old.googleEventId);
      }
    }
  }

  if (normalizedOldProjecte?.datesEntrega) {
    const newIds = new Set((normalizedProjecte.datesEntrega || []).map(d => d.id));
    for (const old of normalizedOldProjecte.datesEntrega) {
      if (!newIds.has(old.id) && old.googleEventId) {
        await deleteGoogleEvent(old.googleEventId);
      }
    }
  }

  const datesRodatge = await Promise.all(
    (normalizedProjecte.datesRodatge || []).map(async (d, index) => {
      if (!d.data) return d;
      const extras =
        extresEsdevenimentsAuto[getRodatgeAutoEventId(normalizedProjecte, d, index)] ||
        extresEsdevenimentsAuto[getLegacyAutoEventId(normalizedProjecte, 'rodatge', index)];
      const googleEventId = await syncRodatgeDate(d, normalizedProjecte, clientNom, extras);
      return googleEventId ? { ...d, googleEventId } : d;
    })
  );

  const datesEntrega = await Promise.all(
    (normalizedProjecte.datesEntrega || []).map(async (d, index) => {
      if (!d.data) return d;
      const extras =
        extresEsdevenimentsAuto[getEntregaAutoEventId(normalizedProjecte, d, index)] ||
        extresEsdevenimentsAuto[getLegacyAutoEventId(normalizedProjecte, 'entrega', index)];
      const googleEventId = await syncEntregaDate(d, normalizedProjecte, clientNom, extras);
      return googleEventId ? { ...d, googleEventId } : d;
    })
  );

  return { ...normalizedProjecte, datesRodatge, datesEntrega };
}

export async function syncAllProjectDatesToGoogle(
  projectes: Projecte[],
  clients: { codi: string; nomComercial?: string; nomFiscal?: string }[],
  extresEsdevenimentsAuto: AutoEventExtras = {}
): Promise<Projecte[]> {
  if (!isGoogleCalendarConnected()) return projectes;

  const updated: Projecte[] = [];
  for (const projecte of projectes) {
    updated.push(await syncProjectDatesToGoogle(projecte, projecte, clients, extresEsdevenimentsAuto));
  }
  return updated;
}

function getDateFromGoogleEvent(event: GoogleCalendarEventResponse): string | undefined {
  return event.start.date || event.start.dateTime?.slice(0, 10);
}

function getStartTimeFromGoogleEvent(event: GoogleCalendarEventResponse): string | undefined {
  return event.start.dateTime?.slice(11, 16);
}

function getEndTimeFromGoogleEvent(event: GoogleCalendarEventResponse): string | undefined {
  return event.end.dateTime?.slice(11, 16);
}

async function listAuroraProjectEventsFromGoogle(): Promise<GoogleCalendarEventResponse[]> {
  const query = new URLSearchParams({
    privateExtendedProperty: `auroraSource=${AURORA_SOURCE}`,
    singleEvents: 'true',
    showDeleted: 'false',
    maxResults: '2500'
  });
  const result = await apiRequest('GET', `/events?${query.toString()}`);
  return (result?.items || []).filter((event: GoogleCalendarEventResponse) =>
    event.extendedProperties?.private?.auroraType === 'project-date'
  );
}

export async function syncGoogleProjectEventsToAurora(
  projectes: Projecte[],
  extresEsdevenimentsAuto: AutoEventExtras = {}
): Promise<{ projectes: Projecte[]; extresEsdevenimentsAuto: AutoEventExtras; updatedCount: number }> {
  if (!isGoogleCalendarConnected()) {
    return { projectes, extresEsdevenimentsAuto, updatedCount: 0 };
  }

  const googleEvents = await listAuroraProjectEventsFromGoogle();
  let updatedCount = 0;
  let updatedExtras = { ...extresEsdevenimentsAuto };

  const updatedProjectes = projectes.map(projecte => {
    let nextProjecte = normalizeProjectDates(projecte);
    let changed = false;

    googleEvents
      .filter(event => event.extendedProperties?.private?.auroraProjectCodi === projecte.codi)
      .forEach(event => {
        const meta = event.extendedProperties?.private || {};
        const kind = meta.auroraDateKind;
        const dateId = meta.auroraDateId;
        const googleDate = getDateFromGoogleEvent(event);
        if (!dateId || !googleDate) return;

        if (kind === 'rodatge') {
          const dates = nextProjecte.datesRodatge || [];
          const index = dates.findIndex(d => d.id === dateId);
          if (index < 0) return;
          const googleHora = getStartTimeFromGoogleEvent(event);
          const current = dates[index];
          const updatedDate = {
            ...current,
            data: googleDate,
            hora: googleHora || current.hora,
            googleEventId: event.id
          };
          if (JSON.stringify(updatedDate) !== JSON.stringify(current)) {
            nextProjecte = {
              ...nextProjecte,
              datesRodatge: dates.map((d, i) => i === index ? updatedDate : d)
            };
            changed = true;
          }
          const eventId = getRodatgeAutoEventId(nextProjecte, updatedDate, index);
          updatedExtras[eventId] = {
            ...(updatedExtras[eventId] || {}),
            ubicacio: event.location || updatedExtras[eventId]?.ubicacio,
            horaInici: googleHora || updatedExtras[eventId]?.horaInici,
            horaFi: getEndTimeFromGoogleEvent(event) || updatedExtras[eventId]?.horaFi
          };
        }

        if (kind === 'entrega') {
          const dates = nextProjecte.datesEntrega || [];
          const index = dates.findIndex(d => d.id === dateId);
          if (index < 0) return;
          const current = dates[index];
          const updatedDate = {
            ...current,
            data: googleDate,
            googleEventId: event.id
          };
          if (JSON.stringify(updatedDate) !== JSON.stringify(current)) {
            nextProjecte = {
              ...nextProjecte,
              datesEntrega: dates.map((d, i) => i === index ? updatedDate : d)
            };
            changed = true;
          }
          const eventId = getEntregaAutoEventId(nextProjecte, updatedDate, index);
          updatedExtras[eventId] = {
            ...(updatedExtras[eventId] || {}),
            ubicacio: event.location || updatedExtras[eventId]?.ubicacio,
            horaInici: getStartTimeFromGoogleEvent(event) || updatedExtras[eventId]?.horaInici,
            horaFi: getEndTimeFromGoogleEvent(event) || updatedExtras[eventId]?.horaFi
          };
        }
      });

    if (changed) updatedCount++;
    return nextProjecte;
  });

  return { projectes: updatedProjectes, extresEsdevenimentsAuto: updatedExtras, updatedCount };
}

export async function syncProjectDatesBidirectional(
  projectes: Projecte[],
  clients: { codi: string; nomComercial?: string; nomFiscal?: string }[],
  extresEsdevenimentsAuto: AutoEventExtras = {}
): Promise<{ projectes: Projecte[]; extresEsdevenimentsAuto: AutoEventExtras; updatedFromGoogle: number }> {
  const pulled = await syncGoogleProjectEventsToAurora(projectes, extresEsdevenimentsAuto);
  const pushedProjectes = await syncAllProjectDatesToGoogle(pulled.projectes, clients, pulled.extresEsdevenimentsAuto);
  return {
    projectes: pushedProjectes,
    extresEsdevenimentsAuto: pulled.extresEsdevenimentsAuto,
    updatedFromGoogle: pulled.updatedCount
  };
}

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
    console.error('Error fetching calendar list:', e);
    return [];
  }
}
