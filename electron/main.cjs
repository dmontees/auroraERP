const { app, BrowserWindow, ipcMain, shell, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const JSZip = require('jszip');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const {
  GITHUB_LATEST_MAC_YML,
  GITHUB_RELEASES_API,
  compareSemver,
  isNewer,
  parseLatestMacYml,
  parseSemver,
  selectMacDmgAsset
} = require('./updater-utils.cjs');

let backupInterval = null;
let mainWindow = null;
let pendingUpdateInfo = null; // cache per si el renderer no estava llest quan va arribar l'event
let isQuitting = false;       // flag per al tancament controlat via sync

const LOCAL_BACKUP_RETENTION = 30;
const BACKUP_RESTORE_ALLOWED_KEYS = new Set([
  'clients',
  'proveidors',
  'projectes',
  'facturesVenda',
  'facturesCompra',
  'pressupostos',
  'obligacionsFiscals',
  'albaransCompra',
  'parametres',
  'partsTreball',
  'cronometre',
  'settings',
  'esdevenimentsPersonalitzats',
  'googleCalendarToken',
  'webSyncConfig',
  'verifactuConfig',
  'verifactuCertificatP12',
  'lastCloudBackup',
  'version',
  'dataSchemaVersion',
  'migrationCompleted',
  'migrationV2Completed',
  'migrationV3Completed',
  'migrationV4Completed',
  'migrationV5Completed'
]);

const IMPORT_DATA_ALLOWED_KEYS = new Set([
  'clients',
  'proveidors',
  'projectes',
  'facturesVenda',
  'facturesCompra',
  'pressupostos',
  'obligacionsFiscals',
  'albaransCompra',
  'parametres',
  'partsTreball',
  'cronometre',
  'settings',
  'esdevenimentsPersonalitzats',
  'googleCalendarToken',
  'webSyncConfig',
  'verifactuConfig',
  'verifactuCertificatP12',
  'lastCloudBackup',
  'version',
  'dataSchemaVersion',
  'migrationCompleted',
  'migrationV2Completed',
  'migrationV3Completed',
  'migrationV4Completed',
  'migrationV5Completed'
]);

// Inicializar electron-store
const store = new Store({
  name: 'aurora-data',
  defaults: {
    clients: [],
    proveidors: [],
    projectes: [],
    facturesVenda: [],
    facturesCompra: [],
    pressupostos: [],
    obligacionsFiscals: [],
    albaransCompra: [],
    parametres: {
      categories: [],
      serveis: [],
      unitats: [],
      tarifes: [],
      materials: [],
      grupsMaterials: [],
      plantilles: []
    },
    partsTreball: [],
    version: '3.0.14',
    dataSchemaVersion: 5,
    migrationCompleted: false
  },
  // Opcional: schema validation
  schema: {
    clients: { type: 'array' },
    facturesVenda: { type: 'array' },
    projectes: { type: 'array' },
    version: { type: 'string' },
    dataSchemaVersion: { type: 'number' }
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Aurora ERP',
    backgroundColor: '#1a1a1a'
  });

  // Restaurar backup si existe (por compatibilidad)
  restoreBackupIfNeeded();
  backupElectronStoreSnapshotIfMeaningful('aurora-startup');

  // Cargar aplicación
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.setMenuBarVisibility(false);

  // BACKUP AUTOMÁTICO cada 30 segundos (ahora de electron-store)
  backupInterval = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      backupElectronStore();
    } else {
      if (backupInterval) {
        clearInterval(backupInterval);
        backupInterval = null;
      }
    }
  }, 30000);

  // Interceptar el tancament per donar temps al renderer de sincronitzar
  mainWindow.on('close', (e) => {
    if (backupInterval) { clearInterval(backupInterval); backupInterval = null; }

    if (!isQuitting) {
      e.preventDefault(); // atura el tancament
      mainWindow.webContents.send('app-will-close');
      console.log('🔄 Esperant sync del renderer abans de tancar...');

      // Timeout de seguretat: si el renderer no respon en 10 s, tanquem igualment
      setTimeout(() => {
        if (!isQuitting) {
          console.warn('⚠️  Timeout sync en tancar — forçant tancament');
          isQuitting = true;
          backupElectronStore();
          mainWindow.destroy();
        }
      }, 10000);
    } else {
      // Tancament confirmat pel renderer — backup local final
      if (!mainWindow.isDestroyed()) {
        try { backupElectronStore(); } catch { /* ignore */ }
      }
    }
  });

  mainWindow.on('closed', () => {
    if (backupInterval) {
      clearInterval(backupInterval);
      backupInterval = null;
    }
    mainWindow = null;
  });

  // CONFIGURAR AUTO-UPDATER — comprova a l'arrencada, després que React hagi muntat
  if (process.env.NODE_ENV !== 'development') {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        if (process.platform === 'darwin') {
          checkForUpdatesMac();
        } else {
          autoUpdater.setFeedURL({
            provider: 'github',
            owner: 'dmontees',
            repo: 'auroraERP'
          });
          autoUpdater.checkForUpdatesAndNotify();
        }
      }, 3000); // marge perquè els useEffect de React es registrin
    });
  }
}

// ============================================
// ACTUALITZACIONS macOS (via GitHub API + DMG manual)
// ============================================

function fetchGitHubReleases() {
  return new Promise((resolve, reject) => {
    let body = '';
    let settled = false;

    const request = net.request({
      method: 'GET',
      url: `${GITHUB_RELEASES_API}?per_page=10`,
      redirect: 'follow'
    });
    request.setHeader('User-Agent', `Aurora-ERP-Updater/${app.getVersion()}`);
    request.setHeader('Accept', 'application/vnd.github.v3+json');

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      request.abort();
      reject(new Error('Timeout comprovant actualitzacions a GitHub'));
    }, 15000);

    request.on('response', (response) => {
      response.on('data', chunk => { body += chunk.toString(); });
      response.on('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GitHub API HTTP ${response.statusCode}: ${body.substring(0, 250)}`));
          return;
        }

        try {
          const releases = JSON.parse(body);
          resolve(Array.isArray(releases) ? releases : []);
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });

    request.end();
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    let body = '';
    let settled = false;

    const request = net.request({
      method: 'GET',
      url,
      redirect: 'follow'
    });
    request.setHeader('User-Agent', `Aurora-ERP-Updater/${app.getVersion()}`);

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      request.abort();
      reject(new Error('Timeout comprovant actualitzacions a GitHub'));
    }, 15000);

    request.on('response', (response) => {
      response.on('data', chunk => { body += chunk.toString(); });
      response.on('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (response.statusCode < 200 || response.statusCode >= 300) {
          const inaccessibleRelease = response.statusCode === 404
            ? '. La release no es accessible publicament; comprova si el repositori/releases son privats.'
            : '';
          reject(new Error(`GitHub HTTP ${response.statusCode}${inaccessibleRelease}: ${body.substring(0, 250)}`));
          return;
        }

        resolve(body);
      });
    });

    request.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });

    request.end();
  });
}

function sendUpdateError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-error', { message });
  }
}

async function checkForUpdatesMac() {
  const currentVersion = app.getVersion();

  const sendNotAvailable = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available');
    }
  };

  try {
    try {
      const latestMacYml = await fetchText(GITHUB_LATEST_MAC_YML);
      const latestMac = parseLatestMacYml(latestMacYml);
      if (latestMac) {
        if (!isNewer(latestMac.version, currentVersion)) {
          console.log(`✅ Aurora està actualitzat (${currentVersion})`);
          sendNotAvailable();
          return;
        }

        console.log(`✅ Nova versió macOS disponible: ${latestMac.version}`);
        console.log(`📦 Asset seleccionat: ${latestMac.assetName}`);

        pendingUpdateInfo = {
          version: latestMac.version,
          downloadUrl: latestMac.downloadUrl,
          releaseUrl: latestMac.releaseUrl,
          assetName: latestMac.assetName,
          manual: true
        };

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-available', pendingUpdateInfo);
        }
        return;
      }
    } catch (metadataError) {
      console.warn('⚠️ No sha pogut llegir latest-mac.yml, provant API de releases:', metadataError);
    }

    const releases = await fetchGitHubReleases();
    const candidates = releases
      .filter(release => !release.draft)
      .map(release => ({ release, version: parseSemver(release.tag_name || release.name) }))
      .filter(item => item.version)
      .sort((a, b) => compareSemver(b.version, a.version));

    const latest = candidates[0];
    if (!latest || !isNewer(latest.version.raw, currentVersion)) {
      console.log(`✅ Aurora està actualitzat (${currentVersion})`);
      sendNotAvailable();
      return;
    }

    const dmgAsset = selectMacDmgAsset(latest.release);
    const downloadUrl = dmgAsset?.browser_download_url || latest.release.html_url;

    console.log(`✅ Nova versió macOS disponible: ${latest.version.raw}`);
    console.log(`📦 Asset seleccionat: ${dmgAsset?.name || 'pagina de release'}`);

    pendingUpdateInfo = {
      version: latest.version.raw,
      downloadUrl,
      releaseUrl: latest.release.html_url,
      assetName: dmgAsset?.name || null,
      manual: true
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', pendingUpdateInfo);
    }
  } catch (e) {
    console.error('❌ Error comprovant actualitzacions (macOS):', e);
    sendUpdateError(e);
  }
}

// ============================================
// FUNCIONES DE BACKUP Y RESTAURACIÓN
// ============================================

function backupElectronStore() {
  try {
    const userDataPath = app.getPath('userData');
    const backupFile = path.join(userDataPath, 'aurora-backup.json');
    
    // Leer todos los datos del store
    
    // Guardar backup con formato legible
    writeJsonAtomically(backupFile, store.store);
    console.log('✅ Backup de electron-store guardado:', backupFile);
  } catch (error) {
    console.error('❌ Error al guardar backup de electron-store:', error);
  }
}

function backupElectronStoreSnapshot(prefix) {
  try {
    const userDataPath = getLocalBackupsPath();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(userDataPath, `${prefix}-${timestamp}.json`);
    writeJsonAtomically(backupFile, store.store);
    pruneLocalBackups(userDataPath, LOCAL_BACKUP_RETENTION);
    console.log('✅ Snapshot de seguretat guardat:', backupFile);
    return backupFile;
  } catch (error) {
    console.error('❌ Error guardant snapshot de seguretat:', error);
    return null;
  }
}

function backupElectronStoreSnapshotIfMeaningful(prefix) {
  if (!hasMeaningfulStoreData(store.store)) return null;
  return backupElectronStoreSnapshot(prefix);
}

function getLocalBackupsPath() {
  const backupsPath = path.join(app.getPath('userData'), 'backups');
  fs.mkdirSync(backupsPath, { recursive: true });
  return backupsPath;
}

function writeJsonAtomically(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const json = JSON.stringify(data, null, 2);
  const hash = crypto.createHash('sha256').update(json, 'utf8').digest('hex');
  const tmpFile = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  const metaFile = `${filePath}.meta.json`;

  fs.writeFileSync(tmpFile, json, 'utf-8');
  fs.renameSync(tmpFile, filePath);
  fs.writeFileSync(metaFile, JSON.stringify({
    createdAt: new Date().toISOString(),
    sha256: hash,
    bytes: Buffer.byteLength(json, 'utf8'),
    appVersion: app.getVersion(),
    dataSchemaVersion: store.get('dataSchemaVersion')
  }, null, 2), 'utf-8');
}

function pruneLocalBackups(backupsPath, keep) {
  const entries = fs.readdirSync(backupsPath)
    .filter(name => name.endsWith('.json') && !name.endsWith('.meta.json'))
    .map(name => {
      const fullPath = path.join(backupsPath, name);
      const stat = fs.statSync(fullPath);
      return { name, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const entry of entries.slice(keep)) {
    try {
      fs.unlinkSync(entry.fullPath);
      const metaFile = `${entry.fullPath}.meta.json`;
      if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);
    } catch (error) {
      console.warn('No sha pogut eliminar backup antic:', entry.name, error.message);
    }
  }
}

function hasMeaningfulStoreData(data) {
  if (!data || typeof data !== 'object') return false;

  const criticalArrayKeys = [
    'clients',
    'proveidors',
    'projectes',
    'facturesVenda',
    'facturesCompra',
    'pressupostos',
    'obligacionsFiscals',
    'albaransCompra',
    'partsTreball'
  ];
  const hasCriticalData = criticalArrayKeys.some((key) => {
    const value = data[key];
    return Array.isArray(value) && value.length > 0;
  });
  const hasMeaningfulParametres = data.parametres
    && typeof data.parametres === 'object'
    && Object.values(data.parametres).some((value) => Array.isArray(value) ? value.length > 0 : !!value);

  return hasCriticalData || hasMeaningfulParametres;
}

function filterRestorableBackupData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Backup local invalid: no es un objecte JSON');
  }

  const filtered = {};
  for (const [key, value] of Object.entries(data)) {
    if (BACKUP_RESTORE_ALLOWED_KEYS.has(key)) {
      filtered[key] = value;
    }
  }

  if (!hasMeaningfulStoreData(filtered)) {
    throw new Error('Backup local invalid: no conte dades operatives');
  }

  return filtered;
}

function stripForCloudBackup(data) {
  const sensitiveKeys = new Set([
    'googleCalendarToken',
    'verifactuCertificatP12'
  ]);

  const strip = (value) => {
    if (Array.isArray(value)) return value.map(item => strip(item));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, child] of Object.entries(value)) {
        if (sensitiveKeys.has(key)) continue;
        if (key === 'webSyncConfig' && child && typeof child === 'object') {
          const { apiKey, ...safeConfig } = child;
          void apiKey;
          out[key] = strip(safeConfig);
          continue;
        }
        if (['fitxer', 'imatgePerfil', 'imatgeReferencia', 'documentPDF'].includes(key)) continue;
        if (key === 'documentPDFName' && value.documentPDF === undefined) {
          out[key] = child;
          continue;
        }
        out[key] = strip(child);
      }
      return out;
    }
    return value;
  };

  return strip(data);
}

const DOCUMENT_BASE_STRUCTURE = [
  ['00_Sistema'],
  ['00_Sistema', 'paperera'],
  ['00_Sistema', 'pendents-de-revisar'],
  ['Clients'],
  ['Proveidors'],
  ['Fiscal']
];

function isInsidePath(parentPath, childPath) {
  const parent = path.resolve(parentPath);
  const child = path.resolve(childPath);
  return child === parent || child.startsWith(`${parent}${path.sep}`);
}

function resolveDocumentRoot(rootPath) {
  if (!rootPath || typeof rootPath !== 'string') {
    throw new Error('Ruta documental no configurada');
  }
  const root = path.resolve(rootPath);
  if (path.basename(root) !== 'Aurora') {
    throw new Error('La carpeta documental ha de dir-se Aurora');
  }
  return root;
}

function resolveDocumentPath(rootPath, relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('Ruta relativa no valida');
  }
  if (path.isAbsolute(relativePath)) {
    throw new Error('La ruta del document ha de ser relativa');
  }

  const root = resolveDocumentRoot(rootPath);
  const target = path.resolve(root, relativePath);
  if (!isInsidePath(root, target)) {
    throw new Error('La ruta del document queda fora de la carpeta documental');
  }
  return { root, target };
}

function ensureDocumentBaseStructure(rootPath) {
  const root = resolveDocumentRoot(rootPath);
  fs.mkdirSync(root, { recursive: true });
  for (const parts of DOCUMENT_BASE_STRUCTURE) {
    fs.mkdirSync(path.join(root, ...parts), { recursive: true });
  }
  const indexPath = path.join(root, '00_Sistema', 'index-documental.json');
  if (!fs.existsSync(indexPath)) {
    writeJsonAtomically(indexPath, {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      documents: []
    });
  }
  return root;
}

function getDocumentFileInfo(rootPath, relativePath, includeHash = false) {
  const { target } = resolveDocumentPath(rootPath, relativePath);
  if (!fs.existsSync(target)) {
    return { exists: false, relativePath };
  }

  const stat = fs.statSync(target);
  if (!stat.isFile()) {
    return { exists: false, relativePath };
  }

  const info = {
    exists: true,
    relativePath,
    absolutePath: target,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString()
  };

  if (includeHash) {
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(target));
    info.sha256 = hash.digest('hex');
  }

  return info;
}

function decodeDocumentData(dataBase64) {
  if (!dataBase64 || typeof dataBase64 !== 'string') {
    throw new Error('Contingut del document buit');
  }
  const payload = dataBase64.includes(',') ? dataBase64.split(',').pop() : dataBase64;
  return Buffer.from(payload, 'base64');
}

function addDirectoryToZip(zip, directoryPath, zipRoot, counters) {
  if (!fs.existsSync(directoryPath)) return;
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);
    const relativePath = path.relative(directoryPath === zipRoot ? zipRoot : zipRoot, absolutePath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      addDirectoryToZip(zip, absolutePath, zipRoot, counters);
    } else if (entry.isFile()) {
      zip.file(relativePath, fs.readFileSync(absolutePath));
      counters.files += 1;
    }
  }
}

function restoreBackupIfNeeded() {
  const userDataPath = app.getPath('userData');
  const backupFile = path.join(userDataPath, 'aurora-backup.json');

  try {
    if (fs.existsSync(backupFile)) {
      console.log('📂 Backup encontrado, verificando...');
      
      const backupData = filterRestorableBackupData(JSON.parse(fs.readFileSync(backupFile, 'utf-8')));
      
      // Si el store esta realmente vacio, restaurar desde backup.
      // Ser conservadors aqui es important: un usuari pot tenir projectes o
      // factures encara que no tingui clients, i no volem sobreescriure dades.
      const currentData = store.store;
      const storeIsEmpty = Object.keys(currentData).length === 0 || !hasMeaningfulStoreData(currentData);
      
      if (storeIsEmpty && backupData) {
        console.log('🔄 Restaurando datos desde backup...');
        backupElectronStoreSnapshot('aurora-before-auto-restore');
        Object.entries(backupData).forEach(([key, value]) => {
          store.set(key, value);
        });
        console.log('✅ Datos restaurados desde backup');
      } else {
        console.log('ℹ️  Store ya contiene datos, no se restaura backup');
      }
    } else {
      console.log('ℹ️  No hay backup previo (primera instalación)');
    }
  } catch (error) {
    console.error('❌ Error al restaurar backup:', error);
  }
}

// ============================================
// EVENTOS DE AUTO-UPDATER
// ============================================

autoUpdater.on('checking-for-update', () => {
  console.log('🔍 Comprobant actualitzacions...');
});

autoUpdater.on('update-available', (info) => {
  console.log('✅ Actualització disponible:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate
    });
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('✅ Aurora està actualitzat');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-not-available');
  }
});

autoUpdater.on('download-progress', (progress) => {
  console.log(`📥 Descarregant: ${progress.percent.toFixed(1)}%`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-progress', progress.percent);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('✅ Actualització descarregada:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version
    });
  }
});

autoUpdater.on('error', (error) => {
  console.error('❌ Error en auto-updater:', error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-error', { message: error.message });
  }
});

// ============================================
// IPC HANDLERS
// ============================================

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-pending-update', () => pendingUpdateInfo);

ipcMain.handle('check-for-updates', () => {
  if (process.platform === 'darwin') {
    return checkForUpdatesMac();
  } else {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'dmontees',
      repo: 'auroraERP'
    });
    return autoUpdater.checkForUpdates().catch(err => {
      console.error('❌ Error en checkForUpdates manual:', err);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-not-available');
      }
    });
  }
});

ipcMain.handle('open-external', async (_, url) => {
  try {
    const parsed = new URL(String(url));
    if (!['https:', 'mailto:'].includes(parsed.protocol)) {
      throw new Error(`Protocol no permes: ${parsed.protocol}`);
    }
    await shell.openExternal(parsed.toString());
    return { success: true };
  } catch (error) {
    console.error('❌ URL externa rebutjada:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Handler para obtener la ruta del store (útil para debug)
ipcMain.handle('get-store-path', () => {
  return store.path;
});

// Handler para exportar datos saneados para el backup cloud.
// No expone credenciales ni binarios pesados al renderer.
ipcMain.handle('export-cloud-backup-data', () => {
  return stripForCloudBackup(store.store);
});

// Handler para importar datos (útil para restaurar backups)
ipcMain.handle('import-data', (_, data) => {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Format de dades invalid');
    }

    const preImportBackup = backupElectronStoreSnapshot('aurora-pre-import-backup');
    const importedKeys = [];
    const ignoredKeys = [];

    Object.entries(data).forEach(([key, value]) => {
      if (!IMPORT_DATA_ALLOWED_KEYS.has(key)) {
        ignoredKeys.push(key);
        return;
      }
      store.set(key, value);
      importedKeys.push(key);
    });

    return { success: true, importedKeys, ignoredKeys, preImportBackup };
  } catch (error) {
    console.error('❌ Error importando datos:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// TANCAMENT CONTROLAT — sync abans de sortir
// ============================================

ipcMain.handle('documents-select-root', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecciona on vols crear la carpeta Aurora',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, cancelled: true };
    }

    const selectedPath = result.filePaths[0];
    const rootPath = path.basename(selectedPath) === 'Aurora'
      ? selectedPath
      : path.join(selectedPath, 'Aurora');
    ensureDocumentBaseStructure(rootPath);

    return { success: true, data: { rootPath } };
  } catch (error) {
    console.error('Error seleccionant carpeta documental:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents-ensure-structure', async (_, { rootPath }) => {
  try {
    const ensuredRoot = ensureDocumentBaseStructure(rootPath);
    return { success: true, data: { rootPath: ensuredRoot } };
  } catch (error) {
    console.error('Error creant estructura documental:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents-ensure-directories', async (_, { rootPath, relativePaths }) => {
  try {
    ensureDocumentBaseStructure(rootPath);
    if (!Array.isArray(relativePaths)) {
      throw new Error('La llista de carpetes documentals no es valida');
    }

    let created = 0;
    const errors = [];
    for (const relativePath of relativePaths) {
      try {
        const { target } = resolveDocumentPath(rootPath, String(relativePath));
        if (fs.existsSync(target)) continue;
        fs.mkdirSync(target, { recursive: true });
        created++;
      } catch (error) {
        errors.push(`${relativePath}: ${error.message}`);
      }
    }

    return { success: true, data: { requested: relativePaths.length, created, errors } };
  } catch (error) {
    console.error('Error creant carpetes documentals:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents-restore-missing-file', async (_, { rootPath, relativePath }) => {
  try {
    ensureDocumentBaseStructure(rootPath);
    const selected = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecciona el fitxer per reparar la referencia documental',
      properties: ['openFile']
    });

    if (selected.canceled || selected.filePaths.length === 0) {
      return { success: true, cancelled: true };
    }

    const { target } = resolveDocumentPath(rootPath, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(selected.filePaths[0], target);
    const info = getDocumentFileInfo(rootPath, relativePath, true);
    return { success: true, data: info };
  } catch (error) {
    console.error('Error reparant document:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents-export-complete-backup', async (_, { rootPath, manifest }) => {
  try {
    const root = ensureDocumentBaseStructure(rootPath);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar copia completa dAurora',
      defaultPath: `aurora-backup-complet-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: true, cancelled: true };
    }

    const zip = new JSZip();
    const counters = { files: 0 };
    zip.file('aurora-data.json', JSON.stringify(store.store, null, 2));
    zip.file('manifest-documental.json', JSON.stringify(manifest || {}, null, 2));
    const documentsZip = zip.folder('Aurora');
    addDirectoryToZip(documentsZip, root, root, counters);
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, data: { filePath: result.filePath, files: counters.files } };
  } catch (error) {
    console.error('Error exportant copia documental completa:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents-write-file', async (_, { rootPath, relativePath, dataBase64 }) => {
  try {
    ensureDocumentBaseStructure(rootPath);
    const { target } = resolveDocumentPath(rootPath, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, decodeDocumentData(dataBase64));
    const info = getDocumentFileInfo(rootPath, relativePath, true);
    return { success: true, data: info };
  } catch (error) {
    console.error('Error escrivint document:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents-read-file', async (_, { rootPath, relativePath }) => {
  try {
    const { target } = resolveDocumentPath(rootPath, relativePath);
    const dataBase64 = fs.readFileSync(target).toString('base64');
    return { success: true, data: { relativePath, dataBase64 } };
  } catch (error) {
    console.error('Error llegint document:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents-file-info', async (_, { rootPath, relativePath, includeHash }) => {
  try {
    return { success: true, data: getDocumentFileInfo(rootPath, relativePath, !!includeHash) };
  } catch (error) {
    console.error('Error comprovant document:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents-open-file', async (_, { rootPath, relativePath }) => {
  try {
    const { target } = resolveDocumentPath(rootPath, relativePath);
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
    return { success: true };
  } catch (error) {
    console.error('Error obrint document:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents-reveal-file', async (_, { rootPath, relativePath }) => {
  try {
    const { target } = resolveDocumentPath(rootPath, relativePath);
    shell.showItemInFolder(target);
    return { success: true };
  } catch (error) {
    console.error('Error mostrant document al Finder:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents-open-root', async (_, { rootPath }) => {
  try {
    const root = ensureDocumentBaseStructure(rootPath);
    const error = await shell.openPath(root);
    if (error) throw new Error(error);
    return { success: true };
  } catch (error) {
    console.error('Error obrint carpeta documental:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('confirm-close', () => {
  console.log('✅ Sync completat — tancant Aurora ERP');
  isQuitting = true;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
});

// ============================================
// VERIFACTU — Enviament a l'AEAT (mTLS)
// ============================================

ipcMain.handle('verifactu-enviar', async (_, { xmlPayload, p12Base64, pin, entornTest }) => {
  const https = require('https');

  const hostname = entornTest ? 'prewww1.aeat.es' : 'www1.aeat.es';
  const path = '/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSistemaFacturacion';

  let p12Buffer;
  try {
    p12Buffer = Buffer.from(p12Base64, 'base64');
  } catch (e) {
    console.error('❌ Verifactu: error decodificant P12:', e);
    return { ok: false, error: 'Error descodificant el certificat P12.' };
  }

  return new Promise((resolve) => {
    const xmlBuf = Buffer.from(xmlPayload, 'utf8');

    const req = https.request(
      {
        hostname,
        port: 443,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Content-Length': xmlBuf.length,
          'SOAPAction': '""',
          'Accept': 'text/xml, application/xml, */*',
        },
        pfx: p12Buffer,
        passphrase: pin,
        // En entorn de test, acceptar certificats autosignats de la AEAT
        rejectUnauthorized: !entornTest,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk.toString(); });
        res.on('end', () => {
          console.log(`🔗 Verifactu AEAT → HTTP ${res.statusCode}`);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Cercar el CSV al cos de la resposta SOAP
            const csvMatch = data.match(/<(?:[^:>]+:)?CSV>([^<]+)<\/(?:[^:>]+:)?CSV>/i);
            const csv = csvMatch?.[1]?.trim();
            console.log('✅ Verifactu: resposta acceptada, CSV:', csv);
            resolve({ ok: true, csv });
          } else {
            // Intentar extreure missatge d'error del XML
            const errMatch = data.match(/<(?:[^:>]+:)?DescripcionError>([^<]+)<\/(?:[^:>]+:)?DescripcionError>/i)
              || data.match(/<(?:[^:>]+:)?faultstring>([^<]+)<\/(?:[^:>]+:)?faultstring>/i);
            const errMsg = errMatch?.[1]?.trim() || `HTTP ${res.statusCode}`;
            console.error('❌ Verifactu AEAT error:', errMsg, '\n', data.substring(0, 400));
            resolve({ ok: false, error: errMsg });
          }
        });
      }
    );

    req.on('error', (e) => {
      console.error('❌ Verifactu xarxa error:', e.message);
      resolve({ ok: false, error: e.message });
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error('Timeout de 30 s en connectar amb l\'AEAT'));
    });

    req.write(xmlBuf);
    req.end();
  });
});

// ============================================
// GOOGLE CALENDAR OAUTH
// ============================================

async function exchangeCodeForTokens(code, clientId, clientSecret, redirectUri) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString();

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error_description || json.error));
          else resolve(json);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

ipcMain.handle('google-calendar-start-auth', (_, { clientId, clientSecret }) => {
  const http = require('http');

  return new Promise((resolve, reject) => {
    const server = http.createServer();

    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Timeout: l\'autenticació ha superat els 5 minuts'));
    }, 5 * 60 * 1000);

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const redirectUri = `http://127.0.0.1:${port}/callback`;

      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar',
        access_type: 'offline',
        prompt: 'consent'
      }).toString();

      shell.openExternal(authUrl);
      console.log('🔗 Google OAuth: obertura del navegador per autenticació');

      server.on('request', async (req, res) => {
        if (!req.url || !req.url.startsWith('/callback')) {
          res.writeHead(404); res.end(); return;
        }

        const url = new URL(req.url, `http://127.0.0.1:${port}`);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        clearTimeout(timeout);
        server.close();

        const html = (ok, msg) =>
          `<html><body style="font-family:sans-serif;padding:2rem;text-align:center">` +
          `<h2>${ok ? '✅' : '❌'} ${msg}</h2>` +
          `<p>Pots tancar aquesta finestra i tornar a Aurora ERP.</p></body></html>`;

        if (error || !code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html(false, 'Autenticació cancel·lada'));
          reject(new Error(error || 'No s\'ha rebut el codi d\'autorització'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html(true, 'Connexió completada correctament'));

        try {
          const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);
          const tokenData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + tokens.expires_in * 1000,
            client_id: clientId,
            client_secret: clientSecret,
            calendar_id: 'primary'
          };
          store.set('googleCalendarToken', tokenData);
          console.log('✅ Google Calendar: token guardat correctament');
          resolve({ success: true, token: tokenData });
        } catch (err) {
          console.error('❌ Google Calendar: error intercanviant el codi:', err);
          reject(err);
        }
      });

      server.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });
});

ipcMain.handle('google-calendar-disconnect', () => {
  store.delete('googleCalendarToken');
  console.log('✅ Google Calendar: desconnectat');
  return { success: true };
});

// ============================================
// EVENTOS DE APLICACIÓN
// ============================================

app.whenReady().then(() => {
  console.log('🚀 Aurora ERP iniciado');
  console.log('📁 Store ubicado en:', store.path);
  createWindow();
});

app.on('window-all-closed', () => {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Backup final antes de salir
app.on('before-quit', () => {
  console.log('🛑 Aplicación cerrándose...');
  backupElectronStoreSnapshotIfMeaningful('aurora-shutdown');
  backupElectronStore();
});
