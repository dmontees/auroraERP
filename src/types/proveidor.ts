import type { DocumentFileRef } from './documental';

export interface CategoriaProveidor {
  codi: string;
  nom: string;
  color: string; // Hex color
}

export interface DocumentProveidor {
  id: string;
  nom: string;
  tipus: 'contracte' | 'assegurança' | 'certificat' | 'altres';
  dataCarrega: string;
  urlFitxer: string; // Base64 o ruta
  fileRef?: DocumentFileRef;
  mida?: number; // bytes
  projecteCodi?: string;
  projecteNom?: string;
}

export interface Tarifa {
  codi: string;
  servei: string;
  unitat: string;
  preu: number;
}

export interface Proveidor {
  codi: string;
  tipus: 'Proveïdor' | 'Acreedor' | 'Treballador';
  dataAlta: string;
  nomFiscal: string;
  nomComercial: string;
  pais: 'Espanya' | 'UE-VIES' | 'Estranger-exportació' | 'Altres';
  domicili: string;
  nif: string;
  telefon: string;
  correuElectronic: string;
  web: string;
  notesInternes: string;
  tipusIVA: 'Normal' | 'Exempt' | 'Reduit' | 'Superreduit';
  retencio: number;
  tarifesEspecials: Tarifa[];
  categories: string[]; // Array de codis de categories
  documents: DocumentProveidor[]; // Documentación adjunta
  // Camps específics per a Treballadors (tipus === 'Treballador')
  actiu?: boolean;                   // treballador actiu (contractat); default true
  percentatgeSSEmpresa?: number;     // % SS càrrec empresa; default 30.2
  percentatgeSSTreballador?: number; // % SS càrrec treballador; default 6.35
  percentatgeIRPF?: number;          // % IRPF retingut; default 15
  salariDiari?: number;              // salari diari brut de referència
  serveisAssociats?: string[];       // codis de serveis que realitza
  imatgePerfil?: string;            // base64 JPEG quadrat, usat com avatar
}
