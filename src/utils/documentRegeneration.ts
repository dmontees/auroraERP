import type { FacturaVenta } from '../types/facturaVenta';
import type { Pressupost } from '../types/pressupost';
import { generarFacturaVentaPDF } from './generarFacturaVentaPDF';
import { generarPressupostPDF } from './generarPressupostPDF';
import { buildFiscalDocumentPath, buildPendingDocumentPath, buildProjectDocumentPath, createDocumentRef, versionedPdfName } from './documentManager';
import { storage } from './storageManager';

export interface DocumentRegenerationResult {
  pressupostos: number;
  facturesVenda: number;
  skipped: number;
  errors: string[];
}

export async function regenerateHistoricalGeneratedDocuments(rootPath: string): Promise<DocumentRegenerationResult> {
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  if (!electronDocuments) throw new Error('El gestor documental local nomes esta disponible a Aurora Desktop.');

  const result: DocumentRegenerationResult = { pressupostos: 0, facturesVenda: 0, skipped: 0, errors: [] };
  const clients = storage.getClients();
  const projectes = storage.getProjectes();
  const pressupostos = storage.getPressupostos();
  const facturesVenda = storage.getFacturesVenda();
  const verifactuConfig = storage.getVerifactuConfig();

  const nextPressupostos: Pressupost[] = [];
  for (const pressupost of pressupostos) {
    try {
      if ((pressupost.documentsGenerats || []).length > 0) {
        result.skipped += 1;
        nextPressupostos.push(pressupost);
        continue;
      }

      const client = clients.find(c => c.codi === pressupost.client);
      if (!client) {
        result.skipped += 1;
        nextPressupostos.push(pressupost);
        continue;
      }

      const projecteCodi = pressupost.projecteCreat || pressupost.projecteVinculat;
      const projecte = projecteCodi ? projectes.find(p => p.codi === projecteCodi) : undefined;
      const filename = versionedPdfName(`${pressupost.codi}_ca`, 1, 'historic');
      const relativePath = projecte
        ? buildProjectDocumentPath(
            client.codi,
            client.nomComercial || client.nomFiscal || 'Client',
            projecte.codi,
            projecte.titol || pressupost.nomProjecte || 'Projecte',
            'pressupostos',
            filename
          )
        : buildPendingDocumentPath('Pressupostos', filename);
      const dataBase64 = generarPressupostPDF(pressupost, clients, 'ca', { save: false });
      const writeResult = await electronDocuments.writeFile({ rootPath, relativePath, dataBase64 });
      if (!writeResult.success || !writeResult.data) throw new Error(writeResult.error || 'No sha pogut guardar el PDF');

      const fileRef = createDocumentRef({
        kind: 'pressupost',
        ownerType: projecte ? 'projecte' : 'client',
        ownerCodi: projecte?.codi || client.codi,
        displayName: `${pressupost.codi}_ca`,
        originalName: filename,
        relativePath,
        mimeType: 'application/pdf',
        size: writeResult.data.size,
        sha256: writeResult.data.sha256,
        version: 1,
        generated: true,
      });
      nextPressupostos.push({ ...pressupost, documentsGenerats: [fileRef] });
      result.pressupostos += 1;
    } catch (error) {
      result.errors.push(`${pressupost.codi}: ${error instanceof Error ? error.message : String(error)}`);
      nextPressupostos.push(pressupost);
    }
  }

  const nextFactures: FacturaVenta[] = [];
  for (const factura of facturesVenda) {
    try {
      if ((factura.documentsGenerats || []).length > 0) {
        result.skipped += 1;
        nextFactures.push(factura);
        continue;
      }

      const filename = versionedPdfName(`${factura.codi}_ca_factura`, 1, 'historic');
      const relativePath = buildFiscalDocumentPath(factura.dataFactura, 'factures-venda', filename);
      const dataBase64 = await generarFacturaVentaPDF(factura, clients, projectes, 'ca', factura.estat === 'borrador', verifactuConfig, { save: false });
      const writeResult = await electronDocuments.writeFile({ rootPath, relativePath, dataBase64 });
      if (!writeResult.success || !writeResult.data) throw new Error(writeResult.error || 'No sha pogut guardar el PDF');

      const fileRef = createDocumentRef({
        kind: 'factura-venda',
        ownerType: 'fiscal',
        ownerCodi: factura.codi,
        displayName: `${factura.codi}_ca_factura`,
        originalName: filename,
        relativePath,
        mimeType: 'application/pdf',
        size: writeResult.data.size,
        sha256: writeResult.data.sha256,
        version: 1,
        generated: true,
      });
      nextFactures.push({
        ...factura,
        documentsGenerats: [fileRef],
        documentPDF: dataBase64,
        documentPDFName: `${factura.codi}_factura.pdf`,
      });
      result.facturesVenda += 1;
    } catch (error) {
      result.errors.push(`${factura.codi}: ${error instanceof Error ? error.message : String(error)}`);
      nextFactures.push(factura);
    }
  }

  storage.setPressupostos(nextPressupostos);
  storage.setFacturesVenda(nextFactures);
  return result;
}
