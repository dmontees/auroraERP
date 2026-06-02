import type { ExportConfig } from '../components/resultats/types';
import type { FacturaVenta } from '../types/facturaVenda';
import type { Gasto, FacturaCompra, ObligacioFiscal } from '../types/facturaCompra';
import type { Projecte } from '../types/projecte';
import type { Client } from '../types/client';
import type { Proveidor } from '../types/proveidor';
import type { Parametres } from '../types/parametres';
import type { Periode } from './resultatCalculs';
import { estaEnPeriode, formatCurrency, agruparPerMes, getProjecteIngressos, getDataEfectivaGasto } from './resultatCalculs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── Aurora ERP color palette ────────────────────────────────────────────────
type RGB = [number, number, number];
const C: Record<string, RGB> = {
  accent:  [71,   85, 105],  // slate-600 — matches invoice/budget PDFs
  dark:    [30,   41,  59],
  rowAlt:  [248, 250, 252],
  text:    [15,   23,  42],
  muted:   [100, 116, 139],
  border:  [226, 232, 240],
  green:   [16,  185, 129],
  amber:   [245, 158,  11],
  red:     [239,  68,  68],
  white:   [255, 255, 255],
};

const SUBTIPUS_FISCAL = ['cuota-autonomo', 'irpf-trimestral', 'irpf-anual', 'regularitzacio-ss'];

// ─── Calculation helpers (matching Activitat.tsx logic) ──────────────────────

function calcIngressosBruts(
  facturesVenda: FacturaVenta[],
  projectes: Projecte[],
  periode: Periode,
): number {
  const fromFactures = facturesVenda
    .filter(f => !['borrador', 'cancelled'].includes(f.estat) && estaEnPeriode(f.dataFactura, periode))
    .reduce((s, f) => s + (f.baseImposable || 0), 0);

  const fromImported = projectes
    .filter(p => {
      const data = p.facturaHistorica?.data || p.dataFinalitzacio || p.dataInici || '';
      return p.esImportat === true && data && estaEnPeriode(data, periode);
    })
    .reduce((s, p) => {
      const ing = (p.tasques || []).reduce((t, tk) => t + (tk.importe || 0), 0);
      const desp =
        (p.recursosHumans || []).reduce((t, r) => t + (r.cost || 0), 0) +
        (p.materials || []).reduce((t, m) => t + (m.preuProveidor || 0) * (m.jornades ?? 1), 0);
      return s + (ing - desp);
    }, 0);

  return fromFactures + fromImported;
}

function calcObligacionsFiscals(
  obligacionsFiscals: ObligacioFiscal[],
  periode: Periode,
): number {
  const years = new Set<string>();
  const start = parseInt(periode.dataInici.substring(0, 4));
  const end = parseInt(periode.dataFi.substring(0, 4));
  for (let y = start; y <= end; y++) years.add(String(y));

  return obligacionsFiscals
    .filter(o => SUBTIPUS_FISCAL.includes(o.subtipus) && years.has(o.periode?.substring(0, 4) ?? ''))
    .reduce((s, o) => s + (o.baseImposable || o.totalGasto || 0), 0);
}

function calcDespesesEstructurals(gastos: Gasto[], periode: Periode): number {
  return gastos
    .filter(
      g =>
        g.tipus === 'factura-compra' &&
        (g as FacturaCompra).esDepesaGeneral === true &&
        estaEnPeriode(getDataEfectivaGasto(g), periode),
    )
    .reduce((s, g) => s + ((g as FacturaCompra).baseImposable || 0), 0);
}

function calcMesosBase(periode: Periode): number {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const cursor = new Date(
    new Date(periode.dataInici).getFullYear(),
    new Date(periode.dataInici).getMonth(),
    1,
  );
  const end = new Date(periode.dataFi);
  let count = 0;
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    if (key < todayKey) count++;
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return Math.max(1, count);
}

// ─── PDF layout helpers ───────────────────────────────────────────────────────

function addPageHeader(
  doc: jsPDF,
  title: string,
  periode: Periode,
  timestamp: string,
  config: ExportConfig,
  parametres: Parametres | null,
): number {
  const PW = doc.internal.pageSize.getWidth();

  // Top accent band
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, PW, 10, 'F');

  let yPos = 20;

  // Logo (top-right, same proportions as invoice PDF)
  if (config.includeLogo && parametres?.dadesEmpresa?.logo) {
    try {
      const logoW = 50;
      const logoH = 8;
      doc.addImage(
        parametres.dadesEmpresa.logo,
        'PNG',
        PW - 14 - logoW,
        yPos - 6,
        logoW,
        logoH,
        undefined,
        'FAST',
      );
    } catch {
      // ignore broken image data
    }
  }

  // Company info (left)
  const empresa = parametres?.dadesEmpresa;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.text);
  doc.text(empresa?.nomComercial || empresa?.nomFiscal || 'Aurora ERP', 14, yPos);

  if (empresa?.nif) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(`NIF: ${empresa.nif}`, 14, yPos + 5.5);
  }

  // Report title (centered below accent band)
  yPos += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.dark);
  doc.text(title, PW / 2, yPos, { align: 'center' });

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(
    `Periode: ${periode.dataInici} - ${periode.dataFi}   |   Generat: ${timestamp}`,
    PW / 2,
    yPos,
    { align: 'center' },
  );

  // Divider
  yPos += 6;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.line(14, yPos, PW - 14, yPos);

  return yPos + 7;
}

function addSectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.dark);
  doc.text(text, 14, y);
  return y + 7;
}

function ensureSpace(doc: jsPDF, y: number, needed = 30): number {
  const PH = doc.internal.pageSize.getHeight();
  if (y + needed > PH - 20) {
    doc.addPage();
    return 22;
  }
  return y;
}

function addFooters(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(14, PH - 13, PW - 14, PH - 13);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text('Aurora ERP', 14, PH - 8);
    doc.text(`${i} / ${total}`, PW - 14, PH - 8, { align: 'right' });
  }
}

function baseTableStyles() {
  return {
    theme: 'grid' as const,
    headStyles: {
      fillColor: C.accent,
      textColor: C.white,
      fontStyle: 'bold' as const,
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: { fillColor: C.rowAlt },
    styles: {
      fontSize: 9,
      textColor: C.text,
      cellPadding: 3,
      lineColor: C.border,
      lineWidth: 0.2,
    },
    tableLineColor: C.border,
    tableLineWidth: 0.2,
  };
}

// ─── PDF sections ─────────────────────────────────────────────────────────────

function addActivitatSection(
  doc: jsPDF,
  yPos: number,
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  obligacionsFiscals: ObligacioFiscal[],
  projectes: Projecte[],
): number {
  yPos = addSectionTitle(doc, 'Activitat - Compte de resultats simplificat', yPos);

  const ingressos = calcIngressosBruts(facturesVenda, projectes, periode);
  const obligacions = calcObligacionsFiscals(obligacionsFiscals, periode);
  const estructurals = calcDespesesEstructurals(gastos, periode);
  const resultat = ingressos - obligacions - estructurals;
  const mesosBase = calcMesosBase(periode);
  const mitja = resultat / mesosBase;
  const marge = ingressos > 0 ? (resultat / ingressos) * 100 : 0;

  const summary = [
    ['+ Ingressos bruts', formatCurrency(ingressos)],
    ['- Obligacions fiscals (autònom, IRPF, SS)', `-${formatCurrency(obligacions)}`],
    ['- Despeses estructurals (factures generals)', `-${formatCurrency(estructurals)}`],
    ['= Resultat net - equivalent a un sou', formatCurrency(resultat)],
    ['Marge net', `${marge.toFixed(1)}%`],
    [`Promig mensual (${mesosBase} mesos completats)`, `${formatCurrency(mitja)} / mes`],
  ];

  autoTable(doc, {
    startY: yPos,
    body: summary,
    ...baseTableStyles(),
    theme: 'grid',
    headStyles: undefined,
    columnStyles: {
      0: { fontStyle: 'normal', cellWidth: 130 },
      1: { fontStyle: 'bold', halign: 'right' },
    },
    didParseCell(data) {
      const row = data.row.index;
      if (row === 3) {
        data.cell.styles.fillColor = resultat >= 0 ? [220, 252, 231] : [254, 226, 226];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = resultat >= 0 ? C.green : C.red;
      }
      if (row === 0) data.cell.styles.textColor = C.green;
      if (row === 1 || row === 2) data.cell.styles.textColor = C.red;
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Monthly breakdown table
  yPos = ensureSpace(doc, yPos, 40);
  yPos = addSectionTitle(doc, 'Desglossament mensual', yPos);

  const ingressosPerMes = agruparPerMes(
    facturesVenda.filter(f => !['borrador', 'cancelled'].includes(f.estat)),
    'dataFactura',
    'baseImposable',
    periode,
  );
  const obligacionsPerMes = agruparPerMes(
    obligacionsFiscals.filter(o => SUBTIPUS_FISCAL.includes(o.subtipus)),
    'dataGasto',
    'totalGasto',
    periode,
  );
  const estructuralsPerMes = agruparPerMes(
    gastos
      .filter(g => g.tipus === 'factura-compra' && (g as FacturaCompra).esDepesaGeneral === true)
      .map(g => ({ ...g, dataGasto: getDataEfectivaGasto(g) })),
    'dataGasto',
    'baseImposable',
    periode,
  );

  const monthlyRows = ingressosPerMes.map(m => {
    const fiscal = obligacionsPerMes.find(x => x.mes === m.mes)?.valor || 0;
    const estr = estructuralsPerMes.find(x => x.mes === m.mes)?.valor || 0;
    const net = m.valor - fiscal - estr;
    const label = new Date(m.mes + '-01').toLocaleDateString('ca', {
      month: 'short',
      year: 'numeric',
    });
    return [
      label,
      formatCurrency(m.valor),
      fiscal > 0 ? `-${formatCurrency(fiscal)}` : '-',
      estr > 0 ? `-${formatCurrency(estr)}` : '-',
      formatCurrency(net),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Mes', 'Ingressos', 'Oblig. Fiscals', 'Desp. Estr.', 'Resultat Net']],
    body: monthlyRows,
    ...baseTableStyles(),
    tableWidth: 'auto',
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 36, halign: 'right', textColor: C.green },
      2: { cellWidth: 36, halign: 'right', textColor: C.amber },
      3: { cellWidth: 36, halign: 'right', textColor: C.red },
      4: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
  });

  return (doc as any).lastAutoTable.finalY + 12;
}

function addProjectesSection(
  doc: jsPDF,
  yPos: number,
  periode: Periode,
  projectes: Projecte[],
  facturesVenda: FacturaVenta[],
  clients: Client[],
): number {
  yPos = addSectionTitle(doc, 'Projectes i Rendibilitat', yPos);

  const rows = projectes
    .filter(p => {
      const data = p.facturaHistorica?.data || p.dataFinalitzacio || p.dataInici || '';
      return data && estaEnPeriode(data, periode);
    })
    .map(p => {
      const client = clients.find(c => c.codi === p.client);
      const ingressos = getProjecteIngressos(p, facturesVenda);
      const despeses =
        (p.recursosHumans || []).reduce((s, r) => s + (r.cost || 0), 0) +
        (p.materials || []).reduce((s, m) => s + (m.preuProveidor || 0) * (m.jornades ?? 1), 0);
      const benefici = ingressos - despeses;
      const marge = ingressos > 0 ? (benefici / ingressos) * 100 : 0;

      return [
        p.titol?.substring(0, 40) || p.codi,
        client?.nomComercial || client?.nomFiscal || '-',
        p.estat || '-',
        formatCurrency(ingressos),
        formatCurrency(despeses),
        formatCurrency(benefici),
        `${marge.toFixed(1)}%`,
      ];
    });

  if (rows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text('Cap projecte en el període seleccionat.', 14, yPos + 5);
    return yPos + 15;
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Projecte', 'Client', 'Estat', 'Ingressos', 'Despeses', 'Benefici', 'Marge']],
    body: rows,
    ...baseTableStyles(),
    columnStyles: {
      0: { cellWidth: 50 },
      3: { halign: 'right', textColor: C.green },
      4: { halign: 'right', textColor: C.red },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right' },
    },
  });

  return (doc as any).lastAutoTable.finalY + 12;
}

function addClientsSection(
  doc: jsPDF,
  yPos: number,
  periode: Periode,
  clients: Client[],
  projectes: Projecte[],
  facturesVenda: FacturaVenta[],
): number {
  yPos = addSectionTitle(doc, 'Anàlisi de Clients', yPos);

  const rows = clients
    .map(client => {
      const facturesClient = facturesVenda.filter(
        f => f.client === client.codi && estaEnPeriode(f.dataFactura, periode),
      );
      const projectesClient = projectes.filter(p => p.client === client.codi);
      const facturacio = facturesClient.reduce((s, f) => s + (f.baseImposable || 0), 0);
      const pendent = facturesClient.reduce((s, f) => s + (f.pendentCobrar || 0), 0);
      return {
        nom: client.nomComercial || client.nomFiscal,
        projectes: projectesClient.length,
        facturacio,
        pendent,
      };
    })
    .filter(r => r.facturacio > 0 || r.projectes > 0)
    .sort((a, b) => b.facturacio - a.facturacio)
    .map(r => [
      r.nom,
      String(r.projectes),
      formatCurrency(r.facturacio),
      formatCurrency(r.pendent),
    ]);

  if (rows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text('Cap client amb activitat en el període.', 14, yPos + 5);
    return yPos + 15;
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Client', 'Projectes', 'Facturació (base)', 'Pendent cobrar']],
    body: rows,
    ...baseTableStyles(),
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right', textColor: C.green },
      3: { halign: 'right', textColor: C.amber },
    },
  });

  return (doc as any).lastAutoTable.finalY + 12;
}

function addDespesesSection(
  doc: jsPDF,
  yPos: number,
  periode: Periode,
  gastos: Gasto[],
  proveidors: Proveidor[],
): number {
  yPos = addSectionTitle(doc, 'Despeses i Proveïdors', yPos);

  const rows = gastos
    .filter(g => estaEnPeriode(getDataEfectivaGasto(g), periode))
    .sort((a, b) => b.totalGasto - a.totalGasto)
    .map(g => {
      const prov =
        g.tipus === 'factura-compra'
          ? proveidors.find(p => p.codi === (g as FacturaCompra).proveidor)
          : null;
      const tipusLabel =
        g.tipus === 'factura-compra'
          ? 'Factura compra'
          : g.tipus === 'gasto-general'
          ? 'Gasto general'
          : 'Obligació fiscal';
      return [
        g.dataGasto,
        tipusLabel,
        prov?.nomComercial || (g as any).categoria || '-',
        formatCurrency(g.totalGasto),
        g.estat || '-',
      ];
    });

  if (rows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text('Cap despesa en el període seleccionat.', 14, yPos + 5);
    return yPos + 15;
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Data', 'Tipus', 'Proveïdor / Categoria', 'Import', 'Estat']],
    body: rows,
    ...baseTableStyles(),
    columnStyles: {
      3: { halign: 'right', textColor: C.red },
    },
  });

  return (doc as any).lastAutoTable.finalY + 12;
}

function addTresoreriaSection(
  doc: jsPDF,
  yPos: number,
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  clients: Client[],
): number {
  yPos = addSectionTitle(doc, 'Tresoreria - Pendent de cobrar i pagar', yPos);

  // Pending collections
  const pendentCobrar = facturesVenda
    .filter(f => (f.pendentCobrar || 0) > 0 && estaEnPeriode(f.dataFactura, periode))
    .sort((a, b) => b.pendentCobrar - a.pendentCobrar);

  if (pendentCobrar.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text('Pendent de cobrar', 14, yPos);
    yPos += 5;

    const rowsCobrar = pendentCobrar.map(f => {
      const client = clients.find(c => c.codi === f.client);
      return [
        f.codi,
        client?.nomComercial || client?.nomFiscal || f.client,
        f.dataFactura,
        formatCurrency(f.totalFactura),
        formatCurrency(f.pendentCobrar),
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Factura', 'Client', 'Data', 'Total', 'Pendent']],
      body: rowsCobrar,
      ...baseTableStyles(),
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right', textColor: C.amber, fontStyle: 'bold' },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // Pending payments
  const pendentPagar = gastos
    .filter(g => (g.pendentPagament || 0) > 0 && estaEnPeriode(getDataEfectivaGasto(g), periode))
    .sort((a, b) => b.pendentPagament - a.pendentPagament);

  if (pendentPagar.length > 0) {
    yPos = ensureSpace(doc, yPos, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text('Pendent de pagar', 14, yPos);
    yPos += 5;

    const rowsPagar = pendentPagar.map(g => [
      g.codi,
      g.tipus === 'factura-compra' ? 'Factura compra' : 'Gasto',
      g.dataGasto,
      formatCurrency(g.totalGasto),
      formatCurrency(g.pendentPagament),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Referència', 'Tipus', 'Data', 'Total', 'Pendent']],
      body: rowsPagar,
      ...baseTableStyles(),
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right', textColor: C.red, fontStyle: 'bold' },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  if (pendentCobrar.length === 0 && pendentPagar.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text('Cap import pendent en el període seleccionat.', 14, yPos + 5);
    yPos += 15;
  }

  return yPos + 4;
}

function addFiscalSection(
  doc: jsPDF,
  yPos: number,
  periode: Periode,
  obligacionsFiscals: ObligacioFiscal[],
): number {
  yPos = addSectionTitle(doc, 'Fiscal i Obligacions', yPos);

  const years = new Set<string>();
  const start = parseInt(periode.dataInici.substring(0, 4));
  const end = parseInt(periode.dataFi.substring(0, 4));
  for (let y = start; y <= end; y++) years.add(String(y));

  const rows = obligacionsFiscals
    .filter(o => years.has(o.periode?.substring(0, 4) ?? ''))
    .sort((a, b) => (a.periode || '').localeCompare(b.periode || ''))
    .map(o => {
      const subtipusLabel: Record<string, string> = {
        'cuota-autonomo': 'Quota autònom (RETA)',
        'regularitzacio-ss': 'Regularització SS',
        'irpf-trimestral': 'IRPF trimestral',
        'irpf-anual': 'IRPF anual (renda)',
      };
      return [
        o.periode || '-',
        subtipusLabel[o.subtipus] || o.subtipus,
        formatCurrency(o.baseImposable || o.totalGasto || 0),
        o.estat || '-',
      ];
    });

  if (rows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text('Cap obligació fiscal registrada per als anys del període.', 14, yPos + 5);
    return yPos + 15;
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Període', 'Concepte', 'Import', 'Estat']],
    body: rows,
    ...baseTableStyles(),
    columnStyles: {
      2: { halign: 'right', textColor: C.red },
    },
  });

  return (doc as any).lastAutoTable.finalY + 12;
}

// ─── Main PDF generator ───────────────────────────────────────────────────────

export const exportToPDF = (
  config: ExportConfig,
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  projectes: Projecte[],
  clients: Client[],
  proveidors: Proveidor[],
  obligacionsFiscals: ObligacioFiscal[],
  parametres: Parametres | null,
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const timestamp = new Date().toLocaleDateString('ca-ES');

  const title =
    config.format === 'pdf-executiu'
      ? 'Informe Executiu de Resultats'
      : 'Informe Complet de Resultats';

  let yPos = addPageHeader(doc, title, periode, timestamp, config, parametres);

  if (config.format === 'pdf-executiu') {
    // Executive: always show P&L summary + top projects
    yPos = addActivitatSection(
      doc, yPos, periode, facturesVenda, gastos, obligacionsFiscals, projectes,
    );

    yPos = ensureSpace(doc, yPos, 40);
    yPos = addProjectesSection(doc, yPos, periode, projectes, facturesVenda, clients);
  } else {
    // Full report: show all selected sections
    const secs = config.sections;

    if (secs.includes('activitat')) {
      yPos = addActivitatSection(
        doc, yPos, periode, facturesVenda, gastos, obligacionsFiscals, projectes,
      );
    }

    if (secs.includes('projectes')) {
      yPos = ensureSpace(doc, yPos, 40);
      yPos = addProjectesSection(doc, yPos, periode, projectes, facturesVenda, clients);
    }

    if (secs.includes('clients')) {
      yPos = ensureSpace(doc, yPos, 40);
      yPos = addClientsSection(doc, yPos, periode, clients, projectes, facturesVenda);
    }

    if (secs.includes('despeses')) {
      yPos = ensureSpace(doc, yPos, 40);
      yPos = addDespesesSection(doc, yPos, periode, gastos, proveidors);
    }

    if (secs.includes('tresoreria')) {
      yPos = ensureSpace(doc, yPos, 40);
      yPos = addTresoreriaSection(doc, yPos, periode, facturesVenda, gastos, clients);
    }

    if (secs.includes('fiscal')) {
      yPos = ensureSpace(doc, yPos, 40);
      yPos = addFiscalSection(doc, yPos, periode, obligacionsFiscals);
    }
  }

  addFooters(doc);

  const date = new Date().toISOString().split('T')[0];
  doc.save(
    config.format === 'pdf-executiu'
      ? `informe-executiu-${date}.pdf`
      : `informe-complet-${date}.pdf`,
  );
};

// ─── CSV export ───────────────────────────────────────────────────────────────

const arrayToCSV = (data: Record<string, unknown>[], headers: string[]): string => {
  const escape = (v: unknown): string => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers.join(','), ...data.map(row => headers.map(h => escape(row[h])).join(','))].join('\n');
};

const downloadCSV = (filename: string, content: string) => {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const exportToCSV = (
  config: ExportConfig,
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  projectes: Projecte[],
  clients: Client[],
  proveidors: Proveidor[],
  obligacionsFiscals: ObligacioFiscal[],
) => {
  const ts = new Date().toISOString().split('T')[0];

  config.sections.forEach(section => {
    switch (section) {
      case 'activitat': {
        const ing = agruparPerMes(
          facturesVenda.filter(f => !['borrador', 'cancelled'].includes(f.estat)),
          'dataFactura', 'baseImposable', periode,
        );
        const obl = agruparPerMes(
          obligacionsFiscals.filter(o => SUBTIPUS_FISCAL.includes(o.subtipus)),
          'dataGasto', 'totalGasto', periode,
        );
        const estr = agruparPerMes(
          gastos
            .filter(g => g.tipus === 'factura-compra' && (g as FacturaCompra).esDepesaGeneral === true)
            .map(g => ({ ...g, dataGasto: getDataEfectivaGasto(g) })),
          'dataGasto', 'baseImposable', periode,
        );
        const rows = ing.map(m => {
          const fiscal = obl.find(x => x.mes === m.mes)?.valor || 0;
          const estructural = estr.find(x => x.mes === m.mes)?.valor || 0;
          const net = m.valor - fiscal - estructural;
          return { Mes: m.mes, Ingressos: m.valor.toFixed(2), ObligFiscals: fiscal.toFixed(2), DespEstructurals: estructural.toFixed(2), ResultatNet: net.toFixed(2) };
        });
        downloadCSV(`activitat-${ts}.csv`, arrayToCSV(rows, ['Mes', 'Ingressos', 'ObligFiscals', 'DespEstructurals', 'ResultatNet']));
        break;
      }
      case 'projectes': {
        const rows = projectes
          .filter(p => {
            const d = p.facturaHistorica?.data || p.dataFinalitzacio || p.dataInici || '';
            return d && estaEnPeriode(d, periode);
          })
          .map(p => {
            const client = clients.find(c => c.codi === p.client);
            const ing = getProjecteIngressos(p, facturesVenda);
            const desp = (p.recursosHumans || []).reduce((s, r) => s + (r.cost || 0), 0) + (p.materials || []).reduce((s, m) => s + (m.preuProveidor || 0) * (m.jornades ?? 1), 0);
            return { Codi: p.codi, Titol: p.titol, Client: client?.nomComercial || '', Estat: p.estat, Ingressos: ing.toFixed(2), Despeses: desp.toFixed(2), Benefici: (ing - desp).toFixed(2), Marge: ing > 0 ? ((ing - desp) / ing * 100).toFixed(1) + '%' : '-' };
          });
        downloadCSV(`projectes-${ts}.csv`, arrayToCSV(rows, ['Codi', 'Titol', 'Client', 'Estat', 'Ingressos', 'Despeses', 'Benefici', 'Marge']));
        break;
      }
      case 'clients': {
        const rows = clients
          .map(c => {
            const facs = facturesVenda.filter(f => f.client === c.codi && estaEnPeriode(f.dataFactura, periode));
            const facturacio = facs.reduce((s, f) => s + (f.baseImposable || 0), 0);
            const pendent = facs.reduce((s, f) => s + (f.pendentCobrar || 0), 0);
            return { Codi: c.codi, Nom: c.nomComercial || c.nomFiscal, Facturacio: facturacio.toFixed(2), Pendent: pendent.toFixed(2) };
          })
          .filter(r => parseFloat(r.Facturacio) > 0);
        downloadCSV(`clients-${ts}.csv`, arrayToCSV(rows, ['Codi', 'Nom', 'Facturacio', 'Pendent']));
        break;
      }
      case 'despeses': {
        const rows = gastos
          .filter(g => estaEnPeriode(getDataEfectivaGasto(g), periode))
          .map(g => ({
            Codi: g.codi,
            Tipus: g.tipus,
            Data: getDataEfectivaGasto(g),
            Total: g.totalGasto.toFixed(2),
            Estat: g.estat,
          }));
        downloadCSV(`despeses-${ts}.csv`, arrayToCSV(rows, ['Codi', 'Tipus', 'Data', 'Total', 'Estat']));
        break;
      }
      case 'tresoreria': {
        const cobrar = facturesVenda
          .filter(f => (f.pendentCobrar || 0) > 0 && estaEnPeriode(f.dataFactura, periode))
          .map(f => ({ Tipus: 'Cobrar', Codi: f.codi, Data: f.dataFactura, Total: f.totalFactura.toFixed(2), Pendent: f.pendentCobrar.toFixed(2) }));
        const pagar = gastos
          .filter(g => (g.pendentPagament || 0) > 0 && estaEnPeriode(getDataEfectivaGasto(g), periode))
          .map(g => ({ Tipus: 'Pagar', Codi: g.codi, Data: getDataEfectivaGasto(g), Total: g.totalGasto.toFixed(2), Pendent: g.pendentPagament.toFixed(2) }));
        downloadCSV(`tresoreria-${ts}.csv`, arrayToCSV([...cobrar, ...pagar], ['Tipus', 'Codi', 'Data', 'Total', 'Pendent']));
        break;
      }
      case 'fiscal': {
        const rows = obligacionsFiscals.map(o => ({
          Periode: o.periode,
          Subtipus: o.subtipus,
          Import: (o.baseImposable || o.totalGasto || 0).toFixed(2),
          Estat: o.estat,
        }));
        downloadCSV(`fiscal-${ts}.csv`, arrayToCSV(rows, ['Periode', 'Subtipus', 'Import', 'Estat']));
        break;
      }
    }
  });
};

// ─── Excel export ─────────────────────────────────────────────────────────────

export const exportToExcel = (
  config: ExportConfig,
  periode: Periode,
  facturesVenda: FacturaVenta[],
  gastos: Gasto[],
  projectes: Projecte[],
  clients: Client[],
  proveidors: Proveidor[],
  obligacionsFiscals: ObligacioFiscal[],
) => {
  const wb = XLSX.utils.book_new();

  config.sections.forEach(section => {
    let ws: XLSX.WorkSheet | undefined;
    let name: string;

    switch (section) {
      case 'activitat': {
        const ing = agruparPerMes(
          facturesVenda.filter(f => !['borrador', 'cancelled'].includes(f.estat)),
          'dataFactura', 'baseImposable', periode,
        );
        const obl = agruparPerMes(
          obligacionsFiscals.filter(o => SUBTIPUS_FISCAL.includes(o.subtipus)),
          'dataGasto', 'totalGasto', periode,
        );
        const estr = agruparPerMes(
          gastos
            .filter(g => g.tipus === 'factura-compra' && (g as FacturaCompra).esDepesaGeneral === true)
            .map(g => ({ ...g, dataGasto: getDataEfectivaGasto(g) })),
          'dataGasto', 'baseImposable', periode,
        );
        ws = XLSX.utils.aoa_to_sheet([
          ['Mes', 'Ingressos', 'Oblig. Fiscals', 'Desp. Estructurals', 'Resultat Net'],
          ...ing.map(m => {
            const fiscal = obl.find(x => x.mes === m.mes)?.valor || 0;
            const estructural = estr.find(x => x.mes === m.mes)?.valor || 0;
            return [m.mes, m.valor, fiscal, estructural, m.valor - fiscal - estructural];
          }),
        ]);
        name = 'Activitat';
        break;
      }
      case 'projectes': {
        ws = XLSX.utils.aoa_to_sheet([
          ['Codi', 'Títol', 'Client', 'Estat', 'Ingressos', 'Despeses', 'Benefici', 'Marge %'],
          ...projectes
            .filter(p => {
              const d = p.facturaHistorica?.data || p.dataFinalitzacio || p.dataInici || '';
              return d && estaEnPeriode(d, periode);
            })
            .map(p => {
              const client = clients.find(c => c.codi === p.client);
              const ing = getProjecteIngressos(p, facturesVenda);
              const desp = (p.recursosHumans || []).reduce((s, r) => s + (r.cost || 0), 0) + (p.materials || []).reduce((s, m) => s + (m.preuProveidor || 0) * (m.jornades ?? 1), 0);
              const marge = ing > 0 ? ((ing - desp) / ing * 100) : 0;
              return [p.codi, p.titol, client?.nomComercial || '', p.estat, ing, desp, ing - desp, marge];
            }),
        ]);
        name = 'Projectes';
        break;
      }
      case 'clients': {
        ws = XLSX.utils.aoa_to_sheet([
          ['Codi', 'Nom', 'Facturació (base)', 'Pendent cobrar'],
          ...clients
            .map(c => {
              const facs = facturesVenda.filter(f => f.client === c.codi && estaEnPeriode(f.dataFactura, periode));
              return [c.codi, c.nomComercial || c.nomFiscal, facs.reduce((s, f) => s + (f.baseImposable || 0), 0), facs.reduce((s, f) => s + (f.pendentCobrar || 0), 0)];
            })
            .filter(r => (r[2] as number) > 0),
        ]);
        name = 'Clients';
        break;
      }
      case 'despeses': {
        ws = XLSX.utils.aoa_to_sheet([
          ['Codi', 'Tipus', 'Data', 'Total', 'Estat'],
          ...gastos
            .filter(g => estaEnPeriode(getDataEfectivaGasto(g), periode))
            .map(g => [g.codi, g.tipus, getDataEfectivaGasto(g), g.totalGasto, g.estat]),
        ]);
        name = 'Despeses';
        break;
      }
      case 'tresoreria': {
        const cobrar = facturesVenda
          .filter(f => (f.pendentCobrar || 0) > 0 && estaEnPeriode(f.dataFactura, periode))
          .map(f => ['Cobrar', f.codi, f.dataFactura, f.totalFactura, f.pendentCobrar]);
        const pagar = gastos
          .filter(g => (g.pendentPagament || 0) > 0 && estaEnPeriode(getDataEfectivaGasto(g), periode))
          .map(g => ['Pagar', g.codi, getDataEfectivaGasto(g), g.totalGasto, g.pendentPagament]);
        ws = XLSX.utils.aoa_to_sheet([
          ['Tipus', 'Codi', 'Data', 'Total', 'Pendent'],
          ...cobrar, ...pagar,
        ]);
        name = 'Tresoreria';
        break;
      }
      case 'fiscal': {
        ws = XLSX.utils.aoa_to_sheet([
          ['Període', 'Subtipus', 'Import', 'Estat'],
          ...obligacionsFiscals.map(o => [o.periode, o.subtipus, o.baseImposable || o.totalGasto || 0, o.estat]),
        ]);
        name = 'Fiscal';
        break;
      }
      default:
        return;
    }

    if (ws) XLSX.utils.book_append_sheet(wb, ws, name!);
  });

  if (wb.SheetNames.length === 0) return;

  XLSX.writeFile(wb, `informe-resultats-${new Date().toISOString().split('T')[0]}.xlsx`);
};
