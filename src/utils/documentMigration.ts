import type { Client } from '../types/client';
import type { FacturaCompra, Gasto, GastoGeneral, ObligacioFiscal } from '../types/facturaCompra';
import type { FacturaVenta } from '../types/facturaVenta';
import type { DocumentProjecte, Projecte } from '../types/projecte';
import type { DocumentProveidor, Proveidor } from '../types/proveidor';
import type { DocumentFileRef, DocumentKind } from '../types/documental';
import {
  buildFiscalDocumentPath,
  buildProjectDocumentPath,
  buildProviderDocumentPath,
  createDocumentRef,
  safeFileName,
  versionedPdfName,
  type ProviderDocumentFolder
} from './documentManager';
import { appendCurrentDocumentRef } from './fiscalDocumentStorage';
import { storage } from './storageManager';

export interface LegacyDocumentMigrationStats {
  projectDocuments: number;
  providerDocuments: number;
  salesInvoices: number;
  purchaseDocuments: number;
  fiscalObligations: number;
  total: number;
}

export interface LegacyDocumentMigrationResult extends LegacyDocumentMigrationStats {
  migrated: number;
  skipped: number;
  errors: string[];
}

const emptyStats = (): LegacyDocumentMigrationStats => ({
  projectDocuments: 0,
  providerDocuments: 0,
  salesInvoices: 0,
  purchaseDocuments: 0,
  fiscalObligations: 0,
  total: 0,
});

function hasBase64(value?: string): value is string {
  return typeof value === 'string' && value.startsWith('data:') && value.includes('base64,');
}

function providerFolderForType(tipus: DocumentProveidor['tipus']): ProviderDocumentFolder {
  if (tipus === 'contracte') return 'contracte';
  if (String(tipus).startsWith('asseg')) return 'asseguranca';
  if (tipus === 'certificat') return 'certificat';
  return 'altres';
}

function nextVersion(existingRefs: DocumentFileRef[] | undefined, displayName: string): number {
  const refs = existingRefs || [];
  const max = refs
    .filter(ref => ref.displayName === displayName)
    .reduce((current, ref) => Math.max(current, ref.version || 0), 0);
  return max + 1;
}

function clientForProject(projecte: Projecte, clients: Client[]): Client | undefined {
  return clients.find(client => client.codi === projecte.client);
}

export function scanLegacyDocuments(): LegacyDocumentMigrationStats {
  const stats = emptyStats();

  for (const projecte of storage.getProjectes()) {
    const count = (projecte.documents || []).filter(doc => hasBase64(doc.fitxer) && !doc.fileRef).length;
    stats.projectDocuments += count;
  }

  for (const proveidor of storage.getProveidors()) {
    const count = (proveidor.documents || []).filter(doc => hasBase64(doc.urlFitxer) && !doc.fileRef).length;
    stats.providerDocuments += count;
  }

  for (const factura of storage.getFacturesVenda()) {
    if (hasBase64(factura.documentPDF) && !(factura.documentsGenerats || []).some(ref => ref.migratedFromBase64)) {
      stats.salesInvoices += 1;
    }
  }

  for (const gasto of storage.getFacturesCompra() as Gasto[]) {
    if (hasBase64(gasto.documentPDF) && !(gasto.documentsGenerats || []).some(ref => ref.migratedFromBase64)) {
      stats.purchaseDocuments += 1;
    }
  }

  for (const obligacio of storage.getObligacionsFiscals()) {
    if (hasBase64(obligacio.documentPDF) && !(obligacio.documentsGenerats || []).some(ref => ref.migratedFromBase64)) {
      stats.fiscalObligations += 1;
    }
  }

  stats.total = stats.projectDocuments + stats.providerDocuments + stats.salesInvoices + stats.purchaseDocuments + stats.fiscalObligations;
  return stats;
}

async function writeDocument(rootPath: string, relativePath: string, dataBase64: string) {
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  if (!electronDocuments) throw new Error('El gestor documental nomes esta disponible a Aurora Desktop.');
  const result = await electronDocuments.writeFile({ rootPath, relativePath, dataBase64 });
  if (!result.success || !result.data) throw new Error(result.error || 'No sha pogut escriure el document.');
  return result.data;
}

async function migrateProjectDocument(rootPath: string, projecte: Projecte, client: Client, doc: DocumentProjecte): Promise<DocumentProjecte> {
  const displayName = doc.nom || doc.nomFitxer;
  const version = nextVersion((projecte.documents || []).map(d => d.fileRef).filter(Boolean) as DocumentFileRef[], displayName);
  const ext = doc.nomFitxer.includes('.') ? doc.nomFitxer.split('.').pop() || 'dat' : 'dat';
  const filename = `${safeFileName(displayName)}_v${String(version).padStart(3, '0')}.${safeFileName(ext)}`;
  const relativePath = buildProjectDocumentPath(
    client.codi,
    client.nomComercial || client.nomFiscal || 'Client',
    projecte.codi,
    projecte.titol || 'Projecte',
    'documents',
    filename
  );
  const info = await writeDocument(rootPath, relativePath, doc.fitxer!);
  const fileRef = createDocumentRef({
    kind: 'projecte',
    ownerType: 'projecte',
    ownerCodi: projecte.codi,
    displayName,
    originalName: doc.nomFitxer,
    relativePath,
    size: info.size,
    sha256: info.sha256,
    version,
    generated: false,
    migratedFromBase64: true,
  });
  return { ...doc, fileRef };
}

async function migrateProviderDocument(rootPath: string, proveidor: Proveidor, doc: DocumentProveidor): Promise<DocumentProveidor> {
  const displayName = doc.nom;
  const version = nextVersion((proveidor.documents || []).map(d => d.fileRef).filter(Boolean) as DocumentFileRef[], displayName);
  const ext = doc.nom.includes('.') ? doc.nom.split('.').pop() || 'dat' : 'dat';
  const filename = `${safeFileName(displayName.replace(/\.[^.]+$/, ''))}_v${String(version).padStart(3, '0')}.${safeFileName(ext)}`;
  const relativePath = buildProviderDocumentPath(
    proveidor.codi,
    proveidor.nomComercial || proveidor.nomFiscal || 'Proveidor',
    providerFolderForType(doc.tipus),
    filename
  );
  const info = await writeDocument(rootPath, relativePath, doc.urlFitxer);
  const fileRef = createDocumentRef({
    kind: 'proveidor',
    ownerType: 'proveidor',
    ownerCodi: proveidor.codi,
    displayName,
    originalName: doc.nom,
    relativePath,
    size: info.size,
    sha256: info.sha256,
    version,
    generated: false,
    migratedFromBase64: true,
  });
  return { ...doc, urlFitxer: doc.urlFitxer, fileRef, mida: info.size || doc.mida };
}

async function migrateFiscalDocument(
  rootPath: string,
  item: FacturaVenta | FacturaCompra | GastoGeneral | ObligacioFiscal,
  kind: DocumentKind,
  folder: 'factures-venda' | 'despeses'
) {
  if (!hasBase64(item.documentPDF)) return item;
  const existingRefs = item.documentsGenerats || [];
  if (existingRefs.some(ref => ref.migratedFromBase64)) return item;

  const date = 'dataFactura' in item ? item.dataFactura : item.dataGasto;
  const originalName = item.documentPDFName || `${item.codi}.pdf`;
  const displayName = `${item.codi}_${originalName.replace(/\.[^.]+$/, '')}`;
  const version = nextVersion(existingRefs, displayName);
  const filename = versionedPdfName(displayName, version, 'migrat');
  const relativePath = buildFiscalDocumentPath(date, folder, filename);
  const info = await writeDocument(rootPath, relativePath, item.documentPDF);
  const fileRef = createDocumentRef({
    kind,
    ownerType: 'fiscal',
    ownerCodi: item.codi,
    displayName,
    originalName,
    relativePath,
    mimeType: 'application/pdf',
    size: info.size,
    sha256: info.sha256,
    version,
    generated: kind === 'factura-venda',
    migratedFromBase64: true,
  });

  return {
    ...item,
    documentsGenerats: appendCurrentDocumentRef(existingRefs, fileRef),
  };
}

export async function migrateLegacyDocuments(rootPath: string): Promise<LegacyDocumentMigrationResult> {
  const result: LegacyDocumentMigrationResult = { ...emptyStats(), migrated: 0, skipped: 0, errors: [] };
  const clients = storage.getClients();

  const projectes = storage.getProjectes();
  const migratedProjectes: Projecte[] = [];
  for (const projecte of projectes) {
    const client = clientForProject(projecte, clients);
    if (!client) {
      migratedProjectes.push(projecte);
      continue;
    }
    const docs: DocumentProjecte[] = [];
    for (const doc of projecte.documents || []) {
      if (!hasBase64(doc.fitxer) || doc.fileRef) {
        docs.push(doc);
        if (doc.fileRef) result.skipped += 1;
        continue;
      }
      try {
        docs.push(await migrateProjectDocument(rootPath, projecte, client, doc));
        result.projectDocuments += 1;
        result.migrated += 1;
      } catch (error) {
        docs.push(doc);
        result.errors.push(`${projecte.codi}/${doc.nom}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    migratedProjectes.push({ ...projecte, documents: docs });
  }
  storage.setProjectes(migratedProjectes);

  const proveidors = storage.getProveidors();
  const migratedProveidors: Proveidor[] = [];
  for (const proveidor of proveidors) {
    const docs: DocumentProveidor[] = [];
    for (const doc of proveidor.documents || []) {
      if (!hasBase64(doc.urlFitxer) || doc.fileRef) {
        docs.push(doc);
        if (doc.fileRef) result.skipped += 1;
        continue;
      }
      try {
        docs.push(await migrateProviderDocument(rootPath, proveidor, doc));
        result.providerDocuments += 1;
        result.migrated += 1;
      } catch (error) {
        docs.push(doc);
        result.errors.push(`${proveidor.codi}/${doc.nom}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    migratedProveidors.push({ ...proveidor, documents: docs });
  }
  storage.setProveidors(migratedProveidors);

  const facturesVenda: FacturaVenta[] = [];
  for (const factura of storage.getFacturesVenda()) {
    try {
      const migrated = await migrateFiscalDocument(rootPath, factura, 'factura-venda', 'factures-venda') as FacturaVenta;
      if (migrated !== factura) {
        result.salesInvoices += 1;
        result.migrated += 1;
      }
      facturesVenda.push(migrated);
    } catch (error) {
      facturesVenda.push(factura);
      result.errors.push(`${factura.codi}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  storage.setFacturesVenda(facturesVenda);

  const facturesCompra: Gasto[] = [];
  for (const gasto of storage.getFacturesCompra() as Gasto[]) {
    try {
      const kind: DocumentKind = gasto.tipus === 'gasto-general' ? 'gasto-general' : 'factura-compra';
      const migrated = await migrateFiscalDocument(rootPath, gasto as FacturaCompra | GastoGeneral, kind, 'despeses') as Gasto;
      if (migrated !== gasto) {
        result.purchaseDocuments += 1;
        result.migrated += 1;
      }
      facturesCompra.push(migrated);
    } catch (error) {
      facturesCompra.push(gasto);
      result.errors.push(`${gasto.codi}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  storage.setFacturesCompra(facturesCompra as FacturaCompra[]);

  const obligacions: ObligacioFiscal[] = [];
  for (const obligacio of storage.getObligacionsFiscals()) {
    try {
      const migrated = await migrateFiscalDocument(rootPath, obligacio, 'obligacio-fiscal', 'despeses') as ObligacioFiscal;
      if (migrated !== obligacio) {
        result.fiscalObligations += 1;
        result.migrated += 1;
      }
      obligacions.push(migrated);
    } catch (error) {
      obligacions.push(obligacio);
      result.errors.push(`${obligacio.codi}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  storage.setObligacionsFiscals(obligacions);

  result.total = result.projectDocuments + result.providerDocuments + result.salesInvoices + result.purchaseDocuments + result.fiscalObligations;
  return result;
}
