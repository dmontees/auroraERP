import React, { useState, useEffect } from 'react';
import { Clock, Pause, Play, Square } from 'lucide-react';
import type { CronometreState } from '../../types/partTreball';
import type { Projecte } from '../../types/projecte';
import type { Client } from '../../types/client';
import { storage } from '../../utils/storageManager';

export default function CronometreWidget() {
  const [cronometreState, setCronometreState] = useState<CronometreState | null>(null);
  const [tempsActual, setTempsActual] = useState('00:00:00');
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    setProjectes(storage.getProjectes());
    setClients(storage.getClients());

    const carregarCronometre = () => {
      const state = storage.getCronometre();
      setCronometreState(state);
    };
    carregarCronometre();
    const interval = setInterval(carregarCronometre, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!cronometreState?.actiu) {
      setTempsActual('00:00:00');
      return;
    }

    const calcularTemps = () => {
      const ara = Date.now();
      const temps = cronometreState.pausat
        ? cronometreState.tempsTranscorregut
        : cronometreState.tempsTranscorregut + (ara - (cronometreState.ultimaPausa || cronometreState.horaInici));
      const hores = Math.floor(temps / 3600000);
      const minuts = Math.floor((temps % 3600000) / 60000);
      const segons = Math.floor((temps % 60000) / 1000);
      setTempsActual(`${String(hores).padStart(2, '0')}:${String(minuts).padStart(2, '0')}:${String(segons).padStart(2, '0')}`);
    };

    calcularTemps();
    const interval = setInterval(calcularTemps, 1000);
    return () => clearInterval(interval);
  }, [cronometreState]);

  const handlePausarReanudar = () => {
    const state = storage.getCronometre();
    if (!state?.actiu) return;

    if (state.pausat) {
      const nouState: CronometreState = { ...state, pausat: false, ultimaPausa: Date.now() };
      storage.setCronometre(nouState);
      setCronometreState(nouState);
    } else {
      const ara = Date.now();
      const tempsNou = state.tempsTranscorregut + (ara - (state.ultimaPausa || state.horaInici));
      const nouState: CronometreState = { ...state, pausat: true, tempsTranscorregut: tempsNou, ultimaPausa: ara };
      storage.setCronometre(nouState);
      setCronometreState(nouState);
    }
  };

  const handleDetenir = () => {
    const state = storage.getCronometre();
    if (!state?.actiu) return;

    if (!confirm('Vols crear un part de treball amb aquest temps?')) {
      storage.deleteCronometre();
      setCronometreState(null);
      return;
    }

    const ara = Date.now();
    const tempsTotal = state.pausat
      ? state.tempsTranscorregut
      : state.tempsTranscorregut + (ara - (state.ultimaPausa || state.horaInici));
    const tempsMinuts = Math.round(tempsTotal / 60000);

    const dataInici = new Date(state.horaInici);
    const dataFi = new Date(ara);
    const horaInici = `${String(dataInici.getHours()).padStart(2, '0')}:${String(dataInici.getMinutes()).padStart(2, '0')}`;
    const horaFi = `${String(dataFi.getHours()).padStart(2, '0')}:${String(dataFi.getMinutes()).padStart(2, '0')}`;

    const parts = storage.getPartsTreball();
    const maxNum = parts.length === 0 ? 0 : Math.max(...parts.map(p => parseInt(p.codi.split('-')[1]) || 0));
    const newCode = `PT-${String(maxNum + 1).padStart(5, '0')}`;

    const nouPart = state.mode === 'administratiu'
      ? {
          codi: newCode,
          data: new Date().toISOString().split('T')[0],
          horaInici,
          horaFi,
          temps: tempsMinuts,
          client: '',
          projecte: 'ADMIN',
          tasca: (state as any).titolAdministratiu || 'Tasca administrativa',
          descripcio: state.descripcio
        }
      : {
          codi: newCode,
          data: new Date().toISOString().split('T')[0],
          horaInici,
          horaFi,
          temps: tempsMinuts,
          client: state.client,
          projecte: state.projecte,
          tasca: state.tasca,
          descripcio: state.descripcio
        };

    storage.setPartsTreball([...parts, nouPart]);
    storage.deleteCronometre();
    setCronometreState(null);
    window.dispatchEvent(new CustomEvent('parts-treball-updated'));
  };

  if (!cronometreState?.actiu) return null;

  const pausat = cronometreState.pausat;

  // Resolve activity label
  let activitatLabel = '';
  let activitatSublabel = '';
  if (cronometreState.mode === 'administratiu') {
    activitatLabel = (cronometreState as any).titolAdministratiu || 'Tasca administrativa';
    activitatSublabel = 'Administratiu';
  } else {
    const projecte = projectes.find(p => p.codi === cronometreState.projecte);
    const tasca = projecte?.tasques.find(t => t.id === cronometreState.tasca);
    activitatLabel = projecte?.titol || cronometreState.projecte || '';
    activitatSublabel = tasca?.descripcio || tasca?.servei || '';
  }

  const accentColor = pausat ? 'var(--color-warning)' : 'var(--color-info)';
  const textColor = pausat ? 'var(--color-warning-dark)' : 'var(--color-info-dark)';

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        background: pausat ? 'var(--color-warning-bg)' : 'var(--color-info-bg)',
        border: `2px solid ${accentColor}`,
        borderRadius: '12px',
        transition: 'all 0.2s',
        margin: '0 1rem 1rem 1rem'
      }}
    >
      {/* Fila superior: icono + estat + temps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        {pausat
          ? <Pause size={13} style={{ color: accentColor, flexShrink: 0 }} />
          : <Clock size={13} style={{ color: accentColor, flexShrink: 0 }} />
        }
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 600,
          color: textColor,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          flex: 1
        }}>
          {pausat ? 'Pausat' : 'En curs'}
        </span>
        <span style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: textColor,
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }}>
          {tempsActual}
        </span>
      </div>

      {/* Activitat */}
      {activitatLabel && (
        <div style={{ marginBottom: '0.6rem' }}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: textColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {activitatLabel}
          </div>
          {activitatSublabel && (
            <div style={{
              fontSize: '0.7rem',
              color: textColor,
              opacity: 0.75,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {activitatSublabel}
            </div>
          )}
        </div>
      )}

      {/* Botons */}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button
          type="button"
          onClick={handleDetenir}
          title="Detenir i crear part de treball"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem',
            padding: '0.35rem 0.5rem',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: 'var(--color-error-bg)',
            color: 'var(--color-error-dark)',
            border: '1px solid var(--color-error-dark)',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          <Square size={12} />
          Detenir
        </button>
        <button
          type="button"
          onClick={handlePausarReanudar}
          title={pausat ? 'Reanudar cronòmetre' : 'Pausar cronòmetre'}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem',
            padding: '0.35rem 0.5rem',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: pausat ? 'var(--color-info)' : 'var(--color-warning)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {pausat ? <Play size={12} /> : <Pause size={12} />}
          {pausat ? 'Reanudar' : 'Pausar'}
        </button>
      </div>
    </div>
  );
}
