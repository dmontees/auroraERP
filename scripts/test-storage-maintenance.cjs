const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const Conf = require('conf');
const { withCachedReads } = require('../electron/cached-store.cjs');
const { BackgroundStore } = require('../electron/background-store.cjs');
const { diagnose, compact } = require('../electron/storage-maintenance.cjs');
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const dataURL = buffer => `data:application/pdf;base64,${buffer.toString('base64')}`;

async function main() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-maintenance-'));
  const root = path.join(temporary, 'Aurora');
  fs.mkdirSync(root);
  const CachedConf = withCachedReads(Conf);
  const options = { cwd: temporary, configName: 'store', projectName: 'aurora-test', accessPropertiesByDotNotation: false };
  const store = new CachedConf(options);
  const payload = Buffer.from('%PDF-1.4\n' + 'synthetic bytes\n'.repeat(5000));
  const embedded = dataURL(payload);
  const existing = { id: 'old-copy', relativePath: 'existing.pdf', version: 1, current: true, displayName: 'Original' };
  fs.writeFileSync(path.join(root, 'existing.pdf'), payload);
  store.store = {
    parametres: { gestorDocumental: { rootPath: root } },
    projectes: [{ codi: 'PR-1', titol: 'Keep this title', historial: [{ descripcio: 'Keep audit' }], documents: [
      { id: 'one', nom: 'Contracte', nomFitxer: '../same.pdf', fitxer: embedded },
      { id: 'two', nom: 'Contracte', nomFitxer: '../same.pdf', fitxer: embedded },
      { id: 'missing', nom: 'Missing external', fitxer: embedded, fileRef: { id: 'missing-ref', relativePath: 'missing.pdf' } },
    ] }],
    proveidors: [{ codi: 'PRO-1', imatgePerfil: embedded, documents: [{ id: 'p-doc', nom: 'Contract.pdf', urlFitxer: embedded }] }],
    facturesVenda: [{ codi: 'FAV-1', totalFactura: 123.45, documentsGenerats: [existing], documentPDF: embedded }],
    facturesCompra: [{ codi: 'FAC-1', totalGasto: 9.98, pagaments: [{ import: 9.98 }], documentPDF: embedded }],
    obligacionsFiscals: [{ codi: 'OF-1', documentPDF: 'data:application/pdf;base64,%%%invalid' }],
  };
  const before = fs.readFileSync(store.path);
  const diagnostic = diagnose(store.store, store.path);
  assert.equal(diagnostic.fileBytes, before.length);
  assert.equal(diagnostic.transferableCount, 7);
  assert.equal(diagnostic.embeddedCount, 8);
  assert.ok(diagnostic.rows[0].bytes >= diagnostic.rows[1].bytes);
  assert.ok(!JSON.stringify(diagnostic).includes('synthetic bytes'));
  const backup = path.join(temporary, 'before.json');
  const result = compact(store, root, backup);
  assert.equal(result.migrated, 5);
  assert.equal(result.errors.length, 2);
  assert.deepEqual(fs.readFileSync(backup), before);
  assert.ok(result.afterBytes < result.beforeBytes / 2);
  const snapshot = store.store;
  const docs = snapshot.projectes[0].documents;
  assert.equal(docs[0].fitxer, undefined);
  assert.equal(docs[0].fileRef.relativePath, docs[1].fileRef.relativePath, 'Identical content safely reuses its destination');
  assert.equal(hash(fs.readFileSync(path.join(root, docs[0].fileRef.relativePath))), hash(payload));
  assert.equal(docs[2].fitxer, embedded, 'Missing external copy must retain its source');
  assert.equal(snapshot.proveidors[0].imatgePerfil, embedded, 'Profile images are preserved');
  assert.equal(snapshot.proveidors[0].documents[0].urlFitxer.startsWith('data:'), false);
  assert.equal(snapshot.facturesVenda[0].documentsGenerats.length, 1, 'Existing verified copy is reused');
  assert.equal(snapshot.facturesVenda[0].documentPDF, undefined);
  assert.equal(snapshot.facturesVenda[0].totalFactura, 123.45);
  assert.deepEqual(snapshot.facturesCompra[0].pagaments, [{ import: 9.98 }]);
  assert.deepEqual(snapshot.projectes[0].historial, [{ descripcio: 'Keep audit' }]);
  assert.equal(snapshot.obligacionsFiscals[0].documentPDF.includes('invalid'), true);
  const again = compact(store, root, path.join(temporary, 'again.json'));
  assert.equal(again.migrated, 0);
  assert.equal(again.afterBytes, result.afterBytes);

  // Traversal references cannot cause reads outside the configured root.
  fs.writeFileSync(path.join(temporary, 'outside.pdf'), payload);
  store.set('projectes', [{ codi: 'PR-2', documents: [{ id: 'bad', nom: 'Bad path', fitxer: embedded, fileRef: { relativePath: '../outside.pdf' } }] }]);
  const rejectedPath = compact(store, root, path.join(temporary, 'traversal.json'));
  assert.equal(rejectedPath.migrated, 0);
  assert.match(rejectedPath.errors[0], /fora/);
  assert.equal(store.get('projectes')[0].documents[0].fitxer, embedded);

  store.set('projectes', [{ codi: 'PR-3', documents: [{ id: 'keep', nom: 'Keep on failure', fitxer: embedded }] }]);
  const intact = fs.readFileSync(store.path);
  const write = store._write;
  store._write = () => { throw new Error('ENOSPC: simulated full disk'); };
  assert.throws(() => compact(store, root, path.join(temporary, 'failed.json')), /ENOSPC/);
  assert.deepEqual(fs.readFileSync(store.path), intact);
  assert.equal(store.get('projectes')[0].documents[0].fitxer, embedded);
  store._write = write;
  assert.throws(() => compact(store, root, backup), /EEXIST/, 'Recovery copies must never be overwritten');
  assert.deepEqual(fs.readFileSync(backup), before);

  const live = new BackgroundStore(store);
  try {
    const pending = live.compact(root, path.join(temporary, 'worker.json'));
    assert.throws(() => live.set('projectes', []), /optimitzant/);
    const migrated = await pending;
    assert.equal(migrated.migrated, 1);
    assert.equal(live.get('projectes')[0].documents[0].fitxer, undefined);
    assert.throws(() => live.delete('projectes'), /optimitzant/, 'Stale renderer stays blocked until reload');
    live.finishMaintenance();
    live.set('safeAfterReload', true);
    await live.flush();
    assert.equal((await live.diagnose()).fileBytes, fs.statSync(store.path).size);
    await assert.rejects(live.compact(path.join(temporary, 'wrong-root'), path.join(temporary, 'wrong.json')));
    assert.equal(live.maintenance, false, 'Failed preparation must release the lock');
    await live.shutdown();
  } finally {
    if (!live.closed && live.worker) { live.closed = true; await live.worker.terminate(); }
  }
  assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
  assert.match(path.basename(temporary), /^aurora-maintenance-/);
  fs.rmSync(temporary, { recursive: true, force: true });
  console.log('PASS: exact diagnostic size, verified extraction/reuse, original backup, unchanged accounting/audit, invalid/missing/traversal protection, failed writes, idempotency and worker maintenance lock.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
