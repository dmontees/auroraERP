export interface ElectronStore {
  get: (key: string) => any;
  set: (key: string, value: any) => void;
  delete: (key: string) => void;
  clear: () => void;
  getPath: () => string;
  has: (key: string) => boolean;
  store: () => any;
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  installUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (data: any) => void) => void;
  onDownloadProgress: (callback: (percent: number) => void) => void;
  onUpdateDownloaded: (callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    electronStore: ElectronStore;
    electron: ElectronAPI;
  }
}