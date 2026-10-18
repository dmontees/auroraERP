const { app, BrowserWindow, ipcMain } = require('electron');
const Store = require('electron-store');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { handleStoreRequest } = require('../electron/store-bridge.cjs');
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-storage-smoke-'));
// Never open the user's Aurora profile or store.
app.setPath('userData', testRoot);
const outputPath = process.env.AURORA_STORAGE_TEST_OUTPUT;
const finish = (code, message) => {
  if (outputPath) fs.writeFileSync(outputPath, message);
  console.log(message);
  app.exit(code);
};
setTimeout(() => finish(1, 'Storage smoke test timed out'), 30000);
app.whenReady().then(async () => {
  try {
    const store = new Store({ cwd: testRoot, name: 'smoke-test' });
    const allowed = new Set(['facturesCompra']);
    ipcMain.on('aurora-store', (event, request) => { event.returnValue = handleStoreRequest(store, allowed, request); });
    const win = new BrowserWindow({ show: false, webPreferences: {
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      preload: path.resolve(__dirname, '../electron/preload.js'),
    } });
    const htmlPath = path.join(testRoot, 'smoke.html');
    fs.writeFileSync(htmlPath, '<!doctype html><html><body>Storage test</body></html>');
    await win.loadFile(htmlPath);
    const result = await win.webContents.executeJavaScript(`(() => {
      const api = window.electronStore;
      if (!api.isAvailable()) throw new Error('Store unavailable');
      const pdf = 'data:application/pdf;base64,' + 'a'.repeat(6 * 1024 * 1024);
      api.set('facturesCompra', [{ codi: 'TEST-1', documentPDF: pdf }]);
      const length = api.get('facturesCompra')[0].documentPDF.length;
      const stored = api.has('facturesCompra');
      let rejected = false;
      try { api.set('__not_allowed__', true); } catch { rejected = true; }
      return { length, stored, rejected, path: api.getPath(), browserStorageUsed: localStorage.length };
    })()`);
    assert.equal(result.length, 6 * 1024 * 1024 + 'data:application/pdf;base64,'.length);
    assert.equal(result.stored, true);
    assert.equal(result.rejected, true);
    assert.equal(result.path, store.path);
    assert.equal(result.browserStorageUsed, 0);
    assert.ok(fs.existsSync(store.path));
    const diskStore = new Store({ cwd: testRoot, name: 'smoke-test' });
    assert.equal(diskStore.get('facturesCompra')[0].codi, 'TEST-1');
    store.set = () => { throw new Error('EACCES: test write denied'); };
    const error = await win.webContents.executeJavaScript(`(() => {
      try { window.electronStore.set('facturesCompra', []); return ''; } catch (error) { return error.message; }
    })()`);
    assert.match(error, /EACCES/);
    finish(0, 'PASS: real sandboxed Electron preload persists a 6 MB PDF to disk, rejects unknown keys and reports write errors.');
  } catch (error) { finish(1, error.stack || String(error)); }
});
