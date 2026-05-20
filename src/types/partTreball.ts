export interface PartTreball {
  codi: string;
  data: string; // YYYY-MM-DD
  horaInici: string; // HH:mm formato 24h
  horaFi: string; // HH:mm formato 24h
  temps: number; // Minutos totales
  client: string; // Código del cliente
  projecte: string; // Código del proyecto
  tasca?: string; // ID de la tarea (opcional)
  descripcio: string;
}

export interface CronometreState {
  actiu: boolean;
  pausat: boolean;
  mode: 'projecte' | 'administratiu';
  client: string;
  projecte: string;
  tasca?: string;
  descripcio: string;
  tituolAdministratiu?: string;
  horaInici: number;
  tempsTranscorregut: number;
  ultimaPausa?: number;
}