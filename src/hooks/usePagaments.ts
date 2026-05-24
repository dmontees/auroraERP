import { useState } from 'react';
import type { Pagament } from '../types/facturaCompra';

export function usePagaments(initialPagaments: Pagament[] = []) {
  const [pagaments, setPagaments] = useState<Pagament[]>(initialPagaments);

  const afegirPagament = (nouPagament: Omit<Pagament, 'codi'>) => {
    const pagament: Pagament = {
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

  const totalPagat = pagaments.reduce((sum, p) => sum + p.import, 0);

  return {
    pagaments,
    setPagaments,
    afegirPagament,
    eliminarPagament,
    totalPagat
  };
}
