import { storage } from './storageManager';

export interface SyncResult {
  ok: boolean;
  synced_at: string;
  stats: Record<string, number>;
  dry_run?: boolean;
  sync_id?: string;
  schema_version?: number | null;
}

interface SyncOptions {
  dryRun?: boolean;
}

// ── Strip de contingut binari ─────────────────────────────────────────────────
// Els camps base64 s'exclouen del sync de dades per mantenir el payload lleuger.
// Els documents es sincronitzen per separat via pdfSync.ts (delta sync).

function stripProjectes(projectes: any[]): any[] {
  return projectes.map(p => ({
    ...p,
    imatgeReferencia: undefined,
    documents: (p.documents ?? []).map((d: any) => ({ ...d, fitxer: undefined })),
  }));
}

function stripProveidors(proveidors: any[]): any[] {
  return proveidors.map(p => ({
    ...p,
    imatgePerfil: undefined,
    documents: (p.documents ?? []).map((d: any) => ({ ...d, fitxer: undefined })),
  }));
}

function stripFacturesCompra(factures: any[]): any[] {
  return factures.map(f => ({ ...f, documentPDF: undefined }));
}

function stripFacturesVenda(factures: any[]): any[] {
  // El PDF de factura de venda es regenera des de les dades — no cal sincronitzar-lo
  return factures.map(f => ({ ...f, documentPDF: undefined, documentPDFName: undefined }));
}

// ── Sync principal (dades, sense binaris) ─────────────────────────────────────

/**
 * Sincronitza totes les dades estructurals al servidor web.
 * Exclou contingut binari (base64): el delta sync de documents s'encarrega de sincronitzar-los.
 */
export function buildSyncPayload() {
  const syncId = `aurora-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    _syncMeta: {
      syncId,
      appVersion: __APP_VERSION__,
      dataSchemaVersion: storage.get('dataSchemaVersion'),
      createdAt: new Date().toISOString(),
    },
    clients:            storage.getClients(),
    proveidors:         stripProveidors(storage.getProveidors() as any[]),
    projectes:          stripProjectes(storage.getProjectes() as any[]),
    facturesVenda:      stripFacturesVenda(storage.getFacturesVenda() as any[]),
    facturesCompra:     stripFacturesCompra(storage.getFacturesCompra() as any[]),
    obligacionsFiscals: storage.getObligacionsFiscals(),
    parametres:         storage.getParametres(),
  };
}

export async function syncToWeb(apiUrl: string, apiKey: string, options: SyncOptions = {}): Promise<SyncResult> {
  const base = apiUrl.replace(/\/+$/, '');
  const endpoint = `${base}/sync.php${options.dryRun ? '?dryRun=1' : ''}`;
  const payload = buildSyncPayload();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? `Error ${response.status}`);
  }

  return data as SyncResult;
}

export async function dryRunSyncToWeb(apiUrl: string, apiKey: string): Promise<SyncResult> {
  return syncToWeb(apiUrl, apiKey, { dryRun: true });
}
