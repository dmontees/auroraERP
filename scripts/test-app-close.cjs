// End-to-end: real main process, preload and built React app, isolated profile.
// Run with Electron after npm run build. The window stays hidden.
const electron = require('electron');
const { app, BrowserWindow } = electron;
const Module = require('node:module');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const Store = require('electron-store');
const maintenanceMode = process.argv.includes('--maintenance');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-app-close-'));
app.setPath('userData', root);
process.env.NODE_ENV = 'development';
let expectedTitle = null;
const closeErrors = [];
const rendererErrors = [];
let completed = false;
const report = (code, message) => {
  if (code && rendererErrors.length) message += '\nRenderer: ' + rendererErrors.join('\n');
  completed = true;
  if (process.env.AURORA_STORAGE_TEST_OUTPUT) fs.writeFileSync(process.env.AURORA_STORAGE_TEST_OUTPUT, message);
  console.log(message);
  if (code) app.exit(code);
};
const timeout = setTimeout(() => { report(1, 'FAIL: real app close timed out'); }, 30000);

class HiddenWindow extends BrowserWindow {
  constructor(options) {
    super({ ...options, show: false, webPreferences: { ...options.webPreferences, backgroundThrottling: false } });
    this.webContents.openDevTools = () => {};
  }
  loadURL() { return this.loadFile(path.resolve(__dirname, '../dist/index.html')); }
}

app.whenReady().then(async () => {
  const disk = new Store({ cwd: root, name: 'aurora-data' });
  disk.store = {
    legacyFixture: 'A'.repeat(56 * 1024 * 1024),
    clients: [{ codi: 'CLI-1', nomFiscal: 'Synthetic client', nomComercial: 'Synthetic client', tipusIVA: 'Normal', retencio: 0 }],
    projectes: [{
      codi: 'PR-00001', titol: 'Synthetic project', client: 'CLI-1', estat: 'esborrany',
      descripcio: '', modalitat: '', servei: '', esDirect: false, datesRodatge: [], datesEntrega: [],
      recursosHumans: [], materials: [], tasques: [], historial: [], ingresSenseIVA: 0,
      iva: 21, ingresAmbIVA: 0, gastosMaterials: 0, gastosHumans: 0, gastosTotals: 0,
      benefici: 0, percentBenefici: 0, instruccionsClient: '', instruccionsProveidors: '',
      facturat: false, arxivat: false,
    }],
    migrationCompleted: true, migrationV2Completed: true, migrationV3Completed: true,
    migrationV4Completed: true, migrationV5Completed: true, dataSchemaVersion: 5,
  };
  if (maintenanceMode) {
    const data = disk.store;
    delete data.legacyFixture;
    const documentRoot = path.join(root, 'Aurora');
    fs.mkdirSync(documentRoot);
    data.parametres = { gestorDocumental: { rootPath: documentRoot } };
    data.projectes[0].documents = [{ id: 'legacy', nom: 'Synthetic PDF', nomFitxer: 'synthetic.pdf',
      fitxer: 'data:application/pdf;base64,' + 'A'.repeat(56 * 1024 * 1024) }];
    disk.store = data;
  }
  const created = new Promise(resolve => app.once('browser-window-created', (_, win) => resolve(win)));
  const originalLoad = Module._load;
  Module._load = function(name, parent, ...rest) {
    if (name === 'electron' && parent?.filename === path.resolve(__dirname, '../electron/main.cjs')) {
      return { ...electron, BrowserWindow: HiddenWindow,
        dialog: { ...electron.dialog, showErrorBox: (...args) => closeErrors.push(args) },
      };
    }
    return originalLoad.call(this, name, parent, ...rest);
  };
  require('../electron/main.cjs');
  Module._load = originalLoad;
  const win = await created;
  win.webContents.on('console-message', (_, level, message) => { if (level >= 2) rendererErrors.push(message); });
  await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
  expectedTitle = await win.webContents.executeJavaScript(`(async () => {
    async function until(find) {
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) { const element = find(); if (element) return element; await new Promise(r => setTimeout(r, 30)); }
      throw new Error('App element not found: ' + document.body.textContent.slice(-500));
    }
    (await until(() => document.querySelector('button[title="Gestió de projectes"]') || [...document.querySelectorAll('.nav-item')].find(b => b.textContent.trim() === 'Projectes'))).click();
    (await until(() => [...document.querySelectorAll('tr')].find(row => row.textContent.includes('Synthetic project')))).click();
    (await until(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Dades Generals'))).click();
    const input = await until(() => document.querySelector('input[placeholder="Títol descriptiu del projecte..."]'));
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const letter of ' final edit') {
      setValue.call(input, input.value + letter);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 15));
    }
    return input.value;
  })()`);
  assert.equal(expectedTitle, 'Synthetic project final edit');
  if (maintenanceMode) {
    await win.webContents.executeJavaScript(`(async () => {
      async function until(find) {
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) { const value = find(); if (value) return value; await new Promise(r => setTimeout(r, 30)); }
        throw new Error('Maintenance UI not found: ' + document.body.textContent.slice(-1000));
      }
      document.querySelector('button[title="Configuració"]').click();
      (await until(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Analitzar l’espai ocupat')))).click();
      const compact = await until(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Traslladar adjunts i reduir el JSON') && !b.disabled));
      window.confirm = () => true;
      compact.click();
      await until(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Recarregar Aurora i continuar')));
      if (!document.body.textContent.includes('1 adjunts verificats i traslladats')) throw new Error('Migration result missing');
      let blocked = false;
      try { window.electronStore.set('projectes', []); } catch { blocked = true; }
      if (!blocked) throw new Error('Stale form was allowed to overwrite migrated data');
    })()`);
    const reloaded = new Promise(resolve => win.webContents.once('did-finish-load', resolve));
    await win.webContents.executeJavaScript(`document.querySelector('[aria-label="Optimització de dades"] button').click()`);
    await reloaded;
    const after = await win.webContents.executeJavaScript(`window.electronStore.get('projectes')`);
    assert.equal(after[0].documents[0].fitxer, undefined);
    assert.ok(after[0].documents[0].fileRef.relativePath);
    const diagnostic = await win.webContents.executeJavaScript('window.electron.diagnoseStorage()');
    assert.equal(diagnostic.transferableCount, 0);
    assert.ok(diagnostic.fileBytes < 100000, '56 MB attachment should be replaced by a small reference');
    await win.webContents.executeJavaScript(`window.electronStore.set('navigateTo', null)`);
    // Wait for React to register its close handler after the reload.
    await win.webContents.executeJavaScript(`new Promise(resolve => setTimeout(resolve, 300))`);
    win.close();
    return;
  }
  // Fail the disk before closing, while the final debounce is still pending.
  const filePath = path.join(root, 'aurora-data.json');
  const heldPath = `${filePath}.held`;
  fs.renameSync(filePath, heldPath);
  fs.mkdirSync(filePath);
  win.close();
  const deadline = Date.now() + 5000;
  while (!closeErrors.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(closeErrors.length, 1, 'A failed local save must prevent closing');
  assert.equal(win.isDestroyed(), false);
  assert.ok((await win.webContents.executeJavaScript('window.electron.getStoreStatus()')).error);
  fs.rmdirSync(filePath);
  fs.renameSync(heldPath, filePath);
  const saved = await win.webContents.executeJavaScript('window.electron.flushStore(true)');
  assert.equal(saved.success, true);
  // No cloud is configured; retrying close must still finish promptly.
  win.close();
}).catch(error => report(1, error.stack || String(error)));

app.on('will-quit', event => {
  if (completed) return;
  try {
    assert.ok(expectedTitle, 'Close must happen after the final edit');
    const data = JSON.parse(fs.readFileSync(path.join(root, 'aurora-data.json'), 'utf8'));
    const backup = JSON.parse(fs.readFileSync(path.join(root, 'aurora-backup.json'), 'utf8'));
    assert.equal(data.projectes[0].titol, expectedTitle);
    assert.equal(backup.projectes[0].titol, expectedTitle);
    if (maintenanceMode) {
      assert.equal(data.navigateTo, null);
      const ref = data.projectes[0].documents[0].fileRef;
      const content = fs.readFileSync(path.join(root, 'Aurora', ref.relativePath));
      assert.equal(content.length, 42 * 1024 * 1024);
      assert.equal(require('node:crypto').createHash('sha256').update(content).digest('hex'), ref.sha256);
      const original = fs.readdirSync(root).find(name => name.startsWith('aurora-before-compact-'));
      assert.ok(original);
      assert.ok(JSON.parse(fs.readFileSync(path.join(root, original), 'utf8')).projectes[0].documents[0].fitxer);
    } else assert.equal(data.legacyFixture.length, 56 * 1024 * 1024);
    clearTimeout(timeout);
    report(0, maintenanceMode
      ? 'PASS: real React settings diagnose/extract a 56 MB embedded attachment, verify backup and SHA-256, block stale writes, reload with external reference and close with a small JSON.'
      : 'PASS: real React app with 56 MB opens/edits a project; immediate close flushes the final debounce, disk failure keeps the app open, retry persists the edit in store and backup and closes without cloud sync.');
  } catch (error) {
    event.preventDefault();
    report(1, error.stack || String(error));
  }
});
