import { useState, useEffect } from 'react';
import type { FacturaVenta } from '../../../types/facturaVenta';
import type { Client } from '../../../types/client';
import type { Projecte } from '../../../types/projecte';
import { storage } from '../../../utils/storageManager'; // ← CAMBIO

export function useFacturesVenda() {
  const [factures, setFactures] = useState<FacturaVenta[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [parametres, setParametres] = useState<any>({});

  // Cargar datos al montar
  useEffect(() => {
    setFactures(storage.getFacturesVenda()); // ← CAMBIO
    setClients(storage.getClients());
    setProjectes(storage.getProjectes());
    setParametres(storage.getParametres());
  }, []);

  // Guardar factures
  const saveFactures = (newFactures: FacturaVenta[]) => {
    storage.setFacturesVenda(newFactures); // ← CAMBIO
    setFactures(newFactures);
  };

  // Eliminar factura
  const deleteFactura = (codi: string) => {
    const filtered = factures.filter(f => f.codi !== codi);
    saveFactures(filtered);
  };

  return {
    factures,
    clients,
    projectes,
    parametres,
    saveFactures,
    deleteFactura
  };
}