import type { FacturaVenta } from '../../../types/facturaVenta';

export function generarFacturaRectificativa(
  facturaOriginal: FacturaVenta,
  nouCodi: string,
  motivo: string
): FacturaVenta {
  // Copiar estructura de tasques con importes negativos
  const tasquesRectificatives = facturaOriginal.tasques.map(categoria => ({
    ...categoria,
    tasques: categoria.tasques.map(tasca => ({
      ...tasca,
      preu: -tasca.preu // Invertir precio
    }))
  }));

  // Crear factura rectificativa
  const facturaRectificativa: FacturaVenta = {
    codi: nouCodi,
    tipus: 'rectificativa',
    facturaRectificada: facturaOriginal.codi,
    motivoRectificativa: motivo,
    estat: 'borrador',
    client: facturaOriginal.client,
    projecte: facturaOriginal.projecte,
    dataFactura: new Date().toISOString().split('T')[0],
    dataVenciment: new Date().toISOString().split('T')[0], // Mismo día
    dataEnviada: undefined,
    ivaPercent: facturaOriginal.ivaPercent,
    irpfPercent: facturaOriginal.irpfPercent,
    tasques: tasquesRectificatives,
    baseImposable: -facturaOriginal.baseImposable,
    ivaImport: -facturaOriginal.ivaImport,
    irpfImport: -facturaOriginal.irpfImport,
    totalFactura: -facturaOriginal.totalFactura,
    pagaments: [],
    totalPagat: 0,
    pendentCobrar: -facturaOriginal.totalFactura,
    observacions: `Nota de crèdit de la factura ${facturaOriginal.codi}. Motiu: ${motivo}`,
    plantillesSeleccionades: facturaOriginal.plantillesSeleccionades,
    plantillesText: facturaOriginal.plantillesText,
    accions: [
      {
        data: new Date().toISOString(),
        descripcio: `Factura rectificativa creada. Rectifica: ${facturaOriginal.codi}`,
        automatic: true
      }
    ],
    documentPDF: undefined,
    documentPDFName: undefined
  };

  return facturaRectificativa;
}

export function validarCrearRectificativa(
  factura: FacturaVenta,
  allFactures: FacturaVenta[]
): { valid: boolean; error?: string } {
  // 1. No se puede rectificar una rectificativa
  if (factura.tipus === 'rectificativa') {
    return {
      valid: false,
      error: 'No es pot crear una nota de crèdit d\'una factura que ja és rectificativa'
    };
  }

  // 2. Verificar si ya tiene rectificativa total (opcional)
  const jaTeRectificativa = allFactures.some(f => 
    f.tipus === 'rectificativa' && 
    f.facturaRectificada === factura.codi &&
    Math.abs(f.totalFactura) === Math.abs(factura.totalFactura)
  );

  if (jaTeRectificativa) {
    return {
      valid: false,
      error: 'Aquesta factura ja té una nota de crèdit total creada'
    };
  }

  return { valid: true };
}