import { useState, useEffect } from 'react';
import type { Projecte } from '../../types/projecte';
import type { FacturaVenta } from '../../types/facturaVenda';
import type { Gasto } from '../../types/facturaCompra';
import type { Pressupost } from '../../types/pressupost';
import type { Client } from '../../types/client';
import type { Proveidor } from '../../types/proveidor';
import type { Parametres } from '../../types/parametres';
import { storage } from '../../utils/storageManager';

type ExtresAuto = Record<string, { ubicacio?: string; horaInici?: string; horaFi?: string; enllac?: string }>;

export function useCalendarData() {
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [facturesVenda, setFacturesVenda] = useState<FacturaVenta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [pressupostos, setPressupostos] = useState<Pressupost[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [esdevenimentsPersonalitzats, setEsdevenimentsPersonalitzats] = useState<any[]>([]);
  const [parametres, setParametres] = useState<Parametres | null>(null);

  useEffect(() => {
    setProjectes(storage.getProjectes());
    setFacturesVenda(storage.getFacturesVenda());
    setGastos(storage.getFacturesCompra());
    setPressupostos(storage.getPressupostos());
    setClients(storage.getClients());
    setProveidors(storage.getProveidors());
    setEsdevenimentsPersonalitzats(storage.getEsdevenimentsPersonalitzats());
    setParametres(storage.getParametres());
  }, []);

  const updateEsdevenimentsPersonalitzats = (events: any[]) => {
    setEsdevenimentsPersonalitzats(events);
    storage.setEsdevenimentsPersonalitzats(events);
  };

  const updateProjectes = (projects: Projecte[]) => {
    setProjectes(projects);
    storage.setProjectes(projects);
  };

  const updateExtresEsdevenimentsAuto = (eventId: string, extras: ExtresAuto[string]) => {
    const p = storage.getParametres();
    const current: ExtresAuto = p?.extresEsdevenimentsAuto ?? {};
    const updated: ExtresAuto = { ...current, [eventId]: extras };
    const newParametres = { ...p!, extresEsdevenimentsAuto: updated };
    storage.setParametres(newParametres);
    setParametres(newParametres);
  };

  const configCalendari = parametres?.configCalendari ?? undefined;
  const categoriesCalendari = parametres?.categoriesCalendari ?? [];
  const extresEsdevenimentsAuto: ExtresAuto = parametres?.extresEsdevenimentsAuto ?? {};

  return {
    projectes,
    facturesVenda,
    gastos,
    pressupostos,
    clients,
    proveidors,
    esdevenimentsPersonalitzats,
    updateEsdevenimentsPersonalitzats,
    updateProjectes,
    configCalendari,
    categoriesCalendari,
    extresEsdevenimentsAuto,
    updateExtresEsdevenimentsAuto
  };
}
