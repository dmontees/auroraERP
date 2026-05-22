import React from 'react';
import type { FacturaVenta, PagamentClient, AccioFactura } from '../../../types/facturaVenta';
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

    // Calcular nuevo total pagado
    const nouTotalPagat = formData.totalPagat + nouPagament.import;

    setFormData({
      ...formData,
      pagaments: [...formData.pagaments, pagament],
      totalPagat: nouTotalPagat,
      accions: [...formData.accions, novaAccioAuto]
    });
  };

  const handleEliminarPagament = (codiPagament: string) => {
    const pagament = formData.pagaments.find(p => p.codi === codiPagament);
    if (!pagament) return;

    if (!confirm('Estàs segur que vols eliminar aquest pagament?')) return;

    // Calcular nuevo total pagado
    const nouTotalPagat = formData.totalPagat - pagament.import;

    setFormData({
      ...formData,
      pagaments: formData.pagaments.filter(p => p.codi !== codiPagament),
      totalPagat: nouTotalPagat
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