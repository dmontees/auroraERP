import type { FacturaVenta } from '../types/facturaVenta';
import type { Projecte } from '../types/projecte';
import type { Gasto, GastoGeneral } from '../types/facturaCompra';
import { getBaseProjecteFacturat } from './facturaBestretes';

export interface Periode {
  dataInici: string;
  dataFi: string;
}

// Canonical income resolver for a project (used in Resultats tabs and exports).
// Priority: linked invoice baseImposable → tasks sum → legacy ingresSenseIVA field.
// Always uses baseImposable (net of IVA/IRPF), never totalFactura.
export const getProjecteIngressos = (
  p: Projecte,
  facturesVenda: FacturaVenta[],
): number => {
  const facturat = getBaseProjecteFacturat(p.codi, facturesVenda);
  if (facturat > 0) return facturat;
  const fromTasques = (p.tasques || []).reduce((s, t) => s + (t.importe || 0), 0);
  return fromTasques || p.ingresSenseIVA || 0;
};

export const estaEnPeriode = (data: string, periode: Periode): boolean =>
  data >= periode.dataInici && data <= periode.dataFi;

// Returns the effective date for filtering a Gasto item.
// GastoGeneral has mesImputacion (YYYY-MM) = accounting month, independent of receipt date.
export const getDataEfectivaGasto = (g: Gasto): string => {
  if (g.tipus === 'gasto-general' && (g as GastoGeneral).mesImputacion) {
    return (g as GastoGeneral).mesImputacion + '-01';
  }
  return g.dataGasto;
};

export const getUltimsXMesos = (mesos: number): Periode => {
  const avui = new Date();
  const inici = new Date(avui.getFullYear(), avui.getMonth() - mesos + 1, 1);
  return {
    dataInici: inici.toISOString().split('T')[0],
    dataFi: avui.toISOString().split('T')[0],
  };
};

export const formatCurrency = (value: number): string =>
  value.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';

export const agruparPerMes = (
  items: any[],
  campData: string,
  campValor: string,
  periode: Periode,
): { mes: string; valor: number }[] => {
  const mesos: Record<string, number> = {};

  // String-based iteration avoids DST timezone issues with Date.setMonth
  const [iniY, iniM] = periode.dataInici.substring(0, 7).split('-').map(Number);
  const [fiY, fiM] = periode.dataFi.substring(0, 7).split('-').map(Number);
  let y = iniY, m = iniM;
  while (y < fiY || (y === fiY && m <= fiM)) {
    mesos[`${y}-${String(m).padStart(2, '0')}`] = 0;
    if (++m > 12) { m = 1; y++; }
  }

  items.forEach(item => {
    const data = item[campData];
    if (data && estaEnPeriode(data, periode)) {
      const key = data.substring(0, 7);
      if (key in mesos) mesos[key] += item[campValor] || 0;
    }
  });

  return Object.entries(mesos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, valor]) => ({ mes, valor }));
};
