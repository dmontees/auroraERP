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
  mida?: number; // bytes
}

export interface Tarifa {
  codi: string;
  servei: string;
  unitat: string;
  preu: number;
}

export interface Proveidor {
  codi: string;
  tipus: 'Proveïdor' | 'Acreedor';
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
}