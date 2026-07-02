import type { DocumentFileRef } from '../types/documental';
import type { FacturaCompra, Gasto } from '../types/facturaCompra';
import type { FacturaVenta } from '../types/facturaVenta';
import type { Pressupost } from '../types/pressupost';
import {
  buildClientDocumentPath,
  buildProjectDocumentPath,
  buildProviderDocumentPath,
  safeFileName,
} from './documentManager';
import { storage } from './storageManager';

export interface DocumentMirrorResult {
  copied: number;
  updatedRefs: number;
  skipped: number;
  errors: string[];
}

const emptyResult = (): DocumentMirrorResult => ({ copied: 0, updatedRefs: 0, skipped: 0, errors: [] });

function isPendingBudgetPath(ref: DocumentFileRef): boolean {
  return ref.relativePath.startsWith('pendents-de-revisar/Pressupostos/');
}

function fileNameForMirror(ref: DocumentFileRef): string {
  return safeFileName(ref.originalName || `${ref.displayName}_v${String(ref.version).padStart(3, '0')}.pdf`);
}

async function copyRef(rootPath: string, sourceRef: DocumentFileRef, targetRelativePath: string): Promise<boolean> {
  if (sourceRef.relativePath === targetRelativePath) return false;
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  if (!electronDocuments) throw new Error('El gestor documental local nomes esta disponible a Aurora Desktop.');

  const existing = await electronDocuments.fileInfo({ rootPath, relativePath: targetRelativePath });
  if (existing.success && existing.data?.exists) return false;

  const source = await electronDocuments.readFile({ rootPath, relativePath: sourceRef.relativePath });
  if (!source.success || !source.data) throw new Error(source.error || `No sha pogut llegir ${sourceRef.relativePath}`);

  const written = await electronDocuments.writeFile({
    rootPath,
    relativePath: targetRelativePath,
    dataBase64: source.data.dataBase64,
  });
  if (!written.success) throw new Error(written.error || `No sha pogut escriure ${targetRelativePath}`);
  return true;
}

export async function mirrorSalesInvoiceToProject(rootPath: string, factura: FacturaVenta, ref: DocumentFileRef): Promise<boolean> {
  if (!factura.projecte) return false;
  const clients = storage.getClients();
  const projectes = storage.getProjectes();
  const projecte = projectes.find(p => p.codi === factura.projecte);
  if (!projecte) return false;
  const client = clients.find(c => c.codi === projecte.client || c.codi === factura.client);
  if (!client) return false;

  const target = buildProjectDocumentPath(
    client.codi,
    client.nomComercial || client.nomFiscal || 'Client',
    projecte.codi,
    projecte.titol || 'Projecte',
    'enllacos',
    fileNameForMirror(ref)
  );
  return copyRef(rootPath, ref, target);
}

export async function mirrorPurchaseInvoice(rootPath: string, gasto: FacturaCompra, ref: DocumentFileRef): Promise<number> {
  const clients = storage.getClients();
  const projectes = storage.getProjectes();
  const proveidors = storage.getProveidors();
  let copied = 0;

  const proveidor = proveidors.find(p => p.codi === gasto.proveidor);
  if (proveidor) {
    const target = buildProviderDocumentPath(
      proveidor.codi,
      proveidor.nomComercial || proveidor.nomFiscal || 'Proveidor',
      'factures',
      fileNameForMirror(ref)
    );
    if (await copyRef(rootPath, ref, target)) copied += 1;
  }

  for (const projecteCodi of gasto.projectes || []) {
    const projecte = projectes.find(p => p.codi === projecteCodi);
    if (!projecte) continue;
    const client = clients.find(c => c.codi === projecte.client);
    if (!client) continue;
    const target = buildProjectDocumentPath(
      client.codi,
      client.nomComercial || client.nomFiscal || 'Client',
      projecte.codi,
      projecte.titol || 'Projecte',
      'enllacos',
      fileNameForMirror(ref)
    );
    if (await copyRef(rootPath, ref, target)) copied += 1;
  }

  return copied;
}

async function normalizeBudget(rootPath: string, pressupost: Pressupost): Promise<{ pressupost: Pressupost; copied: number; updatedRefs: number }> {
  const clients = storage.getClients();
  const projectes = storage.getProjectes();
  const client = clients.find(c => c.codi === pressupost.client);
  if (!client) return { pressupost, copied: 0, updatedRefs: 0 };

  const projecteCodi = pressupost.projecteCreat || pressupost.projecteVinculat;
  const projecte = projecteCodi ? projectes.find(p => p.codi === projecteCodi) : undefined;
  let copied = 0;
  let updatedRefs = 0;

  const documentsGenerats = [];
  for (const ref of pressupost.documentsGenerats || []) {
    if (!isPendingBudgetPath(ref)) {
      documentsGenerats.push(ref);
      continue;
    }

    const target = projecte
      ? buildProjectDocumentPath(
          client.codi,
          client.nomComercial || client.nomFiscal || 'Client',
          projecte.codi,
          projecte.titol || pressupost.nomProjecte || 'Projecte',
          'pressupostos',
          fileNameForMirror(ref)
        )
      : buildClientDocumentPath(
          client.codi,
          client.nomComercial || client.nomFiscal || 'Client',
          'pressupostos',
          fileNameForMirror(ref)
        );

    if (await copyRef(rootPath, ref, target)) copied += 1;
    documentsGenerats.push({ ...ref, relativePath: target });
    updatedRefs += 1;
  }

  return { pressupost: { ...pressupost, documentsGenerats }, copied, updatedRefs };
}

export async function organizeDocumentMirrors(rootPath: string): Promise<DocumentMirrorResult> {
  const result = emptyResult();

  const nextPressupostos: Pressupost[] = [];
  for (const pressupost of storage.getPressupostos()) {
    try {
      const normalized = await normalizeBudget(rootPath, pressupost);
      result.copied += normalized.copied;
      result.updatedRefs += normalized.updatedRefs;
      nextPressupostos.push(normalized.pressupost);
    } catch (error) {
      nextPressupostos.push(pressupost);
      result.errors.push(`${pressupost.codi}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  storage.setPressupostos(nextPressupostos);

  for (const factura of storage.getFacturesVenda()) {
    for (const ref of factura.documentsGenerats || []) {
      try {
        if (await mirrorSalesInvoiceToProject(rootPath, factura, ref)) result.copied += 1;
        else result.skipped += 1;
      } catch (error) {
        result.errors.push(`${factura.codi}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  for (const gasto of storage.getFacturesCompra() as Gasto[]) {
    if (gasto.tipus !== 'factura-compra') continue;
    for (const ref of gasto.documentsGenerats || []) {
      try {
        const copied = await mirrorPurchaseInvoice(rootPath, gasto, ref);
        result.copied += copied;
        if (copied === 0) result.skipped += 1;
      } catch (error) {
        result.errors.push(`${gasto.codi}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return result;
}
