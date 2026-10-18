import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/storageManager.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const localInvoices = [{ codi: 'FAC-1', tipus: 'factura-compra', documentPDF: 'data:application/pdf;base64,' + 'a'.repeat(6 * 1024 * 1024) }];
function setup(failInvoiceWrite = false) {
  const native = new Map();
  const local = new Map([
    ['plateaFacturesCompra', JSON.stringify(localInvoices)],
    ['plateaClients', JSON.stringify([{ codi: 'CLI-1', nomFiscal: 'Client conservat' }])],
  ]);
  const electronStore = {
    isAvailable: () => true,
    get: key => native.get(key),
    set: (key, value) => {
      if (failInvoiceWrite && key === 'facturesCompra') throw new Error('EACCES');
      native.set(key, structuredClone(value));
    },
    delete: key => native.delete(key),
  };
  const localStorage = {
    getItem: key => local.get(key) ?? null,
    setItem() { throw new Error('Native mode must not write browser storage'); },
  };
  const module = { exports: {} };
  new Function('module', 'exports', 'window', 'localStorage', 'console', outputText)(module, module.exports, { electronStore }, localStorage, { log() {}, error() {} });
  return { storage: module.exports.storage, native, local };
}
const { storage, native, local } = setup();
storage.migrateFromLocalStorage();
assert.deepEqual(native.get('facturesCompra'), localInvoices);
assert.equal(native.get('clients')[0].nomFiscal, 'Client conservat');
assert.equal(native.get('migrationCompleted'), true);
assert.equal(JSON.parse(local.get('plateaFacturesCompra'))[0].codi, 'FAC-1', 'Keep original local data');
storage.setFacturesCompra([...localInvoices, { codi: 'FAC-2', tipus: 'factura-compra' }]);
storage.migrateFromLocalStorage();
assert.equal(native.get('facturesCompra').length, 2, 'Completed migration must not overwrite newer native records');
const failed = setup(true);
failed.storage.migrateFromLocalStorage();
assert.notEqual(failed.native.get('migrationCompleted'), true, 'Partial migration remains retryable');
assert.equal(JSON.parse(failed.local.get('plateaFacturesCompra'))[0].codi, 'FAC-1');
console.log('Storage migration preserves PDFs and original local data; partial failures remain retryable.');
