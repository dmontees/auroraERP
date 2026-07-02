export type { TascaVenda } from './tascaVenda';
import type { DocumentFileRef } from './documental';
// Backward-compatible alias — existing imports keep working unchanged
export type TascaProjecte = import('./tascaVenda').TascaVenda;

export interface RecursHumaProjecte {
  id: string;
  tdCodi?: string; // TD-0000001 — codi de tasca despesa, assignat en crear si hi ha proveïdor
  categoria: string;
  servei: string;
  unitat: string;
  quantitat: number;
  preu: number;
  cost: number;
  ordre: number;
  proveidor?: string;
}

export interface MaterialProjecte {
  id: string;
  tdCodi?: string;
  grup: string;
  material: string;
  proveidor: string;
  preuProveidor: number;  // cost price per day
  preuPlatea: number;     // sale price per day
  jornades: number;       // days this material is used in the project
}

export interface DataRodatge {
  id: string;
  data: string;
  hora?: string;
  nota?: string;
  googleEventId?: string;
}

export interface DataEntrega {
  id: string;
  data: string;
  nota?: string;
  entregada?: boolean;
  googleEventId?: string;
}

export interface FeedbackProjecte {
  dataEntrega?: string;
  notaEntrega?: string;
  dataFeedback?: string;
  notesFeedback?: string;
  notesRevisio?: string;
  dataValidacio?: string;
  validat: boolean;
}

export type EstatProjecte = 'esborrany' | 'planificat' | 'rodatge' | 'edicio' | 'esperant_feedback' | 'revisio' | 'acabat' | 'facturat';

export interface HistorialEntry {
  id: string;
  data: string; // Fecha en formato ISO
  tipus: 'creacio' | 'estat' | 'tasca' | 'pressupost' | 'factura' | 'document' | 'esdeveniment' | 'modificacio';
  descripcio: string;
  detalls?: string;
  usuari?: string;
}

export interface Projecte {
  codi: string; // PRJ-00001++
  client: string; // Referència a Client.codi
  pressupost?: string; // Referència a Pressupost.codi (opcional)
  factura?: string; // Referència futura

  // Info general
  titol: string;
  descripcio: string;
  modalitat: string; // Referència a modalitat de paràmetres
  servei: string; // Referència a servei de paràmetres
  esDirect: boolean;

  // Dates (legacy - optional for backward compat)
  dataInici?: string;
  dataEntrega?: string;
  dataFinalitzacio?: string;
  // Dates (new multi-date format)
  datesRodatge?: DataRodatge[];
  datesEntrega?: DataEntrega[];

  // Estat
  estat: EstatProjecte;
  
  // Financiero - despeses detallades
recursosHumans: RecursHumaProjecte[];
materials: MaterialProjecte[];

  // Financiero — source fields
  ingresSenseIVA: number;  // sum(tasques[].importe), recalculated from tasks on form load
  iva: number;

  // Cached derived fields — always recomputed from recursosHumans/materials/tasques on form load.
  // Never read these from storage directly; use the source arrays instead.
  ingresAmbIVA?: number;
  gastosMaterials?: number;
  gastosHumans?: number;
  gastosTotals?: number;
  benefici?: number;
  percentBenefici?: number;
  
  // Instrucciones
  instruccionsClient: string;
  instruccionsProveidors: string;
  
  // Tareas
  tasques: TascaProjecte[];
  
  // Control
  facturat: boolean;
  arxivat: boolean;

  documents?: DocumentProjecte[];
  facturaAssociada?: string;  // Código de la factura
  historial?: HistorialEntry[];
  feedback?: FeedbackProjecte;
  avisFacturacio?: { actiu: boolean; descripcio: string };

  // Imatge de referència del projecte (base64, mostrada al hero del Resum)
  imatgeReferencia?: string;

  // Campos para proyectos importados
  esImportat?: boolean;
  facturaHistorica?: {
    numero: string;
    data: string;
  };

}

export interface DocumentProjecte {
  id: string;
  tipus: string;        // Tipo de documento
  nom: string;          // Nombre del documento
  fitxer?: string;      // Base64 legacy del archivo
  nomFitxer: string;    // Nombre original del archivo
  fileRef?: DocumentFileRef;
  dataAfegit: string;   // Fecha de creación
}
