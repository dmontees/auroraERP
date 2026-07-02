import { collectDocumentRefs, type DocumentRefEntry } from './documentRegistry';

export interface DocumentHealthResult {
  checked: number;
  ok: number;
  missing: number;
  errors: string[];
  missingEntries: DocumentRefEntry[];
}

export async function checkDocumentHealth(rootPath: string): Promise<DocumentHealthResult> {
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  if (!electronDocuments) throw new Error('El gestor documental nomes esta disponible a Aurora Desktop.');

  const result: DocumentHealthResult = { checked: 0, ok: 0, missing: 0, errors: [], missingEntries: [] };
  for (const item of collectDocumentRefs()) {
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
        result.missingEntries.push(item);
        result.errors.push(`${item.owner.label}: fitxer no trobat (${item.ref.relativePath})`);
      }
    } catch (error) {
      result.missing += 1;
      result.missingEntries.push(item);
      result.errors.push(`${item.owner.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return result;
}
