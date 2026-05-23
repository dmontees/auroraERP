import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import type { FacturaVenta } from '../../../types/facturaVenta';
import type { Client } from '../../../types/client';

const QUARTER_MONTHS: Record<string, string[]> = {
  Q1: ['01', '02', '03'],
  Q2: ['04', '05', '06'],
  Q3: ['07', '08', '09'],
  Q4: ['10', '11', '12'],
};

function buildZipVendes(factures: FacturaVenta[], clients: Client[]) {
  const zip = new JSZip();
  factures.forEach(f => {
    const client = clients.find(c => c.codi === f.client);
    const filename = `${f.codi}_${client?.nomComercial || client?.nomFiscal || 'client'}.pdf`;
    const base64Data = f.documentPDF!.split(',')[1];
    zip.file(filename, base64Data, { base64: true });
  });
  return zip;
}

export async function exportarFacturesVendaTrimestre(
  any: string,
  trimestre: string,
  factures: FacturaVenta[],
  clients: Client[]
) {
  const months = QUARTER_MONTHS[trimestre];
  const filtrades = factures.filter(f => {
    if (!f.documentPDF) return false;
    const [fAny, fMes] = f.dataFactura.substring(0, 7).split('-');
    return fAny === any && months.includes(fMes);
  });

  if (filtrades.length === 0) {
    alert(`No hi ha factures de venda amb PDF per ${trimestre} ${any}`);
    return;
  }

  const zip = buildZipVendes(filtrades, clients);
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `Factures_vendes_${any}-${trimestre}.zip`);
}

export async function exportarFacturesVendaAny(
  any: string,
  factures: FacturaVenta[],
  clients: Client[]
) {
  const filtrades = factures.filter(f => f.documentPDF && f.dataFactura.startsWith(any));

  if (filtrades.length === 0) {
    alert(`No hi ha factures de venda amb PDF per l'any ${any}`);
    return;
  }

  const zip = buildZipVendes(filtrades, clients);
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `Factures_vendes_${any}.zip`);
}

// Export Excel de facturas filtradas
export function exportarFacturesExcel(
  factures: FacturaVenta[],
  clients: Client[]
) {
  if (factures.length === 0) {
    alert('No hi ha factures per exportar');
    return;
  }

  const data = factures.map(f => {
    const client = clients.find(c => c.codi === f.client);
    
    return {
      'Codi': f.codi,
      'Estat': f.estat,
      'Client': client?.nomComercial || client?.nomFiscal || f.client,
      'NIF Client': client?.nif || '',
      'Data Factura': f.dataFactura,
      'Data Venciment': f.dataVenciment,
      'Base Imposable': f.baseImposable,
      'IVA %': f.ivaPercent,
      'IVA Import': f.ivaImport,
      'IRPF %': f.irpfPercent,
      'IRPF Import': f.irpfImport,
      'Total Factura': f.totalFactura,
      'Total Cobrat': f.totalPagat,
      'Pendent Cobrar': f.pendentCobrar,
      'Projecte': f.projecte || '',
      'Observacions': f.observacions || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Factures');

  // Auto-ajustar anchos de columna
  const maxWidth = data.reduce((w, r) => {
    return Object.keys(r).reduce((a, key) => {
      const val = String(r[key as keyof typeof r]);
      return Math.max(a, val.length);
    }, w);
  }, 10);

  ws['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: maxWidth }));

  const avui = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Factures_vendes_${avui}.xlsx`);
}

// Export XML contabilidad (formato estándar)
export function exportarFacturesXML(
  factures: FacturaVenta[],
  clients: Client[],
  dadesEmpresa: any
) {
  if (factures.length === 0) {
    alert('No hi ha factures per exportar');
    return;
  }

  // Generar XML según formato estándar contable
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<FacturesVenda>\n';
  xml += `  <DadesEmpresa>\n`;
  xml += `    <NIF>${dadesEmpresa.nif || ''}</NIF>\n`;
  xml += `    <Nom>${dadesEmpresa.nomFiscal || ''}</Nom>\n`;
  xml += `  </DadesEmpresa>\n`;
  xml += '  <Factures>\n';

  factures.forEach(f => {
    const client = clients.find(c => c.codi === f.client);
    
    xml += '    <Factura>\n';
    xml += `      <Codi>${f.codi}</Codi>\n`;
    xml += `      <DataFactura>${f.dataFactura}</DataFactura>\n`;
    xml += `      <DataVenciment>${f.dataVenciment}</DataVenciment>\n`;
    xml += `      <Client>\n`;
    xml += `        <NIF>${client?.nif || ''}</NIF>\n`;
    xml += `        <Nom>${client?.nomFiscal || ''}</Nom>\n`;
    xml += `      </Client>\n`;
    xml += `      <BaseImposable>${f.baseImposable.toFixed(2)}</BaseImposable>\n`;
    xml += `      <IVA percent="${f.ivaPercent}">${f.ivaImport.toFixed(2)}</IVA>\n`;
    xml += `      <IRPF percent="${f.irpfPercent}">${f.irpfImport.toFixed(2)}</IRPF>\n`;
    xml += `      <TotalFactura>${f.totalFactura.toFixed(2)}</TotalFactura>\n`;
    xml += `      <Estat>${f.estat}</Estat>\n`;
    
    if (f.pagaments.length > 0) {
      xml += '      <Pagaments>\n';
      f.pagaments.forEach(p => {
        xml += '        <Pagament>\n';
        xml += `          <Data>${p.data}</Data>\n`;
        xml += `          <Import>${p.import.toFixed(2)}</Import>\n`;
        xml += `          <Metode>${p.metode}</Metode>\n`;
        xml += `          <Referencia>${p.referencia || ''}</Referencia>\n`;
        xml += '        </Pagament>\n';
      });
      xml += '      </Pagaments>\n';
    }
    
    xml += '    </Factura>\n';
  });

  xml += '  </Factures>\n';
  xml += '</FacturesVenda>';

  const blob = new Blob([xml], { type: 'application/xml' });
  const avui = new Date().toISOString().split('T')[0];
  saveAs(blob, `Factures_vendes_${avui}.xml`);
}

// Export Excel de cobros (para tabla de pagos)
export function exportarCobrosExcel(
  pagaments: Array<{ codi: string; data: string; import: number; metode: string; referencia: string }>,
  codiFactura: string
) {
  if (pagaments.length === 0) {
    alert('No hi ha pagaments per exportar');
    return;
  }

  const data = pagaments.map(p => ({
    'Codi Pagament': p.codi,
    'Data': p.data,
    'Import': p.import,
    'Mètode': p.metode,
    'Referència': p.referencia || '-'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pagaments');

  ws['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 }
  ];

  XLSX.writeFile(wb, `Pagaments_${codiFactura}.xlsx`);
}