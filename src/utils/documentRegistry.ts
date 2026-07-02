import type { DocumentFileRef } from '../types/documental';
import { storage } from './storageManager';

export type DocumentRefOwner =
  | { type: 'client'; codi: string; label: string }
  | { type: 'projecte-document'; codi: string; documentId: string; label: string }
  | { type: 'proveidor-document'; codi: string; documentId: string; label: string }
  | { type: 'pressupost'; codi: string; label: string }
  | { type: 'factura-venda'; codi: string; label: string }
  | { type: 'factura-compra'; codi: string; label: string }
  | { type: 'obligacio-fiscal'; codi: string; label: string };

export interface DocumentRefEntry {
  owner: DocumentRefOwner;
  ref: DocumentFileRef;
}

export function collectDocumentRefs(): DocumentRefEntry[] {
  const refs: DocumentRefEntry[] = [];

  for (const client of storage.getClients()) {
    for (const ref of client.documents || []) {
      refs.push({ owner: { type: 'client', codi: client.codi, label: `${client.codi}/${ref.displayName}` }, ref });
    }
  }

  for (const projecte of storage.getProjectes()) {
    for (const doc of projecte.documents || []) {
      if (doc.fileRef) {
        refs.push({ owner: { type: 'projecte-document', codi: projecte.codi, documentId: doc.id, label: `${projecte.codi}/${doc.nom}` }, ref: doc.fileRef });
      }
    }
  }

  for (const proveidor of storage.getProveidors()) {
    for (const doc of proveidor.documents || []) {
      if (doc.fileRef) {
        refs.push({ owner: { type: 'proveidor-document', codi: proveidor.codi, documentId: doc.id, label: `${proveidor.codi}/${doc.nom}` }, ref: doc.fileRef });
      }
    }
  }

  for (const pressupost of storage.getPressupostos()) {
    for (const ref of pressupost.documentsGenerats || []) {
      refs.push({ owner: { type: 'pressupost', codi: pressupost.codi, label: `${pressupost.codi}/${ref.displayName}` }, ref });
    }
  }

  for (const factura of storage.getFacturesVenda()) {
    for (const ref of factura.documentsGenerats || []) {
      refs.push({ owner: { type: 'factura-venda', codi: factura.codi, label: `${factura.codi}/${ref.displayName}` }, ref });
    }
  }

  for (const gasto of storage.getFacturesCompra()) {
    for (const ref of gasto.documentsGenerats || []) {
      refs.push({ owner: { type: 'factura-compra', codi: gasto.codi, label: `${gasto.codi}/${ref.displayName}` }, ref });
    }
  }

  for (const obligacio of storage.getObligacionsFiscals()) {
    for (const ref of obligacio.documentsGenerats || []) {
      refs.push({ owner: { type: 'obligacio-fiscal', codi: obligacio.codi, label: `${obligacio.codi}/${ref.displayName}` }, ref });
    }
  }

  return refs;
}

function replaceRef(refs: DocumentFileRef[] | undefined, refId: string, nextRef: DocumentFileRef): DocumentFileRef[] {
  return (refs || []).map(ref => ref.id === refId ? nextRef : ref);
}

export function updateStoredDocumentRef(owner: DocumentRefOwner, refId: string, nextRef: DocumentFileRef): void {
  if (owner.type === 'client') {
    storage.setClients(storage.getClients().map(client =>
      client.codi === owner.codi ? { ...client, documents: replaceRef(client.documents, refId, nextRef) } : client
    ));
    return;
  }

  if (owner.type === 'projecte-document') {
    storage.setProjectes(storage.getProjectes().map(projecte =>
      projecte.codi === owner.codi
        ? {
            ...projecte,
            documents: (projecte.documents || []).map(doc =>
              doc.id === owner.documentId && doc.fileRef?.id === refId ? { ...doc, fileRef: nextRef } : doc
            ),
          }
        : projecte
    ));
    return;
  }

  if (owner.type === 'proveidor-document') {
    storage.setProveidors(storage.getProveidors().map(proveidor =>
      proveidor.codi === owner.codi
        ? {
            ...proveidor,
            documents: (proveidor.documents || []).map(doc =>
              doc.id === owner.documentId && doc.fileRef?.id === refId ? { ...doc, fileRef: nextRef } : doc
            ),
          }
        : proveidor
    ));
    return;
  }

  if (owner.type === 'pressupost') {
    storage.setPressupostos(storage.getPressupostos().map(pressupost =>
      pressupost.codi === owner.codi ? { ...pressupost, documentsGenerats: replaceRef(pressupost.documentsGenerats, refId, nextRef) } : pressupost
    ));
    return;
  }

  if (owner.type === 'factura-venda') {
    storage.setFacturesVenda(storage.getFacturesVenda().map(factura =>
      factura.codi === owner.codi ? { ...factura, documentsGenerats: replaceRef(factura.documentsGenerats, refId, nextRef) } : factura
    ));
    return;
  }

  if (owner.type === 'factura-compra') {
    storage.setFacturesCompra(storage.getFacturesCompra().map(gasto =>
      gasto.codi === owner.codi ? { ...gasto, documentsGenerats: replaceRef(gasto.documentsGenerats, refId, nextRef) } : gasto
    ));
    return;
  }

  storage.setObligacionsFiscals(storage.getObligacionsFiscals().map(obligacio =>
    obligacio.codi === owner.codi ? { ...obligacio, documentsGenerats: replaceRef(obligacio.documentsGenerats, refId, nextRef) } : obligacio
  ));
}
