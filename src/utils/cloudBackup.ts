import { storage } from './storageManager';

export interface BackupUploadResult {
  savedAt: string;
  sizeKb: number;
}

// ── Strip de binaris ──────────────────────────────────────────────────────────
// El backup NO inclou contingut base64: els documents estan sincronitzats
// al servidor via pdf-sync.php i es restauren per separat.
// Això fa que el JSON del backup sigui petit (< 1 MB) i es pugui pujar
// després de cada sync sense impacte de xarxa.

function stripBinaries(data: Record<string, any>): Record<string, any> {
  const strip = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(strip);
    if (obj && typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
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
  const raw: any = electronAPI?.exportAllData
    ? await electronAPI.exportAllData()
    : gatherDataWeb();

  // Strip de binaris + metadades de backup
  const payload = {
    _backupMeta: {
      version:       __APP_VERSION__,
      createdAt:     new Date().toISOString(),
      hasServerDocs: true,
    },
    ...stripBinaries(raw),
  };

  const response = await fetch(`${base}/backup.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok) throw new Error((result as any).error ?? `Error ${response.status}`);

  const savedAt = (result as any).saved_at as string;
  storage.setLastCloudBackup(savedAt);
  return { savedAt, sizeKb: (result as any).size_kb };
}

// ── Download i restauració ────────────────────────────────────────────────────

export async function downloadCloudBackup(apiUrl: string, apiKey: string): Promise<any> {
  const base = apiUrl.replace(/\/+$/, '');
  const response = await fetch(`${base}/backup.php`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Error ${response.status}`);
  }
  return response.json();
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
    await electronAPI.importData(storeData);
  } else {
    const knownKeys = [
      'clients', 'proveidors', 'projectes', 'facturesVenda', 'facturesCompra',
      'pressupostos', 'obligacionsFiscals', 'partsTreball', 'parametres',
      'webSyncConfig', 'verifactuConfig', 'verifactuCertificatP12',
      'albaransCompra', 'settings',
    ];
    knownKeys.forEach(key => {
      if (storeData[key] !== undefined) {
        try { localStorage.setItem(`platea${key.charAt(0).toUpperCase() + key.slice(1)}`, JSON.stringify(storeData[key])); }
        catch { /* ignore */ }
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
