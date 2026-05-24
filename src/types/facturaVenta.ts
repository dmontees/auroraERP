export type TipusFactura = 'normal' | 'rectificativa';

export interface FacturaVenta {
  codi: string;
  tipus: TipusFactura; // ← NUEVO: tipo de factura
  facturaRectificada?: string; // ← NUEVO: código factura que rectifica
  motivoRectificativa?: string; // ← NUEVO: motivo de la rectificativa
  
  // ... resto de campos existentes
  estat: EstatFacturaVenta;
  client: string;
  projecte?: string;
  dataFactura: string;
  dataVenciment: string;
  dataEnviada?: string;
  ivaPercent: number;
  irpfPercent: number;
  tasques: TascaCategoria[];
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
  accions: AccioFactura[];
  documentPDF?: string;
  documentPDFName?: string;
  avisFacturacio?: { actiu: boolean; descripcio: string };
}

export type EstatFacturaVenta = 
  | 'borrador' 
  | 'enviada' 
  | 'pagada-parcial' 
  | 'pagada' 
  | 'vencuda' 
  | 'cancelled';

export interface AccioFactura {
  data: string;              // ISO date
  descripcio: string;
  automatic?: boolean;       // true si es automática (creació, estat canviat)
}

export interface PagamentClient {
  codi: string;              // PAG-00001
  data: string;              // ISO date
  import: number;
  metode: 'transferencia' | 'efectiu' | 'targeta' | 'domiciliacio' | 'altres';
  referencia?: string;
}

// Reutilizamos la estructura de tareas del presupuesto
import type { TascaCategoria } from './pressupost';

export interface FacturaVenta {
  codi: string;              // FAV-00235
  estat: EstatFacturaVenta;
  
  // Relaciones
  client: string;            // Código del cliente
  projecte?: string;         // Código del proyecto (opcional)
  
  // Fechas
  dataFactura: string;       // ISO date
  dataVenciment: string;     // ISO date
  dataEnviada?: string;      // ISO date (cuando se envía)
  
  // Fiscal
  ivaPercent: number;
  irpfPercent: number;
  
  // Tareas (estructura igual que presupuesto/proyecto)
  tasques: TascaCategoria[];
  
  // Cálculos
  baseImposable: number;
  ivaImport: number;
  irpfImport: number;
  totalFactura: number;
  
  // Pagos
  pagaments: PagamentClient[];
  totalPagat: number;
  pendentCobrar: number;
  
  // Notas
  observacions: string;
  plantillesSeleccionades: string[];  // Códigos de plantillas
  plantillesText: string;              // Texto combinado y editable
  plantillesTextEs?: string;
  plantillesTextEn?: string;
  
  // Historial
  accions: AccioFactura[];
}

// Colores de estados
export const ESTAT_FACTURA_COLORS: Record<EstatFacturaVenta, { bg: string; text: string; icon: string; label: string }> = {
  borrador: { bg: '#e5e7eb', text: '#374151', icon: '📝', label: 'Esborrany' },
  enviada: { bg: '#dbeafe', text: '#1e40af', icon: '📤', label: 'Enviada' },
  'pagada-parcial': { bg: '#fef3c7', text: '#92400e', icon: '🟡', label: 'Pagada Parcial' },
  pagada: { bg: '#d1fae5', text: '#065f46', icon: '✅', label: 'Pagada' },
  vencuda: { bg: '#fee2e2', text: '#991b1b', icon: '🔴', label: 'Vençuda' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280', icon: '⚫', label: 'Cancel·lada' }
};