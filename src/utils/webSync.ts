import { storage } from './storageManager';

export interface SyncResult {
  ok: boolean;
  synced_at: string;
  stats: Record<string, number>;
}

/**
 * Exporta totes les dades de l'app i les envia al servidor web via sync.php.
 * El servidor fa un DELETE + INSERT complet (el desktop és la font de veritat).
 */
export async function syncToWeb(apiUrl: string, apiKey: string): Promise<SyncResult> {
  // Elimina barra final si n'hi ha
  const base = apiUrl.replace(/\/+$/, '');

  const payload = {
    clients:            storage.getClients(),
    proveidors:         storage.getProveidors(),
    projectes:          storage.getProjectes(),
    facturesVenda:      storage.getFacturesVenda(),
    facturesCompra:     storage.getFacturesCompra(),
    obligacionsFiscals: storage.getObligacionsFiscals(),
    parametres:         storage.getParametres(),
  };

  const response = await fetch(`${base}/sync.php`, {
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
