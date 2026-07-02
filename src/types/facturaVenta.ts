import type { TascaVenda } from './tascaVenda';
import type { RegistreVerifactu } from './verifactu';
import type { DocumentFileRef } from './documental';

export type { TascaVenda };

// Estructura real de tasca dins d'una FacturaVenda.
// Difereix de TascaVenda (Projectes/Pressupostos) en que usa `preu` en lloc de `tarifa`,
// perquè en afegir-la es fa la conversió preu = tasca.tarifa.
// Verifactu ha de llegir `preu` (no `tarifa`) quan generi l'XML de línies.
export interface TascaFacturaVenda {
  id: string;
  categoria: string;
  servei: string;
  descripcio: string;
  quantitat: number;
  unitat: string;
  preu: number;    // preu unitari sense IVA (≠ tarifa en TascaVenda)
  importe: number; // quantitat × preu
  ordre: number;
}

// Estructura anidada real: cada element de `tasques` és una categoria amb les seves línies.
export interface CategoriaFacturaVenda {
  categoria: string;
  tasques: TascaFacturaVenda[];
}

export type TipusFactura = 'normal' | 'rectificativa';

export type EstatFacturaVenta =
  | 'borrador'
  | 'enviada'
  | 'pagada-parcial'
  | 'pagada'
  | 'vencuda';

export interface PagamentClient {
  codi: string;
  data: string;
  import: number;
  metode: 'transferencia' | 'efectiu' | 'targeta' | 'domiciliacio' | 'altres';
  referencia?: string;
}

export interface AccioFactura {
  data: string;
  descripcio: string;
  automatic?: boolean;
}

export interface FacturaVenta {
  codi: string;
  tipus: TipusFactura;
  facturaRectificada?: string;
  motivoRectificativa?: string;

  estat: EstatFacturaVenta;
  client: string;
  projecte?: string;

  dataFactura: string;
  dataVenciment: string;
  dataEnviada?: string;

  ivaPercent: number;
  irpfPercent: number;

  tasques: CategoriaFacturaVenda[];

  baseImposable: number;
  ivaImport: number;
  irpfImport: number;
  totalFactura: number;

  pagaments: PagamentClient[];
  totalPagat: number;
  pendentCobrar: number;

  observacions: string;
  plantillesSeleccionades: string[];
  plantillesText: string;
  plantillesTextEs?: string;
  plantillesTextEn?: string;

  accions: AccioFactura[];

  documentPDF?: string;
  documentPDFName?: string;
  documentsGenerats?: DocumentFileRef[];
  avisFacturacio?: { actiu: boolean; descripcio: string };

  // Verifactu — undefined quan el mòdul està desactivat o és una factura pre-Verifactu
  fechaExpedicion?: string;      // ISO 8601 complet, s'assigna quan estat → 'enviada'
  verifactu?: RegistreVerifactu;
}

export const ESTAT_FACTURA_COLORS: Record<EstatFacturaVenta, { bg: string; text: string; icon: string; label: string }> = {
  borrador:        { bg: '#e5e7eb', text: '#374151', icon: '📝', label: 'Esborrany' },
  enviada:         { bg: '#dbeafe', text: '#1e40af', icon: '📤', label: 'Enviada' },
  'pagada-parcial':{ bg: '#fef3c7', text: '#92400e', icon: '🟡', label: 'Pagada Parcial' },
  pagada:          { bg: '#d1fae5', text: '#065f46', icon: '✅', label: 'Pagada' },
  vencuda:         { bg: '#fee2e2', text: '#991b1b', icon: '🔴', label: 'Vençuda' },
};
