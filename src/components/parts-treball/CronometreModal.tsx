import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Square } from 'lucide-react';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';
import type { CronometreState, PartTreball } from '../../types/partTreball';
import SearchableSelect from '../common/SearchableSelect';

export default function CronometreModal({
  onClose,
  clients,
  projectes,
  onCrearPart
}: CronometreModalProps) {
  const [cronometreState, setCronometreState] = useState<CronometreState | null>(null);
  const [mode, setMode] = useState<'projecte' | 'administratiu'>('projecte');
  const [formData, setFormData] = useState({
    client: '',
    projecte: '',
    tasca: '',
    descripcio: ''
  });
  const [formAdministratiu, setFormAdministratiu] = useState({
    titol: '',
    descripcio: ''
  });

  // Cargar estado del cronómetro desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('plateaCronometre');
    if (saved) {
      const state = JSON.parse(saved);
      setCronometreState(state);
      
      if (state.mode === 'projecte') {
        setFormData({
          client: state.client,
          projecte: state.projecte,
          tasca: state.tasca || '',
          descripcio: state.descripcio
        });
        setMode('projecte');
      } else {
        setFormAdministratiu({
          titol: state.titolAdministratiu || '',
          descripcio: state.descripcio
        });
        setMode('administratiu');
      }
    }
  }, []);

  const projectesFiltrats = formData.client
    ? projectes.filter(p => p.client === formData.client)
    : projectes;

  const projecteSeleccionat = projectes.find(p => p.codi === formData.projecte);
  const tasquesDisponibles = projecteSeleccionat?.tasques || [];

  const handleClientChange = (value: string) => {
    setFormData({ 
      ...formData, 
      client: value, 
      projecte: '', 
      tasca: '' 
    });
  };

  const handleProjecteChange = (value: string) => {
    setFormData({ 
      ...formData, 
      projecte: value, 
      tasca: '' 
    });
  };

  // INICIAR cronómetro
  const handleIniciar = () => {
    if (mode === 'projecte') {
      const nouState: CronometreState = {
        actiu: true,
        pausat: false,
        mode: 'projecte',
        client: formData.client,
        projecte: formData.projecte,
        tasca: formData.tasca,
        descripcio: formData.descripcio,
        horaInici: Date.now(),
        tempsTranscorregut: 0
      };

      localStorage.setItem('plateaCronometre', JSON.stringify(nouState));
      setCronometreState(nouState);
    } else {
      const nouState: CronometreState = {
        actiu: true,
        pausat: false,
        mode: 'administratiu',
        client: '',
        projecte: '',
        descripcio: formAdministratiu.descripcio,
        titolAdministratiu: formAdministratiu.titol,
        horaInici: Date.now(),
        tempsTranscorregut: 0
      };

      localStorage.setItem('plateaCronometre', JSON.stringify(nouState));
      setCronometreState(nouState);
    }
    
    onClose();
  };

  // PAUSAR cronómetro
  const handlePausar = () => {
    if (!cronometreState) return;

    const ara = Date.now();
    const tempsNou = cronometreState.tempsTranscorregut + (ara - (cronometreState.ultimaPausa || cronometreState.horaInici));

    const nouState: CronometreState = {
      ...cronometreState,
      pausat: true,
      tempsTranscorregut: tempsNou,
      ultimaPausa: ara
    };

    localStorage.setItem('plateaCronometre', JSON.stringify(nouState));
    setCronometreState(nouState);
    onClose();
  };

  // REANUDAR cronómetro
  const handleReanudar = () => {
    if (!cronometreState) return;

    const nouState: CronometreState = {
      ...cronometreState,
      pausat: false,
      ultimaPausa: Date.now()
    };

    localStorage.setItem('plateaCronometre', JSON.stringify(nouState));
    setCronometreState(nouState);
    onClose();
  };

  // DETENER cronómetro
  const handleDetenir = () => {
    if (!cronometreState) return;

    if (!confirm('Vols crear un part de treball amb aquest temps?')) {
      localStorage.removeItem('plateaCronometre');
      setCronometreState(null);
      onClose();
      return;
    }

    // Calcular tiempo total
    const ara = Date.now();
    const tempsTotal = cronometreState.pausat
      ? cronometreState.tempsTranscorregut
      : cronometreState.tempsTranscorregut + (ara - (cronometreState.ultimaPausa || cronometreState.horaInici));

    const tempsMinuts = Math.round(tempsTotal / 60000);

    const dataInici = new Date(cronometreState.horaInici);
    const dataFi = new Date(ara);

    const horaInici = `${String(dataInici.getHours()).padStart(2, '0')}:${String(dataInici.getMinutes()).padStart(2, '0')}`;
    const horaFi = `${String(dataFi.getHours()).padStart(2, '0')}:${String(dataFi.getMinutes()).padStart(2, '0')}`;

// Crear el part de treball
const nouPart: Omit<PartTreball, 'codi'> = cronometreState.mode === 'administratiu' 
  ? {
      data: new Date().toISOString().split('T')[0],
      horaInici,
      horaFi,
      temps: tempsMinuts,
      client: '',
      projecte: 'ADMIN',
      tasca: cronometreState.titolAdministratiu || 'Tasca administrativa',
      descripcio: cronometreState.descripcio
    }
  : {
      data: new Date().toISOString().split('T')[0],
      horaInici,
      horaFi,
      temps: tempsMinuts,
      client: cronometreState.client,
      projecte: cronometreState.projecte,
      tasca: cronometreState.tasca,
      descripcio: cronometreState.descripcio
    };

    onCrearPart(nouPart);

    localStorage.removeItem('plateaCronometre');
    setCronometreState(null);
    onClose();
  };

  // Formatear tiempo transcurrido
  const formatTemps = () => {
    if (!cronometreState) return '00:00:00';

    const ara = Date.now();
    const temps = cronometreState.pausat
      ? cronometreState.tempsTranscorregut
      : cronometreState.tempsTranscorregut + (ara - (cronometreState.ultimaPausa || cronometreState.horaInici));

    const hores = Math.floor(temps / 3600000);
    const minuts = Math.floor((temps % 3600000) / 60000);
    const segons = Math.floor((temps % 60000) / 1000);

    return `${String(hores).padStart(2, '0')}:${String(minuts).padStart(2, '0')}:${String(segons).padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {cronometreState?.actiu ? <Pause size={24} /> : <Play size={24} />}
            Cronòmetre
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="modal-close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {cronometreState?.actiu ? (
            <>
              {/* Tiempo transcurrido */}
              <div style={{
                background: 'var(--color-bg-tertiary)',
                padding: '2rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 700,
                  color: 'var(--color-accent-primary)',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em'
                }}>
                  {formatTemps()}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-text-tertiary)',
                  marginTop: '0.5rem'
                }}>
                  {cronometreState.pausat ? 'PAUSAT' : 'EN CURS'}
                </div>
              </div>

              {/* Información del trabajo */}
              <div style={{
                background: 'var(--color-bg-secondary)',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid var(--color-border)'
              }}>
                {cronometreState.mode === 'projecte' ? (
                  <>
                    {cronometreState.client && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Client:</strong>{' '}
                        <span>{clients.find(c => c.codi === cronometreState.client)?.nomComercial || '-'}</span>
                      </div>
                    )}
                    {cronometreState.projecte && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Projecte:</strong>{' '}
                        <span>{projectes.find(p => p.codi === cronometreState.projecte)?.titol || '-'}</span>
                      </div>
                    )}
                    {cronometreState.tasca && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Tasca:</strong>{' '}
                        <span>{projectes.find(p => p.codi === cronometreState.projecte)?.tasques.find(t => t.id === cronometreState.tasca)?.descripcio || 
                               projectes.find(p => p.codi === cronometreState.projecte)?.tasques.find(t => t.id === cronometreState.tasca)?.servei || '-'}</span>
                      </div>
                    )}
                    {cronometreState.descripcio && (
                      <div>
                        <strong style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Descripció:</strong>{' '}
                        <span>{cronometreState.descripcio}</span>
                      </div>
                    )}
                    {!cronometreState.client && !cronometreState.projecte && (
                      <div style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                        Sense client ni projecte assignat
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Tipus:</strong>{' '}
                      <span>Tasca Administrativa</span>
                    </div>
                    {cronometreState.titolAdministratiu && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Títol:</strong>{' '}
                        <span>{cronometreState.titolAdministratiu}</span>
                      </div>
                    )}
                    {cronometreState.descripcio && (
                      <div>
                        <strong style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Descripció:</strong>{' '}
                        <span>{cronometreState.descripcio}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Botones de control */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={handleDetenir}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #dc2626'
                  }}
                >
                  <Square size={18} />
                  Detenir
                </button>

                {cronometreState.pausat ? (
                  <button
                    type="button"
                    onClick={handleReanudar}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Play size={18} />
                    Reanudar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePausar}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: '#f59e0b'
                    }}
                  >
                    <Pause size={18} />
                    Pausar
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* SWITCHERS */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem',
                marginBottom: '1.5rem',
                borderBottom: '2px solid var(--color-border)'
              }}>
                <button
                  type="button"
                  onClick={() => setMode('projecte')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: mode === 'projecte' ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                    color: mode === 'projecte' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    fontWeight: mode === 'projecte' ? 600 : 400,
                    cursor: 'pointer',
                    marginBottom: '-2px'
                  }}
                >
                  Projecte
                </button>
                <button
                  type="button"
                  onClick={() => setMode('administratiu')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: mode === 'administratiu' ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                    color: mode === 'administratiu' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    fontWeight: mode === 'administratiu' ? 600 : 400,
                    cursor: 'pointer',
                    marginBottom: '-2px'
                  }}
                >
                  Administratiu
                </button>
              </div>

              {mode === 'projecte' ? (
                <>
                  {/* Formulario de proyecto */}
                  <div className="form-section">
                    <div className="form-group">
                      <label>Client</label>
                      <SearchableSelect
                        value={formData.client}
                        onChange={handleClientChange}
                        options={clients.map(c => ({ 
                          value: c.codi, 
                          label: c.nomComercial || c.nomFiscal 
                        }))}
                        placeholder="Selecciona client..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Projecte</label>
                      <SearchableSelect
                        value={formData.projecte}
                        onChange={handleProjecteChange}
                        options={projectesFiltrats.map(p => ({ 
                          value: p.codi, 
                          label: `${p.codi} - ${p.titol}` 
                        }))}
                        placeholder="Selecciona projecte..."
                        disabled={!formData.client}
                      />
                    </div>

                    <div className="form-group">
                      <label>Tasca</label>
                      <SearchableSelect
                        value={formData.tasca}
                        onChange={(value) => setFormData({ ...formData, tasca: value })}
                        options={tasquesDisponibles.map(t => ({ 
                          value: t.id, 
                          label: t.descripcio || t.servei 
                        }))}
                        placeholder="Selecciona tasca..."
                        disabled={!formData.projecte}
                      />
                    </div>

                    <div className="form-group">
                      <label>Descripció</label>
                      <textarea
                        className="form-input"
                        value={formData.descripcio}
                        onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                        rows={3}
                        placeholder="Descripció del treball..."
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Formulario administrativo */}
                  <div className="form-section">
                    <div className="form-group">
                      <label>Títol de la tasca</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formAdministratiu.titol}
                        onChange={(e) => setFormAdministratiu({ ...formAdministratiu, titol: e.target.value })}
                        placeholder="Ex: Reunió interna, Formació, Gestió email..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Descripció</label>
                      <textarea
                        className="form-input"
                        value={formAdministratiu.descripcio}
                        onChange={(e) => setFormAdministratiu({ ...formAdministratiu, descripcio: e.target.value })}
                        rows={4}
                        placeholder="Detalls de la tasca administrativa..."
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleIniciar}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}
              >
                <Play size={24} />
                Iniciar Cronòmetre
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}