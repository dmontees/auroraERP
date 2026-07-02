import type { DocumentFileRef, DocumentKind } from '../types/documental';
import { buildFiscalDocumentPath, createDocumentRef, safeFileName } from './documentManager';
import { storage } from './storageManager';

export async function saveFiscalDocumentVersion(input: {
  kind: DocumentKind;
  ownerCodi: string;
  dataGasto: string;
  displayName: string;
  originalName: string;
  dataBase64: string;
  existingRefs?: DocumentFileRef[];
}): Promise<DocumentFileRef | null> {
  const rootPath = storage.getParametres().gestorDocumental?.rootPath;
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  if (!rootPath || !electronDocuments) return null;

  const matchingRefs = (input.existingRefs || []).filter(ref => ref.displayName === input.displayName);
  const version = Math.max(0, ...matchingRefs.map(ref => ref.version || 0)) + 1;
  const extension = input.originalName.includes('.') ? input.originalName.split('.').pop() || 'pdf' : 'pdf';
  const filename = `${safeFileName(input.displayName)}_v${String(version).padStart(3, '0')}.${safeFileName(extension)}`;
  const relativePath = buildFiscalDocumentPath(input.dataGasto, 'despeses', filename);
  const result = await electronDocuments.writeFile({
    rootPath,
    relativePath,
    dataBase64: input.dataBase64,
  });

  if (!result.success || !result.data) {
    alert(result.error || 'No sha pogut guardar el document al gestor documental.');
    return null;
  }

  return createDocumentRef({
    kind: input.kind,
    ownerType: 'fiscal',
    ownerCodi: input.ownerCodi,
    displayName: input.displayName,
    originalName: input.originalName,
    relativePath,
    mimeType: 'application/pdf',
    size: result.data.size,
    sha256: result.data.sha256,
    version,
    generated: false,
  });
}

export function appendCurrentDocumentRef(existingRefs: DocumentFileRef[] | undefined, newRef: DocumentFileRef): DocumentFileRef[] {
  return [
    ...(existingRefs || []).map(ref => ref.displayName === newRef.displayName
      ? { ...ref, current: false, replacedBy: newRef.id }
      : ref
    ),
    newRef,
  ];
}
