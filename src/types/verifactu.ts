export interface VerifactuConfig {
  enabled: boolean;
  mode: 'verifactu' | 'no-verifactu';
  entornTest: boolean;
  idSistema: string;
  teCertificat: boolean; // true si hi ha un P12 desat a l'emmagatzematge
}

export interface RegistreVerifactu {
  numSerieFactura: string;
  fechaExpedicion: string;       // ISO 8601 complet
  tipoFactura: 'F1' | 'F2' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  huella: string;                // SHA-256 hex
  fechaHoraHusoGenRegistro: string; // ISO 8601 amb timezone: "2025-06-01T10:30:00+02:00"
  huellaAnterior: string | null; // null per al primer registre
  enviada: boolean;
  fechaEnviament?: string;
  csvAeat?: string;
  estatEnviament: 'pendent' | 'acceptada' | 'rebutjada' | 'error';
  errorDetall?: string;
}

export const DEFAULT_VERIFACTU_CONFIG: VerifactuConfig = {
  enabled: false,
  mode: 'no-verifactu',
  entornTest: true,
  idSistema: '',
  teCertificat: false,
};
