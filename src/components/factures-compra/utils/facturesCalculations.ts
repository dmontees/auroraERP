import type { EstatGasto } from '../../../types/facturaCompra';

export function calcularImpostos(base: number, ivaPercent: number, irpfPercent: number) {
  // Work in integer cents to avoid floating-point residuals
  const ivaImport = Math.round(base * ivaPercent) / 100;
  const irpfImport = Math.round(base * irpfPercent) / 100;
  const total = Math.round((base + ivaImport - irpfImport) * 100) / 100;

  return { ivaImport, irpfImport, total };
}

export function determinarEstat(
  totalGasto: number,
  totalPagat: number,
  dataVenciment?: string
): EstatGasto {
  const pendent = totalGasto - totalPagat;

  if (pendent <= 0.01) {
    return 'pagada';
  }

  if (totalPagat > 0) {
    return 'pagada-parcial';
  }

  if (dataVenciment && new Date(dataVenciment) < new Date()) {
    return 'vencuda';
  }

  return 'pendent';
}

export function formatCurrency(value: number | undefined): string {
  return `${(value || 0).toFixed(2)}€`;
}