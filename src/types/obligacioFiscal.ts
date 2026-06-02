import type { GastoBase } from './facturaCompra';

export type SubtipusObligacioFiscal =
  | 'cuota-autonomo'
  | 'regularitzacio-ss'
  | 'irpf-trimestral'
  | 'irpf-anual'
  | 'iva-trimestral'
  | 'nomina-treballador';

export interface ObligacioFiscal extends GastoBase {
  tipus: 'obligacio-fiscal';
  subtipus: SubtipusObligacioFiscal;
  periode: string;              // 'YYYY-MM' per mensual, 'YYYY-QN' per trimestral
  // nomina-treballador only:
  treballadorCodi?: string;
  treballadorNom?: string;
  diesTreballats?: number;
  salariDiariBrut?: number;
  salariTotalBrut?: number;
  ssEmpresa?: number;
  ssTreballador?: number;
  irpfRetingut?: number;
  salariNet?: number;
  costTotalEmpresa?: number;
  projecteCodi?: string;
  albaransVinculats?: string[];    // ALC-XXXXX codis vinculats (nomina-treballador)
  // iva-trimestral only:
  ivaRepercutitCalculat?: number;
  ivaSuportatCalculat?: number;
  ivaNetCalculat?: number;
  ivaRegistratGestor?: number;
}

export const SUBTIPUS_OBLIGACIO_FISCAL = [
  { codi: 'cuota-autonomo',     nom: 'Quota Autònom (RETA)',           icon: '👤' },
  { codi: 'regularitzacio-ss',  nom: 'Regularització anual SS',        icon: '📊' },
  { codi: 'irpf-trimestral',    nom: 'IRPF Trimestral (Mod. 130)',     icon: '📋' },
  { codi: 'irpf-anual',         nom: 'Liquidació Anual IRPF (Renda)',  icon: '📅' },
  { codi: 'iva-trimestral',     nom: 'IVA Trimestral (Mod. 303)',      icon: '💶' },
  { codi: 'nomina-treballador', nom: 'Nòmina Treballador',             icon: '👷' },
] as const;
