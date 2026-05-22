import type { EstatFacturaVenta } from '../../../types/facturaVenta';

export function calcularImpostos(base: number, ivaPercent: number, irpfPercent: number) {
  const ivaImport = (base * ivaPercent) / 100;
  const irpfImport = (base * irpfPercent) / 100;
  const total = base + ivaImport - irpfImport;

  return { ivaImport, irpfImport, total };
}

export function determinarEstat(
  totalFactura: number,
  totalCobrat: number,
  dataVenciment: string,
  estatActual: EstatFacturaVenta
): EstatFacturaVenta {
  const pendent = totalFactura - totalCobrat;

  // No cambiar si está cancelada
  if (estatActual === 'cancelled') {
    return 'cancelled';
  }

  // Totalmente cobrada
  if (pendent <= 0.01) {
    return 'pagada';
  }

  // Cobrada parcialmente
  if (totalCobrat > 0) {
    return 'pagada-parcial';
  }

  // Sin cobros: comprobar si está vencida
  const avui = new Date();
  const venciment = new Date(dataVenciment);
  
  if (avui > venciment && pendent > 0) {
    return 'vencuda';
  }

  // Por defecto: enviada (si ya estaba enviada) o borrador
  return estatActual === 'borrador' ? 'borrador' : 'enviada';
}

export function formatCurrency(value: number | undefined): string {
  return `${(value || 0).toFixed(2)}€`;
}

export function calcularVenciment(dataFactura: string, diesVenciment: number = 30): string {
  const data = new Date(dataFactura);
  data.setDate(data.getDate() + diesVenciment);
  return data.toISOString().split('T')[0];
}