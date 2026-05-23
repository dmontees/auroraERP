import { storage } from './storageManager';
import type { ObligacioFiscal } from '../types/facturaCompra';

export function migrateGastoAutonomoToObligacioFiscal() {
  try {
    const gastos = storage.getFacturesCompra() as any[];
    let count = 0;
    const migrated = gastos.map(gasto => {
      if (gasto.tipus === 'gasto-general' && gasto.categoria === 'autonomo') {
        count++;
        const ob: ObligacioFiscal = {
          codi: gasto.codi,
          tipus: 'obligacio-fiscal',
          subtipus: 'cuota-autonomo',
          periode: gasto.mesImputacion || gasto.dataGasto?.substring(0, 7) || '',
          dataGasto: gasto.dataGasto,
          concepte: gasto.concepte || 'Quota Autònom',
          notes: gasto.notes,
          baseImposable: gasto.baseImposable || gasto.totalGasto || 0,
          ivaPercent: 0,
          ivaImport: 0,
          irpfPercent: 0,
          irpfImport: 0,
          totalGasto: gasto.totalGasto || gasto.baseImposable || 0,
          pagaments: gasto.pagaments || [],
          totalPagat: gasto.totalPagat || 0,
          pendentPagament: gasto.pendentPagament || 0,
          estat: gasto.estat || 'pendent',
          documentPDF: gasto.documentPDF,
          documentPDFName: gasto.documentPDFName,
        };
        return ob;
      }
      return gasto;
    });
    if (count > 0) {
      storage.setFacturesCompra(migrated as any);
      console.log(`✅ Migrats ${count} gasto(s) autònom a Obligació Fiscal`);
    }
  } catch (e) {
    console.error('❌ Error migrant gastos autònom:', e);
  }
}
