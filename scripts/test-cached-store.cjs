const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const Conf = require('conf');
const { withCachedReads } = require('../electron/cached-store.cjs');
const { handleStoreRequest } = require('../electron/store-bridge.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-cached-store-'));
const options = { cwd: root, configName: 'synthetic', projectName: 'aurora-test', accessPropertiesByDotNotation: false };
const originalRead = fs.readFileSync;
try {
  const CachedStore = withCachedReads(Conf);
  const store = new CachedStore(options);
  store.store = { cronometre: null, projectes: [], facturesCompra: [{ pdf: 'A'.repeat(56 * 1024 * 1024) }] };
  let reads = 0;
  fs.readFileSync = function(file, ...args) {
    if (file === store.path) reads++;
    return originalRead.call(this, file, ...args);
  };
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    assert.equal(store.get('cronometre'), null);
    assert.equal(store.has('projectes'), true);
  }
  const elapsed = performance.now() - start;
  assert.equal(reads, 0, 'Repeated small queries must not read the 56 MB file');
  const external = new Conf(options);
  external.set('externalRestore', 'must survive');
  assert.equal(store.get('externalRestore'), 'must survive');
  store.set('projectes', [{ codi: 'PR-1', titol: 'Saved' }]);
  store.delete('cronometre');
  assert.equal(store.has('cronometre'), false);
  const reopened = new CachedStore(options);
  assert.equal(reopened.get('projectes')[0].titol, 'Saved');
  assert.equal(reopened.has('cronometre'), false);
  assert.equal(reopened.get('externalRestore'), 'must survive');
  assert.equal(reopened.get('facturesCompra')[0].pdf.length, 56 * 1024 * 1024);
  const write = store._write;
  store._write = () => { throw new Error('EACCES: synthetic failure'); };
  const allowed = new Set(['projectes']);
  const failure = handleStoreRequest(store, allowed, { operation: 'set', key: 'projectes', value: [] });
  assert.equal(failure.success, false);
  assert.match(failure.error, /EACCES/);
  assert.equal(store.get('projectes')[0].titol, 'Saved', 'Failed writes must preserve committed data');
  assert.throws(() => store.delete('projectes'), /EACCES/);
  assert.equal(store.has('projectes'), true);
  store._write = write;
  store.set({ projectes: [], cronometre: { actiu: true } });
  assert.equal(store.get('cronometre').actiu, true);
  assert.equal(new Conf(options).get('cronometre').actiu, true);
  console.log(`PASS: 56 MB store; 2,000 cached queries in ${elapsed.toFixed(1)} ms, zero disk reads; persistence, deletion, bulk updates and write failures verified.`);
} finally {
  fs.readFileSync = originalRead;
  fs.rmSync(root, { recursive: true, force: true });
}
