const { contextBridge, ipcRenderer } = require('electron');

// Initialize electron-store with error handling — if it fails, IPC-based features
// (window.electron) must still be exposed so the app doesn't degrade to web mode.
let store = null;
const ALLOWED_STORE_KEYS = new Set([
  'clients',
  'proveidors',
  'projectes',
  'facturesVenda',
  'facturesCompra',
  'pressupostos',
  'obligacionsFiscals',
  'albaransCompra',
  'navigateTo',
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

function isAllowedStoreKey(key) {
  const allowed = ALLOWED_STORE_KEYS.has(String(key));
  if (!allowed) {
    console.warn('âš ï¸  electronStore key rebutjada:', key);
  }
  return allowed;
}

try {
  const Store = require('electron-store');
  store = new Store({
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
      version: '3.0.7',
      dataSchemaVersion: 5,
      migrationCompleted: false
    }
  });
  console.log('✅ electron-store inicialitzat correctament');
  console.log('📁 Store path:', store.path);
} catch (e) {
  console.error('❌ Error inicialitzant electron-store:', e);
  console.warn('⚠️  Preload continuarà sense electron-store (usarà localStorage al renderer)');
}

// Expose electron-store API (null-safe — returns undefined if store is unavailable)
contextBridge.exposeInMainWorld('electronStore', {
  get: (key) => store && isAllowedStoreKey(key) ? store.get(key) : undefined,
  set: (key, value) => store && isAllowedStoreKey(key) ? store.set(key, value) : undefined,
  delete: (key) => store && isAllowedStoreKey(key) ? store.delete(key) : undefined,
  getPath: () => store ? store.path : undefined,
  has: (key) => store ? store.has(key) : false,
  isAvailable: () => store !== null
});

// Expose IPC and auto-updater API — always available regardless of electron-store
contextBridge.exposeInMainWorld('electron', {
  // App version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Auto-updater
  installUpdate: () => ipcRenderer.invoke('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getPendingUpdate: () => ipcRenderer.invoke('get-pending-update'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_, data) => callback(data));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_, percent) => callback(percent));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_, data) => callback(data));
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', () => callback());
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (_, data) => callback(data));
  },

  // Store utilities
  getStorePath: () => ipcRenderer.invoke('get-store-path'),
  exportCloudBackupData: () => ipcRenderer.invoke('export-cloud-backup-data'),
  importData: (data) => ipcRenderer.invoke('import-data', data),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Google Calendar OAuth
  startGoogleAuth: (clientId, clientSecret) =>
    ipcRenderer.invoke('google-calendar-start-auth', { clientId, clientSecret }),
  disconnectGoogle: () =>
    ipcRenderer.invoke('google-calendar-disconnect'),

  // Verifactu — enviament a l'AEAT via mTLS (certificat P12 + PIN)
  verifactuEnviar: ({ xmlPayload, p12Base64, pin, entornTest }) =>
    ipcRenderer.invoke('verifactu-enviar', { xmlPayload, p12Base64, pin, entornTest }),

  // Tancament controlat — el main avisa el renderer perquè faci sync abans de sortir
  onAppWillClose: (callback) => ipcRenderer.on('app-will-close', () => callback()),
  confirmClose: () => ipcRenderer.invoke('confirm-close'),
});

console.log('✅ Preload script carregat correctament');
