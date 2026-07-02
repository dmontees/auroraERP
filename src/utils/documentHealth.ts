import type { DocumentFileRef } from '../types/documental';
import { storage } from './storageManager';

export interface DocumentHealthResult {
  checked: number;
  ok: number;
  missing: number;
  errors: string[];
}

function collectRefs(): Array<{ label: string; ref: DocumentFileRef }> {
  const refs: Array<{ label: string; ref: DocumentFileRef }> = [];

  for (const client of storage.getClients()) {
    for (const ref of client.documents || []) refs.push({ label: `${client.codi}/${ref.displayName}`, ref });
  }

  for (const projecte of storage.getProjectes()) {
    for (const doc of projecte.documents || []) {
      if (doc.fileRef) refs.push({ label: `${projecte.codi}/${doc.nom}`, ref: doc.fileRef });
    }
  }

  for (const proveidor of storage.getProveidors()) {
    for (const doc of proveidor.documents || []) {
      if (doc.fileRef) refs.push({ label: `${proveidor.codi}/${doc.nom}`, ref: doc.fileRef });
    }
  }

  for (const pressupost of storage.getPressupostos()) {
    for (const ref of pressupost.documentsGenerats || []) refs.push({ label: `${pressupost.codi}/${ref.displayName}`, ref });
  }

  for (const factura of storage.getFacturesVenda()) {
    for (const ref of factura.documentsGenerats || []) refs.push({ label: `${factura.codi}/${ref.displayName}`, ref });
  }

  for (const gasto of storage.getFacturesCompra()) {
    for (const ref of gasto.documentsGenerats || []) refs.push({ label: `${gasto.codi}/${ref.displayName}`, ref });
  }

  for (const obligacio of storage.getObligacionsFiscals()) {
    for (const ref of obligacio.documentsGenerats || []) refs.push({ label: `${obligacio.codi}/${ref.displayName}`, ref });
  }

  return refs;
}

export async function checkDocumentHealth(rootPath: string): Promise<DocumentHealthResult> {
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  if (!electronDocuments) throw new Error('El gestor documental nomes esta disponible a Aurora Desktop.');

  const result: DocumentHealthResult = { checked: 0, ok: 0, missing: 0, errors: [] };
  for (const item of collectRefs()) {
    result.checked += 1;
    try {
      const info = await electronDocuments.fileInfo({
        rootPath,
        relativePath: item.ref.relativePath,
        includeHash: false,
      });
      if (info.success && info.data?.exists) result.ok += 1;
      else {
        result.missing += 1;
        result.errors.push(`${item.label}: fitxer no trobat (${item.ref.relativePath})`);
      }
    } catch (error) {
      result.missing += 1;
      result.errors.push(`${item.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return result;
}
