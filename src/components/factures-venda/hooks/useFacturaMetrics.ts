import { useMemo } from 'react';
import type { FacturaVenta } from '../../../types/facturaVenta';

export function useFacturaMetrics(factures: FacturaVenta[]) {
  return useMemo(() => {
    const avui = new Date();
    const primerDiaMes = new Date(avui.getFullYear(), avui.getMonth(), 1);
    
    // Pendent de cobrar
    const facturesPendents = factures.filter(f => 
      ['enviada', 'pagada-parcial', 'vencuda'].includes(f.estat)
    );
    const totalPendent = facturesPendents.reduce((sum, f) => sum + f.pendentCobrar, 0);
    const numFacturesPendents = facturesPendents.length;

    // Vençudes
    const facturesVencudes = factures.filter(f => f.estat === 'vencuda');
    const totalVencudes = facturesVencudes.reduce((sum, f) => sum + f.pendentCobrar, 0);
    const numFacturesVencudes = facturesVencudes.length;

    // Enviades (sin vencidas)
    const facturesEnviades = factures.filter(f => 
      f.estat === 'enviada' || f.estat === 'pagada-parcial'
    );
    const totalEnviades = facturesEnviades.reduce((sum, f) => sum + f.pendentCobrar, 0);
    const numFacturesEnviades = facturesEnviades.length;

    // Cobrat aquest mes
    const pagamentsAquestMes = factures.flatMap(f => 
      f.pagaments.filter(p => new Date(p.data) >= primerDiaMes)
    );
    const totalCobratAquestMes = pagamentsAquestMes.reduce((sum, p) => sum + p.import, 0);
    
    const facturesCobrades = new Set(
      factures
        .filter(f => f.pagaments.some(p => new Date(p.data) >= primerDiaMes))
        .map(f => f.codi)
    );
    const numFacturesCobrades = facturesCobrades.size;

    return {
      totalPendent,
      numFacturesPendents,
      totalVencudes,
      numFacturesVencudes,
      totalEnviades,
      numFacturesEnviades,
      totalCobratAquestMes,
      numFacturesCobrades
    };
  }, [factures]);
}