const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const bytes = value => Buffer.byteLength(JSON.stringify(value) || '', 'utf8');
const embedded = value => typeof value === 'string' && /^data:[^,]*;base64,/.test(value);
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const safe = value => String(value || 'document').normalize('NFKD').replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^\.+/, '').slice(0, 70) || 'document';

function candidates(snapshot) {
  const result = [];
  for (const [collection, field, kind] of [
    ['projectes', 'fitxer', 'projecte'], ['proveidors', 'urlFitxer', 'proveidor'],
  ]) {
    for (const record of snapshot[collection] || []) {
      for (const doc of record.documents || []) {
        if (embedded(doc[field])) result.push({ collection, record, target: doc, field, kind,
          name: doc.nomFitxer || doc.nom || 'document', ref: doc.fileRef });
      }
    }
  }
  for (const [collection, kind] of [
    ['facturesVenda', 'factura-venda'], ['facturesCompra', 'factura-compra'], ['obligacionsFiscals', 'obligacio-fiscal'],
  ]) {
    for (const record of snapshot[collection] || []) {
      if (embedded(record.documentPDF)) result.push({ collection, record, target: record, field: 'documentPDF',
        kind: record.tipus === 'gasto-general' ? 'gasto-general' : kind,
        name: record.documentPDFName || `${record.codi}.pdf` });
    }
  }
  return result;
}

function diagnose(snapshot, storePath) {
  let embeddedBytes = 0, embeddedCount = 0;
  const visit = value => {
    if (embedded(value)) { embeddedBytes += bytes(value); embeddedCount++; }
    else if (value && typeof value === 'object') for (const child of Object.values(value)) visit(child);
  };
  visit(snapshot);
  const found = candidates(snapshot);
  const rows = Object.entries(snapshot).map(([key, value]) => ({ key, bytes: bytes(value) })).sort((a, b) => b.bytes - a.bytes);
  return {
    fileBytes: fs.statSync(storePath).size,
    embeddedBytes, embeddedCount,
    transferableCount: found.length,
    transferableBytes: found.reduce((sum, item) => sum + bytes(item.target[item.field]), 0),
    rows,
  };
}

function decode(value) {
  const comma = value.indexOf(',');
  const payload = value.slice(comma + 1).replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload) || payload.replace(/=+$/, '').length % 4 === 1) throw new Error('Base64 invàlid');
  const buffer = Buffer.from(payload, 'base64');
  if (!buffer.length || buffer.toString('base64').replace(/=+$/, '') !== payload.replace(/=+$/, '')) throw new Error('Base64 invàlid o buit');
  return { buffer, mimeType: value.slice(5, comma).split(';')[0] || 'application/octet-stream' };
}

function inside(root, target) { return target === root || target.startsWith(`${root}${path.sep}`); }
function destination(root, relativePath, create = false) {
  if (!relativePath || path.isAbsolute(relativePath)) throw new Error('Ruta documental invàlida');
  const target = path.resolve(root, relativePath);
  if (!inside(root, target) || target === root) throw new Error('Ruta fora de la carpeta documental');
  const parts = path.relative(root, target).split(path.sep);
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    if (create && i < parts.length - 1 && !fs.existsSync(current)) fs.mkdirSync(current);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('No es poden seguir enllaços simbòlics');
  }
  return target;
}

function verifiedFile(root, ref, buffer) {
  const target = destination(root, ref.relativePath);
  return fs.existsSync(target) && fs.statSync(target).isFile()
    && fs.statSync(target).size === buffer.length && hash(fs.readFileSync(target)) === hash(buffer);
}

// Called only in the storage worker, under the main-process maintenance lock.
// All binary copies are verified before a single atomic JSON commit. Failures
// leave their original fields intact; the full pre-migration JSON is retained.
function compact(store, rootPath, backupFile) {
  const configuredRoot = store.get('parametres')?.gestorDocumental?.rootPath;
  if (!configuredRoot || path.resolve(rootPath) !== path.resolve(configuredRoot) || path.basename(rootPath) !== 'Aurora') {
    throw new Error('Configura la carpeta documental a Paràmetres abans de continuar.');
  }
  const root = fs.realpathSync(rootPath);
  if (!fs.statSync(root).isDirectory()) throw new Error('La carpeta documental no està disponible.');
  // Never mutate Conf's committed snapshot before persistence succeeds.
  const snapshot = structuredClone(store.store);
  const found = candidates(snapshot);
  const beforeBytes = fs.statSync(store.path).size;
  if (!found.length) return { snapshot, migrated: 0, errors: [], beforeBytes, afterBytes: beforeBytes, backupFile: null };
  // Exclusive copy and fsync: never replace a previous recovery copy.
  fs.mkdirSync(path.dirname(backupFile), { recursive: true });
  fs.copyFileSync(store.path, backupFile, fs.constants.COPYFILE_EXCL);
  if (hash(fs.readFileSync(backupFile)) !== hash(fs.readFileSync(store.path))) throw new Error('No s’ha pogut verificar la còpia del JSON original.');
  const descriptor = fs.openSync(backupFile, 'r+');
  try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
  const errors = [];
  let migrated = 0;
  for (const item of found) {
    try {
      const { buffer, mimeType } = decode(item.target[item.field]);
      const sha256 = hash(buffer);
      let ref = item.ref;
      if (ref) {
        if (!verifiedFile(root, ref, buffer)) throw new Error('La còpia externa no coincideix; es conserva l’adjunt incrustat');
      } else {
        // Reuse old migration copies only when their actual content matches.
        ref = (item.target.documentsGenerats || []).find(existing => {
          try { return verifiedFile(root, existing, buffer); } catch { return false; }
        });
        if (!ref) {
          const extension = ({ 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' })[mimeType]
            || safe(path.extname(item.name).slice(1) || 'bin');
          const relativePath = ['00_Sistema', 'adjunts-migrats', item.collection, safe(item.record.codi), `${safe(path.parse(item.name).name)}_${sha256}.${extension}`].join('/');
          const target = destination(root, relativePath, true);
          if (!fs.existsSync(target)) {
            const fd = fs.openSync(target, 'wx');
            try { fs.writeFileSync(fd, buffer); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
          }
          if (!verifiedFile(root, { relativePath }, buffer)) throw new Error('No s’ha pogut verificar la còpia externa');
          const refs = item.target.documentsGenerats || [];
          ref = {
            id: crypto.randomUUID(), kind: item.kind,
            ownerType: item.kind === 'projecte' ? 'projecte' : item.kind === 'proveidor' ? 'proveidor' : 'fiscal',
            ownerCodi: item.record.codi, displayName: item.target.nom || item.name, originalName: item.name,
            relativePath, mimeType, size: buffer.length, sha256,
            version: Math.max(0, ...refs.map(existing => existing.version || 0)) + 1,
            current: !refs.some(existing => existing.current), generated: false,
            migratedFromBase64: true, createdAt: new Date().toISOString(),
          };
          if (item.field === 'documentPDF') item.target.documentsGenerats = [...refs, ref];
        }
      }
      ref = { ...ref, sha256, size: buffer.length, mimeType: ref.mimeType || mimeType, migratedFromBase64: true };
      if (item.field === 'documentPDF') {
        item.target.documentsGenerats = (item.target.documentsGenerats || []).map(existing => existing.id === ref.id ? ref : existing);
        delete item.target.documentPDF;
      }
      else {
        item.target.fileRef = ref;
        if (item.field === 'urlFitxer') item.target.urlFitxer = ref.relativePath;
        else delete item.target.fitxer;
      }
      migrated++;
    } catch (error) { errors.push(`${item.record.codi}/${item.name}: ${error.message}`); }
  }
  if (migrated) store.store = snapshot;
  return { snapshot: store.store, migrated, errors, beforeBytes, afterBytes: fs.statSync(store.path).size, backupFile };
}

module.exports = { diagnose, compact };
