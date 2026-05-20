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
export type TipusGasto = 'factura-compra' | 'gasto-general';

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
  | 'autonomo' 
  | 'seguro' 
  | 'otros';

export interface GastoGeneral extends GastoBase {
  tipus: 'gasto-general';
  categoria: CategoriaGastoGeneral;
  mesImputacion: string;           // YYYY-MM
}

export type Gasto = FacturaCompra | GastoGeneral;

// Configuración de categorías
export const CATEGORIES_GASTO_GENERAL = [
  { codi: 'autonomo', nom: 'Quota Autònom / Seguretat Social', icon: '👤' },
  { codi: 'seguro', nom: 'Assegurances (recibos)', icon: '🛡️' },
  { codi: 'otros', nom: 'Altres Despeses sense Factura', icon: '📄' }
] as const;