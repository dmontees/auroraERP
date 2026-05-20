import type { FacturaVenta } from '../types/facturaVenda';
import type { Gasto } from '../types/facturaCompra';
import type { Projecte } from '../types/projecte';

export interface Periode {
  dataInici: string;
  dataFi: string;
}

// Verificar si una fecha está en un período
export const estaEnPeriode = (data: string, periode: Periode): boolean => {
  return data >= periode.dataInici && data <= periode.dataFi;
};

// Calcular ingresos totales
export const calcularIngressos = (
  facturesVenda: FacturaVenta[],
  periode: Periode
): number => {
  return facturesVenda
    .filter(f => estaEnPeriode(f.dataFactura, periode))
    .reduce((sum, f) => sum + f.totalFactura, 0);
};

// Calcular gastos totales
export const calcularDespeses = (
  gastos: Gasto[],
  periode: Periode
): number => {
  return gastos
    .filter(g => estaEnPeriode(g.dataGasto, periode))
    .reduce((sum, g) => sum + g.totalGasto, 0);
};

// Calcular gastos de proyectos
export const calcularDespesesProjectes = (
  projectes: Projecte[],
  periode: Periode
): number => {
  return projectes
    .filter(p => p.dataInici && estaEnPeriode(p.dataInici, periode))
    .reduce((sum, p) => {
      const recursosHumans = p.recursosHumans?.reduce((s, r) => s + (r.cost || 0), 0) || 0;
      const materials = p.materials?.reduce((s, m) => s + (m.preuProveidor || 0), 0) || 0;
      return sum + recursosHumans + materials;
    }, 0);
};

// Calcular beneficio
export const calcularBenefici = (ingressos: number, despeses: number): number => {
  return ingressos - despeses;
};

// Calcular margen
export const calcularMarge = (benefici: number, ingressos: number): number => {
  if (ingressos === 0) return 0;
  return (benefici / ingressos) * 100;
};

// Obtener período anterior
export const getPeriodeAnterior = (periode: Periode): Periode => {
  const inici = new Date(periode.dataInici);
  const fi = new Date(periode.dataFi);
  
  const diff = fi.getTime() - inici.getTime();
  
  const nouFi = new Date(inici.getTime() - 1);
  const nouInici = new Date(nouFi.getTime() - diff);
  
  return {
    dataInici: nouInici.toISOString().split('T')[0],
    dataFi: nouFi.toISOString().split('T')[0]
  };
};

// Obtener últimos N meses
export const getUltimsXMesos = (mesos: number): Periode => {
  const avui = new Date();
  const inici = new Date(avui.getFullYear(), avui.getMonth() - mesos + 1, 1);
  
  return {
    dataInici: inici.toISOString().split('T')[0],
    dataFi: avui.toISOString().split('T')[0]
  };
};

// Calcular variación porcentual
export const calcularVariacio = (actual: number, anterior: number): number => {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return ((actual - anterior) / anterior) * 100;
};

// Formatear moneda
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('ca-ES', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }) + '€';
};

// Formatear porcentaje
export const formatPercentage = (value: number): string => {
  return value.toFixed(1) + '%';
};

// Agrupar datos por mes
export const agruparPerMes = (
  items: any[],
  campData: string,
  campValor: string,
  periode: Periode
): { mes: string; valor: number }[] => {
  const mesos: { [key: string]: number } = {};
  
  // Inicializar todos los meses del período
  const inici = new Date(periode.dataInici);
  const fi = new Date(periode.dataFi);
  
  for (let d = new Date(inici); d <= fi; d.setMonth(d.getMonth() + 1)) {
    const mesKey = d.toISOString().substring(0, 7);
    mesos[mesKey] = 0;
  }
  
  // Sumar valores por mes
  items.forEach(item => {
    const data = item[campData];
    if (data && estaEnPeriode(data, periode)) {
      const mesKey = data.substring(0, 7);
      if (mesos[mesKey] !== undefined) {
        mesos[mesKey] += item[campValor] || 0;
      }
    }
  });
  
  return Object.entries(mesos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, valor]) => ({ mes, valor }));
};