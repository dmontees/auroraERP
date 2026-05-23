export interface TascaProjecte {
  id: string;
  categoria: string;
  servei: string;
  descripcio: string;
  quantitat: number;
  unitat: string;
  tarifa: number;
  importe: number;
  ordre: number;
}

export interface RecursHumaProjecte {
  id: string;
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
  grup: string;
  material: string;
  proveidor: string;
  preuProveidor: number;
  preuPlatea: number;
}

export interface DataRodatge {
  id: string;
  data: string;
  hora?: string;
  nota?: string;
}

export interface DataEntrega {
  id: string;
  data: string;
  nota?: string;
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

  // Financiero
  ingresSenseIVA: number;
  iva: number;
  ingresAmbIVA: number; // calculat
  gastosMaterials: number;
  gastosHumans: number;
  gastosTotals: number; // calculat
  benefici: number; // calculat
  percentBenefici: number; // calculat
  
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
  fitxer: string;       // Base64 del archivo
  nomFitxer: string;    // Nombre original del archivo
  dataAfegit: string;   // Fecha de creación
}