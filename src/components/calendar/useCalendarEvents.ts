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
  color: string;
  estat?: string;
  projecteCodi?: string;
}

interface UseCalendarEventsProps {
  projectes: Projecte[];
  facturesVenda: FacturaVenta[];
  gastos: Gasto[];
  pressupostos: Pressupost[];
  clients: Client[];
  proveidors: Proveidor[];
  esdevenimentsPersonalitzats: any[];
}

export function useCalendarEvents({
  projectes,
  facturesVenda,
  gastos,
  pressupostos,
  clients,
  proveidors,
  esdevenimentsPersonalitzats
}: UseCalendarEventsProps) {
  
  return useMemo(() => {
    const events: CalendarEvent[] = [];

    // PROJECTES - Inicio
    projectes.forEach(p => {
      if (p.dataInici) {
        const client = clients.find(c => c.codi === p.client);
        events.push({
          id: `proj-inici-${p.codi}`,
          tipus: 'projecte-inici',
          tipusDescriptiu: '🎬 Inici de rodatge',
          titol: p.titol,
          subtitol: client?.nomComercial || client?.nomFiscal,
          data: p.dataInici,
          color: '#3b82f6',
          estat: p.estat
        });
      }
    });

    // PROJECTES - Entrega
    projectes.forEach(p => {
      if (p.dataEntrega) {
        const client = clients.find(c => c.codi === p.client);
        events.push({
          id: `proj-entrega-${p.codi}`,
          tipus: 'projecte-entrega',
          tipusDescriptiu: '📦 Entrega de projecte',
          titol: p.titol,
          subtitol: client?.nomComercial || client?.nomFiscal,
          data: p.dataEntrega,
          color: p.estat === 'completat' ? '#10b981' : '#f59e0b',
          estat: p.estat
        });
      }
    });

    // FACTURES VENDA
    facturesVenda.forEach(f => {
      const client = clients.find(c => c.codi === f.client);
      events.push({
        id: `fac-venda-${f.codi}`,
        tipus: 'factura-venda',
        tipusDescriptiu: '💰 Factura emesa',
        titol: f.codi,
        subtitol: client?.nomComercial || client?.nomFiscal,
        data: f.dataFactura,
        color: f.estat === 'pagada' ? '#10b981' : '#3b82f6',
        estat: f.estat
      });
      
      if (f.estat !== 'pagada' && f.dataVenciment) {
        events.push({
          id: `fac-venda-venc-${f.codi}`,
          tipus: 'factura-venda-venciment',
          tipusDescriptiu: '⏰ Venciment factura venda',
          titol: f.codi,
          subtitol: client?.nomComercial || client?.nomFiscal,
          data: f.dataVenciment,
          color: f.estat === 'vencuda' ? '#dc2626' : '#f59e0b',
          estat: f.estat
        });
      }
    });

    // FACTURES COMPRA
    gastos.forEach(g => {
      if (g.tipus === 'factura-compra') {
        const prov = proveidors.find(p => p.codi === g.proveidor);
        events.push({
          id: `gasto-${g.codi}`,
          tipus: 'factura-compra',
          tipusDescriptiu: '💸 Factura rebuda',
          titol: g.codi,
          subtitol: prov?.nomComercial,
          data: g.dataGasto,
          color: g.estat === 'pagada' ? '#10b981' : '#ef4444',
          estat: g.estat
        });
        
        if (g.estat !== 'pagada' && g.dataVenciment) {
          events.push({
            id: `gasto-venc-${g.codi}`,
            tipus: 'factura-compra-venciment',
            tipusDescriptiu: '⚠️ Venciment factura compra',
            titol: g.codi,
            subtitol: prov?.nomComercial,
            data: g.dataVenciment,
            color: g.estat === 'vencuda' ? '#dc2626' : '#f59e0b',
            estat: g.estat
          });
        }
      }
    });

    // PRESSUPOSTOS
    pressupostos.forEach(p => {
      const client = clients.find(c => c.codi === p.client);
      events.push({
        id: `pres-${p.codi}`,
        tipus: 'pressupost',
        tipusDescriptiu: '📋 Pressupost creat',
        titol: p.codi,
        subtitol: client?.nomComercial || client?.nomFiscal,
        data: p.dataCreacio,
        color: p.estat === 'acceptat' ? '#10b981' : p.estat === 'rebutjat' ? '#dc2626' : '#6366f1',
        estat: p.estat
      });
    });

    // ESDEVENIMENTS PERSONALITZATS
    esdevenimentsPersonalitzats.forEach(e => {
      let subtitol = e.descripcio;
      if (e.projecte) {
        const projecte = projectes.find(p => p.codi === e.projecte);
        if (projecte) {
          subtitol = `📁 ${projecte.titol}${e.descripcio ? ' • ' + e.descripcio : ''}`;
        }
      }
      
      events.push({
        id: `custom-${e.id}`,
        tipus: 'esdeveniment-personalitzat',
        tipusDescriptiu: '📌 Esdeveniment personalitzat',
        titol: e.titol,
        subtitol: subtitol,
        data: e.data,
        color: e.color || '#ec4899',
        projecteCodi: e.projecte
      });
    });

    return events;
  }, [projectes, facturesVenda, gastos, pressupostos, clients, proveidors, esdevenimentsPersonalitzats]);
}