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
      signal: AbortSignal.timeout(30000),
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
    if (getStoredToken()?.refresh_token !== token.refresh_token) return null;
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

class GoogleApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
let syncQueue: Promise<unknown> = Promise.resolve();
let activeTarget: string | undefined;
let eventCache: GoogleCalendarEventResponse[] | undefined;
function targetKey(): string {
  return JSON.stringify([getStoredToken()?.refresh_token, getCalendarId()]);
}
function queuedSync<T>(work: () => Promise<T>): Promise<T> {
  const target = targetKey();
  const result = syncQueue.then(async () => {
    if (target !== targetKey()) throw new Error('El calendari ha canviat. Torna a sincronitzar.');
    activeTarget = target;
    eventCache = undefined;
    try {
      const result = await work();
      window.dispatchEvent(new CustomEvent('google-calendar-sync-status', { detail: { error: null } }));
      return result;
    } catch (error) {
      window.dispatchEvent(new CustomEvent('google-calendar-sync-status', { detail: { error: error instanceof Error ? error.message : String(error) } }));
      throw error;
    } finally { activeTarget = undefined; eventCache = undefined; }
  });
  syncQueue = result.catch(() => undefined);
  return result;
}
async function apiRequest(method: string, path: string, body?: any): Promise<any> {
  const target = activeTarget ?? targetKey();
  const calendarId = getCalendarId();
  for (let attempt = 0; attempt < 4; attempt++) {
    if (target !== targetKey()) throw new Error('El calendari ha canviat. Torna a sincronitzar.');
    const accessToken = await getValidAccessToken();
    if (!accessToken) throw new Error('No es pot autenticar amb Google. Reconnecta el calendari.');
    if (target !== targetKey()) throw new Error('El calendari ha canviat. Torna a sincronitzar.');
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + path, {
      method, headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000)
    });
    if (target !== targetKey()) throw new Error('El calendari ha canviat. Torna a sincronitzar.');
    if (res.status === 204) return null;
    if (res.ok) return res.json();
    const err = await res.json().catch(() => ({}));
    const reasons = err?.error?.errors?.map((e: any) => e.reason) || [];
    const retryable = res.status === 429 || res.status >= 500 ||
      (res.status === 403 && reasons.some((r: string) => ['rateLimitExceeded', 'userRateLimitExceeded'].includes(r)));
    if (retryable && attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt + Math.random() * 250));
      continue;
    }
    throw new GoogleApiError(res.status, 'Google API ' + res.status + ': ' + (err?.error?.message || 'Error desconegut'));
  }
}
function eventIdentity(event: GoogleEvent): string {
  const m = event.extendedProperties?.private || {};
  return JSON.stringify([m.auroraSource, m.auroraType, m.auroraProjectCodi, m.auroraDateKind, m.auroraDateId, m.auroraCustomEventId]);
}
async function listAuroraEvents(): Promise<GoogleCalendarEventResponse[]> {
  if (eventCache) return eventCache;
  const query = new URLSearchParams({ privateExtendedProperty: 'auroraSource=' + AURORA_SOURCE, singleEvents: 'true', showDeleted: 'false', maxResults: '2500' });
  const events: GoogleCalendarEventResponse[] = [];
  do {
    const result = await apiRequest('GET', '/events?' + query);
    events.push(...(result.items || []));
    if (!result.nextPageToken) break;
    query.set('pageToken', result.nextPageToken);
  } while (true);
  eventCache = events;
  return events;
}
function sameEventContent(a: GoogleEvent, b: GoogleEvent): boolean {
  const dateValue = (value: GoogleEvent['start']) => {
    if (value.date) return value.date;
    if (!value.dateTime || !/(Z|[+-]\d\d:\d\d)$/.test(value.dateTime)) return value.dateTime;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(value.dateTime));
    const part = (type: string) => parts.find(p => p.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`;
  };
  const value = (e: GoogleEvent) => JSON.stringify([e.summary, e.description || '', e.location || '', dateValue(e.start), dateValue(e.end)]);
  return value(a) === value(b);
}
async function upsertEvent(event: GoogleEvent): Promise<string> {
  // Resolve ownership in the current calendar; local ids can belong to another user.
  const matches = (await listAuroraEvents()).filter(e => eventIdentity(e) === eventIdentity(event)).sort((a, b) => a.id.localeCompare(b.id));
  const existing = matches[0];
  if (existing) {
    const unchanged = sameEventContent(existing, event) && Object.entries(event.extendedProperties?.private || {}).every(([key, value]) => existing.extendedProperties?.private?.[key] === value);
    const updated = unchanged ? existing : await apiRequest('PATCH', '/events/' + encodeURIComponent(existing.id), {
      ...event,
      extendedProperties: { private: { ...existing.extendedProperties?.private, ...event.extendedProperties?.private } }
    });
    eventCache = eventCache?.map(e => e.id === existing.id ? updated : e);
    for (const duplicate of matches.slice(1)) {
      const unsafe = (e: any) => e.recurringEventId || e.recurrence || e.attendees?.length || e.attachments?.length || e.conferenceData || e.reminders?.overrides?.length || e.reminders?.useDefault === false || e.colorId || e.visibility === 'private';
      if (!unsafe(existing) && !unsafe(duplicate) && sameEventContent(existing, duplicate)) await deleteGoogleEventInternal(duplicate.id);
    }
    return existing.id;
  }
  // The same identity yields the same Google id, even after a lost POST response.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(eventIdentity(event)));
  const baseId = 'aurora' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  for (let generation = 0; generation < 10; generation++) {
    const id = generation ? baseId + generation : baseId;
    try {
      const created = await apiRequest('POST', '/events', { ...event, id });
      eventCache?.push(created);
      return created.id;
    } catch (error) {
      if (!(error instanceof GoogleApiError) || error.status !== 409) throw error;
      const current = await apiRequest('GET', '/events/' + id).catch(error => {
        if (error instanceof GoogleApiError && error.status === 410) return { status: 'cancelled' };
        throw error;
      });
      // Google retains deleted ids. Only a confirmed tombstone permits using
      // the next deterministic generation, so retries remain idempotent.
      if (current.status === 'cancelled') continue;
      if (eventIdentity(current) !== eventIdentity(event)) throw new Error('Conflicte amb un esdeveniment aliè. Cal revisar el calendari.');
      const updated = await apiRequest('PATCH', '/events/' + id, event);
      eventCache?.push(updated);
      return id;
    }
  }
  throw new Error('No es pot recuperar un esdeveniment eliminat repetidament. Cal revisar el calendari.');
}
async function deleteGoogleEventInternal(googleId: string): Promise<void> {
  try {
    await apiRequest('DELETE', '/events/' + encodeURIComponent(googleId));
    eventCache = eventCache?.filter(e => e.id !== googleId);
  }
  catch (error) { if (!(error instanceof GoogleApiError) || ![404, 410].includes(error.status)) throw error; }
}
export function deleteGoogleEvent(googleId: string): Promise<void> {
  return queuedSync(async () => {
    const event = await apiRequest('GET', '/events/' + encodeURIComponent(googleId)).catch(error => {
      if (error instanceof GoogleApiError && [404, 410].includes(error.status)) return null;
      throw error;
    });
    if (event?.extendedProperties?.private?.auroraSource === AURORA_SOURCE) await deleteGoogleEventInternal(googleId);
  });
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
  const endH = String((h + 1) % 24).padStart(2, '0');
  const endDate = h === 23 ? nextDateStr(date) : date;
  const mm = String(m).padStart(2, '0');
  return {
    summary,
    description,
    start: { dateTime: `${date}T${hora}:00`, timeZone: TIME_ZONE },
    end: { dateTime: `${endDate}T${endH}:${mm}:00`, timeZone: TIME_ZONE }
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

function projectDateState(project: Projecte, id: string, kind: string, extras?: AutoEventExtras[string]): string {
  const date = kind === 'rodatge' ? project.datesRodatge?.find(d => d.id === id) : project.datesEntrega?.find(d => d.id === id);
  return JSON.stringify([date?.data, date && 'hora' in date ? date.hora || '' : '', extras?.horaInici || '', extras?.horaFi || '', extras?.ubicacio || '']);
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
        auroraDateKind: kind,
        auroraLocalState: projectDateState(projecte, dateId, kind, extras)
      }
    }
  };
}

// Custom calendar events
async function syncCustomEventToGoogleInternal(ev: any): Promise<string | null> {
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

  return upsertEvent(googleEvent);
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

  return upsertEvent(ev);
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

  return upsertEvent(ev);
}

function persistCalendarDates(before: Projecte, after: Projecte): Projecte {
  const projects = storage.getProjectes();
  let saved = after;
  const updatedProjects = projects.map(current => {
    if (current.codi !== before.codi) return current;
    const next = { ...current };
    for (const field of ['datesRodatge', 'datesEntrega'] as const) {
      const currentDates = normalizeProjectDates(current)[field] || [];
      const oldDates = normalizeProjectDates(before)[field] || [];
      next[field] = currentDates.map(date => {
        const old = oldDates.find(d => d.id === date.id);
        const updated = after[field]?.find(d => d.id === date.id);
        return old && updated && JSON.stringify(date) === JSON.stringify(old) ? { ...date, ...updated } : date;
      });
    }
    saved = next;
    return next;
  });
  if (JSON.stringify(projects) !== JSON.stringify(updatedProjects)) storage.setProjectes(updatedProjects);
  return saved;
}

/**
 * Sync all project dates to Google Calendar.
 * Returns an updated project with googleEventId fields populated.
 * Dates removed since oldProjecte are deleted from Google Calendar.
 */
async function syncProjectDatesToGoogleInternal(
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
      if (!newIds.has(old.id)) {
        for (const e of await listAuroraEvents()) {
          const m = e.extendedProperties?.private;
          if (m?.auroraProjectCodi === normalizedProjecte.codi && m.auroraDateId === old.id && m.auroraDateKind === 'rodatge') await deleteGoogleEventInternal(e.id);
        }
      }
    }
  }

  if (normalizedOldProjecte?.datesEntrega) {
    const newIds = new Set((normalizedProjecte.datesEntrega || []).map(d => d.id));
    for (const old of normalizedOldProjecte.datesEntrega) {
      if (!newIds.has(old.id)) {
        for (const e of await listAuroraEvents()) {
          const m = e.extendedProperties?.private;
          if (m?.auroraProjectCodi === normalizedProjecte.codi && m.auroraDateId === old.id && m.auroraDateKind === 'entrega') await deleteGoogleEventInternal(e.id);
        }
      }
    }
  }

  const errors: string[] = [];
  const datesRodatge: DataRodatge[] = [];
  for (const [index, d] of (normalizedProjecte.datesRodatge || []).entries()) {
    if (!d.data) { datesRodatge.push(d); continue; }
    const extras =
      extresEsdevenimentsAuto[getRodatgeAutoEventId(normalizedProjecte, d, index)] ||
      extresEsdevenimentsAuto[getLegacyAutoEventId(normalizedProjecte, 'rodatge', index)];
    try {
      const googleEventId = await syncRodatgeDate(d, normalizedProjecte, clientNom, extras);
      const updated = googleEventId ? { ...d, googleEventId } : d;
      persistCalendarDates(normalizedProjecte, { ...normalizedProjecte, datesRodatge: normalizedProjecte.datesRodatge?.map(date => date.id === d.id ? updated : date) });
      datesRodatge.push(updated);
    } catch (error) {
      datesRodatge.push(d);
      errors.push(normalizedProjecte.codi + ' / ' + d.data + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  const datesEntrega: DataEntrega[] = [];
  for (const [index, d] of (normalizedProjecte.datesEntrega || []).entries()) {
    if (!d.data) { datesEntrega.push(d); continue; }
    const extras =
      extresEsdevenimentsAuto[getEntregaAutoEventId(normalizedProjecte, d, index)] ||
      extresEsdevenimentsAuto[getLegacyAutoEventId(normalizedProjecte, 'entrega', index)];
    try {
      const googleEventId = await syncEntregaDate(d, normalizedProjecte, clientNom, extras);
      const updated = googleEventId ? { ...d, googleEventId } : d;
      persistCalendarDates(normalizedProjecte, { ...normalizedProjecte, datesEntrega: normalizedProjecte.datesEntrega?.map(date => date.id === d.id ? updated : date) });
      datesEntrega.push(updated);
    } catch (error) {
      datesEntrega.push(d);
      errors.push(normalizedProjecte.codi + ' / ' + d.data + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  if (errors.length) throw new Error(errors.join('\n'));
  return { ...normalizedProjecte, datesRodatge, datesEntrega };
}

async function syncAllProjectDatesToGoogleInternal(
  projectes: Projecte[],
  clients: { codi: string; nomComercial?: string; nomFiscal?: string }[],
  extresEsdevenimentsAuto: AutoEventExtras = {}
): Promise<Projecte[]> {
  if (!isGoogleCalendarConnected()) return projectes;

  const updated: Projecte[] = [];
  const errors: string[] = [];
  for (const projecte of projectes) {
    try { updated.push(await syncProjectDatesToGoogleInternal(projecte, projecte, clients, extresEsdevenimentsAuto)); }
    catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  }
  if (errors.length) throw new Error(errors.join('\n'));
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
  const unique = new Map<string, GoogleCalendarEventResponse>();
  for (const event of (await listAuroraEvents()).sort((a, b) => a.id.localeCompare(b.id))) {
    if (event.extendedProperties?.private?.auroraType === 'project-date' && !unique.has(eventIdentity(event))) unique.set(eventIdentity(event), event);
  }
  return [...unique.values()];
}

async function syncGoogleProjectEventsToAuroraInternal(
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
        const dates = kind === 'rodatge' ? nextProjecte.datesRodatge : nextProjecte.datesEntrega;
        const index = dates?.findIndex(d => d.id === dateId) ?? -1;
        if (index < 0) return;
        const autoId = kind === 'rodatge' ? getRodatgeAutoEventId(nextProjecte, dates![index] as DataRodatge, index) : getEntregaAutoEventId(nextProjecte, dates![index], index);
        const extras = updatedExtras[autoId] || updatedExtras[getLegacyAutoEventId(nextProjecte, kind as 'rodatge' | 'entrega', index)];
        // Legacy copies establish a baseline on the first push. Subsequently,
        // local edits win conflicts; remote-only edits are imported.
        if (!meta.auroraLocalState || meta.auroraLocalState !== projectDateState(nextProjecte, dateId, kind, extras)) return;

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

async function syncProjectDatesBidirectionalInternal(
  projectes: Projecte[],
  clients: { codi: string; nomComercial?: string; nomFiscal?: string }[],
  extresEsdevenimentsAuto: AutoEventExtras = {}
): Promise<{ projectes: Projecte[]; extresEsdevenimentsAuto: AutoEventExtras; updatedFromGoogle: number }> {
  const pulled = await syncGoogleProjectEventsToAuroraInternal(projectes, extresEsdevenimentsAuto);
  const merged = pulled.projectes.map(project => persistCalendarDates(projectes.find(p => p.codi === project.codi) || project, project));
  const pushedProjectes = await syncAllProjectDatesToGoogleInternal(merged, clients, pulled.extresEsdevenimentsAuto);
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

export function syncCustomEventToGoogle(...args: Parameters<typeof syncCustomEventToGoogleInternal>) {
  return queuedSync(() => syncCustomEventToGoogleInternal(...args));
}

export function syncProjectDatesToGoogle(...args: Parameters<typeof syncProjectDatesToGoogleInternal>) {
  return queuedSync(async () => {
    const current = storage.getProjectes().find(p => p.codi === args[0].codi) || args[0];
    return syncProjectDatesToGoogleInternal(current, args[1], args[2], storage.getParametres()?.extresEsdevenimentsAuto ?? args[3]);
  });
}

export function syncAllProjectDatesToGoogle(...args: Parameters<typeof syncAllProjectDatesToGoogleInternal>) {
  return queuedSync(() => syncAllProjectDatesToGoogleInternal(...args));
}

export function syncGoogleProjectEventsToAurora(...args: Parameters<typeof syncGoogleProjectEventsToAuroraInternal>) {
  return queuedSync(() => syncGoogleProjectEventsToAuroraInternal(...args));
}

export function syncProjectDatesBidirectional(...args: Parameters<typeof syncProjectDatesBidirectionalInternal>) {
  return queuedSync(async () => {
    const projects = storage.getProjectes();
    const beforeExtras = storage.getParametres()?.extresEsdevenimentsAuto ?? args[2] ?? {};
    const errors: string[] = [];
    let result = { projectes: projects, extresEsdevenimentsAuto: beforeExtras, updatedFromGoogle: 0 };
    try { result = await syncProjectDatesBidirectionalInternal(projects, storage.getClients(), beforeExtras); }
    catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    const params = storage.getParametres();
    const latestExtras = { ...(params?.extresEsdevenimentsAuto ?? {}) };
    for (const [id, extras] of Object.entries(result.extresEsdevenimentsAuto)) {
      if (JSON.stringify(latestExtras[id]) === JSON.stringify(beforeExtras[id])) latestExtras[id] = extras;
    }
    storage.setParametres({ ...params, extresEsdevenimentsAuto: latestExtras });
    for (const event of storage.getEsdevenimentsPersonalitzats()) {
      try {
      const googleEventId = await syncCustomEventToGoogleInternal(event);
      storage.setEsdevenimentsPersonalitzats(storage.getEsdevenimentsPersonalitzats().map((current: any) => current.id === event.id ? { ...current, googleEventId } : current));
      } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    }
    if (errors.length) throw new Error('Sincronització incompleta: ' + errors.join('\n'));
    return { ...result, projectes: storage.getProjectes(), extresEsdevenimentsAuto: latestExtras };
  });
}

export function deleteCustomEventFromGoogle(event: { id: string }): Promise<void> {
  return queuedSync(async () => {
    for (const remote of await listAuroraEvents()) {
      const meta = remote.extendedProperties?.private;
      if (meta?.auroraType === 'custom-event' && meta.auroraCustomEventId === String(event.id)) await deleteGoogleEventInternal(remote.id);
    }
  });
}
