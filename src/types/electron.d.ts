export interface ElectronStore {
  get: (key: string) => any;
  set: (key: string, value: any) => void;
  delete: (key: string) => void;
  getPath: () => string;
  has: (key: string) => boolean;
  isAvailable: () => boolean;
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  installUpdate: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  getPendingUpdate: () => Promise<any>;
  onUpdateAvailable: (callback: (data: any) => void) => void;
  onDownloadProgress: (callback: (percent: number) => void) => void;
  onUpdateDownloaded: (callback: (data: any) => void) => void;
  onUpdateNotAvailable: (callback: () => void) => void;
  onUpdateError: (callback: (data: { message?: string }) => void) => void;
  getStorePath: () => Promise<string>;
  exportCloudBackupData: () => Promise<any>;
  importData: (data: any) => Promise<{ success: boolean; error?: string; importedKeys?: string[]; ignoredKeys?: string[]; preImportBackup?: string | null }>;
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  startGoogleAuth: (clientId: string, clientSecret: string) => Promise<any>;
  disconnectGoogle: () => Promise<{ success: boolean }>;
  verifactuEnviar: (data: { xmlPayload: string; p12Base64: string; pin: string; entornTest: boolean }) => Promise<any>;
  onAppWillClose: (callback: () => void) => void;
  confirmClose: () => Promise<void>;
}

export interface ElectronDocumentsAPI {
  selectRoot: () => Promise<{ success: boolean; cancelled?: boolean; data?: { rootPath: string }; error?: string }>;
  ensureStructure: (rootPath: string) => Promise<{ success: boolean; data?: { rootPath: string }; error?: string }>;
  writeFile: (data: { rootPath: string; relativePath: string; dataBase64: string }) => Promise<{ success: boolean; data?: import('./documental').DocumentFileInfo; error?: string }>;
  readFile: (data: { rootPath: string; relativePath: string }) => Promise<{ success: boolean; data?: { relativePath: string; dataBase64: string }; error?: string }>;
  fileInfo: (data: { rootPath: string; relativePath: string; includeHash?: boolean }) => Promise<{ success: boolean; data?: import('./documental').DocumentFileInfo; error?: string }>;
  openFile: (data: { rootPath: string; relativePath: string }) => Promise<{ success: boolean; error?: string }>;
  revealFile: (data: { rootPath: string; relativePath: string }) => Promise<{ success: boolean; error?: string }>;
  openRoot: (rootPath: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronStore: ElectronStore;
    electron: ElectronAPI;
    electronDocuments?: ElectronDocumentsAPI;
  }
  // Injectat per Vite en temps de compilació des de package.json
  const __APP_VERSION__: string;
}
