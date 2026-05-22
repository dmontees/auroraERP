import React, { useState, useEffect } from 'react';
import { Clock, Pause } from 'lucide-react';
import type { CronometreState } from '../../types/partTreball';
import { storage } from '../../utils/storageManager';

export default function CronometreWidget() {
  const [cronometreState, setCronometreState] = useState<CronometreState | null>(null);
  const [tempsActual, setTempsActual] = useState('00:00:00');
  
  // Cargar estado del cronómetro
  useEffect(() => {
    const carregarCronometre = () => {
      const state = storage.getCronometre();
      setCronometreState(state);
    };

    carregarCronometre();

    // Actualizar cada segundo
    const interval = setInterval(carregarCronometre, 1000);

    return () => clearInterval(interval);
  }, []);

  // Actualizar tiempo cada segundo
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

  if (!cronometreState?.actiu) return null;

  return (
    <div
      style={{
        padding: '1rem',
        background: cronometreState?.pausat ? '#fef3c7' : '#dbeafe',
        border: `2px solid ${cronometreState?.pausat ? '#f59e0b' : '#3b82f6'}`,
        borderRadius: '12px',
        cursor: 'default',
        transition: 'all 0.2s',
        margin: '0 1rem 1rem 1rem'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem'
      }}>
        {cronometreState.pausat ? (
          <Pause size={16} style={{ color: '#f59e0b' }} />
        ) : (
          <Clock size={16} style={{ color: '#3b82f6' }} />
        )}
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: cronometreState.pausat ? '#92400e' : '#1e40af',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {cronometreState.pausat ? 'Pausat' : 'En curs'}
        </span>
      </div>

      <div style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: cronometreState.pausat ? '#92400e' : '#1e40af',
        fontFamily: 'monospace',
        textAlign: 'center',
        letterSpacing: '0.05em'
      }}>
        {tempsActual}
      </div>

      <div style={{
        fontSize: '0.7rem',
        color: cronometreState.pausat ? '#78350f' : '#1e3a8a',
        textAlign: 'center',
        marginTop: '0.5rem',
        opacity: 0.8,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        Parts Treball → Cronòmetre
      </div>
    </div>
  );
}