import { storage } from './storageManager';

// ── Tipus ─────────────────────────────────────────────────────────────────────

interface LocalDoc {
  key: string;    // "proj/PRJ-001/uuid" | "proj/PRJ-001/cover" | "fc/FC-001" | "prov/PRV-001/uuid" | "prov/PRV-001/avatar"
  base64: string;
  name: string;
}

export interface ServerManifest {
  [key: string]: { hash: string; name: string; size_kb: number };
}

export interface PdfSyncResult {
  uploaded: number;
  deleted: number;
}

// ── Fingerprint ──────────────────────────────────────────────────────────────

// Hash ràpid: primer + darrer 8 KB del base64 + longitud.
// Detecta qualsevol canvi de contingut sense haver de hashear el fitxer sencer.
async function fingerprint(base64: string): Promise<string> {
  const sample = base64.slice(0, 8000) + '|' + base64.length + '|' + base64.slice(-8000);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sample));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

// ── Recopilació de documents locals ─────────────────────────────────────────

function collectLocalDocs(): LocalDoc[] {
  const docs: LocalDoc[] = [];

  // Documents de projecte + imatge de portada
  for (const p of storage.getProjectes()) {
    if (p.imatgeReferencia) {
      docs.push({ key: `proj/${p.codi}/cover`, base64: p.imatgeReferencia, name: 'cover.jpg' });
    }
    for (const doc of p.documents ?? []) {
      if ((doc as any).fitxer) {
        docs.push({ key: `proj/${p.codi}/${doc.id}`, base64: (doc as any).fitxer, name: doc.nomFitxer });
      }
    }
  }

  // PDFs de factures de compra (pujats manualment per l'usuari)
  for (const f of storage.getFacturesCompra()) {
    if (f.documentPDF) {
      docs.push({ key: `fc/${f.codi}`, base64: f.documentPDF, name: f.documentPDFName ?? `${f.codi}.pdf` });
    }
  }

  // Imatge de perfil i documents de proveïdors
  for (const p of storage.getProveidors()) {
    if (p.imatgePerfil) {
      docs.push({ key: `prov/${p.codi}/avatar`, base64: p.imatgePerfil, name: 'avatar.jpg' });
    }
    for (const doc of p.documents ?? []) {
      if ((doc as any).fitxer) {
        docs.push({ key: `prov/${p.codi}/${(doc as any).id}`, base64: (doc as any).fitxer, name: (doc as any).nomFitxer });
      }
    }
  }

  return docs;
}

// ── Peticions al servidor ────────────────────────────────────────────────────

async function fetchManifest(base: string, apiKey: string): Promise<ServerManifest> {
  try {
    const res = await fetch(`${base}/pdf-sync.php`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) return {};
    return res.json();
  } catch { return {}; }
}

async function uploadDoc(base: string, apiKey: string, doc: LocalDoc, hash: string): Promise<void> {
  const res = await fetch(`${base}/pdf-sync.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ key: doc.key, name: doc.name, hash, data: doc.base64 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Error ${res.status} pujant ${doc.key}`);
  }
}

async function deleteDoc(base: string, apiKey: string, key: string): Promise<void> {
  const res = await fetch(`${base}/pdf-sync.php?key=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Error ${res.status} esborrant ${key}`);
  }
}

// ── Sync delta ───────────────────────────────────────────────────────────────

export async function syncDocuments(apiUrl: string, apiKey: string): Promise<PdfSyncResult> {
  const base = apiUrl.replace(/\/+$/, '');
  const localDocs = collectLocalDocs();

  // Calcular fingerprints locals en paral·lel
  const localWithHash = await Promise.all(
    localDocs.map(async doc => ({ ...doc, hash: await fingerprint(doc.base64) }))
  );

  const serverManifest = await fetchManifest(base, apiKey);
  const localKeys = new Set(localWithHash.map(d => d.key));

  let uploaded = 0;
  let deleted = 0;

  // Pujar nous o modificats (un a un per no saturar el servidor)
  for (const doc of localWithHash) {
    const serverEntry = serverManifest[doc.key];
    if (!serverEntry || serverEntry.hash !== doc.hash) {
      await uploadDoc(base, apiKey, doc, doc.hash);
      uploaded++;
    }
  }

  // Esborrar del servidor els que ja no existeixen en local
  for (const key of Object.keys(serverManifest)) {
    if (!localKeys.has(key)) {
      await deleteDoc(base, apiKey, key);
      deleted++;
    }
  }

  return { uploaded, deleted };
}

// ── Restauració ──────────────────────────────────────────────────────────────

// Descarrega tots els documents del servidor i els re-adjunta a les entitats locals.
// S'ha de cridar DESPRÉS de restaurar el JSON principal (cloudBackup).
export async function downloadAndRestoreDocuments(apiUrl: string, apiKey: string): Promise<void> {
  const base = apiUrl.replace(/\/+$/, '');
  const manifest = await fetchManifest(base, apiKey);
  if (Object.keys(manifest).length === 0) return;

  const projectes = storage.getProjectes() as any[];
  const facturesCompra = storage.getFacturesCompra() as any[];
  const proveidors = storage.getProveidors() as any[];

  for (const key of Object.keys(manifest)) {
    try {
      const res = await fetch(`${base}/pdf-sync.php?key=${encodeURIComponent(key)}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) continue;
      const { data: base64, name } = await res.json() as { data: string; name: string };

      if (key.startsWith('proj/')) {
        const [, codi, docId] = key.split('/');
        const p = projectes.find((x: any) => x.codi === codi);
        if (!p) continue;
        if (docId === 'cover') {
          p.imatgeReferencia = base64;
        } else {
          const doc = (p.documents ?? []).find((d: any) => d.id === docId);
          if (doc) doc.fitxer = base64;
        }

      } else if (key.startsWith('fc/')) {
        const codi = key.slice(3);
        const f = facturesCompra.find((x: any) => x.codi === codi);
        if (f) { f.documentPDF = base64; f.documentPDFName = name; }

      } else if (key.startsWith('prov/')) {
        const [, codi, docId] = key.split('/');
        const p = proveidors.find((x: any) => x.codi === codi);
        if (!p) continue;
        if (docId === 'avatar') {
          p.imatgePerfil = base64;
        } else {
          const doc = (p.documents ?? []).find((d: any) => d.id === docId);
          if (doc) doc.fitxer = base64;
        }
      }
    } catch (e) {
      console.warn(`[pdfSync] Error descarregant ${key}:`, e);
    }
  }

  storage.setProjectes(projectes);
  storage.setFacturesCompra(facturesCompra);
  storage.setProveidors(proveidors);
}
