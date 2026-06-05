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

declare global {
  interface Window {
    electronStore: ElectronStore;
    electron: ElectronAPI;
  }
  // Injectat per Vite en temps de compilació des de package.json
  const __APP_VERSION__: string;
}
