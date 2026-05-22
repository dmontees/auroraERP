import { useState, useEffect, useCallback } from 'react';
import type { CronometreState, PartTreball } from "../../types/partTreball";
import { storage } from "../../utils/storageManager";

export function useCronometre() {
  const [cronometreState, setCronometreState] = useState<CronometreState | null>(null);

  // Cargar estado inicial
  useEffect(() => {
    const state = storage.getCronometre();
    setCronometreState(state);
  }, []);

  // Iniciar cronómetro
  const iniciar = useCallback((state: Omit<CronometreState, 'actiu' | 'pausat' | 'horaInici' | 'tempsTranscorregut'>) => {
    const nouState: CronometreState = {
      ...state,
      actiu: true,
      pausat: false,
      horaInici: Date.now(),
      tempsTranscorregut: 0
    };
    
    storage.setCronometre(nouState);
    setCronometreState(nouState);
  }, []);

  // Pausar cronómetro
  const pausar = useCallback(() => {
    if (!cronometreState) return;

    const ara = Date.now();
    const tempsNou = cronometreState.tempsTranscorregut + 
      (ara - (cronometreState.ultimaPausa || cronometreState.horaInici));

    const nouState: CronometreState = {
      ...cronometreState,
      pausat: true,
      tempsTranscorregut: tempsNou,
      ultimaPausa: ara
    };

    storage.setCronometre(nouState);
    setCronometreState(nouState);
  }, [cronometreState]);

  // Reanudar cronómetro
  const reanudar = useCallback(() => {
    if (!cronometreState) return;

    const nouState: CronometreState = {
      ...cronometreState,
      pausat: false,
      ultimaPausa: Date.now()
    };

    storage.setCronometre(nouState);
    setCronometreState(nouState);
  }, [cronometreState]);

  // Detener cronómetro y obtener datos
  const detenir = useCallback(() => {
    if (!cronometreState) return null;

    const ara = Date.now();
    const tempsTotal = cronometreState.pausat
      ? cronometreState.tempsTranscorregut
      : cronometreState.tempsTranscorregut + (ara - (cronometreState.ultimaPausa || cronometreState.horaInici));

    const tempsMinuts = Math.round(tempsTotal / 60000);

    const dataInici = new Date(cronometreState.horaInici);
    const dataFi = new Date(ara);

    const horaInici = `${String(dataInici.getHours()).padStart(2, '0')}:${String(dataInici.getMinutes()).padStart(2, '0')}`;
    const horaFi = `${String(dataFi.getHours()).padStart(2, '0')}:${String(dataFi.getMinutes()).padStart(2, '0')}`;

    storage.deleteCronometre();
    setCronometreState(null);

    return {
      horaInici,
      horaFi,
      tempsMinuts,
      state: cronometreState
    };
  }, [cronometreState]);

  // Cancelar cronómetro
  const cancelar = useCallback(() => {
    storage.deleteCronometre();
    setCronometreState(null);
  }, []);

  // Formatear tiempo transcurrido
  const formatTemps = useCallback(() => {
    if (!cronometreState) return '00:00:00';

    const ara = Date.now();
    const temps = cronometreState.pausat
      ? cronometreState.tempsTranscorregut
      : cronometreState.tempsTranscorregut + (ara - (cronometreState.ultimaPausa || cronometreState.horaInici));

    const hores = Math.floor(temps / 3600000);
    const minuts = Math.floor((temps % 3600000) / 60000);
    const segons = Math.floor((temps % 60000) / 1000);

    return `${String(hores).padStart(2, '0')}:${String(minuts).padStart(2, '0')}:${String(segons).padStart(2, '0')}`;
  }, [cronometreState]);

  return {
    cronometreState,
    iniciar,
    pausar,
    reanudar,
    detenir,
    cancelar,
    formatTemps
  };
}