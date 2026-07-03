export const IMPORTABLE_BACKUP_KEYS = [
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
  'migrationV5Completed',
] as const;

type ImportableBackupKey = typeof IMPORTABLE_BACKUP_KEYS[number];

const importableKeySet = new Set<string>(IMPORTABLE_BACKUP_KEYS);

const LEGACY_BACKUP_KEYS: Record<string, ImportableBackupKey> = {
  plateaClients: 'clients',
  plateaProveidors: 'proveidors',
  plateaProjectes: 'projectes',
  plateaFacturesVenda: 'facturesVenda',
  plateaFacturesCompra: 'facturesCompra',
  plateaPressupostos: 'pressupostos',
  plateaObligacionsFiscals: 'obligacionsFiscals',
  plateaAlbaransCompra: 'albaransCompra',
  plateaParametres: 'parametres',
  plateaPartsTreball: 'partsTreball',
  plateaCronometre: 'cronometre',
  plateaErpSettings: 'settings',
  plateaEsdevenimentsPersonalitzats: 'esdevenimentsPersonalitzats',
  plateaGoogleCalendarToken: 'googleCalendarToken',
  plateaWebSyncConfig: 'webSyncConfig',
};

export interface NormalizedBackupImport {
  data: Partial<Record<ImportableBackupKey, unknown>>;
  importedKeys: string[];
  ignoredKeys: string[];
}

export interface BrowserBackupImport {
  data: Partial<Record<ImportableBackupKey, unknown>>;
  strippedBinaryFields: number;
}

const BROWSER_STORAGE_BINARY_KEYS = new Set([
  'documentPDF',
  'fitxer',
  'imatgePerfil',
  'imatgeReferencia',
]);

function parseLegacyValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return JSON.parse(value);
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

export function stripBackupBinariesForBrowserStorage(
  data: Partial<Record<ImportableBackupKey, unknown>>
): BrowserBackupImport {
  let strippedBinaryFields = 0;

  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (!value || typeof value !== 'object') return value;

    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      if (BROWSER_STORAGE_BINARY_KEYS.has(key)) {
        if (typeof child === 'string' && child.length > 0) strippedBinaryFields += 1;
        return;
      }
      out[key] = strip(child);
    });
    return out;
  };

  return {
    data: strip(data) as Partial<Record<ImportableBackupKey, unknown>>,
    strippedBinaryFields,
  };
}

export function normalizeBackupForImport(backup: unknown): NormalizedBackupImport {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    throw new Error('Format de copia de seguretat invalid');
  }

  const data: Partial<Record<ImportableBackupKey, unknown>> = {};
  const ignoredKeys: string[] = [];
  const source = backup as Record<string, unknown>;

  Object.entries(source).forEach(([key, value]) => {
    if (importableKeySet.has(key)) {
      data[key as ImportableBackupKey] = value;
      return;
    }

    const legacyKey = LEGACY_BACKUP_KEYS[key];
    if (legacyKey && data[legacyKey] === undefined) {
      data[legacyKey] = parseLegacyValue(value);
      return;
    }

    ignoredKeys.push(key);
  });

  const importedKeys = Object.keys(data);
  if (importedKeys.length === 0) {
    throw new Error('La copia no conte cap modul reconegut');
  }

  return { data, importedKeys, ignoredKeys };
}
