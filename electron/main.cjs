const { app, BrowserWindow, ipcMain, shell, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');

let backupInterval = null;
let mainWindow = null;
let pendingUpdateInfo = null; // cache per si el renderer no estava llest quan va arribar l'event

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
    version: '1.3.0',
    migrationCompleted: false
  },
  // Opcional: schema validation
  schema: {
    clients: { type: 'array' },
    facturesVenda: { type: 'array' },
    projectes: { type: 'array' },
    version: { type: 'string' }
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

  // Backup final al cerrar
  mainWindow.on('close', () => {
    if (backupInterval) {
      clearInterval(backupInterval);
      backupInterval = null;
    }
    
    if (!mainWindow.isDestroyed()) {
      try {
        backupElectronStore();
        console.log('✅ Backup final guardado antes de cerrar');
      } catch (error) {
        console.error('❌ Error al hacer backup final:', error);
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
// ACTUALITZACIONS macOS (via GitHub API)
// ============================================

function isNewer(latest, current) {
  const parse = v => v.split('.').map(Number);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

function checkForUpdatesMac() {
  const currentVersion = app.getVersion();

  const sendNotAvailable = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available');
    }
  };

  let body = '';
  let settled = false;

  // electron.net usa el stack de Chromium (proxy del sistema, certificats macOS)
  const request = net.request({
    method: 'GET',
    url: 'https://api.github.com/repos/dmontees/auroraERP/releases/latest',
    redirect: 'follow'
  });
  request.setHeader('User-Agent', 'Aurora-ERP-Updater');
  request.setHeader('Accept', 'application/vnd.github.v3+json');

  // Timeout de 15 s per si no hi ha resposta
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    console.error('❌ Timeout comprovant actualitzacions (macOS)');
    request.abort();
    sendNotAvailable();
  }, 15000);

  request.on('response', (response) => {
    response.on('data', chunk => { body += chunk.toString(); });
    response.on('end', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        const release = JSON.parse(body);
        const latestVersion = release.tag_name?.replace('v', '');
        if (!latestVersion || !isNewer(latestVersion, currentVersion)) {
          console.log('✅ Aurora està actualitzat');
          sendNotAvailable();
          return;
        }
        const dmgAsset = release.assets?.find(a => a.name.endsWith('.dmg'));
        const downloadUrl = dmgAsset?.browser_download_url || release.html_url;
        console.log(`✅ Nova versió disponible: ${latestVersion}`);
        pendingUpdateInfo = { version: latestVersion, downloadUrl };
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-available', pendingUpdateInfo);
        }
      } catch (e) {
        console.error('❌ Error parsejant resposta de GitHub:', e);
        sendNotAvailable();
      }
    });
  });

  request.on('error', (e) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    console.error('❌ Error comprovant actualitzacions (macOS):', e);
    sendNotAvailable();
  });

  request.end();
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

function restoreBackupIfNeeded() {
  const userDataPath = app.getPath('userData');
  const backupFile = path.join(userDataPath, 'aurora-backup.json');

  try {
    if (fs.existsSync(backupFile)) {
      console.log('📂 Backup encontrado, verificando...');
      
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
      
      // Si el store está vacío, restaurar desde backup
      const currentData = store.store;
      const storeIsEmpty = Object.keys(currentData).length === 0 || 
                          (currentData.clients && currentData.clients.length === 0);
      
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
    checkForUpdatesMac();
  } else {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'dmontees',
      repo: 'auroraERP'
    });
    autoUpdater.checkForUpdates().catch(err => {
      console.error('❌ Error en checkForUpdates manual:', err);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-not-available');
      }
    });
  }
});

ipcMain.handle('open-external', (_, url) => {
  shell.openExternal(url);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Handler para obtener la ruta del store (útil para debug)
ipcMain.handle('get-store-path', () => {
  return store.path;
});

// Handler para exportar todos los datos (útil para backups manuales)
ipcMain.handle('export-all-data', () => {
  return store.store;
});

// Handler para importar datos (útil para restaurar backups)
ipcMain.handle('import-data', (_, data) => {
  try {
    Object.entries(data).forEach(([key, value]) => {
      store.set(key, value);
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error importando datos:', error);
    return { success: false, error: error.message };
  }
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