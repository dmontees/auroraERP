const { app, BrowserWindow, ipcMain } = require('electron');
const Store = require('electron-store');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const storageRoot = process.env.AURORA_PACKAGED_STORAGE_ROOT || path.resolve(__dirname, '../electron');
const { handleStoreRequest } = require(path.join(storageRoot, 'store-bridge.cjs'));
const { withCachedReads } = require(path.join(storageRoot, 'cached-store.cjs'));
const { BackgroundStore } = require(path.join(storageRoot, 'background-store.cjs'));
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
    const CachedStore = withCachedReads(Store);
    const initialStore = new CachedStore({ cwd: testRoot, name: 'smoke-test', accessPropertiesByDotNotation: false });
    initialStore.set('largeFixture', 'A'.repeat(56 * 1024 * 1024));
    const store = new BackgroundStore(initialStore);
    const allowed = new Set(['facturesCompra', 'projectes']);
    ipcMain.on('aurora-store', (event, request) => { event.returnValue = handleStoreRequest(store, allowed, request); });
    ipcMain.handle('store-status', () => store.status);
    ipcMain.handle('store-flush', async (_, retry) => {
      try { await store.flush({ retry }); return { success: true }; }
      catch (error) { return { success: false, error: error.message }; }
    });
    const win = new BrowserWindow({ show: false, webPreferences: {
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false,
      preload: path.join(storageRoot, 'preload.js'),
    } });
    const htmlPath = path.join(testRoot, 'smoke.html');
    fs.writeFileSync(htmlPath, '<!doctype html><html><body><input id="title"><button id="module">Projectes</button><div id="view"></div></body></html>');
    await win.loadFile(htmlPath);
    store.on('status', status => win.webContents.send('store-status', status));
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
    await store.flush();
    assert.ok(fs.existsSync(store.path));
    const diskStore = new Store({ cwd: testRoot, name: 'smoke-test' });
    assert.equal(diskStore.get('facturesCompra')[0].codi, 'TEST-1');
    const interaction = win.webContents.executeJavaScript(`(async () => {
      let ticks = 0, edits = 0, navigations = 0, maxGap = 0, previous = performance.now();
      const input = document.getElementById('title');
      input.addEventListener('input', () => window.electronStore.set('projectes', [{ titol: input.value }]));
      document.getElementById('module').onclick = () => {
        window.electronStore.get('projectes');
        document.getElementById('view').textContent = 'Projectes ' + (++navigations);
      };
      const timer = setInterval(() => {
        const now = performance.now(); maxGap = Math.max(maxGap, now - previous); previous = now;
        ticks++;
        if (edits < 15) {
          input.value += 'a'; input.dispatchEvent(new Event('input')); edits++;
          document.getElementById('module').click();
        }
      }, 20);
      try {
        await new Promise(resolve => setTimeout(resolve, 650));
        const saved = await window.electron.flushStore();
        if (!saved.success) throw new Error(saved.error);
        return { ticks, edits, navigations, maxGap, title: input.value };
      } finally { clearInterval(timer); }
    })()`);
    await store.backup(path.join(testRoot, 'backup.json'));
    const responsiveness = await interaction;
    assert.equal(responsiveness.edits, 15);
    assert.equal(responsiveness.navigations, 15);
    assert.ok(responsiveness.ticks >= 15);
    assert.ok(responsiveness.maxGap < 350, `Renderer stalled: ${responsiveness.maxGap}ms`);
    assert.equal(diskStore.get('projectes')[0].titol, responsiveness.title);

    const held = `${store.path}.held`;
    fs.renameSync(store.path, held);
    fs.mkdirSync(store.path);
    const failed = await win.webContents.executeJavaScript(`(async () => {
      window.electronStore.set('projectes', [{ titol: 'retry me' }]);
      return window.electron.flushStore();
    })()`);
    assert.equal(failed.success, false);
    assert.ok((await win.webContents.executeJavaScript('window.electron.getStoreStatus()')).error);
    fs.rmdirSync(store.path);
    fs.renameSync(held, store.path);
    const retried = await win.webContents.executeJavaScript('window.electron.flushStore(true)');
    assert.equal(retried.success, true);
    assert.equal(diskStore.get('projectes')[0].titol, 'retry me');
    await store.shutdown();
    finish(0, `PASS: sandboxed Electron with 56 MB fixture; PDF persistence, 15 input edits/module switches during background writes and backup, max renderer interval ${responsiveness.maxGap.toFixed(1)}ms; disk failure and retry verified.`);
  } catch (error) { finish(1, error.stack || String(error)); }
});
