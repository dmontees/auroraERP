import React from 'react';
import type { FacturaVenta, PagamentClient, AccioFactura, EstatFacturaVenta } from '../../../types/facturaVenta';
import CobrosManager from '../shared/CobrosManager';

interface Props {
  formData: FacturaVenta;
  setFormData: (data: FacturaVenta) => void;
  totals: {
    totalFactura: number;
    pendentCobrar: number;
  };
}

export default function PagamentTab({
  formData,
  setFormData,
  totals
}: Props) {

  const calcularNouEstat = (nouTotalPagat: number): EstatFacturaVenta => {
    if (totals.totalFactura <= 0) return formData.estat;
    const pendent = totals.totalFactura - nouTotalPagat;
    if (pendent <= 0.01) return 'pagada';
    if (nouTotalPagat > 0) return 'pagada-parcial';
    // All payments removed: revert from payment states to enviada
    if (formData.estat === 'pagada' || formData.estat === 'pagada-parcial') return 'enviada';
    return formData.estat;
  };

  const handleAfegirPagament = (nouPagament: Omit<PagamentClient, 'codi'>) => {
    const pagament: PagamentClient = {
      codi: `PAG-${String(formData.pagaments.length + 1).padStart(5, '0')}`,
      ...nouPagament
    };

    const novaAccioAuto: AccioFactura = {
      data: nouPagament.data,
      descripcio: `Pagament rebut: ${nouPagament.import.toFixed(2)}€`,
      automatic: true
    };

    const nouTotalPagat = formData.totalPagat + nouPagament.import;
    const nouEstat = calcularNouEstat(nouTotalPagat);

    setFormData({
      ...formData,
      pagaments: [...formData.pagaments, pagament],
      totalPagat: nouTotalPagat,
      estat: nouEstat,
      accions: [...formData.accions, novaAccioAuto]
    });
  };

  const handleEliminarPagament = (codiPagament: string) => {
    const pagament = formData.pagaments.find(p => p.codi === codiPagament);
    if (!pagament) return;

    if (!confirm('Estàs segur que vols eliminar aquest pagament?')) return;

    const nouTotalPagat = Math.max(0, formData.totalPagat - pagament.import);
    const nouEstat = calcularNouEstat(nouTotalPagat);

    setFormData({
      ...formData,
      pagaments: formData.pagaments.filter(p => p.codi !== codiPagament),
      totalPagat: nouTotalPagat,
      estat: nouEstat
    });
  };

  return (
    <CobrosManager
      pagaments={formData.pagaments}
      totalFactura={totals.totalFactura}
      pendentCobrar={totals.pendentCobrar}
      onAfegirPagament={handleAfegirPagament}
      onEliminarPagament={handleEliminarPagament}
      codiFactura={formData.codi}
    />
  );
}