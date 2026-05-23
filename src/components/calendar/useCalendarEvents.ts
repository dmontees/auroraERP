import { useMemo } from 'react';
import type { Projecte } from '../../types/projecte';
import type { FacturaVenta } from '../../types/facturaVenda';
import type { Gasto } from '../../types/facturaCompra';
import type { Pressupost } from '../../types/pressupost';
import type { Client } from '../../types/client';
import type { Proveidor } from '../../types/proveidor';

export interface CalendarEvent {
  id: string;
  tipus: 'projecte-inici' | 'projecte-entrega' | 'factura-venda' | 'factura-venda-venciment' |
         'factura-compra' | 'factura-compra-venciment' | 'pressupost' | 'esdeveniment-personalitzat';
  tipusDescriptiu: string;
  titol: string;
  subtitol?: string;
  data: string;
  dataFi?: string;
  color: string;
  estat?: string;
  projecteCodi?: string;
  horaInici?: string;
  horaFi?: string;
  ubicacio?: string;
  enllac?: string;
  categoriaId?: string;
  customEventId?: string;
  // Rang de dates
  rangeId?: string;
  isRangeStart?: boolean;
  isRangeMiddle?: boolean;
  isRangeEnd?: boolean;
}

interface ConfigCalendariEntry {
  actiu: boolean;
  color: string;
}

interface ConfigCalendari {
  rodatge: ConfigCalendariEntry;
  entrega: ConfigCalendariEntry;
  facturesVenda: ConfigCalendariEntry;
  facturesCompra: ConfigCalendariEntry;
  pressupostos: ConfigCalendariEntry;
}

type ExtresAuto = Record<string, { ubicacio?: string; horaInici?: string; horaFi?: string; enllac?: string }>;

interface UseCalendarEventsProps {
  projectes: Projecte[];
  facturesVenda: FacturaVenta[];
  gastos: Gasto[];
  pressupostos: Pressupost[];
  clients: Client[];
  proveidors: Proveidor[];
  esdevenimentsPersonalitzats: any[];
  configCalendari?: ConfigCalendari;
  categoriesCalendari?: { id: string; nom: string; color: string }[];
  extresEsdevenimentsAuto?: ExtresAuto;
}

export function useCalendarEvents({
  projectes,
  facturesVenda,
  gastos,
  pressupostos,
  clients,
  proveidors,
  esdevenimentsPersonalitzats,
  configCalendari,
  categoriesCalendari,
  extresEsdevenimentsAuto
}: UseCalendarEventsProps) {

  return useMemo(() => {
    const events: CalendarEvent[] = [];

    const applyExtras = (event: CalendarEvent): CalendarEvent => {
      const extras = extresEsdevenimentsAuto?.[event.id];
      if (!extras) return event;
      return {
        ...event,
        ubicacio: extras.ubicacio || event.ubicacio,
        horaInici: extras.horaInici || event.horaInici,
        horaFi: extras.horaFi || event.horaFi,
        enllac: extras.enllac || event.enllac,
      };
    };

    const rodatgeColor = configCalendari?.rodatge?.color ?? '#ef4444';
    const entregaColor = configCalendari?.entrega?.color ?? '#f59e0b';
    const facturesVendaColor = configCalendari?.facturesVenda?.color ?? '#3b82f6';
    const facturesCompraColor = configCalendari?.facturesCompra?.color ?? '#ef4444';
    const pressupostosColor = configCalendari?.pressupostos?.color ?? '#6366f1';

    const rodatgeActiu = configCalendari?.rodatge?.actiu ?? true;
    const entregaActiu = configCalendari?.entrega?.actiu ?? true;
    const facturesVendaActiu = configCalendari?.facturesVenda?.actiu ?? false;
    const facturesCompraActiu = configCalendari?.facturesCompra?.actiu ?? false;
    const pressupostosActiu = configCalendari?.pressupostos?.actiu ?? false;

    // PROJECTES - Dates de rodatge
    if (rodatgeActiu) {
      projectes.forEach(p => {
        const client = clients.find(c => c.codi === p.client);
        const clientNom = client?.nomComercial || client?.nomFiscal;

        if (p.datesRodatge && p.datesRodatge.length > 0) {
          p.datesRodatge.forEach((d: any, i: number) => {
            if (!d.data) return;
            const eventId = `proj-inici-${p.codi}-${i}`;
            events.push(applyExtras({
              id: eventId,
              tipus: 'projecte-inici',
              tipusDescriptiu: '🎬 Rodatge',
              titol: p.titol,
              subtitol: d.nota ? `${clientNom} • ${d.nota}` : clientNom,
              data: d.data,
              color: rodatgeColor,
              estat: p.estat
            }));
          });
        } else if (p.dataInici) {
          const eventId = `proj-inici-${p.codi}`;
          events.push(applyExtras({
            id: eventId,
            tipus: 'projecte-inici',
            tipusDescriptiu: '🎬 Rodatge',
            titol: p.titol,
            subtitol: clientNom,
            data: p.dataInici,
            color: rodatgeColor,
            estat: p.estat
          }));
        }
      });
    }

    // PROJECTES - Dates d'entrega
    if (entregaActiu) {
      projectes.forEach(p => {
        const client = clients.find(c => c.codi === p.client);
        const clientNom = client?.nomComercial || client?.nomFiscal;

        if (p.datesEntrega && p.datesEntrega.length > 0) {
          p.datesEntrega.forEach((d: any, i: number) => {
            if (!d.data) return;
            const eventId = `proj-entrega-${p.codi}-${i}`;
            events.push(applyExtras({
              id: eventId,
              tipus: 'projecte-entrega',
              tipusDescriptiu: '📦 Entrega de projecte',
              titol: p.titol,
              subtitol: d.nota ? `${clientNom} • ${d.nota}` : clientNom,
              data: d.data,
              color: entregaColor,
              estat: p.estat
            }));
          });
        } else if (p.dataEntrega) {
          const eventId = `proj-entrega-${p.codi}`;
          events.push(applyExtras({
            id: eventId,
            tipus: 'projecte-entrega',
            tipusDescriptiu: '📦 Entrega de projecte',
            titol: p.titol,
            subtitol: clientNom,
            data: p.dataEntrega,
            color: entregaColor,
            estat: p.estat
          }));
        }
      });
    }

    // FACTURES VENDA
    if (facturesVendaActiu) {
      facturesVenda.forEach(f => {
        const client = clients.find(c => c.codi === f.client);
        const eventId = `fac-venda-${f.codi}`;
        events.push(applyExtras({
          id: eventId,
          tipus: 'factura-venda',
          tipusDescriptiu: '💰 Factura emesa',
          titol: f.codi,
          subtitol: client?.nomComercial || client?.nomFiscal,
          data: f.dataFactura,
          color: f.estat === 'pagada' ? '#10b981' : facturesVendaColor,
          estat: f.estat
        }));

        if (f.estat !== 'pagada' && f.dataVenciment) {
          const vencId = `fac-venda-venc-${f.codi}`;
          events.push(applyExtras({
            id: vencId,
            tipus: 'factura-venda-venciment',
            tipusDescriptiu: '⏰ Venciment factura venda',
            titol: f.codi,
            subtitol: client?.nomComercial || client?.nomFiscal,
            data: f.dataVenciment,
            color: f.estat === 'vencuda' ? '#dc2626' : '#f59e0b',
            estat: f.estat
          }));
        }
      });
    }

    // FACTURES COMPRA
    if (facturesCompraActiu) {
      gastos.forEach(g => {
        if (g.tipus === 'factura-compra') {
          const prov = proveidors.find(p => p.codi === g.proveidor);
          const eventId = `gasto-${g.codi}`;
          events.push(applyExtras({
            id: eventId,
            tipus: 'factura-compra',
            tipusDescriptiu: '💸 Factura rebuda',
            titol: g.codi,
            subtitol: prov?.nomComercial,
            data: g.dataGasto,
            color: g.estat === 'pagada' ? '#10b981' : facturesCompraColor,
            estat: g.estat
          }));

          if (g.estat !== 'pagada' && g.dataVenciment) {
            const vencId = `gasto-venc-${g.codi}`;
            events.push(applyExtras({
              id: vencId,
              tipus: 'factura-compra-venciment',
              tipusDescriptiu: '⚠️ Venciment factura compra',
              titol: g.codi,
              subtitol: prov?.nomComercial,
              data: g.dataVenciment,
              color: g.estat === 'vencuda' ? '#dc2626' : '#f59e0b',
              estat: g.estat
            }));
          }
        }
      });
    }

    // PRESSUPOSTOS
    if (pressupostosActiu) {
      pressupostos.forEach(p => {
        const client = clients.find(c => c.codi === p.client);
        const eventId = `pres-${p.codi}`;
        events.push(applyExtras({
          id: eventId,
          tipus: 'pressupost',
          tipusDescriptiu: '📋 Pressupost creat',
          titol: p.codi,
          subtitol: client?.nomComercial || client?.nomFiscal,
          data: p.dataCreacio,
          color: p.estat === 'acceptat' ? '#10b981' : p.estat === 'rebutjat' ? '#dc2626' : pressupostosColor,
          estat: p.estat
        }));
      });
    }

    // ESDEVENIMENTS PERSONALITZATS
    const nextDateStr = (d: string): string => {
      const [y, m, day] = d.split('-').map(Number);
      const dt = new Date(y, m - 1, day + 1);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    esdevenimentsPersonalitzats.forEach(e => {
      let subtitol = e.descripcio;
      if (e.projecte) {
        const projecte = projectes.find(p => p.codi === e.projecte);
        if (projecte) {
          subtitol = `📁 ${projecte.titol}${e.descripcio ? ' • ' + e.descripcio : ''}`;
        }
      }

      let color = e.color || '#ec4899';
      let tipusDescriptiu = '📌 Esdeveniment personalitzat';
      if (e.categoriaId && categoriesCalendari) {
        const cat = categoriesCalendari.find((c: { id: string; nom: string; color: string }) => c.id === e.categoriaId);
        if (cat) {
          color = cat.color;
          tipusDescriptiu = cat.nom;
        }
      }

      const base = {
        tipus: 'esdeveniment-personalitzat' as const,
        tipusDescriptiu,
        titol: e.titol,
        subtitol,
        color,
        projecteCodi: e.projecte,
        horaInici: e.horaInici,
        horaFi: e.horaFi,
        ubicacio: e.ubicacio,
        enllac: e.enllac,
        categoriaId: e.categoriaId,
        customEventId: e.id,
      };

      if (e.dataFi && e.dataFi > e.data) {
        // Rang de dates: genera un event per cada dia
        let current = e.data;
        let i = 0;
        while (current <= e.dataFi) {
          const isStart = i === 0;
          const isEnd = current === e.dataFi;
          events.push({
            ...base,
            id: `custom-${e.id}-${current}`,
            data: current,
            dataFi: e.dataFi,
            rangeId: e.id,
            isRangeStart: isStart,
            isRangeMiddle: !isStart && !isEnd,
            isRangeEnd: isEnd,
          });
          current = nextDateStr(current);
          i++;
        }
      } else {
        events.push({ ...base, id: `custom-${e.id}`, data: e.data });
      }
    });

    return events;
  }, [
    projectes,
    facturesVenda,
    gastos,
    pressupostos,
    clients,
    proveidors,
    esdevenimentsPersonalitzats,
    configCalendari,
    categoriesCalendari,
    extresEsdevenimentsAuto
  ]);
}
