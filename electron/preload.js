const { contextBridge, ipcRenderer } = require('electron');
const Store = require('electron-store');

// Inicializar electron-store con la misma configuración que main
const store = new Store({
  name: 'aurora-data',
  defaults: {
    clients: [],
    proveidors: [],
    projectes: [],
    facturesVenda: [],
    facturesCompra: [],
    pressupostos: [],
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
    version: '1.0.1',
    migrationCompleted: false
  }
});

// Exponer API de electron-store al renderer
contextBridge.exposeInMainWorld('electronStore', {
  get: (key) => store.get(key),
  set: (key, value) => store.set(key, value),
  delete: (key) => store.delete(key),
  clear: () => store.clear(),
  getPath: () => store.path,
  has: (key) => store.has(key),
  store: () => store.store
});

// Exponer API de IPC y auto-updater
contextBridge.exposeInMainWorld('electron', {
  // Versión de la app
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Auto-updater
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_, data) => callback(data));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_, percent) => callback(percent));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_, data) => callback(data));
  },
  
  // Utilidades de store
  getStorePath: () => ipcRenderer.invoke('get-store-path'),
  exportAllData: () => ipcRenderer.invoke('export-all-data'),
  importData: (data) => ipcRenderer.invoke('import-data', data)
});

console.log('✅ Preload script cargado correctamente');
console.log('📁 Store path:', store.path);