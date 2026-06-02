import QRCode from 'qrcode';
import type { FacturaVenta } from '../types/facturaVenta';
import type { VerifactuConfig } from '../types/verifactu';

const QR_OPTIONS: QRCode.QRCodeToDataURLOptions = {
  width: 80,
  margin: 1,
  errorCorrectionLevel: 'M',
  color: { dark: '#000000', light: '#FFFFFF' },
};

/**
 * Construeix la URL de verificació AEAT per al codi QR.
 * Format del paràmetre fecha: DD-MM-YYYY (requeriment AEAT).
 */
export function urlVerificacioAEAT(
  nif: string,
  numSerie: string,
  dataFactura: string, // "YYYY-MM-DD" intern
  importTotal: number,
  entornTest: boolean
): string {
  const base = entornTest
    ? 'https://prewww2.aeat.es/wlpl/TIKE-CALC/index.zul'
    : 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CALC/index.zul';
  const [year, month, day] = dataFactura.split('-');
  const params = new URLSearchParams({
    nif,
    numserie: numSerie,
    fecha: `${day}-${month}-${year}`,
    importe: importTotal.toFixed(2),
  });
  return `${base}?${params.toString()}`;
}

/**
 * Genera el QR real per al PDF definitiu.
 * L'URL conté les dades reals de la factura verificables a l'AEAT.
 */
export async function generarQRVerifactu(
  factura: FacturaVenta,
  nifEmisor: string,
  config: VerifactuConfig
): Promise<string> {
  const url = urlVerificacioAEAT(
    nifEmisor,
    factura.codi,
    factura.dataFactura,
    factura.totalFactura,
    config.entornTest
  );
  return QRCode.toDataURL(url, QR_OPTIONS);
}

/**
 * Genera un QR placeholder per al PDF borrador.
 * Mateixa mida i aspecte visual que el QR definitiu,
 * però codifica dades de prova (no és una URL de verificació real).
 */
export async function generarQRPlaceholder(factura: FacturaVenta): Promise<string> {
  const placeholder = `ESBORRANY|${factura.codi}|${factura.dataFactura}|${(factura.totalFactura || 0).toFixed(2)}`;
  return QRCode.toDataURL(placeholder, QR_OPTIONS);
}
