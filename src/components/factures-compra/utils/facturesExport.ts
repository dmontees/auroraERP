import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Gasto } from '../../../types/facturaCompra';
import type { Proveidor } from '../../../types/proveidor';

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

function buildZip(gastos: Gasto[], proveidors: Proveidor[]) {
  const zip = new JSZip();
  gastos.forEach(gasto => {
    let filename: string;
    if (gasto.tipus === 'factura-compra') {
      const proveidor = proveidors.find(p => p.codi === gasto.proveidor);
      const numFactura = gasto.numFacturaProveidor || 'SN';
      const proveidorNom = proveidor?.nomComercial || 'Proveidor';
      filename = `${gasto.codi}_${proveidorNom}_${numFactura}.pdf`;
    } else {
      filename = `${gasto.codi}_${gasto.concepte}.pdf`;
    }
    const base64Data = gasto.documentPDF!.split(',')[1];
    zip.file(filename, base64Data, { base64: true });
  });
  return zip;
}

export async function exportarFacturesTrimestre(
  any: string,
  trimestre: string,
  gastos: Gasto[],
  proveidors: Proveidor[]
) {
  const filtrats = gastos.filter(g => gastoPertanyTrimestre(g, any, trimestre));

  if (filtrats.length === 0) {
    alert(`No hi ha documents PDF per ${trimestre} ${any}`);
    return;
  }

  const zip = buildZip(filtrats, proveidors);
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `Documents_${any}-${trimestre}.zip`);
}

export async function exportarFacturesAny(
  any: string,
  gastos: Gasto[],
  proveidors: Proveidor[]
) {
  const filtrats = gastos.filter(g => gastoPertanyAny(g, any));

  if (filtrats.length === 0) {
    alert(`No hi ha documents PDF per l'any ${any}`);
    return;
  }

  const zip = buildZip(filtrats, proveidors);
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `Documents_${any}.zip`);
}
