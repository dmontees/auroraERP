import type { EstatGasto } from '../../../types/facturaCompra';

export function calcularImpostos(base: number, ivaPercent: number, irpfPercent: number) {
  const ivaImport = (base * ivaPercent) / 100;
  const irpfImport = (base * irpfPercent) / 100;
  const total = base + ivaImport - irpfImport;

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