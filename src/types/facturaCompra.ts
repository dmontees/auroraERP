// ============================================================================
// TYPES: Factures de Compra i Despeses Generals
// 
// CÓDIGOS:
// - Facturas de compra: FAC-00001
// - Gastos generales: DG-00001
// - Facturas de venta (futuro): FAV-00235
// - Pagos: PAG-00001
// ============================================================================

export interface Pagament {
  codi: string;                    // PAG-00001
  data: string;                    // YYYY-MM-DD
  import: number;
  metode: 'transferencia' | 'efectiu' | 'targeta' | 'domiciliacio';
  referencia?: string;
}

export type EstatGasto = 'pendent' | 'pagada-parcial' | 'pagada' | 'vencuda';
export type TipusGasto = 'factura-compra' | 'gasto-general' | 'obligacio-fiscal';

export type SubtipusObligacioFiscal =
  | 'cuota-autonomo'
  | 'regularitzacio-ss'
  | 'irpf-trimestral'
  | 'irpf-anual'
  | 'iva-trimestral'
  | 'nomina-treballador';

export interface GastoBase {
  codi: string;
  tipus: TipusGasto;
  dataGasto: string;               // YYYY-MM-DD
  dataVenciment?: string;          // Solo para facturas
  
  // Importes
  baseImposable: number;
  ivaPercent: number;
  ivaImport: number;
  irpfPercent: number;
  irpfImport: number;
  totalGasto: number;
  
  // Pagos
  pagaments: Pagament[];
  totalPagat: number;
  pendentPagament: number;
  estat: EstatGasto;
  
  // Documento
  documentPDF?: string;            // Base64
  documentPDFName?: string;        // Nombre del archivo
  
  // Metadata
  concepte: string;
  notes?: string;
  createdAt?: string;               // ISO timestamp, used for sort order
}

// FACTURA DE COMPRA
export interface FacturaCompra extends GastoBase {
  tipus: 'factura-compra';
  proveidor: string;               // Código del proveedor
  numFacturaProveidor: string;     // Número de factura del proveedor
  projectes: string[];             // Array de códigos de proyectos
  esDesepsaGeneral: boolean;       // Si no es imputable a proyecto
}

// GASTO GENERAL
export type CategoriaGastoGeneral =
  | 'autonomo'       // deprecated: use ObligacioFiscal 'cuota-autonomo' instead
  | 'seguro'
  | 'seguro-medic'
  | 'otros';

export interface GastoGeneral extends GastoBase {
  tipus: 'gasto-general';
  categoria: CategoriaGastoGeneral;
  mesImputacion: string;           // YYYY-MM
}

// OBLIGACIÓ FISCAL
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
  // iva-trimestral only:
  ivaRepercutitCalculat?: number;
  ivaSuportatCalculat?: number;
  ivaNetCalculat?: number;
  ivaRegistratGestor?: number;
}

export type Gasto = FacturaCompra | GastoGeneral | ObligacioFiscal;

// Configuració de categories
export const CATEGORIES_GASTO_GENERAL = [
  { codi: 'seguro',       nom: 'Assegurances (rebuts)',         icon: '🛡️' },
  { codi: 'seguro-medic', nom: 'Assegurança Mèdica Privada',   icon: '🏥' },
  { codi: 'otros',        nom: 'Altres Despeses amb Rebut',     icon: '📄' },
] as const;

export const SUBTIPUS_OBLIGACIO_FISCAL = [
  { codi: 'cuota-autonomo',     nom: 'Quota Autònom (RETA)',           icon: '👤' },
  { codi: 'regularitzacio-ss',  nom: 'Regularització anual SS',        icon: '📊' },
  { codi: 'irpf-trimestral',    nom: 'IRPF Trimestral (Mod. 130)',     icon: '📋' },
  { codi: 'irpf-anual',         nom: 'Liquidació Anual IRPF (Renda)',  icon: '📅' },
  { codi: 'iva-trimestral',     nom: 'IVA Trimestral (Mod. 303)',      icon: '💶' },
  { codi: 'nomina-treballador', nom: 'Nòmina Treballador',             icon: '👷' },
] as const;