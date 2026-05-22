import React, { useState } from 'react';
import { Trash2, FileText, X, Settings } from 'lucide-react';

interface PlantillesTabProps {
  hook: {
    parametres: any;
    getNextPlantillaCode: () => string;
    saveParametres: (params: any) => void;
    actualitzarPlantilla: (index: number, field: string, value: any) => void;
    eliminarPlantilla: (index: number) => void;
    afegirTipusPlantilla: () => void;
    actualitzarTipusPlantilla: (index: number, nom: string) => void;
    eliminarTipusPlantilla: (index: number) => void;
  };
}

export default function PlantillesTab({ hook }: PlantillesTabProps) {
  const {
    parametres,
    getNextPlantillaCode,
    saveParametres,
    actualitzarPlantilla,
    eliminarPlantilla,
    afegirTipusPlantilla,
    actualitzarTipusPlantilla,
    eliminarTipusPlantilla
  } = hook;

  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<any>(null);
  const [showTipusPlantillesModal, setShowTipusPlantillesModal] = useState(false);

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <button className="btn-primary" onClick={() => {
          setEditingPlantilla(null);
          setShowPlantillaModal(true);
        }}>
          + Afegir Plantilla
        </button>
        <button className="btn-secondary" onClick={() => setShowTipusPlantillesModal(true)}>
          Gestionar Tipus
        </button>
      </div>

      {parametres.plantilles.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
          No hi ha plantilles definides. Fes clic a "Afegir Plantilla" per crear-ne una.
        </p>
      ) : (
        <div>
          {/* Agrupar plantillas por tipo */}
          {parametres.tipusPlantilles.map((tipus: any) => {
            const plantillesTipus = parametres.plantilles.filter((p: any) => p.tipusPlantilla === tipus.codi);
            if (plantillesTipus.length === 0) return null;

            return (
              <div key={tipus.codi} style={{ marginBottom: '2rem' }}>
                <div style={{ 
                  background: 'var(--color-accent-primary)', 
                  color: 'white',
                  padding: '0.75rem 1rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  borderRadius: '4px 4px 0 0',
                  textTransform: 'uppercase'
                }}>
                  {tipus.nom}
                </div>

                <div style={{
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '12%' }}>Codi</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '18%' }}>Títol</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '50%' }}>Text</th>
                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '10%' }}>Per defecte</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {plantillesTipus.map((plantilla: any) => {
                        const realIndex = parametres.plantilles.findIndex((p: any) => p.codi === plantilla.codi);
                        
                        return (
                          <tr 
                            key={plantilla.codi} 
                            onClick={() => {
                              setEditingPlantilla(plantilla);
                              setShowPlantillaModal(true);
                            }}
                            style={{ 
                              borderBottom: '1px solid var(--color-border)',
                              cursor: 'pointer'
                            }}
                            className="table-row-hover"
                          >
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                              {plantilla.codi}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {plantilla.titol || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Sense títol</span>}
                            </td>
                            <td style={{ padding: '0.75rem', maxWidth: '400px' }}>
                              <div style={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {plantilla.text || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Sense text</span>}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {plantilla.perDefecte ? (
                                <span style={{
                                  background: '#10b981',
                                  color: 'white',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}>
                                  SÍ
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>No</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Segur que vols eliminar aquesta plantilla?')) {
                                    eliminarPlantilla(realIndex);
                                  }
                                }}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Plantillas sin tipo asignado */}
          {parametres.plantilles.filter((p: any) => !p.tipusPlantilla).length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                background: '#6b7280', 
                color: 'white',
                padding: '0.75rem 1rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                borderRadius: '4px 4px 0 0',
                textTransform: 'uppercase'
              }}>
                Sense tipus assignat
              </div>

              <div style={{
                border: '1px solid var(--color-border)',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {parametres.plantilles.filter((p: any) => !p.tipusPlantilla).map((plantilla: any) => {
                      const realIndex = parametres.plantilles.findIndex((p: any) => p.codi === plantilla.codi);
                      
                      return (
                        <tr 
                          key={plantilla.codi}
                          onClick={() => {
                            setEditingPlantilla(plantilla);
                            setShowPlantillaModal(true);
                          }}
                          style={{ 
                            borderBottom: '1px solid var(--color-border)',
                            cursor: 'pointer'
                          }}
                          className="table-row-hover"
                        >
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)', width: '15%' }}>
                            {plantilla.codi}
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', width: '20%' }}>
                            Sense tipus
                          </td>
                          <td style={{ padding: '0.75rem', width: '60%' }}>
                            {plantilla.titol || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Sense títol</span>}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', width: '50px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Segur que vols eliminar aquesta plantilla?')) {
                                  eliminarPlantilla(realIndex);
                                }
                              }}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: GESTIÓ DE TIPUS PLANTILLES */}
      {showTipusPlantillesModal && (
        <div className="modal-overlay" onClick={() => setShowTipusPlantillesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>
                <Settings size={24} />
                Gestió de Tipus de Plantilles
              </h2>
              <button className="modal-close" onClick={() => setShowTipusPlantillesModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={afegirTipusPlantilla}>
                  + Afegir Tipus
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {parametres.tipusPlantilles.map((tipus: any, index: number) => (
                    <tr key={tipus.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                        {tipus.codi}
                        {tipus.esDefault && (
                          <span style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.7rem',
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '3px',
                            fontWeight: 600
                          }}>
                            DEFAULT
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {tipus.esDefault ? (
                          tipus.nom
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={tipus.nom}
                            onChange={(e) => actualitzarTipusPlantilla(index, e.target.value)}
                            placeholder="Nom del tipus"
                          />
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {!tipus.esDefault && (
                          <button
                            type="button"
                            onClick={() => eliminarTipusPlantilla(index)}
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
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowTipusPlantillesModal(false)}>
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PLANTILLA */}
      {showPlantillaModal && (
        <div className="modal-overlay" onClick={() => setShowPlantillaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>
                <FileText size={24} />
                {editingPlantilla ? 'Editar Plantilla' : 'Nova Plantilla'}
              </h2>
              <button className="modal-close" onClick={() => setShowPlantillaModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const tipusPlantilla = formData.get('tipusPlantilla') as string;
                const titol = formData.get('titol') as string;
                const text = formData.get('text') as string;
                const perDefecte = formData.get('perDefecte') === 'on';

                if (!titol.trim()) {
                  alert('El títol és obligatori');
                  return;
                }

                if (editingPlantilla) {
                  const index = parametres.plantilles.findIndex((p: any) => p.codi === editingPlantilla.codi);
                  actualitzarPlantilla(index, 'tipusPlantilla', tipusPlantilla);
                  actualitzarPlantilla(index, 'titol', titol);
                  actualitzarPlantilla(index, 'text', text);
                  actualitzarPlantilla(index, 'perDefecte', perDefecte);
                } else {
                  const novaPlantilla = {
                    codi: getNextPlantillaCode(),
                    tipusPlantilla,
                    titol,
                    text,
                    perDefecte
                  };
                  saveParametres({ ...parametres, plantilles: [...parametres.plantilles, novaPlantilla] });
                }

                setShowPlantillaModal(false);
                setEditingPlantilla(null);
              }}>
                <div className="form-group">
                  <label>Tipus de plantilla *</label>
                  <select
                    name="tipusPlantilla"
                    className="form-input"
                    defaultValue={editingPlantilla?.tipusPlantilla || ''}
                    required
                  >
                    <option value="">Selecciona un tipus...</option>
                    {parametres.tipusPlantilles.map((tipus: any) => (
                      <option key={tipus.codi} value={tipus.codi}>{tipus.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Títol *</label>
                  <input
                    type="text"
                    name="titol"
                    className="form-input"
                    defaultValue={editingPlantilla?.titol || ''}
                    placeholder="Títol de la plantilla"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Text</label>
                  <textarea
                    name="text"
                    className="form-input"
                    defaultValue={editingPlantilla?.text || ''}
                    rows={8}
                    style={{ resize: 'vertical' }}
                    placeholder="Escriu el text de la plantilla..."
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="perDefecte"
                      defaultChecked={editingPlantilla?.perDefecte || false}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Utilitzar per defecte en aquests documents</span>
                  </label>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {editingPlantilla && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ background: 'var(--color-error)', color: 'white' }}
                        onClick={() => {
                          if (confirm('Segur que vols eliminar aquesta plantilla?')) {
                            const index = parametres.plantilles.findIndex((p: any) => p.codi === editingPlantilla.codi);
                            eliminarPlantilla(index);
                            setShowPlantillaModal(false);
                            setEditingPlantilla(null);
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowPlantillaModal(false);
                        setEditingPlantilla(null);
                      }}
                    >
                      Cancel·lar
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingPlantilla ? 'Actualitzar' : 'Crear'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}