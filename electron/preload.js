const { contextBridge, ipcRenderer } = require('electron');

// Initialize electron-store with error handling — if it fails, IPC-based features
// (window.electron) must still be exposed so the app doesn't degrade to web mode.
let store = null;
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
      version: '1.4.1',
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
  get: (key) => store ? store.get(key) : undefined,
  set: (key, value) => store ? store.set(key, value) : undefined,
  delete: (key) => store ? store.delete(key) : undefined,
  clear: () => store ? store.clear() : undefined,
  getPath: () => store ? store.path : undefined,
  has: (key) => store ? store.has(key) : false,
  store: () => store ? store.store : undefined,
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

  // Store utilities
  getStorePath: () => ipcRenderer.invoke('get-store-path'),
  exportAllData: () => ipcRenderer.invoke('export-all-data'),
  importData: (data) => ipcRenderer.invoke('import-data', data),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Google Calendar OAuth
  startGoogleAuth: (clientId, clientSecret) =>
    ipcRenderer.invoke('google-calendar-start-auth', { clientId, clientSecret }),
  disconnectGoogle: () =>
    ipcRenderer.invoke('google-calendar-disconnect')
});

console.log('✅ Preload script carregat correctament');
