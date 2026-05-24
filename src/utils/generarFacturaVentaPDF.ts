import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FacturaVenta } from '../types/facturaVenta';
import type { Client } from '../types/client';
import { storage } from './storageManager';

export const generarFacturaVentaPDF = (
  formData: FacturaVenta,
  clients: Client[],
  projectes: any[],
  idioma: 'ca' | 'es' | 'en'
) => {
  
  const doc = new jsPDF();
  
  // Traducciones
  const t = {
    ca: {
      factura: 'Factura:',
      dataFactura: 'Data de la factura:',
      client: 'CLIENT',
      tel: 'Tel.',
      projecte: 'Projecte:',
      concepte: 'Concepte',
      quantitat: 'Quantitat',
      unitats: 'Unitats',
      tarifa: 'Tarifa',
      importe: 'Import',
      subtotal: 'SUBTOTAL',
      iva: 'IVA',
      irpf: 'IRPF',
      total: 'TOTAL FACTURA',
      metodePagament: 'Mètode de pagament',
      transferencia: 'Transferència bancària',
      numeroCuenta: 'Compte bancari:',
      pagina: 'Pàgina'
    },
    es: {
      factura: 'Factura:',
      dataFactura: 'Fecha de la factura:',
      client: 'CLIENTE',
      tel: 'Tel.',
      projecte: 'Proyecto:',
      concepte: 'Concepto',
      quantitat: 'Cantidad',
      unitats: 'Unidades',
      tarifa: 'Tarifa',
      importe: 'Importe',
      subtotal: 'SUBTOTAL',
      iva: 'IVA',
      irpf: 'IRPF',
      total: 'TOTAL FACTURA',
      metodePagament: 'Método de pago',
      transferencia: 'Transferencia bancaria',
      numeroCuenta: 'Cuenta bancaria:',
      pagina: 'Página'
    },
    en: {
      factura: 'Invoice:',
      dataFactura: 'Invoice date:',
      client: 'CLIENT',
      tel: 'Tel.',
      projecte: 'Project:',
      concepte: 'Concept',
      quantitat: 'Quantity',
      unitats: 'Units',
      tarifa: 'Rate',
      importe: 'Amount',
      subtotal: 'SUBTOTAL',
      iva: 'VAT',
      irpf: 'IRPF',
      total: 'TOTAL INVOICE',
      metodePagament: 'Payment method',
      transferencia: 'Bank transfer',
      numeroCuenta: 'Bank account:',
      pagina: 'Page'
    }
  };

  const tr = t[idioma];
  
  // Obtener datos
  const parametresData = storage.getParametres();
  const client = clients.find(c => c.codi === formData.client);
  
  // Colores
  const colorPrimary = [71, 85, 105];
  const colorSecondary = [100, 116, 139];
  const colorAccent = [15, 118, 110];
  
  const colIzq = 15;
  const margenDer = 195;
  const lineHeight = 5;
  
  let yPos = 20;
    
  // ==================== LOGO ====================
  
  if (parametresData?.dadesEmpresa?.logo) {
    try {
      const logoWidth = 60;
      const logoHeight = 8;
      const logoX = margenDer - logoWidth;
      const logoY = yPos;
      
      doc.addImage(parametresData.dadesEmpresa.logo, 'PNG', logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
    } catch (e) {
    }
  }
  
  yPos += 8 + 6;
  
  // ==================== DATOS EMPRESA Y CLIENTE ====================
  
  let yMaxClient = yPos;
  let yMaxEmpresa = yPos;
  
  // DATOS DEL CLIENTE (izquierda)
  if (client) {
    let yClient = yPos;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorPrimary);
    doc.text(tr.client, colIzq, yClient);
    yClient += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    if (client.nomFiscal) {
      doc.text(client.nomFiscal, colIzq, yClient);
      yClient += lineHeight;
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    
    if (client.domicili) {
      const domiciliLines = doc.splitTextToSize(client.domicili, 85);
      domiciliLines.forEach((line: string) => {
        doc.text(line, colIzq, yClient);
        yClient += lineHeight;
      });
    }
    
    if (client.nif) {
      doc.text(client.nif, colIzq, yClient);
      yClient += lineHeight;
    }
    
    if (client.telefon) {
      doc.text(`${tr.tel} ${client.telefon}`, colIzq, yClient);
      yClient += lineHeight;
    }
    
    if (client.correuElectronic) {
      doc.text(client.correuElectronic, colIzq, yClient);
      yClient += lineHeight;
    }
    
    yMaxClient = yClient;
  }
  
  // DATOS DE LA EMPRESA (derecha)
  if (parametresData?.dadesEmpresa) {
    const empresa = parametresData.dadesEmpresa;
    let yEmpresa = yPos;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    if (empresa.nomFiscal) {
      doc.text(empresa.nomFiscal, margenDer, yEmpresa, { align: 'right' });
      yEmpresa += 6;
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    
    if (empresa.domicili) {
      const domiciliLines = doc.splitTextToSize(empresa.domicili, 85);
      domiciliLines.forEach((line: string) => {
        doc.text(line, margenDer, yEmpresa, { align: 'right' });
        yEmpresa += lineHeight;
      });
    }
    
    if (empresa.nif) {
      doc.text(empresa.nif, margenDer, yEmpresa, { align: 'right' });
      yEmpresa += lineHeight;
    }
    
    if (empresa.telefon) {
      doc.text(`${tr.tel} ${empresa.telefon}`, margenDer, yEmpresa, { align: 'right' });
      yEmpresa += lineHeight;
    }
    if (empresa.email) {
      doc.text(empresa.email, margenDer, yEmpresa, { align: 'right' });
      yEmpresa += lineHeight;
    }
    
    yMaxEmpresa = yEmpresa;
  }
  
  yPos = Math.max(yMaxClient, yMaxEmpresa) + 12;
  
  // ==================== TÍTULO ====================
  
  const [year, month, day] = formData.dataFactura.split('-');
  const fechaFormateada = `${day}-${month}-${year}`;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorPrimary);
  doc.text(`${tr.factura} ${formData.codi}`, 105, yPos, { align: 'center' });
  yPos += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${tr.dataFactura} ${fechaFormateada}`, 105, yPos, { align: 'center' });
  yPos += 12;
  
// ==================== NOMBRE DEL PROYECTO ====================

if (formData.projecte) {
  const projecte = projectes.find(p => p.codi === formData.projecte);
  if (projecte?.titol) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorSecondary);
    doc.text(projecte.titol, colIzq, yPos);
    yPos += 3; // ← Espacio entre nombre de proyecto y tabla
  }
}
  
  // ==================== TABLA DE TAREAS ====================
  
  // Aplanar estructura de tareas (están anidadas)
const tasquesPlanes: any[] = [];
formData.tasques.forEach((grupo: any) => {
  if (grupo.tasques && Array.isArray(grupo.tasques)) {
    grupo.tasques.forEach((tasca: any) => {
      tasquesPlanes.push({
        ...tasca,
        categoria: grupo.categoria
      });
    });
  }
});

if (tasquesPlanes.length === 0) {
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('No hi ha tasques en aquesta factura', 105, yPos + 20, { align: 'center' });
  yPos += 40;
} else {
  const categoriesOrdenades: string[] = [];
  tasquesPlanes.forEach(tasca => {
    if (!categoriesOrdenades.includes(tasca.categoria)) {
      categoriesOrdenades.push(tasca.categoria);
    }
  });
  
  const tableData: any[] = [];
  
  categoriesOrdenades.forEach(categoriaCodi => {
    const categoria = parametresData?.categories?.find((c: any) => c.codi === categoriaCodi);
    const categoriaBase = categoriaCodi === 'MATERIALS'
      ? 'MATERIALS'
      : idioma === 'es'
        ? (categoria?.nomEs || categoria?.nom || categoriaCodi)
        : idioma === 'en'
          ? (categoria?.nomEn || categoria?.nom || categoriaCodi)
          : (categoria?.nom || categoriaCodi);
    const categoriaNom = categoriaBase.toUpperCase();
    const tasquesCategoria = tasquesPlanes.filter(t => t.categoria === categoriaCodi);
    
    tableData.push([{
      content: categoriaNom,
      colSpan: 5,
      styles: { 
        fillColor: colorPrimary, 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 10,
        cellPadding: 2.5
      }
    }]);
    
    tasquesCategoria.forEach(tasca => {
      const unitat = parametresData?.unitats?.find((u: any) => u.codi === tasca.unitat);
      const unitatNom = idioma === 'es'
        ? (unitat?.nomEs || unitat?.nom || '-')
        : idioma === 'en'
          ? (unitat?.nomEn || unitat?.nom || '-')
          : (unitat?.nom || '-');
      const concepte = tasca.descripcio || '-';
      const quantitat = tasca.quantitat || 0;
      const preu = tasca.preu || 0;
      const import_ = preu * quantitat;
      
      tableData.push([
        concepte,
        quantitat.toString(),
        categoriaCodi === 'MATERIALS' ? '-' : unitatNom,
        `${preu.toFixed(2)}€`,
        `${import_.toFixed(2)}€`
      ]);
    });
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [[
      { content: tr.concepte, styles: { halign: 'left' } },
      { content: tr.quantitat, styles: { halign: 'center' } },
      { content: tr.unitats, styles: { halign: 'center' } },
      { content: tr.tarifa, styles: { halign: 'center' } },
      { content: tr.importe, styles: { halign: 'right' } }
    ]],
    body: tableData,
    theme: 'plain',
    headStyles: { 
      fillColor: colorSecondary,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 2.5
    },
    styles: { 
      fontSize: 8,
      cellPadding: 2,
      lineWidth: 0
    },
    tableWidth: 180,
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    tableLineWidth: 0,
    tableLineColor: [255, 255, 255],
    margin: { left: colIzq, bottom: 20 },
    showHead: 'everyPage'
  });
  
  yPos = (doc as any).lastAutoTable.finalY;
}

const margenInferiorPagina = 277;

  // ==================== TOTALES Y MÉTODO DE PAGO ====================

  const alturaTotalesYNotas = 60;
  const espacioDisponible = margenInferiorPagina - yPos;

  if (espacioDisponible < alturaTotalesYNotas) {
    doc.addPage();
    yPos = 20;
  }

  const espacioRestante = margenInferiorPagina - yPos;
  if (espacioRestante > alturaTotalesYNotas + 20) {
    yPos = margenInferiorPagina - alturaTotalesYNotas;
  } else {
    yPos += 15;
  }

// MÉTODO DE PAGO (izquierda) - alineado con totales
const startYTotales = yPos;
const boxWidth = 85;

// Calcular altura del recuadro según si hay IRPF o no
const irpfImportTemp = formData.irpfImport || 0;
const numLineasTotales = irpfImportTemp > 0 ? 4 : 3; // Subtotal, IVA, (IRPF?), Total
const boxHeight = (numLineasTotales * 7) + 2; // 7px por línea + 2px extra para el total

doc.setDrawColor(...colorSecondary);
doc.setFillColor(248, 249, 250);
doc.setLineWidth(0.5);
doc.roundedRect(colIzq, startYTotales - 9.5, boxWidth, boxHeight, 2.5, 2.5, 'FD');

let yBox = startYTotales - 5; // Mueve arriba o abajo el contenido del cuadro de método de pago. Si se cambia, hay que mover el recuadro en la línea anterior que está definido por startYTotales también

doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...colorPrimary);
doc.text(tr.metodePagament, colIzq + 3, yBox);

doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
doc.setTextColor(60);
doc.text(tr.transferencia, colIzq + 3, yBox + 5);

if (parametresData?.dadesEmpresa?.ibanDefecte) {
  doc.setFont('helvetica', 'bold');
  doc.text(tr.numeroCuenta, colIzq + 3, yBox + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(parametresData.dadesEmpresa.ibanDefecte, colIzq + 3, yBox + 16);
}

// TOTALES (derecha) - mismo nivel inicial
let yTotals = startYTotales - 5;

const baseImposable = formData.baseImposable || 0;
const ivaPercent = formData.ivaPercent || 0;
const ivaImport = formData.ivaImport || 0;
const irpfPercent = formData.irpfPercent || 0;
const irpfImport = formData.irpfImport || 0;
const totalFactura = formData.totalFactura || 0;

doc.setTextColor(0);
doc.setFontSize(11);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...colorSecondary);
doc.text(tr.subtotal, 120, yTotals);
doc.text(`${baseImposable.toFixed(2)}€`, margenDer, yTotals, { align: 'right' });

yTotals += 7;
doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(80);
doc.text(`${tr.iva} (${ivaPercent}%):`, 120, yTotals);
doc.text(`${ivaImport.toFixed(2)}€`, margenDer, yTotals, { align: 'right' });

if (irpfImport > 0) {
  yTotals += 7;
  doc.text(`${tr.irpf} (${irpfPercent}%):`, 120, yTotals);
  doc.text(`-${irpfImport.toFixed(2)}€`, margenDer, yTotals, { align: 'right' });
}

yTotals += 9;
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(...colorAccent);
doc.text(tr.total, 120, yTotals);
doc.text(`${totalFactura.toFixed(2)}€`, margenDer, yTotals, { align: 'right' });

// Usar el máximo entre el final del recuadro y el final de los totales
const finalRecuadro = startYTotales + boxHeight;
const finalTotales = yTotals;
yPos = Math.max(finalRecuadro, finalTotales) + 5;

  // OBSERVACIONS (centrado)
  const obsText = idioma === 'es'
    ? (parametresData?.dadesEmpresa?.observacionsFacturaEs || parametresData?.dadesEmpresa?.observacionsFactura)
    : idioma === 'en'
      ? (parametresData?.dadesEmpresa?.observacionsFacturaEn || parametresData?.dadesEmpresa?.observacionsFactura)
      : parametresData?.dadesEmpresa?.observacionsFactura;
  if (obsText) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    const obsLines = doc.splitTextToSize(obsText, 180);
    doc.text(obsLines, 105, yPos, { align: 'center' });
    yPos += (obsLines.length * 4) + 5;
  }

  // NOTES A PEU
  const notesText = idioma === 'es'
    ? ((formData as any).plantillesTextEs || formData.plantillesText)
    : idioma === 'en'
      ? ((formData as any).plantillesTextEn || formData.plantillesText)
      : formData.plantillesText;
  if (notesText) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    const notesLines = doc.splitTextToSize(notesText, 180);
    doc.text(notesLines, colIzq, yPos);
  }

  // ==================== NUMERACIÓN ====================

  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(7);
  doc.setTextColor(150);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`${tr.pagina} ${i}/${pageCount}`, margenDer, 287, { align: 'right' });
  }

// Descargar PDF
doc.save(`${formData.codi}_factura.pdf`);

// Retornar PDF en base64 para guardarlo
return doc.output('dataurlstring');

};