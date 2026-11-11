const { parentPort, workerData } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Conf = require('conf');
const { withCachedReads } = require('./cached-store.cjs');
const CachedConf = withCachedReads(Conf);
const { diagnose, compact } = require('./storage-maintenance.cjs');
const store = new CachedConf({
  cwd: path.dirname(workerData.path),
  configName: path.basename(workerData.path, '.json'),
  projectName: 'aurora-background-storage',
  accessPropertiesByDotNotation: false,
  schema: workerData.schema,
});

function atomicJson(filePath, json) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, json, { encoding: 'utf8', flag: 'w' });
    fs.renameSync(temporary, filePath);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

let lastBackupRevision = -1;
parentPort.on('message', ({ id, operation, changes, filePath, revision, skipUnchanged, appVersion, rootPath }) => {
  try {
    let data;
    if (operation === 'diagnose') {
      data = diagnose(store.store, store.path);
    } else if (operation === 'compact') {
      data = compact(store, rootPath, filePath);
      lastBackupRevision = -1;
    } else if (operation === 'snapshot') {
      data = store.store;
    } else if (operation === 'commit') {
      const next = store.store;
      for (const [key, change] of changes) {
        if (change.deleted) delete next[key];
        else next[key] = change.value;
      }
      store.store = next;
    } else if (operation === 'backup') {
      if (skipUnchanged && lastBackupRevision === revision && fs.existsSync(filePath)) {
        data = { skipped: true };
      } else {
        const snapshot = store.store;
        const json = JSON.stringify(snapshot, null, 2);
        atomicJson(filePath, json);
        atomicJson(`${filePath}.meta.json`, JSON.stringify({
          createdAt: new Date().toISOString(), appVersion,
          dataSchemaVersion: snapshot.dataSchemaVersion,
          sha256: crypto.createHash('sha256').update(json, 'utf8').digest('hex'),
          bytes: Buffer.byteLength(json, 'utf8'),
        }, null, 2));
        if (skipUnchanged) lastBackupRevision = revision;
        data = { skipped: false };
      }
    } else {
      throw new Error('Unknown storage worker operation');
    }
    parentPort.postMessage({ id, success: true, data });
  } catch (error) {
    parentPort.postMessage({ id, success: false, error: error.message });
  }
});
