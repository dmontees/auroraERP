import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { FacturaCompra, Gasto, ObligacioFiscal, TipusDocumentCompra } from '../../../types/facturaCompra';
import type { Proveidor } from '../../../types/proveidor';

const SUBTIPUS_SS = new Set(['cuota-autonomo', 'regularitzacio-ss']);

const QUARTER_MONTHS: Record<string, string[]> = {
  Q1: ['01', '02', '03'],
  Q2: ['04', '05', '06'],
  Q3: ['07', '08', '09'],
  Q4: ['10', '11', '12'],
};

function periodeAny(gasto: Gasto): string {
  if (gasto.tipus === 'obligacio-fiscal') {
    const p = gasto.periode;
    if (p.match(/^\d{4}$/)) return p;
    return p.substring(0, 4);
  }
  if (gasto.tipus === 'gasto-general') return gasto.mesImputacion.substring(0, 4);
  return gasto.dataGasto.substring(0, 4);
}

function periodeMes(gasto: Gasto): string {
  if (gasto.tipus === 'obligacio-fiscal') {
    const p = gasto.periode;
    if (p.match(/^\d{4}-\d{2}$/)) return p.substring(5, 7);
    if (p.includes('-Q')) {
      const q = p.split('-Q')[1];
      return QUARTER_MONTHS[`Q${q}`]?.[0] ?? '';
    }
    return '';
  }
  if (gasto.tipus === 'gasto-general') return gasto.mesImputacion.substring(5, 7);
  return gasto.dataGasto.substring(5, 7);
}

function gastoPertanyTrimestre(gasto: Gasto, any: string, trimestre: string): boolean {
  if (!gasto.documentPDF) return false;

  const months = QUARTER_MONTHS[trimestre];
  if (!months) return false;

  if (gasto.tipus === 'obligacio-fiscal') {
    const p = gasto.periode;
    if (p.match(/^\d{4}$/)) return false; // Anuals no entren en export trimestral
    if (p.includes('-Q')) return p === `${any}-${trimestre}`;
    if (p.match(/^\d{4}-\d{2}$/)) {
      return p.substring(0, 4) === any && months.includes(p.substring(5, 7));
    }
    return false;
  }

  const gastoAny = periodeAny(gasto);
  const gastoMes = periodeMes(gasto);
  return gastoAny === any && months.includes(gastoMes);
}

function gastoPertanyAny(gasto: Gasto, any: string): boolean {
  if (!gasto.documentPDF) return false;

  if (gasto.tipus === 'obligacio-fiscal') {
    return gasto.periode.substring(0, 4) === any;
  }

  return periodeAny(gasto) === any;
}

function safeName(s: string): string {
  return s.replace(/[/\\:*?"<>|]/g, '_');
}

const TIPUS_DOCUMENT_LABELS: Record<TipusDocumentCompra, string> = {
  factura: 'Factura',
  factura_simplificada: 'FacturaSimplificada',
};

const getTipusDocument = (gasto: FacturaCompra): TipusDocumentCompra =>
  (gasto.tipusDocument as string) === 'ticket'
    ? 'factura_simplificada'
    : gasto.tipusDocument ?? 'factura';

function buildFacturaCompraFilename(gasto: FacturaCompra, proveidors: Proveidor[]): string {
  const proveidor = gasto.proveidor ? proveidors.find(p => p.codi === gasto.proveidor) : undefined;
  const tipusDocument = getTipusDocument(gasto);
  const numFactura = gasto.numFacturaProveidor || 'SN';
  const emissor = proveidor?.nomComercial || proveidor?.nomFiscal || gasto.emissorNom || 'Emissor';
  return safeName(`${gasto.codi}_${TIPUS_DOCUMENT_LABELS[tipusDocument]}_${emissor}_${numFactura}.pdf`);
}

function buildZip(gastos: Gasto[], proveidors: Proveidor[], obligacionsSS: ObligacioFiscal[]) {
  const zip = new JSZip();

  gastos.forEach(gasto => {
    let filename: string;
    if (gasto.tipus === 'factura-compra') {
      filename = buildFacturaCompraFilename(gasto, proveidors);
    } else {
      filename = safeName(`${gasto.codi}_${gasto.concepte}.pdf`);
    }
    const base64Data = gasto.documentPDF!.split(',')[1];
    zip.file(filename, base64Data, { base64: true });
  });

  if (obligacionsSS.length > 0) {
    const folder = zip.folder('Obligacions_SS')!;
    obligacionsSS.forEach(o => {
      const filename = safeName(`${o.codi}_${o.concepte}.pdf`);
      const base64Data = o.documentPDF!.split(',')[1];
      folder.file(filename, base64Data, { base64: true });
    });
  }

  return zip;
}

function filtrarObligacionsSS(
  obligacionsFiscals: ObligacioFiscal[],
  pertany: (o: ObligacioFiscal) => boolean
): ObligacioFiscal[] {
  return obligacionsFiscals.filter(
    o => SUBTIPUS_SS.has(o.subtipus) && o.documentPDF && pertany(o)
  );
}

export async function exportarFacturesTrimestre(
  any: string,
  trimestre: string,
  gastos: Gasto[],
  proveidors: Proveidor[],
  obligacionsFiscals: ObligacioFiscal[] = []
) {
  const filtrats = gastos.filter(g => gastoPertanyTrimestre(g, any, trimestre));
  const obsSS = filtrarObligacionsSS(
    obligacionsFiscals,
    o => gastoPertanyTrimestre(o as unknown as Gasto, any, trimestre)
  );

  if (filtrats.length === 0 && obsSS.length === 0) {
    alert(`No hi ha documents PDF per ${trimestre} ${any}`);
    return;
  }

  const zip = buildZip(filtrats, proveidors, obsSS);
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `Documents_${any}-${trimestre}.zip`);
}

export async function exportarFacturesAny(
  any: string,
  gastos: Gasto[],
  proveidors: Proveidor[],
  obligacionsFiscals: ObligacioFiscal[] = []
) {
  const filtrats = gastos.filter(g => gastoPertanyAny(g, any));
  const obsSS = filtrarObligacionsSS(
    obligacionsFiscals,
    o => gastoPertanyAny(o as unknown as Gasto, any)
  );

  if (filtrats.length === 0 && obsSS.length === 0) {
    alert(`No hi ha documents PDF per l'any ${any}`);
    return;
  }

  const zip = buildZip(filtrats, proveidors, obsSS);
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `Documents_${any}.zip`);
}
