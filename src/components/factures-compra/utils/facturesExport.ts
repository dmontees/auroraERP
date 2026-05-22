import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Gasto } from '../../../types/facturaCompra';
import type { Proveidor } from '../../../types/proveidor';

export async function exportarFacturesMes(
  mesExport: string,
  gastos: Gasto[],
  proveidors: Proveidor[]
) {
  const gastosDelMes = gastos.filter(g => {
    const mesGasto = g.dataGasto.substring(0, 7);
    return mesGasto === mesExport && g.documentPDF;
  });

  if (gastosDelMes.length === 0) {
    alert('No hi ha factures amb PDF per aquest mes');
    return;
  }

  const zip = new JSZip();

  gastosDelMes.forEach(gasto => {
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

  const content = await zip.generateAsync({ type: 'blob' });
  const [any, mes] = mesExport.split('-');
  const mesNom = new Date(parseInt(any), parseInt(mes) - 1).toLocaleString('ca', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  saveAs(content, `Factures rebudes i despeses_${mesNom}.zip`);
}