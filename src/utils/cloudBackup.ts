import { storage } from './storageManager';
import { isQuotaExceededError, stripBackupBinariesForBrowserStorage } from './backupImport';

export interface BackupUploadResult {
  savedAt: string;
  sizeKb: number;
}

const BACKUP_TIMEOUT_MS = 45000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = BACKUP_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Temps esgotat guardant la copia al nuvol. Comprova el servidor i torna-ho a provar.');
    }
    if (error instanceof TypeError) {
      throw new Error('No es pot connectar amb backup.php. Comprova la URL de l\'API i que el fitxer estigui desplegat a /api.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readJsonResponse(res: Response): Promise<any> {
  return res.json().catch(() => ({}));
}

// ── Strip de binaris ──────────────────────────────────────────────────────────
// El backup NO inclou contingut base64: els documents estan sincronitzats
// al servidor via pdf-sync.php i es restauren per separat.
// Això fa que el JSON del backup sigui petit (< 1 MB) i es pugui pujar
// després de cada sync sense impacte de xarxa.

function stripBinaries(data: Record<string, any>): Record<string, any> {
  const sensitiveKeys = new Set([
    'googleCalendarToken',
    'verifactuCertificatP12',
  ]);

  const strip = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(strip);
    if (obj && typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        // No pugem secrets reutilitzables al backup cloud.
        if (sensitiveKeys.has(k)) continue;
        if (k === 'webSyncConfig' && v && typeof v === 'object') {
          const { apiKey, ...safeConfig } = v as Record<string, any>;
          void apiKey;
          out[k] = strip(safeConfig);
          continue;
        }
        // Camps que contenen base64 de documents
        if (['fitxer', 'imatgePerfil', 'imatgeReferencia', 'documentPDF'].includes(k)) continue;
        // El PDF generat de factura de venda es regenera des de les dades
        if (k === 'documentPDFName' && obj.documentPDF === undefined) { out[k] = v; continue; }
        out[k] = strip(v);
      }
      return out;
    }
    return obj;
  };
  return strip(data);
}

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Puja una còpia de seguretat slim al servidor.
 * No inclou contingut binari (els documents estan a pdfs/ via pdf-sync).
 * S'executa després de cada sync de dades → és ràpid i lleuger.
 */
export async function uploadCloudBackup(apiUrl: string, apiKey: string): Promise<BackupUploadResult> {
  const base = apiUrl.replace(/\/+$/, '');

  // Obtenir totes les dades estructurals
  const electronAPI = (window as any).electron;
  const raw: any = electronAPI?.exportCloudBackupData
    ? await electronAPI.exportCloudBackupData()
    : gatherDataWeb();

  // Strip de binaris + metadades de backup
  const payload = {
    _backupMeta: {
      version:       __APP_VERSION__,
      createdAt:     new Date().toISOString(),
      hasServerDocs: false,
    },
    ...stripBinaries(raw),
  };

  const response = await fetchWithTimeout(`${base}/backup.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error((result as any).error ?? `Error ${response.status} guardant la copia al nuvol`);
  }

  const savedAt = (result as any).saved_at as string;
  storage.setLastCloudBackup(savedAt);
  return { savedAt, sizeKb: (result as any).size_kb };
}

// ── Download i restauració ────────────────────────────────────────────────────

export async function downloadCloudBackup(apiUrl: string, apiKey: string): Promise<any> {
  const base = apiUrl.replace(/\/+$/, '');
  const response = await fetchWithTimeout(`${base}/backup.php`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const err = await readJsonResponse(response);
    throw new Error((err as any).error ?? `Error ${response.status}`);
  }
  return readJsonResponse(response);
}

/**
 * Importa les dades estructurals al store local.
 * Després d'aquesta crida cal cridar downloadAndRestoreDocuments()
 * per recuperar els documents (PDFs, imatges, adjunts) del servidor.
 */
export async function restoreFromBackup(data: any): Promise<void> {
  // Eliminar la metadada abans d'importar
  const { _backupMeta, ...storeData } = data;
  void _backupMeta;

  const electronAPI = (window as any).electron;
  if (electronAPI?.importData) {
    const result = await electronAPI.importData(storeData);
    if (!result?.success) {
      throw new Error(result?.error ?? 'No s\'han pogut importar les dades restaurades');
    }
  } else {
    const knownKeys = [
      'clients', 'proveidors', 'projectes', 'facturesVenda', 'facturesCompra',
      'pressupostos', 'obligacionsFiscals', 'partsTreball', 'parametres',
      'webSyncConfig', 'verifactuConfig', 'verifactuCertificatP12',
      'albaransCompra', 'settings', 'version', 'dataSchemaVersion',
    ];
    const browserImport = stripBackupBinariesForBrowserStorage(storeData);
    knownKeys.forEach(key => {
      if (browserImport.data[key] !== undefined) {
        try {
          storage.set(key as any, browserImport.data[key] as any);
        } catch (error) {
          if (isQuotaExceededError(error)) {
            throw new Error(
              'La copia del nuvol es massa gran per al localStorage del navegador. ' +
              'Importa-la des de l\'app Electron o neteja dades del localhost i torna-ho a provar.'
            );
          }
          throw error;
        }
      }
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gatherDataWeb(): Record<string, any> {
  return {
    clients:            storage.getClients(),
    proveidors:         storage.getProveidors(),
    projectes:          storage.getProjectes(),
    facturesVenda:      storage.getFacturesVenda(),
    facturesCompra:     storage.getFacturesCompra(),
    pressupostos:       storage.getPressupostos(),
    obligacionsFiscals: storage.getObligacionsFiscals(),
    partsTreball:       storage.getPartsTreball(),
    parametres:         storage.getParametres(),
    webSyncConfig:      storage.getWebSyncConfig(),
    verifactuConfig:    storage.getVerifactuConfig(),
  };
}
