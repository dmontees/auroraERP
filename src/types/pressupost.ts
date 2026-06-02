export interface MaterialPressupost {
  id: string;
  grup: string;
  material: string;
  proveidor: string;
  preuProveidor: number;  // cost price per day
  preuPlatea: number;     // sale price per day
  jornades: number;       // days this material is used
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

export type { TascaVenda } from './tascaVenda';
// Backward-compatible aliases — existing imports keep working unchanged
export type TascaPressupost = import('./tascaVenda').TascaVenda;
export type TascaCategoria  = import('./tascaVenda').TascaVenda;

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