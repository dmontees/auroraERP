export interface Contacte {
  codi: string;
  nom: string;
  correuElectronic: string;
  carrec: string;
  telefon: string;
  notes: string;
}

export interface Tarifa {
  codi: string;
  servei: string; // Código del servicio (SRV-00001)
  unitat: string; // Código de la unidad (UNT-00001)
  preu: number;
}

export interface Proveidor {
  codi: string;
  tipus?: 'Proveïdor' | 'Acreedor';
  dataAlta: string;
  nomFiscal: string;
  nomComercial: string;
  pais: 'Espanya' | 'UE-VIES' | 'Estranger-exportació' | 'Altres';
  domicili: string;
  nif: string;
  personaContacte: string;
  telefon: string;
  correuElectronic: string;
  web: string;
  notesInternes: string;
  contactes: Contacte[];
  tipusIVA: 'Normal' | 'Exempt' | 'Reduit' | 'Superreduit';
  retencio: number;
  tarifesEspecials: Tarifa[];
}