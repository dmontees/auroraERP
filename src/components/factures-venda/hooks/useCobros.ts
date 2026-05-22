import { useState } from 'react';
import type { PagamentClient } from '../../../types/facturaVenta';

export function useCobros(initialPagaments: PagamentClient[] = []) {
  const [pagaments, setPagaments] = useState<PagamentClient[]>(initialPagaments);

  const afegirPagament = (nouPagament: Omit<PagamentClient, 'codi'>) => {
    const pagament: PagamentClient = {
      codi: `PAG-${String(pagaments.length + 1).padStart(5, '0')}`,
      ...nouPagament
    };

    setPagaments([...pagaments, pagament]);
    return pagament;
  };

  const eliminarPagament = (codiPagament: string) => {
    setPagaments(pagaments.filter(p => p.codi !== codiPagament));
    
    const pagament = pagaments.find(p => p.codi === codiPagament);
    return pagament?.import || 0;
  };

  const totalCobrat = pagaments.reduce((sum, p) => sum + p.import, 0);

  return {
    pagaments,
    setPagaments,
    afegirPagament,
    eliminarPagament,
    totalCobrat
  };
}