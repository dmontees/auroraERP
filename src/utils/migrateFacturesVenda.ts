import type { FacturaVenta } from '../types/facturaVenta';
import { storage } from './storageManager'; // ← CAMBIO

export function migrateFacturesVendaTipus() {
  const factures = storage.getFacturesVenda(); // ← CAMBIO
  
  if (factures.length === 0) return;

  let needsMigration = false;
  
  const migrated = factures.map(f => {
    if (!f.tipus || !f.tipusComercial) {
      needsMigration = true;
      return {
        ...f,
        tipus: f.tipus || ('normal' as const),
        tipusComercial: f.tipusComercial || ('ordinaria' as const),
        facturaRectificada: f.facturaRectificada,
        motivoRectificativa: f.motivoRectificativa
      };
    }
    return f;
  });

  if (needsMigration) {
    storage.setFacturesVenda(migrated); // ← CAMBIO
    console.log('✅ Migradas', migrated.length, 'factures amb tipus');
  }
}
