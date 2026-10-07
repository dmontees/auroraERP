import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/googleCalendarSync.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
function setup() {
  const data = {
    googleCalendarToken: { refresh_token: 'account-a', access_token: 'valid', expires_at: Date.now() + 3600000, calendar_id: 'primary' },
    projectes: [], clients: [], parametres: {}, esdevenimentsPersonalitzats: []
  };
  const storage = { get: k => data[k], set: (k, v) => { data[k] = v; } };
  for (const key of ['Projectes', 'Clients', 'Parametres', 'EsdevenimentsPersonalitzats']) {
    const field = key[0].toLowerCase() + key.slice(1);
    storage['get' + key] = () => structuredClone(data[field]);
    storage['set' + key] = value => { data[field] = structuredClone(value); };
  }
  const calendars = new Map();
  const requests = [], statuses = [];
  let fail, beforeFetch;
  const fetch = async (url, options) => {
    const parsed = new URL(url);
    const [calendar, eventId] = parsed.pathname.split('/calendars/')[1].split('/events');
    const id = eventId?.replace(/^\//, '');
    requests.push({ method: options.method, calendar, id, body: options.body && JSON.parse(options.body) });
    const request = requests.at(-1);
    if (beforeFetch) await beforeFetch(request);
    const error = fail?.(request);
    if (error) return { ok: false, status: error, json: async () => ({ error: { message: 'Simulated failure', errors: [{ reason: 'rateLimitExceeded' }] } }) };
    if (!calendars.has(calendar)) calendars.set(calendar, new Map());
    const events = calendars.get(calendar);
    let result, status = 200;
    if (options.method === 'GET' && !id) {
      const all = [...events.values()];
      result = parsed.searchParams.has('pageToken') ? { items: all.slice(1) } : { items: all.slice(0, 1), ...(all.length > 1 ? { nextPageToken: 'page2' } : {}) };
    } else if (options.method === 'GET') {
      result = events.get(id); if (!result) status = 404;
    } else if (options.method === 'POST') {
      if (events.has(request.body.id)) status = 409;
      else { result = request.body; events.set(result.id, structuredClone(result)); }
    } else if (options.method === 'PATCH') {
      if (!events.has(id)) status = 404;
      else { result = { ...events.get(id), ...request.body, id }; events.set(id, structuredClone(result)); }
    } else if (options.method === 'DELETE') { events.delete(id); status = 204; }
    return { ok: status < 400, status, json: async () => structuredClone(result || { error: { message: 'Failure' } }) };
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', 'crypto', 'window', 'CustomEvent', 'setTimeout', outputText)(
    () => ({ storage }), module, module.exports, fetch, webcrypto,
    { dispatchEvent: e => statuses.push(e.detail) }, class { constructor(name, options) { this.detail = options.detail; } }, callback => { callback(); }
  );
  return { api: module.exports, data, calendars, requests, statuses, setFail: fn => { fail = fn; }, setBeforeFetch: fn => { beforeFetch = fn; } };
}
const custom = { id: 'custom-1', data: '2026-12-10', horaInici: '23:30', titol: 'Rodatge' };
const project = { codi: 'PRJ-1', titol: 'Production', datesRodatge: [{ id: 'rod-1', data: '2026-12-10', hora: '09:00' }], datesEntrega: [] };

{
  const t = setup();
  const ids = await Promise.all(Array.from({ length: 8 }, () => t.api.syncCustomEventToGoogle(custom)));
  assert.equal(new Set(ids).size, 1, 'Overlapping saves use a single Google event');
  assert.equal(t.requests.filter(r => r.method === 'POST').length, 1);
  const saved = t.calendars.get('primary').get(ids[0]);
  saved.start.dateTime = '2026-12-10T23:30:00+01:00';
  saved.end.dateTime = '2026-12-11T00:30:00+01:00';
  await t.api.syncCustomEventToGoogle(custom);
  assert.equal(t.requests.filter(r => r.method === 'PATCH').length, 0, 'Google timezone offsets do not cause unnecessary updates');
  assert.match(ids[0], /^[a-v0-9]{5,1024}$/);
  assert.match(t.calendars.get('primary').get(ids[0]).end.dateTime, /^2026-12-11T00:30:00/);
  t.setFail(r => r.method === 'PATCH' ? 403 : null);
  await assert.rejects(t.api.syncCustomEventToGoogle({ ...custom, titol: 'Changed' }), /Google API 403/);
  assert.equal(t.requests.filter(r => r.method === 'POST').length, 1, 'Failed update never falls back to insertion');
  assert.match(t.statuses.at(-1).error, /403/);
  t.setFail(null);
  t.api.setCalendarId('other');
  await t.api.syncCustomEventToGoogle({ ...custom, googleEventId: ids[0] });
  assert.equal(t.calendars.get('primary').size, 1);
  assert.equal(t.calendars.get('other').size, 1, 'Old account/calendar ids are not used for writes');
}
{
  const t = setup();
  const id = await t.api.syncCustomEventToGoogle(custom);
  const original = t.calendars.get('primary').get(id);
  t.calendars.get('primary').set('zcopy', { ...structuredClone(original), id: 'zcopy' });
  t.calendars.get('primary').set('zchanged', { ...structuredClone(original), id: 'zchanged', summary: 'Independently edited' });
  await t.api.syncCustomEventToGoogle(custom);
  assert.ok(t.requests.some(r => r.method === 'GET'), 'Lists are fetched');
  assert.equal(t.calendars.get('primary').size, 2, 'Only exact duplicates are removed across all pages');
  assert.ok(t.calendars.get('primary').has('zchanged'));
}
{
  const t = setup();
  t.data.projectes = [structuredClone(project)];
  t.data.esdevenimentsPersonalitzats = [custom];
  await t.api.syncProjectDatesBidirectional(t.data.projectes, []);
  assert.equal(t.calendars.get('primary').size, 2, 'Full sync recovers old custom events as well as project dates');
  assert.ok(t.data.projectes[0].datesRodatge[0].googleEventId);
  const id = t.data.projectes[0].datesRodatge[0].googleEventId;
  const remote = t.calendars.get('primary').get(id);
  remote.start.dateTime = '2026-12-12T09:00:00';
  remote.end.dateTime = '2026-12-12T10:00:00';
  await t.api.syncProjectDatesBidirectional(t.data.projectes, []);
  assert.equal(t.data.projectes[0].datesRodatge[0].data, '2026-12-12', 'Remote-only date edits are imported');
  t.data.projectes[0].datesRodatge[0].data = '2026-12-14';
  await t.api.syncProjectDatesBidirectional(t.data.projectes, []);
  assert.equal(t.data.projectes[0].datesRodatge[0].data, '2026-12-14', 'New local edits are not overwritten by the pull');
  assert.match(t.calendars.get('primary').get(id).start.dateTime, /^2026-12-14/);
}
{
  const t = setup();
  t.data.projectes = [{ ...structuredClone(project), datesEntrega: [{ id: 'delivery', data: '2026-12-20' }] }];
  t.setFail(r => r.method === 'POST' && r.body.summary.startsWith('Entrega') ? 400 : null);
  await assert.rejects(t.api.syncProjectDatesBidirectional(t.data.projectes, []), /400/);
  assert.ok(t.data.projectes[0].datesRodatge[0].googleEventId, 'Completed work survives a later event failure');
  t.setFail(null);
  await t.api.syncProjectDatesBidirectional(t.data.projectes, []);
  assert.equal(t.calendars.get('primary').size, 2, 'Retry fills missing events without duplicating successes');
}
{
  const t = setup();
  let count = 0;
  t.setFail(r => r.method === 'POST' && count++ < 2 ? 429 : null);
  await t.api.syncCustomEventToGoogle(custom);
  assert.equal(t.requests.filter(r => r.method === 'POST').length, 3, 'Rate limiting uses bounded retries');
  assert.equal(t.calendars.get('primary').size, 1);
}
{
  const t = setup();
  t.data.projectes = [structuredClone(project)];
  t.setBeforeFetch(r => {
    if (r.method === 'POST') {
      t.data.projectes[0].titol = 'New title';
      t.data.projectes[0].datesRodatge[0].data = '2026-12-30';
    }
  });
  await t.api.syncProjectDatesToGoogle(project, project, []);
  assert.equal(t.data.projectes[0].titol, 'New title');
  assert.equal(t.data.projectes[0].datesRodatge[0].data, '2026-12-30', 'Late responses never replace newer local edits');
  t.setBeforeFetch(null);
  await t.api.syncProjectDatesToGoogle(t.data.projectes[0], project, []);
  assert.equal(t.calendars.get('primary').size, 1);
}
{
  const t = setup();
  t.data.projectes = [
    { ...structuredClone(project), datesEntrega: [{ id: 'delivery', data: '2026-12-20' }] },
    { ...structuredClone(project), codi: 'PRJ-2' }
  ];
  t.data.esdevenimentsPersonalitzats = [custom];
  t.setFail(r => r.method === 'POST' && r.body.summary.startsWith('Entrega') ? 400 : null);
  await assert.rejects(t.api.syncProjectDatesBidirectional(t.data.projectes, []), /incompleta/);
  assert.equal(t.calendars.get('primary').size, 3, 'One invalid event does not prevent other projects/custom events syncing');
}
{
  const t = setup();
  let simulated = false;
  t.setBeforeFetch(r => {
    if (r.method === 'POST' && !simulated) {
      simulated = true;
      t.calendars.get('primary').set(r.body.id, structuredClone(r.body));
      throw new Error('Lost response');
    }
  });
  await assert.rejects(t.api.syncCustomEventToGoogle(custom), /Lost response/);
  t.setBeforeFetch(null);
  await t.api.syncCustomEventToGoogle(custom);
  assert.equal(t.calendars.get('primary').size, 1, 'Retry after a lost creation response does not duplicate the event');
}
{
  const t = setup();
  t.setBeforeFetch(r => {
    if (r.method === 'POST') t.calendars.get('primary').set(r.body.id, structuredClone(r.body));
  });
  await t.api.syncCustomEventToGoogle(custom);
  assert.equal(t.calendars.get('primary').size, 1, 'Concurrent insertion conflict reuses the deterministic id');
}
{
  const t = setup();
  t.setBeforeFetch(() => t.api.setCalendarId('changed'));
  await assert.rejects(t.api.syncCustomEventToGoogle(custom), /calendari ha canviat/);
  assert.equal(t.requests.filter(r => r.method === 'POST').length, 0, 'Target changes interrupt in-flight jobs before further writes');
}
{
  const t = setup();
  t.data.googleCalendarToken.access_token = '';
  t.data.googleCalendarToken.refresh_token = '';
  await t.api.syncCustomEventToGoogle(custom);
  assert.equal(t.requests.length, 0, 'Disconnected calendars do not claim to create events');
}
console.log('Google Calendar sync regression tests passed.');
