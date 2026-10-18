const { contextBridge, ipcRenderer } = require('electron');

// The sandboxed preload uses IPC; electron-store lives in the main process.
function storeRequest(operation, key, value) {
  const result = ipcRenderer.sendSync('aurora-store', { operation, key, value });
  if (!result || !result.success) {
    throw new Error(result?.error || 'No s’ha pogut accedir al fitxer de dades d’Aurora.');
  }
  return result.data;
}

// ALLOWED_STORE_KEYS are enforced in the main process, never by the renderer.
contextBridge.exposeInMainWorld('electronStore', {
  get: (key) => storeRequest('get', key),
  set: (key, value) => storeRequest('set', key, value),
  delete: (key) => storeRequest('delete', key),
  getPath: () => storeRequest('path'),
  has: (key) => storeRequest('has', key),
  isAvailable: () => storeRequest('available')
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

contextBridge.exposeInMainWorld('electronDocuments', {
  selectRoot: () => ipcRenderer.invoke('documents-select-root'),
  ensureStructure: (rootPath) => ipcRenderer.invoke('documents-ensure-structure', { rootPath }),
  ensureDirectories: ({ rootPath, relativePaths }) =>
    ipcRenderer.invoke('documents-ensure-directories', { rootPath, relativePaths }),
  restoreMissingFile: ({ rootPath, relativePath }) =>
    ipcRenderer.invoke('documents-restore-missing-file', { rootPath, relativePath }),
  exportCompleteBackup: ({ rootPath, manifest }) =>
    ipcRenderer.invoke('documents-export-complete-backup', { rootPath, manifest }),
  writeFile: ({ rootPath, relativePath, dataBase64 }) =>
    ipcRenderer.invoke('documents-write-file', { rootPath, relativePath, dataBase64 }),
  readFile: ({ rootPath, relativePath }) =>
    ipcRenderer.invoke('documents-read-file', { rootPath, relativePath }),
  fileInfo: ({ rootPath, relativePath, includeHash }) =>
    ipcRenderer.invoke('documents-file-info', { rootPath, relativePath, includeHash }),
  openFile: ({ rootPath, relativePath }) =>
    ipcRenderer.invoke('documents-open-file', { rootPath, relativePath }),
  revealFile: ({ rootPath, relativePath }) =>
    ipcRenderer.invoke('documents-reveal-file', { rootPath, relativePath }),
  openRoot: (rootPath) => ipcRenderer.invoke('documents-open-root', { rootPath }),
});

console.log('✅ Preload script carregat correctament');
