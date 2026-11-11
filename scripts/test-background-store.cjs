const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const Conf = require('conf');
const { BackgroundStore } = require('../electron/background-store.cjs');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-background-test-'));
  const options = { cwd: root, configName: 'synthetic', projectName: 'aurora-test', accessPropertiesByDotNotation: false };
  const disk = new Conf(options);
  disk.store = { facturesCompra: [{ documentPDF: 'A'.repeat(56 * 1024 * 1024) }], projectes: [], dataSchemaVersion: 5 };
  const store = new BackgroundStore(disk, { projectes: { type: 'array' } });
  let ticks = 0, maxGap = 0, previous = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    maxGap = Math.max(maxGap, now - previous);
    previous = now;
    ticks++;
    assert.equal(store.get('dataSchemaVersion'), 5);
  }, 10);
  try {
    const mutable = [{ codi: 'PR-1', titol: 'first' }];
    store.set('projectes', mutable);
    mutable[0].titol = 'must not leak';
    assert.equal(store.get('projectes')[0].titol, 'first');
    const flushing = store.flush();
    for (let i = 0; i < 20; i++) store.set('projectes', [{ codi: 'PR-1', titol: `edit ${i}` }]);
    store.set('removeMe', true);
    store.delete('removeMe');
    await flushing;
    assert.equal(new Conf(options).get('projectes')[0].titol, 'edit 19');
    assert.equal(new Conf(options).has('removeMe'), false);
    assert.throws(() => store.set('projectes', 'invalid'), /invàlid/);
    const backup = path.join(root, 'backup.json');
    assert.equal((await store.backup(backup, { skipUnchanged: true })).skipped, false);
    const meta = fs.readFileSync(`${backup}.meta.json`, 'utf8');
    assert.equal((await store.backup(backup, { skipUnchanged: true })).skipped, true);
    assert.equal(fs.readFileSync(`${backup}.meta.json`, 'utf8'), meta);
    store.set('projectes', [{ codi: 'PR-1', titol: 'latest' }]);
    assert.equal((await store.backup(backup, { skipUnchanged: true })).skipped, false);
    assert.equal(JSON.parse(fs.readFileSync(backup, 'utf8')).projectes[0].titol, 'latest');
    assert.ok(ticks > 10, 'The main event loop must run during real large writes/backups');
    console.log(`56 MB background writes/backups: ${ticks} event-loop ticks; maximum interval ${maxGap.toFixed(1)} ms (includes test-side disk assertions).`);

    // Deterministic disk failure: replace the JSON path with a directory.
    const held = `${disk.path}.held`;
    fs.renameSync(disk.path, held);
    fs.mkdirSync(disk.path);
    store.set('projectes', [{ codi: 'PR-1', titol: 'pending after failure' }]);
    await assert.rejects(store.flush());
    assert.ok(store.status.error);
    assert.equal(store.status.pending, true);
    store.set('projectes', [{ codi: 'PR-1', titol: 'newer while failed' }]);
    assert.equal(store.get('projectes')[0].titol, 'newer while failed');
    assert.equal(new Conf({ ...options, configName: 'synthetic.json', fileExtension: 'held' }).get('projectes')[0].titol, 'latest');
    fs.rmdirSync(disk.path);
    fs.renameSync(held, disk.path);
    await store.flush({ retry: true });
    assert.equal(store.status.error, null);
    assert.equal(new Conf(options).get('projectes')[0].titol, 'newer while failed');

    // Worker crashes must reject waiters and retain queued data for restart/retry.
    store.set('projectes', [{ codi: 'PR-1', titol: 'after restart' }]);
    const lastFlush = store.flush();
    const rejectedFlush = assert.rejects(lastFlush);
    await store.worker.terminate();
    await rejectedFlush;
    await store.flush({ retry: true });
    assert.equal(new Conf(options).get('projectes')[0].titol, 'after restart');
    await store.worker.terminate();
    assert.ok(store.status.error);
    let retryStatus;
    store.on('status', status => { retryStatus = status; });
    await store.flush({ retry: true });
    assert.equal(retryStatus.error, null, 'Retry must clear the visible error even with no pending writes');
    await store.shutdown();
    assert.throws(() => store.set('projectes', []), /closed/);
    console.log('PASS: ordered/coalesced writes, durable flush, immutable input, unchanged-backup skipping, disk failure/retry and worker restart.');
  } finally {
    clearInterval(timer);
    if (!store.closed) {
      store.closed = true;
      if (store.worker) await store.worker.terminate();
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
