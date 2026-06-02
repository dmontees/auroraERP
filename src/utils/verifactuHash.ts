import type { FacturaVenta } from '../types/facturaVenta';
import type { RegistreVerifactu } from '../types/verifactu';

/**
 * Converteix "YYYY-MM-DD" → "DD-MM-YYYY" (format AEAT per FechaExpedicionFactura).
 */
function formatDateAEAT(isoDate: string): string {
  const p = isoDate.split('-');
  return `${p[2]}-${p[1]}-${p[0]}`;
}

/**
 * Genera un timestamp ISO 8601 amb l'offset de zona horària local.
 * Exemple: "2025-06-01T10:30:00+02:00"
 * Format requerit per l'AEAT al camp FechaHoraHusoGenRegistro.
 */
export function nowISOWithTimezone(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset(); // minuts, positiu per UTC+
  const sign = off >= 0 ? '+' : '-';
  const offH = pad(Math.floor(Math.abs(off) / 60));
  const offM = pad(Math.abs(off) % 60);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${offH}:${offM}`
  );
}

/**
 * Calcula l'empremta SHA-256 per a un registre Verifactu.
 *
 * Format de la cadena (Ordre HAC/1177/2024, Annex IV):
 *   camp=valor&camp=valor&...
 *
 * Camps i formats:
 *   IDEmisorFactura          → NIF de l'emissor
 *   NumSerieFactura          → codi de la factura ("FAV-00235")
 *   FechaExpedicionFactura   → DD-MM-YYYY
 *   TipoFactura              → F1, F2, R1-R5
 *   CuotaTotal               → import IVA amb 2 decimals
 *   ImporteTotal             → total factura amb 2 decimals
 *   Huella                   → hash anterior, o '' per al primer registre
 *   FechaHoraHusoGenRegistro → ISO 8601 amb timezone local (2025-06-01T10:30:00+02:00)
 */
export async function calcularHuellaVerifactu(
  factura: FacturaVenta,
  nifEmisor: string,
  huellaAnterior: string | null,
  fechaHoraHusoGenRegistro: string,
  tipoFactura: string
): Promise<string> {
  const cadena = [
    `IDEmisorFactura=${nifEmisor}`,
    `NumSerieFactura=${factura.codi}`,
    `FechaExpedicionFactura=${formatDateAEAT(factura.dataFactura)}`,
    `TipoFactura=${tipoFactura}`,
    `CuotaTotal=${factura.ivaImport.toFixed(2)}`,
    `ImporteTotal=${factura.totalFactura.toFixed(2)}`,
    `Huella=${huellaAnterior ?? ''}`,
    `FechaHoraHusoGenRegistro=${fechaHoraHusoGenRegistro}`,
  ].join('&');

  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(cadena)
  );

  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Obté l'empremta de l'última factura emesa en la cadena.
 * Ordena per número de factura (el segment numèric de "FAV-00235").
 * Retorna null si no hi ha cap factura anterior amb hash.
 */
export function getHuellaAnterior(factures: FacturaVenta[]): string | null {
  const emeses = factures
    .filter(f => f.verifactu?.huella && f.estat !== 'borrador')
    .sort((a, b) => {
      const numA = parseInt(a.codi.split('-')[1] ?? '0', 10);
      const numB = parseInt(b.codi.split('-')[1] ?? '0', 10);
      return numB - numA; // descendent → el major és el primer
    });
  return emeses[0]?.verifactu?.huella ?? null;
}

/**
 * Genera el registre Verifactu complet per a una factura.
 * S'ha de cridar quan la factura passa de 'borrador' a 'enviada'
 * i el mòdul Verifactu és actiu.
 */
export async function generarRegistreVerifactu(
  factura: FacturaVenta,
  nifEmisor: string,
  facturesExistents: FacturaVenta[]
): Promise<RegistreVerifactu> {
  const fechaHoraHusoGenRegistro = nowISOWithTimezone();
  const huellaAnterior = getHuellaAnterior(facturesExistents);
  const tipoFactura = factura.tipus === 'normal' ? 'F1' : 'R4';

  const huella = await calcularHuellaVerifactu(
    factura,
    nifEmisor,
    huellaAnterior,
    fechaHoraHusoGenRegistro,
    tipoFactura
  );

  return {
    numSerieFactura: factura.codi,
    fechaExpedicion: factura.fechaExpedicion ?? nowISOWithTimezone(),
    tipoFactura: tipoFactura as 'F1' | 'R4',
    huella,
    fechaHoraHusoGenRegistro,
    huellaAnterior,
    enviada: false,
    estatEnviament: 'pendent',
  };
}

/**
 * Verifica la integritat de la cadena de hashes (eina de desenvolupament).
 * Comprova que cada factura apunta a l'empremta correcta de l'anterior.
 */
export async function verificarCadena(factures: FacturaVenta[]): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const emeses = factures
    .filter(f => f.verifactu?.huella)
    .sort((a, b) => parseInt(a.codi.split('-')[1] ?? '0', 10) - parseInt(b.codi.split('-')[1] ?? '0', 10));

  const errors: string[] = [];
  for (let i = 0; i < emeses.length; i++) {
    const f = emeses[i];
    const expectedPrev = i === 0 ? null : emeses[i - 1].verifactu!.huella;
    const actualPrev = f.verifactu!.huellaAnterior;
    if (expectedPrev !== actualPrev) {
      errors.push(
        `${f.codi}: huellaAnterior incorrecta.\n  Esperada: ${expectedPrev}\n  Trobada:  ${actualPrev}`
      );
    }
  }
  return { valid: errors.length === 0, errors };
}
