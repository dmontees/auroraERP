const { app, BrowserWindow, ipcMain, shell, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const {
  GITHUB_RELEASES_API,
  compareSemver,
  isNewer,
  parseSemver,
  selectMacDmgAsset
} = require('./updater-utils.cjs');

let backupInterval = null;
let mainWindow = null;
let pendingUpdateInfo = null; // cache per si el renderer no estava llest quan va arribar l'event
let isQuitting = false;       // flag per al tancament controlat via sync

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
    version: '3.0.2',
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

async function checkForUpdatesMac() {
  const currentVersion = app.getVersion();

  const sendNotAvailable = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available');
    }
  };

  try {
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
    sendNotAvailable();
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
    const data = store.store;
    
    // Guardar backup con formato legible
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf-8');
    console.log('✅ Backup de electron-store guardado:', backupFile);
  } catch (error) {
    console.error('❌ Error al guardar backup de electron-store:', error);
  }
}

function backupElectronStoreSnapshot(prefix) {
  try {
    const userDataPath = app.getPath('userData');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(userDataPath, `${prefix}-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(store.store, null, 2), 'utf-8');
    console.log('✅ Snapshot de seguretat guardat:', backupFile);
    return backupFile;
  } catch (error) {
    console.error('❌ Error guardant snapshot de seguretat:', error);
    return null;
  }
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

function restoreBackupIfNeeded() {
  const userDataPath = app.getPath('userData');
  const backupFile = path.join(userDataPath, 'aurora-backup.json');

  try {
    if (fs.existsSync(backupFile)) {
      console.log('📂 Backup encontrado, verificando...');
      
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
      
      // Si el store esta realmente vacio, restaurar desde backup.
      // Ser conservadors aqui es important: un usuari pot tenir projectes o
      // factures encara que no tingui clients, i no volem sobreescriure dades.
      const currentData = store.store;
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
        const value = currentData[key];
        return Array.isArray(value) && value.length > 0;
      });
      const hasMeaningfulParametres = currentData.parametres
        && typeof currentData.parametres === 'object'
        && Object.values(currentData.parametres).some((value) => Array.isArray(value) ? value.length > 0 : !!value);
      const storeIsEmpty = Object.keys(currentData).length === 0 || (!hasCriticalData && !hasMeaningfulParametres);
      
      if (storeIsEmpty && backupData) {
        console.log('🔄 Restaurando datos desde backup...');
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
    mainWindow.webContents.send('update-not-available');
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
  backupElectronStore();
});
