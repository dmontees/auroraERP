export interface MaterialPressupost {
  id: string;
  grup: string;
  material: string;
  proveidor: string;
  preuProveidor: number;
  preuPlatea: number;
}

export interface RecursHumaPressupost {
  id: string;
  proveidor: string;
  categoria: string;
  servei: string;
  quantitat: number;
  unitat: string;
  tarifa: number;
  importe: number;
}

export interface TascaPressupost {
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

export interface Pressupost {
  codi: string;
  client: string;
  data: string;
  dataVenciment: string;
  iva: number;
  retencioIRPF: number;
  contacte: string;
  projecteCreat?: string;
  projecteVinculat?: string; // Proyecto vinculado manualmente
  dataCreacio: string; // Fecha de creación del presupuesto
  dataAcceptacio?: string; // Fecha cuando se aceptó
  observacionsClient: string;
  notesAPeu: string;
  notesAPeuEs?: string;
  notesAPeuEn?: string;
  
  // Detalles proyecto
  nomProjecte: string;
  modalitat: string;
  dataProjecte: string;
  numJornades: number;
  detallsProjecte: string;
  
  // Gastos
  materials: MaterialPressupost[];
  recursosHumans: RecursHumaPressupost[];
  
  // Tareas
  tasques: TascaPressupost[];
  
  // Estado
  estat: 'esborrany' | 'enviat' | 'acceptat' | 'rebutjat';
}