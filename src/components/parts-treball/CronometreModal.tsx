import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Square } from 'lucide-react';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';
import type { PartTreball } from '../../types/partTreball';
import SearchableSelect from '../common/SearchableSelect';
import { useCronometre } from './useCronometre';

interface CronometreModalProps {
  onClose: () => void;
  clients: Client[];
  projectes: Projecte[];
  onCrearPart: (part: Omit<PartTreball, 'codi'>) => void;
}

export default function CronometreModal({
  onClose,
  clients,
  projectes,
  onCrearPart
}: CronometreModalProps) {
  const {
    cronometreState,
    iniciar,
    pausar,
    reanudar,
    detenir,
    cancelar,
    formatTemps
  } = useCronometre();

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

  // Cargar datos del cronómetro si está activo
  useEffect(() => {
    if (cronometreState) {
      if (cronometreState.mode === 'projecte') {
        setFormData({
          client: cronometreState.client,
          projecte: cronometreState.projecte,
          tasca: cronometreState.tasca || '',
          descripcio: cronometreState.descripcio
        });
        setMode('projecte');
      } else {
        setFormAdministratiu({
          titol: cronometreState.titolAdministratiu || '',
          descripcio: cronometreState.descripcio
        });
        setMode('administratiu');
      }
    }
  }, [cronometreState]);

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
      iniciar({
        mode: 'projecte',
        client: formData.client,
        projecte: formData.projecte,
        tasca: formData.tasca,
        descripcio: formData.descripcio
      });
    } else {
      iniciar({
        mode: 'administratiu',
        client: '',
        projecte: '',
        descripcio: formAdministratiu.descripcio,
        titolAdministratiu: formAdministratiu.titol
      });
    }
    
    onClose();
  };

  // PAUSAR cronómetro
  const handlePausar = () => {
    pausar();
    onClose();
  };

  // REANUDAR cronómetro
  const handleReanudar = () => {
    reanudar();
    onClose();
  };

  // DETENER cronómetro
  const handleDetenir = () => {
    if (!confirm('Vols crear un part de treball amb aquest temps?')) {
      cancelar();
      onClose();
      return;
    }

    const result = detenir();
    if (!result) return;

    const { horaInici, horaFi, tempsMinuts, state } = result;

    // Crear el part de treball
    const nouPart: Omit<PartTreball, 'codi'> = state.mode === 'administratiu' 
      ? {
          data: new Date().toISOString().split('T')[0],
          horaInici,
          horaFi,
          temps: tempsMinuts,
          client: '',
          projecte: 'ADMIN',
          tasca: state.titolAdministratiu || 'Tasca administrativa',
          descripcio: state.descripcio
        }
      : {
          data: new Date().toISOString().split('T')[0],
          horaInici,
          horaFi,
          temps: tempsMinuts,
          client: state.client,
          projecte: state.projecte,
          tasca: state.tasca,
          descripcio: state.descripcio
        };

    onCrearPart(nouPart);
    onClose();
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
                    background: 'var(--color-error-bg)',
                    color: 'var(--color-error-dark)',
                    border: '1px solid var(--color-error-dark)'
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
                      background: 'var(--color-warning)'
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