import { useState, useEffect } from 'react';
import type { Gasto } from '../../../types/facturaCompra';
import type { Proveidor } from '../../../types/proveidor';
import type { Projecte } from '../../../types/projecte';
import { storage } from '../../../utils/storageManager';

export function useFacturesData() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);

  useEffect(() => {
    setGastos(storage.getFacturesCompra());
    setProveidors(storage.getProveidors());
    setProjectes(storage.getProjectes());
  }, []);

  const saveGastos = (newGastos: Gasto[]) => {
    setGastos(newGastos);
    storage.setFacturesCompra(newGastos);
  };

  const deleteGasto = (codi: string) => {
    saveGastos(gastos.filter(g => g.codi !== codi));
  };

  return {
    gastos,
    proveidors,
    projectes,
    saveGastos,
    deleteGasto
  };
}