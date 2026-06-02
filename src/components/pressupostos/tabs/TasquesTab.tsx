import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import SearchableSelect from '../../common/SearchableSelect';

interface TasquesTabProps {
  hook: any;
}

export default function TasquesTab({ hook }: TasquesTabProps) {
  const {
    formData,
    setFormData,
    clientBlocked,
    pressupostBloquejat,
    parametres,
    totalGastos,
    totalPressupost,
    benefici,
    percentBenefici,
    tasquesAgrupades,
    actualitzarTasca,
    eliminarTasca,
    moureTasca,
    moureCategoría,
    buscarTarifaClient
  } = hook;

  const [showAfegirTascaModal, setShowAfegirTascaModal] = useState(false);
  const [novaTascaForm, setNovaTascaForm] = useState({
    servei: '',
    descripcio: '',
    quantitat: 1,
    unitat: '',
    tarifa: 0
  });

  const handleServeiChange = (codiServei: string) => {
    const serveiData = parametres?.serveis.find((s: any) => s.codi === codiServei);
    setNovaTascaForm({
      ...novaTascaForm,
      servei: codiServei,
      descripcio: serveiData?.descripcio || '',
      unitat: '',
      tarifa: 0
    });
  };

  const handleUnitatChange = (codiUnitat: string) => {
    const tarifaClient = novaTascaForm.servei ? buscarTarifaClient(novaTascaForm.servei, codiUnitat) : 0;
    setNovaTascaForm({
      ...novaTascaForm,
      unitat: codiUnitat,
      tarifa: tarifaClient || 0
    });
  };

  const guardarNovaTasca = () => {
    if (!novaTascaForm.servei || !novaTascaForm.unitat) {
      alert('Has de seleccionar un servei i una unitat');
      return;
    }

    const serveiData = parametres?.serveis.find((s: any) => s.codi === novaTascaForm.servei);
    const categoria = serveiData?.categoria || '';

    const novaTasca: any = {
      id: `task-${Date.now()}-${Math.random()}`,
      categoria: categoria,
      servei: novaTascaForm.servei,
      descripcio: novaTascaForm.descripcio,
      quantitat: novaTascaForm.quantitat,
      unitat: novaTascaForm.unitat,
      tarifa: novaTascaForm.tarifa,
      importe: novaTascaForm.quantitat * novaTascaForm.tarifa,
      ordre: formData.tasques.filter((t: any) => t.categoria === categoria).length
    };

    setFormData({
      ...formData,
      tasques: [...formData.tasques, novaTasca]
    });

    setNovaTascaForm({
      servei: '',
      descripcio: '',
      quantitat: 1,
      unitat: '',
      tarifa: 0
    });
    setShowAfegirTascaModal(false);
  };

  return (
    <div>
      {/* TOTALES SUPERIORES */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ 
          padding: '1rem', 
          background: 'var(--color-bg-tertiary)', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
            DESPESES
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {totalGastos.toFixed(2)}€
          </div>
        </div>
        
        <div style={{ 
          padding: '1rem', 
          background: 'var(--color-bg-tertiary)', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
            TOTAL PRESSUPOST
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {totalPressupost.toFixed(2)}€
          </div>
        </div>
        
        <div style={{ 
          padding: '1rem', 
          background: benefici >= 0 ? 'var(--color-success-bg)' : 'var(--color-error-bg)', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
            BENEFICI
          </div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: 700, 
            color: benefici >= 0 ? 'var(--color-success-dark)' : 'var(--color-error-darker)'
          }}>
            {benefici.toFixed(2)}€
          </div>
        </div>
        
        <div style={{ 
          padding: '1rem', 
          background: benefici >= 0 ? 'var(--color-success-bg)' : 'var(--color-error-bg)', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
            % BENEFICI
          </div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: 700, 
            color: benefici >= 0 ? 'var(--color-success-dark)' : 'var(--color-error-darker)'
          }}>
            {percentBenefici.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* BOTÓN AFEGIR TASCA */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowAfegirTascaModal(true)}
          disabled={clientBlocked}
        >
          + Afegir Tasca
        </button>
      </div>

      {/* TABLA DE TASQUES AGRUPADAS POR CATEGORÍA */}
      {formData.tasques.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
          No hi ha tasques. Fes clic a "Afegir Tasca" o afegeix recursos humans a la pestanya anterior.
        </p>
      ) : (
        <div>
          {Object.entries(tasquesAgrupades).map(([categoriaNom, tasques]: [string, any]) => (
            <div key={categoriaNom} style={{ marginBottom: '2rem' }}>
              {/* HEADER DE CATEGORÍA */}
              <div style={{ 
                background: 'var(--color-accent-primary)', 
                color: 'white',
                padding: '0.75rem 1rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                borderRadius: '4px 4px 0 0',
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{categoriaNom}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => moureCategoría(categoriaNom, 'amunt')}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                    title="Moure categoria amunt"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moureCategoría(categoriaNom, 'avall')}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                    title="Moure categoria avall"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {/* TABLA DE TASQUES DE ESTA CATEGORÍA */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '180px' }}>Servei</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '35%' }}>Descripció</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '60px' }}>Quantitat</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '180px' }}>Unitat</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '130px' }}>Tarifa (€)</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Import (€)</th>
                    <th style={{ width: '100px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tasques.map((tasca: any) => {
                    const serveiData = parametres?.serveis.find((s: any) => s.codi === tasca.servei);
                    const unitatData = parametres?.unitats.find((u: any) => u.codi === tasca.unitat);
                    
                    return (
                      <tr key={tasca.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          {tasca.categoria === 'MATERIALS' ? (
                            <div style={{ 
                              padding: '0.5rem',
                              background: 'var(--color-bg-tertiary)',
                              borderRadius: '4px',
                              color: 'var(--color-text-secondary)',
                              fontSize: '0.9rem'
                            }}>
                              {tasca.servei}
                            </div>
                          ) : (
                            <SearchableSelect
                              value={tasca.servei}
                              onChange={(value) => actualitzarTasca(tasca.id, 'servei', value)}
                              options={parametres?.serveis.map((s: any) => ({ value: s.codi, label: s.nom })) || []}
                              placeholder="Selecciona servei..."
                              disabled={pressupostBloquejat}
                            />
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <textarea
                            className="form-input"
                            value={tasca.descripcio}
                            onChange={(e) => actualitzarTasca(tasca.id, 'descripcio', e.target.value)}
                            rows={2}
                            style={{ resize: 'vertical' }}
                            placeholder="Descripció del servei..."
                            disabled={pressupostBloquejat}
                          />
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="number"
                            className="form-input"
                            value={tasca.quantitat}
                            onChange={(e) => actualitzarTasca(tasca.id, 'quantitat', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            style={{ textAlign: 'right' }}
                            disabled={pressupostBloquejat}
                          />
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {tasca.categoria === 'MATERIALS' ? (
                            <div style={{ 
                              padding: '0.5rem',
                              background: 'var(--color-bg-tertiary)',
                              borderRadius: '4px',
                              color: 'var(--color-text-tertiary)',
                              fontSize: '0.9rem',
                              textAlign: 'center'
                            }}>
                              -
                            </div>
                          ) : (
                            <SearchableSelect
                              value={tasca.unitat}
                              onChange={(value) => actualitzarTasca(tasca.id, 'unitat', value)}
                              options={parametres?.unitats.map((u: any) => ({ value: u.codi, label: u.nom })) || []}
                              placeholder="Selecciona unitat..."
                              disabled={pressupostBloquejat}
                            />
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="number"
                            className="form-input"
                            value={tasca.tarifa}
                            onChange={(e) => actualitzarTasca(tasca.id, 'tarifa', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            style={{ textAlign: 'right' }}
                            disabled={pressupostBloquejat}
                          />
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>
                          {tasca.importe.toFixed(2)}€
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => moureTasca(tasca.id, 'amunt')}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                color: 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Moure amunt"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moureTasca(tasca.id, 'avall')}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                color: 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Moure avall"
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarTasca(tasca.id)}
                              disabled={pressupostBloquejat}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-error)',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                opacity: pressupostBloquejat ? 0.5 : 1
                              }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* MODAL AFEGIR TASCA */}
      {showAfegirTascaModal && (
        <div className="modal-overlay" onClick={() => setShowAfegirTascaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Afegir Tasca</h2>
              <button className="modal-close" onClick={() => setShowAfegirTascaModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Servei *</label>
                <SearchableSelect
                  value={novaTascaForm.servei}
                  onChange={(value) => {
                    const serveiData = parametres?.serveis.find((s: any) => s.codi === value);
                    setNovaTascaForm({ 
                      ...novaTascaForm, 
                      servei: value,
                      descripcio: serveiData?.descripcio || ''
                    });
                  }}
                  options={parametres?.serveis.map((s: any) => ({ value: s.codi, label: s.nom })) || []}
                  placeholder="Selecciona servei..."
                  disabled={pressupostBloquejat}
                />
              </div>

              <div className="form-group">
                <label>Descripció</label>
                <textarea
                  className="form-input"
                  value={novaTascaForm.descripcio}
                  onChange={(e) => setNovaTascaForm({ ...novaTascaForm, descripcio: e.target.value })}
                  disabled={pressupostBloquejat}
                  rows={3}
                  placeholder="Descripció del servei..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Quantitat *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={novaTascaForm.quantitat}
                    onChange={(e) => setNovaTascaForm({ ...novaTascaForm, quantitat: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    disabled={pressupostBloquejat}
                  />
                </div>

                <div className="form-group">
                  <label>Unitat *</label>
                  <select
                    className="form-input"
                    value={novaTascaForm.unitat}
                    onChange={(e) => handleUnitatChange(e.target.value)}
                    disabled={pressupostBloquejat}
                  >
                    <option value="">Selecciona unitat...</option>
                    {parametres?.unitats.map((u: any) => (
                      <option key={u.codi} value={u.codi}>{u.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Tarifa (€)</label>
                <input
                  type="number"
                  className="form-input"
                  value={novaTascaForm.tarifa}
                  onChange={(e) => setNovaTascaForm({ ...novaTascaForm, tarifa: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  disabled={pressupostBloquejat}
                />
              </div>

              <div style={{ 
                padding: '1rem', 
                background: 'var(--color-bg-tertiary)', 
                borderRadius: '6px',
                marginTop: '1rem'
              }}>
                <strong>Import total:</strong> {(novaTascaForm.quantitat * novaTascaForm.tarifa).toFixed(2)}€
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowAfegirTascaModal(false)}
              >
                Cancel·lar
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={guardarNovaTasca}
              >
                Afegir Tasca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}