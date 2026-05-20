import React, { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import type { PartTreball } from '../../types/partTreball';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';
import SearchableSelect from '../common/SearchableSelect';
import { useAutoSave } from '../../hooks/useAutoSave';

interface PartTreballModalProps {
  part: PartTreball | null;
  onClose: () => void;
  onSave: (part: PartTreball) => void;
  nextCode: string;
  clients: Client[];
  projectes: Projecte[];
}

export default function PartTreballModal({
  part,
  onClose,
  onSave,
  nextCode,
  clients,
  projectes
}: PartTreballModalProps) {
  const esNou = !part;
  const [mode, setMode] = useState<'projecte' | 'administratiu'>(
    part?.projecte === 'ADMIN' ? 'administratiu' : 'projecte'
  );
  
  const [formData, setFormData] = useState<PartTreball>(
    part || {
      codi: nextCode,
      data: new Date().toISOString().split('T')[0],
      horaInici: '09:00',
      horaFi: '10:00',
      temps: 60,
      client: '',
      projecte: '',
      tasca: '',
      descripcio: ''
    }
  );

  // Estado inicial para detectar cambios
  const [initialData] = useState(JSON.stringify(formData));
  const [haCambiat, setHaCambiat] = useState(false);

  // Detectar cambios
  useEffect(() => {
    setHaCambiat(JSON.stringify(formData) !== initialData);
  }, [formData, initialData]);

  // Calcular tiempo automáticamente cuando cambian horas
  useEffect(() => {
    calcularTemps();
  }, [formData.horaInici, formData.horaFi]);

  const calcularTemps = () => {
    if (!formData.horaInici || !formData.horaFi) return;

    const [horaI, minI] = formData.horaInici.split(':').map(Number);
    const [horaF, minF] = formData.horaFi.split(':').map(Number);

    const minuts = (horaF * 60 + minF) - (horaI * 60 + minI);
    
    setFormData(prev => ({ ...prev, temps: minuts > 0 ? minuts : 0 }));
  };

  // Filtrar projectes por cliente seleccionado
  const projectesFiltrats = formData.client
    ? projectes.filter(p => p.client === formData.client)
    : projectes;

  // Obtener tasques del proyecto seleccionado
  const projecteSeleccionat = projectes.find(p => p.codi === formData.projecte);
  const tasquesDisponibles = projecteSeleccionat?.tasques
    .filter(t => t.categoria !== 'MATERIALS')
    || [];

  // Cuando cambia el cliente, resetear proyecto y tarea
  const handleClientChange = (value: string) => {
    setFormData({ 
      ...formData, 
      client: value, 
      projecte: '', 
      tasca: '' 
    });
  };

  // Cuando cambia el proyecto, resetear tarea
  const handleProjecteChange = (value: string) => {
    setFormData({ 
      ...formData, 
      projecte: value, 
      tasca: '' 
    });
  };

  const formatTemps = (minuts: number) => {
    const hores = Math.floor(minuts / 60);
    const mins = minuts % 60;
    return `${hores}h ${mins}m`;
  };

  // Manejar cierre
  const handleClose = () => {
    if (esNou && !haCambiat) {
      // Si es nuevo y no hay cambios, no guardar
      onClose();
    } else {
      // Guardar y cerrar
      onSave(formData);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '800px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div className="modal-header">
          <h2>
            <Clock size={24} />
            {part ? 'Editar' : 'Nou'} Part de Treball - {formData.codi}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="modal-close"
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {/* INFORMACIÓN BÁSICA */}
            <div className="form-section">
              <h3>Informació Bàsica</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Codi *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.codi}
                    disabled
                    style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label>Data *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* HORAS Y TIEMPO */}
            <div className="form-section">
              <h3>Hores i Temps</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Hora Inici *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.horaInici}
                    onChange={(e) => setFormData({ ...formData, horaInici: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Hora Fi *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.horaFi}
                    onChange={(e) => setFormData({ ...formData, horaFi: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Temps Total</label>
                  <div style={{
                    padding: '0.7rem',
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--color-accent-primary)',
                    textAlign: 'center'
                  }}>
                    {formatTemps(formData.temps)}
                  </div>
                </div>
              </div>
            </div>

            {/* SWITCHERS */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--color-border)'
            }}>
              <button
                type="button"
                onClick={() => {
                  setMode('projecte');
                  if (formData.projecte === 'ADMIN') {
                    setFormData({ ...formData, projecte: '', client: '', tasca: '' });
                  }
                }}
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
                onClick={() => {
                  setMode('administratiu');
                  setFormData({ 
                    ...formData, 
                    projecte: 'ADMIN', 
                    client: '',
                    tasca: formData.tasca || ''
                  });
                }}
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
              /* PROYECTO */
              <div className="form-section">
                <h3>Projecte i Tasca</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                </div>

                <div className="form-group">
                  <label>Tasca</label>
                  <SearchableSelect
                    value={formData.tasca || ''}
                    onChange={(value) => setFormData({ ...formData, tasca: value })}
                    options={tasquesDisponibles.map(t => ({ 
                      value: t.id, 
                      label: `${t.servei} - ${t.descripcio}`
                    }))}
                    placeholder="Selecciona tasca..."
                    disabled={!formData.projecte}
                  />
                </div>
              </div>
            ) : (
              /* ADMINISTRATIVO */
              <div className="form-section">
                <h3>Tasca Administrativa</h3>
                
                <div className="form-group">
                  <label>Títol de la tasca</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.tasca || ''}
                    onChange={(e) => setFormData({ ...formData, tasca: e.target.value })}
                    placeholder="Ex: Reunió interna, Formació, Gestió email..."
                  />
                </div>
              </div>
            )}

            {/* DESCRIPCIÓN */}
            <div className="form-section">
              <h3>Descripció</h3>
              
              <div className="form-group">
                <label>Descripció del treball realitzat</label>
                <textarea
                  className="form-input"
                  value={formData.descripcio}
                  onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                  rows={4}
                  placeholder="Descriu el treball realitzat..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleClose}
            >
              Acceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}