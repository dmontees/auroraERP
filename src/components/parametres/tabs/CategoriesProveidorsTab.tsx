import React from 'react';
import { Trash2 } from 'lucide-react';

interface CategoriesProveidorsTabProps {
  hook: {
    parametres: any;
    afegirCategoriaProveidor: () => void;
    actualitzarCategoriaProveidor: (codi: string, field: string, value: any) => void;
    eliminarCategoriaProveidor: (codi: string) => void;
    categoriaProveidorEnUs: (codi: string) => boolean;
    afegirCategoriaAcreedor: () => void;
    actualitzarCategoriaAcreedor: (codi: string, field: string, value: any) => void;
    eliminarCategoriaAcreedor: (codi: string) => void;
    categoriaAcreedorEnUs: (codi: string) => boolean;
  };
}

function CategoriesTable({
  categories,
  onAfegir,
  onActualitzar,
  onEliminar,
  enUs,
  labelAfegir,
}: {
  categories: any[];
  onAfegir: () => void;
  onActualitzar: (codi: string, field: string, value: any) => void;
  onEliminar: (codi: string) => void;
  enUs: (codi: string) => boolean;
  labelAfegir: string;
}) {
  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn-primary" onClick={onAfegir}>
          + {labelAfegir}
        </button>
      </div>

      {categories.length === 0 ? (
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem', padding: '2rem 0', textAlign: 'center' }}>
          Cap categoria definida
        </p>
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>Codi</th>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>Nom</th>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>Color</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((categoria: any) => {
                const used = enUs(categoria.codi);
                return (
                  <tr key={categoria.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-text-tertiary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {categoria.codi}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={categoria.nom}
                        onChange={(e) => onActualitzar(categoria.codi, 'nom', e.target.value)}
                        placeholder="Nom..."
                        style={{ fontSize: '0.85rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="color"
                          value={categoria.color}
                          onChange={(e) => onActualitzar(categoria.codi, 'color', e.target.value)}
                          style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
                        />
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          background: categoria.color,
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {categoria.nom || 'Sense nom'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      {!used && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Eliminar "${categoria.nom}"?`)) onEliminar(categoria.codi);
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <Trash2 size={16} />
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

export default function CategoriesProveidorsTab({ hook }: CategoriesProveidorsTabProps) {
  const {
    parametres,
    afegirCategoriaProveidor,
    actualitzarCategoriaProveidor,
    eliminarCategoriaProveidor,
    categoriaProveidorEnUs,
    afegirCategoriaAcreedor,
    actualitzarCategoriaAcreedor,
    eliminarCategoriaAcreedor,
    categoriaAcreedorEnUs,
  } = hook;

  const categoriesProveidors = parametres.categoriesProveidors || [];
  const categoriesAcreedor = parametres.categoriesAcreedor || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
      {/* Columna esquerra: Categories de proveïdors */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--color-text-primary)' }}>
          Categories de proveïdors
        </h3>
        <CategoriesTable
          categories={categoriesProveidors}
          onAfegir={afegirCategoriaProveidor}
          onActualitzar={actualitzarCategoriaProveidor}
          onEliminar={eliminarCategoriaProveidor}
          enUs={categoriaProveidorEnUs}
          labelAfegir="Afegir categoria"
        />
      </div>

      {/* Columna dreta: Categories d'acreedor */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--color-text-primary)' }}>
          Categories d'acreedor
        </h3>
        <CategoriesTable
          categories={categoriesAcreedor}
          onAfegir={afegirCategoriaAcreedor}
          onActualitzar={actualitzarCategoriaAcreedor}
          onEliminar={eliminarCategoriaAcreedor}
          enUs={categoriaAcreedorEnUs}
          labelAfegir="Afegir categoria"
        />
      </div>
    </div>
  );
}
