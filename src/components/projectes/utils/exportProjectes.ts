import * as XLSX from 'xlsx';
import type { Projecte } from '../../../types/projecte';
import type { Client } from '../../../types/client';
import type { Parametres } from '../../../types/parametres';

export function exportarProjectesExcel(
  projectes: Projecte[],
  clients: Client[],
  parametres: Parametres | null
) {
  const workbook = XLSX.utils.book_new();

  const clientNom = (codi: string) => {
    const c = clients.find(x => x.codi === codi);
    return c?.nomComercial || c?.nomFiscal || codi;
  };
  const modalitatNom = (codi: string) =>
    parametres?.modalitats?.find(m => m.codi === codi)?.nom || codi;
  const tipusNom = (codi: string) =>
    parametres?.tipusProduccio?.find(t => t.codi === codi)?.nom || codi;

  const estatLabels: Record<string, string> = {
    esborrany: 'Esborrany',
    planificat: 'Planificat',
    rodatge: 'Rodatge',
    edicio: 'Edició',
    esperant_feedback: 'Esperant Feedback',
    revisio: 'Revisió',
    acabat: 'Acabat',
    facturat: 'Facturat',
  };

  // ── Full 1: Resum de projectes ──────────────────────────────────────────────
  const resums = projectes.map(p => {
    const gastos =
      p.recursosHumans.reduce((s, r) => s + r.cost, 0) +
      p.materials.reduce((s, m) => s + m.preuProveidor, 0);
    const ingressos = p.tasques.reduce((s, t) => s + t.importe, 0);
    const benefici = ingressos - gastos;
    const marge = ingressos > 0 ? ((benefici / ingressos) * 100).toFixed(2) + '%' : '-';

    return {
      'Codi': p.codi,
      'Títol': p.titol,
      'Client': clientNom(p.client),
      'Estat': estatLabels[p.estat] || p.estat,
      'Modalitat': modalitatNom(p.modalitat),
      'Tipus Producció': tipusNom(p.servei),
      'Directe': p.esDirect ? 'Sí' : 'No',
      'Pressupost vinculat': p.pressupost || '',
      'Factura vinculada': p.facturaAssociada || '',
      'Dates Rodatge': (p.datesRodatge || []).map(d => d.data + (d.hora ? ' ' + d.hora : '')).join(', '),
      'Dates Entrega': (p.datesEntrega || []).map(d => d.data).join(', '),
      'Data Finalització': p.dataFinalitzacio || '',
      'Descripció': p.descripcio,
      'Instruccions Client': p.instruccionsClient,
      'Instruccions Proveïdors': p.instruccionsProveidors,
      'Ingressos (€)': +ingressos.toFixed(2),
      'Despeses (€)': +gastos.toFixed(2),
      'Benefici (€)': +benefici.toFixed(2),
      'Marge': marge,
      'Facturat': p.facturat ? 'Sí' : 'No',
      'Arxivat': p.arxivat ? 'Sí' : 'No',
      'Importat': p.esImportat ? 'Sí' : 'No',
    };
  });

  const wsResum = XLSX.utils.json_to_sheet(resums);
  wsResum['!cols'] = [
    { wch: 12 }, { wch: 35 }, { wch: 25 }, { wch: 18 }, { wch: 16 }, { wch: 20 },
    { wch: 9 }, { wch: 16 }, { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 14 },
    { wch: 40 }, { wch: 40 }, { wch: 40 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 9 }, { wch: 9 }, { wch: 9 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsResum, 'Projectes');

  // ── Full 2: Dates de rodatge ────────────────────────────────────────────────
  const datesRodatge = projectes.flatMap(p =>
    (p.datesRodatge || []).map(d => ({
      'Codi Projecte': p.codi,
      'Títol Projecte': p.titol,
      'Client': clientNom(p.client),
      'Data': d.data,
      'Hora': d.hora || '',
      'Nota': d.nota || '',
    }))
  );
  if (datesRodatge.length > 0) {
    const ws = XLSX.utils.json_to_sheet(datesRodatge);
    ws['!cols'] = [{ wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 12 }, { wch: 8 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, ws, 'Dates Rodatge');
  }

  // ── Full 3: Dates d'entrega ─────────────────────────────────────────────────
  const datesEntrega = projectes.flatMap(p =>
    (p.datesEntrega || []).map(d => ({
      'Codi Projecte': p.codi,
      'Títol Projecte': p.titol,
      'Client': clientNom(p.client),
      'Data': d.data,
      'Nota': d.nota || '',
    }))
  );
  if (datesEntrega.length > 0) {
    const ws = XLSX.utils.json_to_sheet(datesEntrega);
    ws['!cols'] = [{ wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 12 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, ws, 'Dates Entrega');
  }

  // ── Full 4: Tasques (ingressos) ─────────────────────────────────────────────
  const tasques = projectes.flatMap(p =>
    p.tasques.map(t => ({
      'Codi Projecte': p.codi,
      'Títol Projecte': p.titol,
      'Client': clientNom(p.client),
      'Categoria': t.categoria,
      'Servei': t.servei,
      'Descripció': t.descripcio,
      'Quantitat': t.quantitat,
      'Unitat': t.unitat,
      'Tarifa (€)': t.tarifa,
      'Import (€)': +t.importe.toFixed(2),
    }))
  );
  if (tasques.length > 0) {
    const ws = XLSX.utils.json_to_sheet(tasques);
    ws['!cols'] = [
      { wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 18 }, { wch: 20 },
      { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, ws, 'Tasques');
  }

  // ── Full 5: Recursos Humans (despeses) ──────────────────────────────────────
  const recursos = projectes.flatMap(p =>
    p.recursosHumans.map(r => ({
      'Codi Projecte': p.codi,
      'Títol Projecte': p.titol,
      'Client': clientNom(p.client),
      'Categoria': r.categoria,
      'Servei': r.servei,
      'Proveïdor': r.proveidor || '',
      'Quantitat': r.quantitat,
      'Unitat': r.unitat,
      'Preu unitari (€)': r.preu,
      'Cost total (€)': +r.cost.toFixed(2),
    }))
  );
  if (recursos.length > 0) {
    const ws = XLSX.utils.json_to_sheet(recursos);
    ws['!cols'] = [
      { wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 18 }, { wch: 20 },
      { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, ws, 'Recursos Humans');
  }

  // ── Full 6: Materials (despeses) ────────────────────────────────────────────
  const materials = projectes.flatMap(p =>
    p.materials.map(m => ({
      'Codi Projecte': p.codi,
      'Títol Projecte': p.titol,
      'Client': clientNom(p.client),
      'Grup': m.grup,
      'Material': m.material,
      'Proveïdor': m.proveidor || '',
      'Cost Proveïdor (€)': +m.preuProveidor.toFixed(2),
      'Preu Platea (€)': +m.preuPlatea.toFixed(2),
    }))
  );
  if (materials.length > 0) {
    const ws = XLSX.utils.json_to_sheet(materials);
    ws['!cols'] = [
      { wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 18 }, { wch: 30 },
      { wch: 20 }, { wch: 18 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, ws, 'Materials');
  }

  const fileName = `projectes-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
