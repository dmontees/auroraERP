import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Pressupost } from '../types/pressupost';
import type { Client } from '../types/client';
import { storage } from './storageManager';

export const generarPressupostPDF = (
  formData: Pressupost,
  clients: Client[],
  idioma: 'ca' | 'es' | 'en'
) => {
  const doc = new jsPDF();
  
  // Traducciones
  const t = {
    ca: {
      pressupost: 'Pressupost:',
      dataPressupost: 'Data del pressupost:',
      client: 'CLIENT',
      tel: 'Tel.',
      resumProjecte: 'Resum del projecte',
      modalitat: 'Modalitat:',
      dataJornades: 'Data del projecte i nombre de jornades:',
      detallsProjecte: 'Detalls del projecte:',
      jornada: 'jornada',
      jornades: 'jornades',
      concepte: 'Concepte',
      quantitat: 'Quantitat',
      unitats: 'Unitats',
      tarifa: 'Tarifa',
      importe: 'Import',
      total: 'TOTAL PRESSUPOST',
      iva: 'IVA',
      totalIva: 'Total amb IVA',
      pagina: 'Pàgina'
    },
    es: {
      pressupost: 'Presupuesto:',
      dataPressupost: 'Fecha del presupuesto:',
      client: 'CLIENTE',
      tel: 'Tel.',
      resumProjecte: 'Resumen del proyecto',
      modalitat: 'Modalidad:',
      dataJornades: 'Fecha del proyecto y número de jornadas:',
      detallsProjecte: 'Detalles del proyecto:',
      jornada: 'jornada',
      jornades: 'jornadas',
      concepte: 'Concepto',
      quantitat: 'Cantidad',
      unitats: 'Unidades',
      tarifa: 'Tarifa',
      importe: 'Importe',
      total: 'TOTAL PRESUPUESTO',
      iva: 'IVA',
      totalIva: 'Total con IVA',
      pagina: 'Página'
    },
    en: {
      pressupost: 'Budget:',
      dataPressupost: 'Budget date:',
      client: 'CLIENT',
      tel: 'Tel.',
      resumProjecte: 'Project summary',
      modalitat: 'Modality:',
      dataJornades: 'Project date and number of days:',
      detallsProjecte: 'Project details:',
      jornada: 'day',
      jornades: 'days',
      concepte: 'Concept',
      quantitat: 'Quantity',
      unitats: 'Units',
      tarifa: 'Rate',
      importe: 'Amount',
      total: 'TOTAL BUDGET',
      iva: 'VAT',
      totalIva: 'Total with VAT',
      pagina: 'Page'
    }
  };

  const tr = t[idioma];
  
  // Obtener datos
  const parametresData = storage.getParametres();
  const client = clients.find(c => c.codi === formData.client);
  
  // ... AQUÍ VA TODO EL RESTO DEL CÓDIGO QUE COPIASTE
  // (todo el código desde "Colores elegantes" hasta "doc.save")
  
  // Colores elegantes y suaves
  const colorPrimary = [71, 85, 105];
  const colorSecondary = [100, 116, 139];
  const colorAccent = [15, 118, 110];
  
  const colIzq = 15;
  const margenDer = 195;
  const lineHeight = 5;
  
  let yPos = 20; // MARGEN SUPERIOR
    
  // ==================== LOGO (ARRIBA A LA DERECHA) ====================
  
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
  
  yPos += 8 + 6; // Altura del logo + espacio
  
  // ==================== DATOS EMPRESA Y CLIENTE ====================
  
  const yInicioEmpresas = yPos;
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
    
    if (client.correu) {
      doc.text(client.correu, colIzq, yClient);
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
  
  // Usar el máximo de las dos columnas + espacio
  yPos = Math.max(yMaxClient, yMaxEmpresa) + 12;
  
  // ==================== TÍTULO DEL PRESUPUESTO (ENCIMA DEL RECUADRO) ====================
  
  // Formatear fecha a dd-mm-aaaa
  const [year, month, day] = formData.data.split('-');
  const fechaFormateada = `${day}-${month}-${year}`;
  
  // NÚMERO DE PRESUPUESTO (centrado)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorPrimary);
  doc.text(`${tr.pressupost} ${formData.codi}`, 105, yPos, { align: 'center' });
  yPos += 6;
  
// FECHA DEL PRESUPUESTO (centrado)
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(100);
doc.text(`${tr.dataPressupost} ${fechaFormateada}`, 105, yPos, { align: 'center' });
yPos += 8; // REDUCIDO de 10 a 8

// ==================== DETALLES DEL PROYECTO ====================
    
doc.setFontSize(7);
doc.setFont('helvetica', 'italic');
doc.setTextColor(120);
doc.text(tr.resumProjecte, colIzq, yPos - 1);

// CALCULAR ALTURA NECESARIA PARA EL CONTENIDO
const margenSuperiorRecuadro = 7;   // ← AJUSTA EL MARGEN SUPERIOR AQUÍ
const margenInferiorRecuadro = 0;   // ← AJUSTA EL MARGEN INFERIOR AQUÍ
let alturaContenido = 0;

if (formData.nomProjecte) alturaContenido += 5;
if (formData.modalitat) alturaContenido += 5;
if (formData.dataProjecte || formData.numJornades) alturaContenido += 5;
if (formData.detallsProjecte) {
  const detallsLines = doc.splitTextToSize(formData.detallsProjecte, 165);
  alturaContenido += 4 + (detallsLines.length * 4);
}

const boxHeight = margenSuperiorRecuadro + alturaContenido + margenInferiorRecuadro;
const boxWidth = 180;
const boxStartY = yPos;

// DIBUJAR RECUADRO
doc.setDrawColor(...colorSecondary);
doc.setFillColor(248, 249, 250);
doc.setLineWidth(0.5);
doc.roundedRect(colIzq, boxStartY, boxWidth, boxHeight, 2, 2, 'FD');

// ESCRIBIR CONTENIDO DENTRO DEL RECUADRO
yPos = boxStartY + margenSuperiorRecuadro; // Usar margen superior específico
doc.setFontSize(9);
doc.setTextColor(50);

// NOMBRE DEL PROYECTO
if (formData.nomProjecte) {
  const nomProjecteLabel = idioma === 'ca' ? 'Nom del projecte:' : idioma === 'es' ? 'Nombre del proyecto:' : 'Project name:';
  doc.setFont('helvetica', 'bold');
  const widthNom = doc.getTextWidth(nomProjecteLabel + ' ');
  doc.text(nomProjecteLabel, 18, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formData.nomProjecte, 18 + widthNom, yPos);
  yPos += 5;
}

if (formData.modalitat) {
  doc.setFont('helvetica', 'bold');
  const widthModalitat = doc.getTextWidth(tr.modalitat + ' ');
  doc.text(tr.modalitat, 18, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formData.modalitat, 18 + widthModalitat, yPos);
  yPos += 5;
}

if (formData.dataProjecte || formData.numJornades) {
  const jornadesText = formData.numJornades === 1 ? tr.jornada : tr.jornades;
  const jornadesStr = formData.numJornades ? ` (${formData.numJornades} ${jornadesText})` : '';
  doc.setFont('helvetica', 'bold');
  const widthData = doc.getTextWidth(tr.dataJornades + ' ');
  doc.text(tr.dataJornades, 18, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formData.dataProjecte || ''}${jornadesStr}`, 18 + widthData, yPos);
  yPos += 5;
}

if (formData.detallsProjecte) {
  doc.setFont('helvetica', 'bold');
  doc.text(`${tr.detallsProjecte}`, 18, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  const detallsLines = doc.splitTextToSize(formData.detallsProjecte, 165);
  doc.text(detallsLines, 18, yPos);
}

// Ajustar yPos para después del recuadro
yPos = boxStartY + boxHeight + 8;
  
// ==================== TABLA DE TAREAS ====================
    
const margenInferiorPagina = 277; // Límite inferior de la página (antes de numeración)
    
if (formData.tasques.length === 0) {
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('No hi ha tasques en aquest pressupost', 105, yPos + 20, { align: 'center' });
  yPos += 40;
} else {
  const categoriesOrdenades: string[] = [];
  formData.tasques.forEach(tasca => {
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
    const tasquesCategoria = formData.tasques
      .filter(t => t.categoria === categoriaCodi)
      .sort((a, b) => a.ordre - b.ordre);
    
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

      tableData.push([
        concepte,
        tasca.quantitat.toString(),
        categoriaCodi === 'MATERIALS' ? '-' : unitatNom,
        `${tasca.tarifa.toFixed(2)}€`,
        `${tasca.importe.toFixed(2)}€`
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
    margin: { left: colIzq, bottom: 20 }, // Margen inferior para proteger zona de numeración
    showHead: 'everyPage', // Repetir header en cada página
    didDrawPage: function(data: any) {
      // Este callback se ejecuta cada vez que se dibuja en una página nueva
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY;
}

// ==================== TOTALES Y NOTAS (SIEMPRE EN ÚLTIMA PÁGINA) ====================

const totalPressupost = formData.tasques.reduce((sum, t) => sum + t.importe, 0);
const ivaAmount = totalPressupost * (formData.iva / 100);
const totalAmbIva = totalPressupost + ivaAmount;

const alturaTotalesYNotas = 40; // Espacio necesario para totales + notas
const espacioDisponible = margenInferiorPagina - yPos;

// Si no hay espacio suficiente en la página actual, crear nueva página
if (espacioDisponible < alturaTotalesYNotas) {
  doc.addPage();
  yPos = 20; // Empezar desde arriba en la nueva página
}

// Calcular posición para que quede en la parte inferior
const espacioRestante = margenInferiorPagina - yPos;
if (espacioRestante > alturaTotalesYNotas + 20) {
  yPos = margenInferiorPagina - alturaTotalesYNotas;
} else {
  yPos += 15;
}

// TOTALES
doc.setTextColor(0);

doc.setFontSize(13);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...colorPrimary);
doc.text(tr.total, 120, yPos);
doc.text(`${totalPressupost.toFixed(2)}€`, margenDer, yPos, { align: 'right' });

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(80);
doc.text(`${tr.iva} (${formData.iva}%):`, 120, yPos + 7);
doc.text(`${ivaAmount.toFixed(2)}€`, margenDer, yPos + 7, { align: 'right' });

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...colorAccent);
doc.text(tr.totalIva, 120, yPos + 14);
doc.text(`${totalAmbIva.toFixed(2)}€`, margenDer, yPos + 14, { align: 'right' });

// NOTES A PEU
const notesText = idioma === 'es'
  ? ((formData as any).notesAPeuEs || formData.notesAPeu)
  : idioma === 'en'
    ? ((formData as any).notesAPeuEn || formData.notesAPeu)
    : formData.notesAPeu;
if (notesText) {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  const notesLines = doc.splitTextToSize(notesText, 180);
  doc.text(notesLines, colIzq, yPos + 24);
}

// ==================== NÚMERO DE PÁGINA (EN ZONA PROTEGIDA) ====================

const pageCount = doc.getNumberOfPages();
doc.setFontSize(7);
doc.setTextColor(150);
for (let i = 1; i <= pageCount; i++) {
  doc.setPage(i);
  doc.text(`${tr.pagina} ${i}/${pageCount}`, margenDer, 287, { align: 'right' });
}

// Descargar
doc.save(`${formData.codi}_pressupost.pdf`);
};