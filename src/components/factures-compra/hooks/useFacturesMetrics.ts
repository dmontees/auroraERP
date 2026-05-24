import { useMemo } from 'react';
import type { Gasto } from '../../../types/facturaCompra';

export function useFacturesMetrics(gastos: Gasto[]) {
  return useMemo(() => {
    const avui = new Date();
    const mesActual = `${avui.getFullYear()}-${String(avui.getMonth() + 1).padStart(2, '0')}`;
    
    let totalPendent = 0;
    let numVencudes = 0;
    let importVencudes = 0;
    let pagatMes = 0;

    gastos.forEach(gasto => {
      const pendent = Math.round(gasto.pendentPagament * 100) / 100;
      if (pendent > 0) {
        totalPendent += pendent;
      }

      if (gasto.estat === 'vencuda') {
        numVencudes++;
        importVencudes += pendent;
      }

      gasto.pagaments.forEach(pag => {
        if (pag.data.startsWith(mesActual)) {
          pagatMes += pag.import;
        }
      });
    });

    return { totalPendent, numVencudes, importVencudes, pagatMes };
  }, [gastos]);
}