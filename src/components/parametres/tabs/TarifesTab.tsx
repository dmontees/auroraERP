import React from 'react';
import { Trash2 } from 'lucide-react';

interface TarifesTabProps {
  hook: {
    parametres: any;
    afegirTarifa: () => void;
    actualitzarTarifa: (index: number, field: string, value: any) => void;
    eliminarTarifa: (index: number) => void;
  };
}

export default function TarifesTab({ hook }: TarifesTabProps) {
  const {
    parametres,
    afegirTarifa,
    actualitzarTarifa,
    eliminarTarifa
  } = hook;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn-primary" onClick={afegirTarifa}>
          + Afegir Tarifa
        </button>
      </div>

      {parametres.tarifes.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
          No hi ha tarifes definides. Primer defineix serveis i unitats, després crea tarifes.
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
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Servei</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Unitat</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Preu (€)</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {parametres.tarifes.map((tarifa: any, index: number) => (
                <tr key={tarifa.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                    {tarifa.codi}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <select
                      className="form-input"
                      value={tarifa.servei}
                      onChange={(e) => actualitzarTarifa(index, 'servei', e.target.value)}
                      style={{ padding: '0.5rem' }}
                    >
                      <option value="">Selecciona servei...</option>
                      {parametres.serveis.map((s: any) => (
                        <option key={s.codi} value={s.codi}>{s.nom}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <select
                      className="form-input"
                      value={tarifa.unitat}
                      onChange={(e) => actualitzarTarifa(index, 'unitat', e.target.value)}
                      style={{ padding: '0.5rem' }}
                    >
                      <option value="">Selecciona unitat...</option>
                      {parametres.unitats.map((u: any) => (
                        <option key={u.codi} value={u.codi}>{u.nom}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      type="number"
                      className="form-input"
                      value={tarifa.preu}
                      onChange={(e) => actualitzarTarifa(index, 'preu', parseFloat(e.target.value))}
                      style={{ padding: '0.5rem' }}
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => eliminarTarifa(index)}
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