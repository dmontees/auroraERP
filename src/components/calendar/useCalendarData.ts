import { useState, useEffect } from 'react';
import type { Projecte } from '../../types/projecte';
import type { FacturaVenta } from '../../types/facturaVenda';
import type { Gasto } from '../../types/facturaCompra';
import type { Pressupost } from '../../types/pressupost';
import type { Client } from '../../types/client';
import type { Proveidor } from '../../types/proveidor';
import { storage } from '../../utils/storageManager';

export function useCalendarData() {
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [facturesVenda, setFacturesVenda] = useState<FacturaVenta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [pressupostos, setPressupostos] = useState<Pressupost[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [esdevenimentsPersonalitzats, setEsdevenimentsPersonalitzats] = useState<any[]>([]);

  useEffect(() => {
    setProjectes(storage.getProjectes());
    setFacturesVenda(storage.getFacturesVenda());
    setGastos(storage.getFacturesCompra());
    setPressupostos(storage.getPressupostos());
    setClients(storage.getClients());
    setProveidors(storage.getProveidors());
    
    // Esdeveniments personalitzats (todavía en localStorage por ahora)
    const saved = localStorage.getItem('plateaEsdevenimentsPersonalitzats');
    if (saved) {
      setEsdevenimentsPersonalitzats(JSON.parse(saved));
    }
  }, []);

  const updateEsdevenimentsPersonalitzats = (events: any[]) => {
    setEsdevenimentsPersonalitzats(events);
    localStorage.setItem('plateaEsdevenimentsPersonalitzats', JSON.stringify(events));
  };

  const updateProjectes = (projects: Projecte[]) => {
    setProjectes(projects);
    storage.setProjectes(projects);
  };

  return {
    projectes,
    facturesVenda,
    gastos,
    pressupostos,
    clients,
    proveidors,
    esdevenimentsPersonalitzats,
    updateEsdevenimentsPersonalitzats,
    updateProjectes
  };
}