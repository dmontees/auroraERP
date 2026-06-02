import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Proveidor, Tarifa } from '../../../types/proveidor';
import SearchableSelect from '../../common/SearchableSelect';

interface FacturacioTabProps {
  hook: {
    formData: Proveidor;
    setFormData: React.Dispatch<React.SetStateAction<Proveidor>>;
    parametres: any;
    afegirTarifaEspecial: () => void;
    actualitzarTarifaEspecial: (index: number, field: keyof Tarifa, value: string | number) => void;
    eliminarTarifaEspecial: (index: number) => void;
    copiarTarifesGenerals: () => void;
    netejaTarifes: () => void;
  };
}

export default function FacturacioTab({ hook }: FacturacioTabProps) {
  const {
    formData,
    setFormData,
    parametres,
    afegirTarifaEspecial,
    actualitzarTarifaEspecial,
    eliminarTarifaEspecial,
    copiarTarifesGenerals,
    netejaTarifes
  } = hook;

  const [showTarifesModal, setShowTarifesModal] = useState(false);
  const [askCopyTarifes, setAskCopyTarifes] = useState(false);

  // Abrir gestión de tarifas
  const obrirTarifesEspecials = () => {
    if (!formData.tarifesEspecials || formData.tarifesEspecials.length === 0) {
      setAskCopyTarifes(true);
    } else {
      setShowTarifesModal(true);
    }
  };

  // Copiar tarifas generales
  const handleCopiarTarifes = () => {
    copiarTarifesGenerals();
    setAskCopyTarifes(false);
    setShowTarifesModal(true);
  };

  // Comenzar con tarifas vacías
  const handleComenzarBuides = () => {
    netejaTarifes();
    setAskCopyTarifes(false);
    setShowTarifesModal(true);
  };

  return (
    <div>
      {/* SECCIÓN: DATOS FISCALES */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-text-primary)'
        }}>
          Dades fiscals
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '1rem' 
        }}>
          <div className="form-group">
            <label className="form-label">Tipus d'IVA</label>
            <SearchableSelect
              value={formData.tipusIVA}
              onChange={(value) => setFormData(prev => ({ 
                ...prev, 
                tipusIVA: value as Proveidor['tipusIVA']
              }))}
              options={[
                { value: 'Normal', label: 'Normal (21%)' },
                { value: 'Reduit', label: 'Reduit (10%)' },
                { value: 'Superreduit', label: 'Superreduit (4%)' },
                { value: 'Exempt', label: 'Exempt (0%)' }
              ]}
              placeholder="Selecciona tipus d'IVA..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">% Retenció IRPF</label>
            <input
              type="number"
              className="form-input"
              value={formData.retencio}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                retencio: parseFloat(e.target.value) || 0 
              }))}
              min="0"
              max="100"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN: TARIFAS ESPECIALES */}
      <div>
        <h3 style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-text-primary)'
        }}>
          Tarifes especials
        </h3>

        <button
          type="button"
          className="btn-secondary"
          style={{ width: '100%' }}
          onClick={obrirTarifesEspecials}
        >
          {formData.tarifesEspecials && formData.tarifesEspecials.length > 0
            ? `Tarifes del proveïdor (${formData.tarifesEspecials.length} tarifes)`
            : 'Configurar tarifes del proveïdor'}
        </button>

        {formData.tarifesEspecials && formData.tarifesEspecials.length > 0 && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f0f9ff',
            borderRadius: '6px',
            border: '1px solid var(--color-info-border)',
            fontSize: '0.875rem',
            color: 'var(--color-info-dark)'
          }}>
            Aquest proveïdor té <strong>{formData.tarifesEspecials.length} tarifes especials</strong> configurades
          </div>
        )}
      </div>

      {/* MODAL: PREGUNTAR SI COPIAR TARIFAS */}
      {askCopyTarifes && (
        <div className="modal-overlay" onClick={() => setAskCopyTarifes(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '500px' }}
          >
            <div className="modal-header">
              <h2>Tarifes especials</h2>
              <button className="modal-close" onClick={() => setAskCopyTarifes(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1.5rem' }}>
                Vols copiar les tarifes generals actuals com a punt de partida?
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="btn-primary" 
                  onClick={handleCopiarTarifes}
                  style={{ flex: 1 }}
                >
                  Sí, copiar tarifes
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={handleComenzarBuides}
                  style={{ flex: 1 }}
                >
                  No, començar buit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GESTIÓN TARIFAS ESPECIALES */}
      {showTarifesModal && parametres && (
        <div className="modal-overlay" onClick={() => setShowTarifesModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '900px' }}
          >
            <div className="modal-header">
              <h2>
                Tarifes del proveïdor - {formData.nomComercial || formData.nomFiscal}
              </h2>
              <button className="modal-close" onClick={() => setShowTarifesModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <button 
                  className="btn-primary" 
                  onClick={afegirTarifaEspecial}
                >
                  + Afegir Tarifa
                </button>
              </div>

              {(!formData.tarifesEspecials || formData.tarifesEspecials.length === 0) ? (
                <p style={{ 
                  textAlign: 'center', 
                  color: 'var(--color-text-tertiary)', 
                  padding: '2rem' 
                }}>
                  No hi ha tarifes especials. Fes clic a "Afegir Tarifa".
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem', 
                        fontSize: '0.85rem', 
                        fontWeight: 600 
                      }}>
                        Codi
                      </th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem', 
                        fontSize: '0.85rem', 
                        fontWeight: 600 
                      }}>
                        Servei
                      </th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem', 
                        fontSize: '0.85rem', 
                        fontWeight: 600 
                      }}>
                        Unitat
                      </th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem', 
                        fontSize: '0.85rem', 
                        fontWeight: 600 
                      }}>
                        Preu (€)
                      </th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.tarifesEspecials.map((tarifa, index) => (
                      <tr 
                        key={tarifa.codi} 
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                      >
                        <td style={{ 
                          padding: '0.75rem', 
                          fontSize: '0.85rem', 
                          color: 'var(--color-text-tertiary)' 
                        }}>
                          {tarifa.codi}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <SearchableSelect
                            value={tarifa.servei}
                            onChange={(value) => actualitzarTarifaEspecial(index, 'servei', value)}
                            options={parametres.serveis?.map((s: any) => ({ 
                              value: s.codi, 
                              label: s.descripcio 
                            })) || []}
                            placeholder="Selecciona servei..."
                          />
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <SearchableSelect
                            value={tarifa.unitat}
                            onChange={(value) => actualitzarTarifaEspecial(index, 'unitat', value)}
                            options={parametres.unitats?.map((u: any) => ({ 
                              value: u.codi, 
                              label: u.nom 
                            })) || []}
                            placeholder="Selecciona unitat..."
                          />
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="number"
                            className="form-input"
                            value={tarifa.preu}
                            onChange={(e) => actualitzarTarifaEspecial(
                              index, 
                              'preu', 
                              parseFloat(e.target.value) || 0
                            )}
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => eliminarTarifaEspecial(index)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-error)',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn-primary" 
                onClick={() => setShowTarifesModal(false)}
              >
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}