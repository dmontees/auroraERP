import React from 'react';
import { Trash2 } from 'lucide-react';

interface CategoriesProveidorsTabProps {
  hook: {
    parametres: any;
    afegirCategoriaProveidor: () => void;
    actualitzarCategoriaProveidor: (codi: string, field: string, value: any) => void;
    eliminarCategoriaProveidor: (codi: string) => void;
    categoriaProveidorEnUs: (codi: string) => boolean;
  };
}

export default function CategoriesProveidorsTab({ hook }: CategoriesProveidorsTabProps) {
  const {
    parametres,
    afegirCategoriaProveidor,
    actualitzarCategoriaProveidor,
    eliminarCategoriaProveidor,
    categoriaProveidorEnUs
  } = hook;

  // SIN ordenación - mostrar tal como están guardadas
  const categories = parametres.categoriesProveidors || [];

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          className="btn-primary" 
          onClick={afegirCategoriaProveidor}
        >
          + Afegir Categoria
        </button>
      </div>

      {categories.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '3rem' }}>
          No hi ha categories de proveïdors definides. Fes clic a "Afegir Categoria" per crear-ne una.
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
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Color</th>
                <th style={{ width: '100px' }}></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((categoria: any) => {
                const enUs = categoriaProveidorEnUs(categoria.codi);

                return (
                  <tr key={categoria.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
                      {categoria.codi}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={categoria.nom}
                        onChange={(e) => actualitzarCategoriaProveidor(categoria.codi, 'nom', e.target.value)}
                        placeholder="Nom de la categoria..."
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="color"
                          value={categoria.color}
                          onChange={(e) => actualitzarCategoriaProveidor(categoria.codi, 'color', e.target.value)}
                          style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        />
                        <span style={{ 
                          padding: '0.25rem 0.75rem',
                          background: categoria.color,
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}>
                          {categoria.nom || 'Sense nom'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {!enUs && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Segur que vols eliminar la categoria "${categoria.nom}"?`)) {
                              eliminarCategoriaProveidor(categoria.codi);
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
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}