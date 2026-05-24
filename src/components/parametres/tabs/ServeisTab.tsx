import React, { useState } from 'react';
import { Trash2, Settings, X } from 'lucide-react';

interface ServeisTabProps {
  hook: {
    parametres: any;
    saveParametres: (params: any) => void;
    serveiEnUs: (codi: string) => boolean;
    categoriaEnUs: (codi: string) => boolean;
    afegirCategoria: () => void;
    actualitzarCategoria: (index: number, nom: string) => void;
    eliminarCategoria: (index: number) => void;
    afegirServei: () => void;
    actualitzarServei: (index: number, field: string, value: any) => void;
    eliminarServei: (index: number) => void;
  };
}

export default function ServeisTab({ hook }: ServeisTabProps) {
  const {
    parametres,
    saveParametres,
    serveiEnUs,
    categoriaEnUs,
    afegirCategoria,
    actualitzarCategoria,
    eliminarCategoria,
    afegirServei,
    actualitzarServei,
    eliminarServei
  } = hook;

  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <button className="btn-primary" onClick={afegirServei}>
          + Afegir Servei
        </button>
        <button className="btn-secondary" onClick={() => setShowCategoriesModal(true)}>
          Gestionar Categories
        </button>
      </div>

      {parametres.serveis.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
          No hi ha serveis definits. Fes clic a "Afegir Servei" per crear-ne un.
        </p>
      ) : (
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Categoria</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Descripció</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {parametres.serveis.map((servei: any, index: number) => {
                const categoria = parametres.categories.find((c: any) => c.codi === servei.categoria);
                
                return (
                  <tr key={servei.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                      {servei.codi}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {serveiEnUs(servei.codi) ? (
                        categoria?.nom || '-'
                      ) : (
                        <select
                          className="form-input"
                          value={servei.categoria}
                          onChange={(e) => actualitzarServei(index, 'categoria', e.target.value)}
                          style={{ padding: '0.5rem' }}
                        >
                          <option value="">Sense categoria</option>
                          {(parametres.categories || []).map((c: any) => (
                            <option key={c.codi} value={c.codi}>{c.nom}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {serveiEnUs(servei.codi) ? (
                        servei.nom
                      ) : (
                        <input
                          type="text"
                          className="form-input"
                          value={servei.nom}
                          onChange={(e) => actualitzarServei(index, 'nom', e.target.value)}
                          style={{ padding: '0.5rem' }}
                          placeholder="Nom del servei"
                        />
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {serveiEnUs(servei.codi) ? (
                        servei.descripcio
                      ) : (
                        <input
                          type="text"
                          className="form-input"
                          value={servei.descripcio}
                          onChange={(e) => actualitzarServei(index, 'descripcio', e.target.value)}
                          style={{ padding: '0.5rem' }}
                          placeholder="Descripció"
                        />
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {!serveiEnUs(servei.codi) && (
                        <button
                          type="button"
                          onClick={() => eliminarServei(index)}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: GESTIÓ DE CATEGORIES */}
      {showCategoriesModal && (
        <div className="modal-overlay" onClick={() => setShowCategoriesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>
                <Settings size={24} />
                Gestió de Categories
              </h2>
              <button className="modal-close" onClick={() => setShowCategoriesModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={afegirCategoria}>
                  + Afegir Categoria
                </button>
              </div>

              {(!parametres.categories || parametres.categories.length === 0) ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                  No hi ha categories definides.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600, width: '15%' }}>Codi</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom CA</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom ES</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom EN</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(parametres.categories || []).map((categoria: any, index: number) => (
                      <tr key={categoria.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                          {categoria.codi}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {categoriaEnUs(categoria.codi) ? (
                            <span style={{ fontSize: '0.9rem' }}>{categoria.nom}</span>
                          ) : (
                            <input
                              type="text"
                              className="form-input"
                              value={categoria.nom}
                              onChange={(e) => actualitzarCategoria(index, e.target.value)}
                              style={{ padding: '0.4rem 0.5rem' }}
                              placeholder="Nom de la categoria"
                            />
                          )}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={categoria.nomEs || ''}
                            onChange={(e) => {
                              const noves = [...parametres.categories];
                              noves[index] = { ...noves[index], nomEs: e.target.value };
                              saveParametres({ ...parametres, categories: noves });
                            }}
                            placeholder="Castellano..."
                            style={{ padding: '0.4rem 0.5rem' }}
                          />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={categoria.nomEn || ''}
                            onChange={(e) => {
                              const noves = [...parametres.categories];
                              noves[index] = { ...noves[index], nomEn: e.target.value };
                              saveParametres({ ...parametres, categories: noves });
                            }}
                            placeholder="English..."
                            style={{ padding: '0.4rem 0.5rem' }}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {!categoriaEnUs(categoria.codi) && (
                            <button
                              type="button"
                              onClick={() => eliminarCategoria(index)}
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
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowCategoriesModal(false)}>
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}