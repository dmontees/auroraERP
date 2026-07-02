export type DocumentKind =
  | 'client'
  | 'projecte'
  | 'pressupost'
  | 'factura-venda'
  | 'factura-compra'
  | 'gasto-general'
  | 'obligacio-fiscal'
  | 'proveidor';

export type DocumentOwnerType = 'client' | 'projecte' | 'proveidor' | 'fiscal';

export interface DocumentFileRef {
  id: string;
  kind: DocumentKind;
  ownerType: DocumentOwnerType;
  ownerCodi: string;
  displayName: string;
  originalName?: string;
  relativePath: string;
  mimeType?: string;
  size?: number;
  sha256?: string;
  version: number;
  current: boolean;
  generated: boolean;
  createdAt: string;
  replacedBy?: string;
  migratedFromBase64?: boolean;
}

export interface DocumentRootConfig {
  rootPath: string;
  configuredAt: string;
  schemaVersion: number;
  lastHealthCheckAt?: string;
}

export interface DocumentFileInfo {
  exists: boolean;
  relativePath: string;
  absolutePath?: string;
  size?: number;
  sha256?: string;
  modifiedAt?: string;
}

export interface DocumentOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  cancelled?: boolean;
  error?: string;
}

