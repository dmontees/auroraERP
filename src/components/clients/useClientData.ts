import { useState, useEffect } from 'react';
import type { Client } from '../../types/client';
import { storage } from '../../utils/storageManager';

export function useClientData(editingClient: Client | null, nextCode: string) {
  const [formData, setFormData] = useState<Client>(
    editingClient || {
      codi: nextCode,
      dataAlta: new Date().toISOString().split('T')[0],
      nomFiscal: '',
      nomComercial: '',
      pais: 'Espanya',
      domicili: '',
      nif: '',
      personaContacte: '',
      telefon: '',
      correuElectronic: '',
      web: '',
      notesInternes: '',
      contactes: [],
      tipusIVA: 'Normal',
      retencio: 0,
      tarifesEspecials: []
    }
  );

  const [parametres, setParametres] = useState<any | null>(null);

  useEffect(() => {
    setParametres(storage.getParametres());
  }, []);

  // Verificar si el cliente está siendo usado
  const isClientInUse = (): boolean => {
    if (!editingClient) return false;

    const projectes = storage.getProjectes();
    const pressupostos = storage.getPressupostos();
    const facturesVenda = storage.getFacturesVenda();
    const partsTreball = storage.getPartsTreball();

    return (
      projectes.some((p: any) => p.client === editingClient.codi) ||
      pressupostos.some((p: any) => p.client === editingClient.codi) ||
      facturesVenda.some((f: any) => f.client === editingClient.codi) ||
      partsTreball.some((pt: any) => pt.client === editingClient.codi)
    );
  };

  return {
    formData,
    setFormData,
    parametres,
    isClientInUse: isClientInUse()
  };
}