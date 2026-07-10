import type { FacturaVenta } from '../types/facturaVenta';

export interface AnticiposAplicatsTotals {
  base: number;
  iva: number;
  irpf: number;
  total: number;
}

export function getTipusComercialFactura(factura: Partial<FacturaVenta>): NonNullable<FacturaVenta['tipusComercial']> {
  return factura.tipusComercial || 'ordinaria';
}

export function esFacturaAnticip(factura: Partial<FacturaVenta>): boolean {
  return getTipusComercialFactura(factura) === 'anticip';
}

export function esFacturaFinal(factura: Partial<FacturaVenta>): boolean {
  return getTipusComercialFactura(factura) === 'final';
}

export function getFacturesAnticipDisponibles(
  factura: Partial<FacturaVenta>,
  allFactures: FacturaVenta[],
): FacturaVenta[] {
  if (!factura.projecte) return [];

  return allFactures
    .filter(f =>
      f.codi !== factura.codi &&
      f.projecte === factura.projecte &&
      getTipusComercialFactura(f) === 'anticip' &&
      f.tipus !== 'rectificativa' &&
      f.estat !== 'borrador'
    )
    .sort((a, b) => a.dataFactura.localeCompare(b.dataFactura) || a.codi.localeCompare(b.codi));
}

export function getCodisAnticipSeleccionats(
  factura: Partial<FacturaVenta>,
  allFactures: FacturaVenta[],
): string[] {
  if (!esFacturaFinal(factura)) return [];
  const disponibles = getFacturesAnticipDisponibles(factura, allFactures);
  if (Array.isArray(factura.anticiposAplicats)) {
    const disponiblesSet = new Set(disponibles.map(f => f.codi));
    return factura.anticiposAplicats.filter(codi => disponiblesSet.has(codi));
  }
  return disponibles.map(f => f.codi);
}

export function calcularAnticiposAplicats(
  factura: Partial<FacturaVenta>,
  allFactures: FacturaVenta[],
): AnticiposAplicatsTotals {
  const codis = new Set(getCodisAnticipSeleccionats(factura, allFactures));
  return allFactures
    .filter(f => codis.has(f.codi))
    .reduce<AnticiposAplicatsTotals>((sum, f) => ({
      base: sum.base + (f.baseImposable || 0),
      iva: sum.iva + (f.ivaImport || 0),
      irpf: sum.irpf + (f.irpfImport || 0),
      total: sum.total + (f.totalFactura || 0),
    }), { base: 0, iva: 0, irpf: 0, total: 0 });
}

export function getBaseProjecteFacturat(
  projecteCodi: string,
  facturesVenda: FacturaVenta[],
): number {
  const facturesProjecte = facturesVenda.filter(f =>
    f.projecte === projecteCodi &&
    f.tipus !== 'rectificativa' &&
    f.estat !== 'borrador'
  );
  const finals = facturesProjecte.filter(esFacturaFinal);
  if (finals.length > 0) {
    return finals.reduce((sum, f) => sum + (f.baseImposable || 0) + (f.anticiposAplicatsBase || 0), 0);
  }
  return facturesProjecte.reduce((sum, f) => sum + (f.baseImposable || 0), 0);
}
