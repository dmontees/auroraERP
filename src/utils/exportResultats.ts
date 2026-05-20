import type { ExportConfig } from '../components/resultats/types';
import type { FacturaVenta } from '../types/facturaVenda';
import type { Gasto } from '../types/facturaCompra';
import type { Projecte } from '../types/projecte';
import type { Client } from '../types/client';
import type { Proveidor } from '../types/proveidor';
import type { Periode } from './resultatCalculs';
import {
  estaEnPeriode,
  calcularIngressos,
  calcularDespeses,
  formatCurrency,
  agruparPerMes
} from './resultatCalculs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ============================================================================
// EXPORTAR CSV
// ============================================================================

const arrayToCSV = (data: any[], headers: string[]): string => {
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.join(',')];
  data.forEach(item => {
    const row = headers.map(header => escapeCSV(item[header]));
    rows.push(row.join(','));
  });
  
  return rows.join('\n');
};

const downloadCSV = (filename: string, content: string) => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToCSV = (
  config: ExportConfig,
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  projectes: Projecte[],
  clients: Client[],
  proveidors: Proveidor[]
) => {
  const timestamp = new Date().toISOString().split('T')[0];
  
  config.sections.forEach(section => {
    switch (section) {
      case 'visio':
        exportVisioGeneralCSV(periode, facturesVenda, gastos, timestamp);
        break;
      case 'financera':
        exportFinanceraCSV(periode, facturesVenda, gastos, timestamp);
        break;
      case 'projectes':
        exportProjectesCSV(periode, projectes, facturesVenda, clients, timestamp);
        break;
      case 'clients':
        exportClientsCSV(periode, clients, projectes, facturesVenda, timestamp);
        break;
      case 'despeses':
        exportDespesesCSV(periode, gastos, proveidors, timestamp);
        break;
      case 'temporal':
        exportTemporalCSV(periode, facturesVenda, gastos, timestamp);
        break;
    }
  });
};

const exportVisioGeneralCSV = (
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  timestamp: string
) => {
  const ingressosPerMes = agruparPerMes(facturesVenda, 'dataFactura', 'totalFactura', periode);
  const despesesPerMes = agruparPerMes(gastos, 'dataGasto', 'totalGasto', periode);
  
  const data = ingressosPerMes.map((ing, i) => ({
    Mes: ing.mes,
    Ingressos: ing.valor.toFixed(2),
    Despeses: (despesesPerMes[i]?.valor || 0).toFixed(2),
    Benefici: (ing.valor - (despesesPerMes[i]?.valor || 0)).toFixed(2)
  }));
  
  const csv = arrayToCSV(data, ['Mes', 'Ingressos', 'Despeses', 'Benefici']);
  downloadCSV(`visio-general-${timestamp}.csv`, csv);
};

const exportFinanceraCSV = (
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  timestamp: string
) => {
  const data = facturesVenda
    .filter(f => estaEnPeriode(f.dataFactura, periode))
    .map(f => ({
      Codi: f.codi,
      Client: f.client,
      Data: f.dataFactura,
      Total: f.totalFactura.toFixed(2),
      Pendent: f.pendentCobrar.toFixed(2),
      Estat: f.estat
    }));
  
  const csv = arrayToCSV(data, ['Codi', 'Client', 'Data', 'Total', 'Pendent', 'Estat']);
  downloadCSV(`factures-venda-${timestamp}.csv`, csv);
  
  // También exportar gastos
  const dataGastos = gastos
    .filter(g => estaEnPeriode(g.dataGasto, periode))
    .map(g => ({
      Codi: g.codi,
      Tipus: g.tipus,
      Data: g.dataGasto,
      Total: g.totalGasto.toFixed(2),
      Pendent: g.pendentPagament.toFixed(2),
      Estat: g.estat
    }));
  
  const csvGastos = arrayToCSV(dataGastos, ['Codi', 'Tipus', 'Data', 'Total', 'Pendent', 'Estat']);
  downloadCSV(`gastos-${timestamp}.csv`, csvGastos);
};

const exportProjectesCSV = (
  periode: Periode,
  projectes: Projecte[],
  facturesVenda: FacturaVenta[],
  clients: Client[],
  timestamp: string
) => {
  const data = projectes
    .filter(p => p.dataInici && estaEnPeriode(p.dataInici, periode))
    .map(p => {
      const client = clients.find(c => c.codi === p.client);
      const factura = facturesVenda.find(f => f.projecte === p.codi);
      const ingressos = factura?.totalFactura || 0;
      const despeses = p.gastosTotals || 0;
      const benefici = ingressos - despeses;
      const marge = ingressos > 0 ? (benefici / ingressos * 100) : 0;
      
      return {
        Codi: p.codi,
        Titol: p.titol,
        Client: client?.nomComercial || client?.nomFiscal || '',
        Estat: p.estat,
        Ingressos: ingressos.toFixed(2),
        Despeses: despeses.toFixed(2),
        Benefici: benefici.toFixed(2),
        Marge: marge.toFixed(2) + '%'
      };
    });
  
  const csv = arrayToCSV(data, ['Codi', 'Titol', 'Client', 'Estat', 'Ingressos', 'Despeses', 'Benefici', 'Marge']);
  downloadCSV(`projectes-${timestamp}.csv`, csv);
};

const exportClientsCSV = (
  periode: Periode,
  clients: Client[],
  projectes: Projecte[],
  facturesVenda: FacturaVenta[],
  timestamp: string
) => {
  const data = clients.map(client => {
    const projectesClient = projectes.filter(p => p.client === client.codi);
    const facturesClient = facturesVenda.filter(f => 
      f.client === client.codi && estaEnPeriode(f.dataFactura, periode)
    );
    
    const numProjectes = projectesClient.length;
    const facturacio = facturesClient.reduce((sum, f) => sum + f.totalFactura, 0);
    const pendent = facturesClient.reduce((sum, f) => sum + f.pendentCobrar, 0);
    
    return {
      Codi: client.codi,
      Nom: client.nomComercial || client.nomFiscal,
      NumProjectes: numProjectes,
      Facturacio: facturacio.toFixed(2),
      Pendent: pendent.toFixed(2)
    };
  }).filter(c => c.Facturacio !== '0.00' || c.NumProjectes > 0);
  
  const csv = arrayToCSV(data, ['Codi', 'Nom', 'NumProjectes', 'Facturacio', 'Pendent']);
  downloadCSV(`clients-${timestamp}.csv`, csv);
};

const exportDespesesCSV = (
  periode: Periode,
  gastos: Gasto[],
  proveidors: Proveidor[],
  timestamp: string
) => {
  const data = gastos
    .filter(g => estaEnPeriode(g.dataGasto, periode))
    .map(g => {
      const proveidor = g.tipus === 'factura-compra' 
        ? proveidors.find(p => p.codi === g.proveidor)
        : null;
      
      return {
        Codi: g.codi,
        Tipus: g.tipus,
        Proveidor: proveidor?.nomComercial || '-',
        Categoria: g.categoria || '-',
        Data: g.dataGasto,
        Total: g.totalGasto.toFixed(2),
        Estat: g.estat
      };
    });
  
  const csv = arrayToCSV(data, ['Codi', 'Tipus', 'Proveidor', 'Categoria', 'Data', 'Total', 'Estat']);
  downloadCSV(`despeses-${timestamp}.csv`, csv);
};

const exportTemporalCSV = (
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  timestamp: string
) => {
  const ingressosPerMes = agruparPerMes(facturesVenda, 'dataFactura', 'totalFactura', periode);
  const despesesPerMes = agruparPerMes(gastos, 'dataGasto', 'totalGasto', periode);
  
  const data = ingressosPerMes.map((ing, i) => {
    const despeses = despesesPerMes[i]?.valor || 0;
    const benefici = ing.valor - despeses;
    const marge = ing.valor > 0 ? (benefici / ing.valor * 100) : 0;
    
    return {
      Mes: ing.mes,
      Ingressos: ing.valor.toFixed(2),
      Despeses: despeses.toFixed(2),
      Benefici: benefici.toFixed(2),
      Marge: marge.toFixed(2) + '%'
    };
  });
  
  const csv = arrayToCSV(data, ['Mes', 'Ingressos', 'Despeses', 'Benefici', 'Marge']);
  downloadCSV(`temporal-${timestamp}.csv`, csv);
};

// ============================================================================
// EXPORTAR EXCEL
// ============================================================================

export const exportToExcel = (
  config: ExportConfig,
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  projectes: Projecte[],
  clients: Client[],
  proveidors: Proveidor[]
) => {
  const wb = XLSX.utils.book_new();
  
  config.sections.forEach(section => {
    let ws: XLSX.WorkSheet;
    let sheetName: string;
    
    switch (section) {
      case 'visio':
        ws = createVisioGeneralSheet(periode, facturesVenda, gastos);
        sheetName = 'Visio General';
        break;
      case 'financera':
        ws = createFinanceraSheet(periode, facturesVenda, gastos);
        sheetName = 'Financera';
        break;
      case 'projectes':
        ws = createProjectesSheet(periode, projectes, facturesVenda, clients);
        sheetName = 'Projectes';
        break;
      case 'clients':
        ws = createClientsSheet(periode, clients, projectes, facturesVenda);
        sheetName = 'Clients';
        break;
      case 'despeses':
        ws = createDespesesSheet(periode, gastos, proveidors);
        sheetName = 'Despeses';
        break;
      case 'temporal':
        ws = createTemporalSheet(periode, facturesVenda, gastos);
        sheetName = 'Temporal';
        break;
      default:
        return;
    }
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
  
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `informe-resultats-${timestamp}.xlsx`);
};

const createVisioGeneralSheet = (
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[]
): XLSX.WorkSheet => {
  const ingressosPerMes = agruparPerMes(facturesVenda, 'dataFactura', 'totalFactura', periode);
  const despesesPerMes = agruparPerMes(gastos, 'dataGasto', 'totalGasto', periode);
  
  const data = [
    ['Mes', 'Ingressos', 'Despeses', 'Benefici'],
    ...ingressosPerMes.map((ing, i) => [
      ing.mes,
      ing.valor,
      despesesPerMes[i]?.valor || 0,
      ing.valor - (despesesPerMes[i]?.valor || 0)
    ])
  ];
  
  return XLSX.utils.aoa_to_sheet(data);
};

const createFinanceraSheet = (
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[]
): XLSX.WorkSheet => {
  const data = [
    ['Codi', 'Client', 'Data', 'Total', 'Pendent', 'Estat'],
    ...facturesVenda
      .filter(f => estaEnPeriode(f.dataFactura, periode))
      .map(f => [f.codi, f.client, f.dataFactura, f.totalFactura, f.pendentCobrar, f.estat])
  ];
  
  return XLSX.utils.aoa_to_sheet(data);
};

const createProjectesSheet = (
  periode: Periode,
  projectes: Projecte[],
  facturesVenda: FacturaVenta[],
  clients: Client[]
): XLSX.WorkSheet => {
  const data = [
    ['Codi', 'Títol', 'Client', 'Estat', 'Ingressos', 'Despeses', 'Benefici', 'Marge %'],
    ...projectes
      .filter(p => p.dataInici && estaEnPeriode(p.dataInici, periode))
      .map(p => {
        const client = clients.find(c => c.codi === p.client);
        const factura = facturesVenda.find(f => f.projecte === p.codi);
        const ingressos = factura?.totalFactura || 0;
        const despeses = p.gastosTotals || 0;
        const benefici = ingressos - despeses;
        const marge = ingressos > 0 ? (benefici / ingressos * 100) : 0;
        
        return [
          p.codi,
          p.titol,
          client?.nomComercial || client?.nomFiscal || '',
          p.estat,
          ingressos,
          despeses,
          benefici,
          marge
        ];
      })
  ];
  
  return XLSX.utils.aoa_to_sheet(data);
};

const createClientsSheet = (
  periode: Periode,
  clients: Client[],
  projectes: Projecte[],
  facturesVenda: FacturaVenta[]
): XLSX.WorkSheet => {
  const data = [
    ['Codi', 'Nom', 'Núm. Projectes', 'Facturació', 'Pendent'],
    ...clients
      .map(client => {
        const projectesClient = projectes.filter(p => p.client === client.codi);
        const facturesClient = facturesVenda.filter(f => 
          f.client === client.codi && estaEnPeriode(f.dataFactura, periode)
        );
        
        const numProjectes = projectesClient.length;
        const facturacio = facturesClient.reduce((sum, f) => sum + f.totalFactura, 0);
        const pendent = facturesClient.reduce((sum, f) => sum + f.pendentCobrar, 0);
        
        return [
          client.codi,
          client.nomComercial || client.nomFiscal,
          numProjectes,
          facturacio,
          pendent
        ];
      })
      .filter(row => row[3] !== 0 || row[2] > 0)
  ];
  
  return XLSX.utils.aoa_to_sheet(data);
};

const createDespesesSheet = (
  periode: Periode,
  gastos: Gasto[],
  proveidors: Proveidor[]
): XLSX.WorkSheet => {
  const data = [
    ['Codi', 'Tipus', 'Proveïdor', 'Categoria', 'Data', 'Total', 'Estat'],
    ...gastos
      .filter(g => estaEnPeriode(g.dataGasto, periode))
      .map(g => {
        const proveidor = g.tipus === 'factura-compra' 
          ? proveidors.find(p => p.codi === g.proveidor)
          : null;
        
        return [
          g.codi,
          g.tipus,
          proveidor?.nomComercial || '-',
          g.categoria || '-',
          g.dataGasto,
          g.totalGasto,
          g.estat
        ];
      })
  ];
  
  return XLSX.utils.aoa_to_sheet(data);
};

const createTemporalSheet = (
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[]
): XLSX.WorkSheet => {
  const ingressosPerMes = agruparPerMes(facturesVenda, 'dataFactura', 'totalFactura', periode);
  const despesesPerMes = agruparPerMes(gastos, 'dataGasto', 'totalGasto', periode);
  
  const data = [
    ['Mes', 'Ingressos', 'Despeses', 'Benefici', 'Marge %'],
    ...ingressosPerMes.map((ing, i) => {
      const despeses = despesesPerMes[i]?.valor || 0;
      const benefici = ing.valor - despeses;
      const marge = ing.valor > 0 ? (benefici / ing.valor * 100) : 0;
      
      return [ing.mes, ing.valor, despeses, benefici, marge];
    })
  ];
  
  return XLSX.utils.aoa_to_sheet(data);
};

// ============================================================================
// EXPORTAR PDF
// ============================================================================

export const exportToPDF = (
  config: ExportConfig,
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  projectes: Projecte[],
  clients: Client[],
  proveidors: Proveidor[]
) => {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleDateString('ca-ES');
  
  if (config.format === 'pdf-executiu') {
    generatePDFExecutiu(doc, periode, facturesVenda, gastos, projectes, timestamp, config);
  } else {
    generatePDFComplet(doc, periode, facturesVenda, gastos, projectes, clients, proveidors, timestamp, config);
  }
  
  const filename = config.format === 'pdf-executiu' 
    ? `informe-executiu-${new Date().toISOString().split('T')[0]}.pdf`
    : `informe-complet-${new Date().toISOString().split('T')[0]}.pdf`;
  
  doc.save(filename);
};

const generatePDFExecutiu = (
  doc: jsPDF,
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  projectes: Projecte[],
  timestamp: string,
  config: ExportConfig
) => {
  let yPos = 20;
  
  // Título
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Informe Executiu de Resultats', 105, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Període: ${periode.dataInici} - ${periode.dataFi}`, 105, yPos, { align: 'center' });
  doc.text(`Generat: ${timestamp}`, 105, yPos + 5, { align: 'center' });
  
  yPos += 20;
  
  // KPIs principales
  const ingressos = calcularIngressos(facturesVenda, periode);
  const despeses = calcularDespeses(gastos, periode);
  const benefici = ingressos - despeses;
  const marge = ingressos > 0 ? (benefici / ingressos * 100) : 0;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resum Financer', 14, yPos);
  
  yPos += 10;
  
  const kpis = [
    ['Ingressos Totals', formatCurrency(ingressos)],
    ['Despeses Totals', formatCurrency(despeses)],
    ['Benefici Net', formatCurrency(benefici)],
    ['Marge de Benefici', `${marge.toFixed(1)}%`]
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Mètrica', 'Valor']],
    body: kpis,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 10 }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Evolución mensual
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Evolució Mensual', 14, yPos);
  
  yPos += 10;
  
  const ingressosPerMes = agruparPerMes(facturesVenda, 'dataFactura', 'totalFactura', periode);
  const despesesPerMes = agruparPerMes(gastos, 'dataGasto', 'totalGasto', periode);
  
  const evolutionData = ingressosPerMes.map((ing, i) => {
    const desp = despesesPerMes[i]?.valor || 0;
    const ben = ing.valor - desp;
    return [
      ing.mes,
      formatCurrency(ing.valor),
      formatCurrency(desp),
      formatCurrency(ben)
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [['Mes', 'Ingressos', 'Despeses', 'Benefici']],
    body: evolutionData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 }
  });
  
  // Pie de página
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Pàgina ${i} de ${pageCount}`, 105, 285, { align: 'center' });
  }
};

const generatePDFComplet = (
  doc: jsPDF,
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  projectes: Projecte[],
  clients: Client[],
  proveidors: Proveidor[],
  timestamp: string,
  config: ExportConfig
) => {
  let yPos = 20;
  
  // Título
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Informe Complet de Resultats', 105, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Període: ${periode.dataInici} - ${periode.dataFi}`, 105, yPos, { align: 'center' });
  doc.text(`Generat: ${timestamp}`, 105, yPos + 5, { align: 'center' });
  
  yPos += 20;
  
  // Sección 1: Resumen Financiero
  if (config.sections.includes('financera')) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Resum Financer', 14, yPos);
    yPos += 10;
    
    const ingressos = calcularIngressos(facturesVenda, periode);
    const despeses = calcularDespeses(gastos, periode);
    const benefici = ingressos - despeses;
    const marge = ingressos > 0 ? (benefici / ingressos * 100) : 0;
    
    const kpis = [
      ['Ingressos Totals', formatCurrency(ingressos)],
      ['Despeses Totals', formatCurrency(despeses)],
      ['Benefici Net', formatCurrency(benefici)],
      ['Marge de Benefici', `${marge.toFixed(1)}%`]
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Mètrica', 'Valor']],
      body: kpis,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Sección 2: Proyectos
  if (config.sections.includes('projectes')) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Projectes', 14, yPos);
    yPos += 10;
    
    const projectesData = projectes
      .filter(p => p.dataInici && estaEnPeriode(p.dataInici, periode))
      .slice(0, 10) // Limitar a 10 para no exceder página
      .map(p => {
        const factura = facturesVenda.find(f => f.projecte === p.codi);
        const ingressos = factura?.totalFactura || 0;
        const despeses = p.gastosTotals || 0;
        const benefici = ingressos - despeses;
        
        return [
          p.codi,
          p.titol.substring(0, 30),
          formatCurrency(ingressos),
          formatCurrency(benefici)
        ];
      });
    
    autoTable(doc, {
      startY: yPos,
      head: [['Codi', 'Títol', 'Ingressos', 'Benefici']],
      body: projectesData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Pie de página
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Pàgina ${i} de ${pageCount}`, 105, 285, { align: 'center' });
  }
};