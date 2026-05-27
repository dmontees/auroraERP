// =============================================================================
// Aurora ERP Web — Tipus compartits (mapeig dels tipus PHP → TypeScript)
// =============================================================================

export type EstatProjecte =
  | 'esborrany' | 'planificat' | 'rodatge' | 'edicio'
  | 'esperant_feedback' | 'revisio' | 'acabat' | 'facturat';

export type EstatFacturaVenta =
  | 'borrador' | 'enviada' | 'pagada-parcial' | 'pagada' | 'vencuda' | 'cancelled';

// --- Resposta de login -------------------------------------------------------

export interface AuthUser {
  nom: string;
  rol: 'admin' | 'viewer';
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  user: AuthUser;
}

// --- Dashboard --------------------------------------------------------------

export interface DashboardProjectesEstat {
  estat: EstatProjecte;
  total: number;
  ingres: number;
  gastos: number;
  benefici: number;
}

export interface DashboardData {
  projectes: {
    per_estat: DashboardProjectesEstat[];
    totals_globals: {
      total_actius: number;
      ingres_total: number;
      gastos_total: number;
      benefici_total: number;
      marge_mitja: number;
    };
    any_actual: {
      any: number;
      total: number;
      ingres: number;
      gastos: number;
      benefici: number;
    };
  };
  factures_venda: {
    pendent_cobrar: { total_factures: number; import: number };
    vencudes: { total: number; import: number };
    any_actual: { any: number; total: number; import: number; pagat: number };
  };
  factures_compra: {
    pendent_pagar: { total: number; import: number };
  };
  agenda: {
    propers_rodatges: AgendaItem[];
    propers_entregues: AgendaItem[];
  };
  darrers_projectes: ProjecteResum[];
  ultima_sync: SyncLog | null;
  generated_at: string;
}

export interface AgendaItem {
  data: string;
  hora?: string;
  nota?: string;
  projecte_codi: string;
  projecte_titol: string;
  projecte_estat: EstatProjecte;
  client_nom?: string;
  entregada?: boolean;
}

export interface SyncLog {
  entitat: string;
  total_registres: number;
  synced_at: string;
}

// --- Projectes --------------------------------------------------------------

export interface ProjecteResum {
  codi: string;
  titol: string;
  estat: EstatProjecte;
  client_codi: string;
  client_nom?: string;
  data_inici?: string;
  data_entrega?: string;
  data_finalitzacio?: string;
  ingres_sense_iva: number;
  gastos_totals: number;
  benefici: number;
  percent_benefici: number;
  facturat: boolean;
  arxivat: boolean;
  es_direct: boolean;
}

export interface ProjecteDetall extends ProjecteResum {
  iva: number;
  ingres_amb_iva: number;
  gastos_materials: number;
  gastos_humans: number;
  dates_rodatge: { data: string; hora?: string; nota?: string }[];
  dates_entrega: { data: string; nota?: string; entregada: boolean }[];
  // dades conté l'objecte TypeScript complet del desktop
  dades: Record<string, unknown>;
}

export interface ProjectesListResponse {
  data: ProjecteResum[];
  pagination: { total: number; page: number; per_page: number; pages: number };
  filters: {
    estat: string;
    arxivat: number;
    client: string;
    q: string;
    order_by: string;
    order_dir: string;
  };
}

// --- Clients ----------------------------------------------------------------

export interface ClientResum {
  codi: string;
  nom_fiscal: string;
  nom_comercial?: string;
  nif?: string;
  pais: string;
  telefon?: string;
  correu?: string;
  tipus_iva: string;
  data_alta?: string;
}

export interface ClientDetall extends ClientResum {
  domicili?: string;
  web?: string;
  retencio: number;
  dades: Record<string, unknown>;
  projectes: ProjecteResum[];
}

export interface ClientsListResponse {
  data: ClientResum[];
  pagination: { total: number; page: number; per_page: number; pages: number };
}

// --- Filtres de projectes ---------------------------------------------------

export interface ProjectesFilters {
  estat: string;
  arxivat: number;
  client: string;
  q: string;
  page: number;
  order_by: string;
  order_dir: 'ASC' | 'DESC';
}
