import type { Projecte, RecursHumaProjecte, MaterialProjecte } from '../types/projecte';
import type { AlbaraCompra } from '../types/albara';
import type { Parametres } from '../types/parametres';
import type { Proveidor } from '../types/proveidor';
import type { ObligacioFiscal } from '../types/facturaCompra';
import { storage } from './storageManager';

// ─── Generació de codis ──────────────────────────────────────────────────────

export function getNextTdCodi(currentFormData?: Projecte): string {
  const saved = storage.getProjectes() as Projecte[];
  let maxNum = 0;

  const scanProject = (p: Projecte) => {
    for (const r of p.recursosHumans || []) {
      if (r.tdCodi) {
        const n = parseInt(r.tdCodi.replace('TD-', ''), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }
    for (const m of p.materials || []) {
      if (m.tdCodi) {
        const n = parseInt(m.tdCodi.replace('TD-', ''), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }
  };

  saved.forEach(scanProject);
  if (currentFormData) scanProject(currentFormData);

  return `TD-${String(maxNum + 1).padStart(7, '0')}`;
}

function getNextAlcCodi(existing: AlbaraCompra[]): string {
  if (existing.length === 0) return 'ALC-00001';
  const nums = existing.map(a => parseInt(a.codi.replace('ALC-', ''), 10)).filter(n => !isNaN(n));
  return `ALC-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(5, '0')}`;
}

// ─── Construcció de dades d'albarà a partir d'una línia de projecte ─────────

function buildAlbaraFromRrhh(
  recurs: RecursHumaProjecte,
  project: Projecte,
  parametres: Parametres | null,
): Omit<AlbaraCompra, 'codi' | 'dataCreacio' | 'estat' | 'facturaCodi'> {
  const serveiData = parametres?.serveis.find(s => s.codi === recurs.servei);
  const unitatData = parametres?.unitats.find(u => u.codi === recurs.unitat);
  return {
    tdCodi: recurs.tdCodi!,
    projecteCodi: project.codi,
    proveidorCodi: recurs.proveidor!,
    tipusLinia: 'rrhh',
    serveiCodi: recurs.servei,
    serveiNom: serveiData?.nom || recurs.servei,
    quantitat: recurs.quantitat,
    unitatCodi: recurs.unitat,
    unitatNom: unitatData?.nom || recurs.unitat,
    preuProv: recurs.preu,
    cost: recurs.cost,
  };
}

function buildAlbaraFromMaterial(
  material: MaterialProjecte,
  project: Projecte,
  parametres: Parametres | null,
): Omit<AlbaraCompra, 'codi' | 'dataCreacio' | 'estat' | 'facturaCodi'> {
  const materialData = parametres?.materials.find(m => m.codi === material.material);
  const grupData = parametres?.grupsMaterials.find(g => g.codi === material.grup);
  return {
    tdCodi: material.tdCodi!,
    projecteCodi: project.codi,
    proveidorCodi: material.proveidor,
    tipusLinia: 'material',
    materialCodi: material.material,
    materialNom: materialData?.material || material.material,
    grupCodi: material.grup,
    grupNom: grupData?.nom || material.grup,
    preuProveidor: material.preuProveidor,
  };
}

// ─── Sincronització principal ────────────────────────────────────────────────

/**
 * Sincronitza els albarans amb les línies de despesa del projecte.
 * - Crea albarans nous per a línies amb proveïdor i tdCodi sense albarà existent.
 * - Actualitza dades de línies ja vinculades (preserva estat i facturaCodi).
 * - No elimina albarans (la gestió d'eliminació és a ProjecteModal).
 */
export function syncAlbaransForProject(
  project: Projecte,
  parametres: Parametres | null,
): void {
  const today = new Date().toISOString().split('T')[0];
  const albarans = storage.getAlbaransCompra();
  const updated = [...albarans];
  let alcCodisBase = updated; // reference for next code generation

  const upsert = (
    tdCodi: string,
    data: Omit<AlbaraCompra, 'codi' | 'dataCreacio' | 'estat' | 'facturaCodi'>,
  ) => {
    const idx = updated.findIndex(a => a.tdCodi === tdCodi);
    if (idx >= 0) {
      updated[idx] = {
        ...updated[idx],
        ...data,
        codi: updated[idx].codi,
        estat: updated[idx].estat,
        facturaCodi: updated[idx].facturaCodi,
        dataCreacio: updated[idx].dataCreacio,
      };
    } else {
      const novaAlbara: AlbaraCompra = {
        ...data,
        codi: getNextAlcCodi(alcCodisBase),
        dataCreacio: today,
        estat: 'pendent-factura',
      };
      updated.push(novaAlbara);
      alcCodisBase = updated;
    }
  };

  for (const r of project.recursosHumans || []) {
    if (r.proveidor && r.tdCodi) {
      upsert(r.tdCodi, buildAlbaraFromRrhh(r, project, parametres));
    }
  }

  for (const m of project.materials || []) {
    if (m.proveidor && m.tdCodi) {
      upsert(m.tdCodi, buildAlbaraFromMaterial(m, project, parametres));
    }
  }

  storage.setAlbaransCompra(updated);
}

/**
 * Comprova si es pot eliminar una línia. Retorna el missatge de bloqueig o null si és permès.
 */
export function checkEliminarLinia(tdCodi: string | undefined): string | null {
  if (!tdCodi) return null;
  const albara = storage.getAlbaransCompra().find(a => a.tdCodi === tdCodi);
  if (albara?.estat === 'factura-vinculada') {
    return `No es pot eliminar aquesta línia. Té un albarà (${albara.codi}) amb una factura vinculada (${albara.facturaCodi}).\n\nPrimer elimina o desvincola la factura de compra.`;
  }
  return null;
}

/**
 * Sincronitza els albarans vinculats a una nòmina de treballador.
 * Marca els albarans com 'factura-vinculada' o 'pagat' segons l'estat de pagament de la nòmina.
 */
export function syncAlbaransAfterNomina(nomina: ObligacioFiscal): void {
  if (nomina.subtipus !== 'nomina-treballador') return;
  if (!nomina.albaransVinculats || nomina.albaransVinculats.length === 0) return;
  const albarans = storage.getAlbaransCompra();
  const codis = nomina.albaransVinculats;
  const isPagat =
    Math.round((nomina.pendentPagament ?? 0) * 100) / 100 <= 0 &&
    (nomina.totalPagat ?? 0) > 0;
  storage.setAlbaransCompra(
    albarans.map(a =>
      codis.includes(a.codi)
        ? { ...a, facturaCodi: nomina.codi, estat: isPagat ? 'pagat' : 'factura-vinculada' }
        : a
    )
  );
}

/**
 * Elimina l'albarà d'una línia eliminada (si estava en pendent-factura).
 * Si estava pagat, es deixa per historial.
 */
export function deleteAlbaraForLinia(tdCodi: string | undefined): void {
  if (!tdCodi) return;
  const albarans = storage.getAlbaransCompra();
  const albara = albarans.find(a => a.tdCodi === tdCodi);
  if (albara && albara.estat === 'pendent-factura') {
    storage.setAlbaransCompra(albarans.filter(a => a.tdCodi !== tdCodi));
  }
  // Si pagat, es manté com a historial (no s'elimina)
}
