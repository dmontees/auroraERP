export interface Servei {
  codi: string;
  nom: string;
  descripcio: string;
  categoria: string;
}

export interface Unitat {
  codi: string;
  nom: string;
}

export interface DadesEmpresa {
  nomFiscal: string;
  nomComercial: string;
  nif: string;
  domicili: string;
  codiPostal: string;
  poblacio: string;
  provincia: string;
  telefon: string;
  email: string;
  web: string;
  logo: string | null;
  ibanDefecte: string;
  observacionsFactura: string;
}

export interface Categoria {
  codi: string;
  nom: string;
}

export interface GrupMaterial {
  codi: string;
  nom: string;
  esDefault: boolean;
}

export interface Material {
  codi: string;
  material: string;
  grup: string;
  proveidor: string;
  enllacAlquiler: string;
  preuProveidor: number;
  preuPlatea: number;
  estat: 'actiu' | 'no_utilitzat';
}

export interface TipusPlantilla {
  codi: string;
  nom: string;
  esDefault: boolean;
}

export interface Plantilla {
  codi: string;
  tipusPlantilla: string;
  titol: string;
  text: string;
  perDefecte: boolean;
}

export interface Parametres {
  serveis: Servei[];
  unitats: Unitat[];
  tarifes: any[]; // Definida en client.ts
  categories: Categoria[];
  grupsMaterials: GrupMaterial[];
  materials: Material[];
  tipusPlantilles: TipusPlantilla[];
  plantilles: Plantilla[];
  modalitats: Modalitat[];
  tipusProduccio: TipusProducció[];
  dadesEmpresa: DadesEmpresa;
}

export interface Modalitat {
  codi: string;
  nom: string;
  color: string;
  descripcio?: string;
}

export interface TipusProducció {
  codi: string;
  nom: string;
  esDefault?: boolean;
}