import React from 'react';
import { Trash2 } from 'lucide-react';

interface ModalitatsTabProps {
  hook: {
    parametres: any;
    getNextModalitatCode: () => string;
    afegirModalitat: (modalitat: any) => void;
    actualitzarModalitat: (modalitat: any) => void;
    eliminarModalitat: (codi: string) => void;
  };
}

export default function ModalitatsTab({ hook }: ModalitatsTabProps) {
  const {
    parametres,
    getNextModalitatCode,
    afegirModalitat,
    actualitzarModalitat,
    eliminarModalitat
  } = hook;

  // Colores predefinidos (solo para auto-asignar al crear) — must stay as hex for <input type="color">
  const colorsPredeferts = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
    '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#06b6d4'
  ];

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          className="btn-primary" 
          onClick={() => {
            const nouCodi = getNextModalitatCode();
            const novaModalitat = {
              codi: nouCodi,
              nom: '',
              color: colorsPredeferts[parametres.modalitats?.length % colorsPredeferts.length || 0],
              descripcio: ''
            };
            afegirModalitat(novaModalitat);
          }}
        >
          + Afegir Modalitat
        </button>
      </div>

      {!parametres.modalitats || parametres.modalitats.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '3rem' }}>
          No hi ha modalitats definides. Fes clic a "Afegir Modalitat" per crear-ne una.
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
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Descripció</th>
                <th style={{ width: '100px' }}></th>
              </tr>
            </thead>
            <tbody>
              {parametres.modalitats.map((modalitat: any) => (
                <tr key={modalitat.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
                    {modalitat.codi}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={modalitat.nom}
                      onChange={(e) => actualitzarModalitat({ ...modalitat, nom: e.target.value })}
                      placeholder="Nom de la modalitat..."
                    />
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={modalitat.color}
                        onChange={(e) => actualitzarModalitat({ ...modalitat, color: e.target.value })}
                        style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      />
                      <span style={{ 
                        padding: '0.25rem 0.75rem',
                        background: modalitat.color,
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}>
                        {modalitat.nom || 'Sense nom'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={modalitat.descripcio || ''}
                      onChange={(e) => actualitzarModalitat({ ...modalitat, descripcio: e.target.value })}
                      placeholder="Descripció opcional..."
                    />
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => eliminarModalitat(modalitat.codi)}
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
        </div>
      )}
    </div>
  );
}