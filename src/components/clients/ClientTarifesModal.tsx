import React from 'react';
import { X, Trash2 } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';
import type { Client, Tarifa } from '../../types/client';
import { storage } from '../../utils/storageManager';

interface ClientTarifesModalProps {
  formData: Client;
  setFormData: (data: Client) => void;
  parametres: any;
  onClose: () => void;
}

export default function ClientTarifesModal({ 
  formData, 
  setFormData, 
  parametres, 
  onClose 
}: ClientTarifesModalProps) {

  const afegirTarifaEspecial = () => {
    const allClients = storage.getClients();
    const allProveidors = storage.getProveidors();
    
    const tarifesGenerals = parametres?.tarifes || [];
    const tarifesClientsGuardades = allClients.flatMap((c: Client) => c.tarifesEspecials || []);
    const tarifesProveidorsGuardades = allProveidors.flatMap((p: any) => p.tarifesEspecials || []);
    const tarifesActuals = formData.tarifesEspecials || [];
    const totesTarifes = [...tarifesGenerals, ...tarifesClientsGuardades, ...tarifesProveidorsGuardades, ...tarifesActuals];
    
    const maxCodi = totesTarifes.length === 0 
      ? 0 
      : Math.max(...totesTarifes.map(t => parseInt(t.codi.split('-')[1])));
    
    const novaTarifa: Tarifa = {
      codi: `TRF-${String(maxCodi + 1).padStart(5, '0')}`,
      servei: '',
      unitat: '',
      preu: 0
    };
    
    setFormData({
      ...formData,
      tarifesEspecials: [...(formData.tarifesEspecials || []), novaTarifa]
    });
  };

  const actualitzarTarifaEspecial = (index: number, field: keyof Tarifa, value: string | number) => {
    const novesTarifes = [...(formData.tarifesEspecials || [])];
    novesTarifes[index] = { ...novesTarifes[index], [field]: value };
    setFormData({ ...formData, tarifesEspecials: novesTarifes });
  };

  const eliminarTarifaEspecial = (index: number) => {
    setFormData({
      ...formData,
      tarifesEspecials: (formData.tarifesEspecials || []).filter((_, i) => i !== index)
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h2>Tarifes especials - {formData.nomComercial || 'Client'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn-primary" onClick={afegirTarifaEspecial}>
              + Afegir Tarifa
            </button>
          </div>

          {(!formData.tarifesEspecials || formData.tarifesEspecials.length === 0) ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
              No hi ha tarifes especials. Fes clic a "Afegir Tarifa".
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Servei</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Unitat</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Preu (€)</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {formData.tarifesEspecials.map((tarifa, index) => (
                  <tr key={tarifa.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                      {tarifa.codi}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <SearchableSelect
                        value={tarifa.servei}
                        onChange={(value) => actualitzarTarifaEspecial(index, 'servei', value)}
                        options={parametres.serveis.map((s: any) => ({ value: s.codi, label: s.nom }))}
                        placeholder="Selecciona servei..."
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <SearchableSelect
                        value={tarifa.unitat}
                        onChange={(value) => actualitzarTarifaEspecial(index, 'unitat', value)}
                        options={parametres.unitats.map((u: any) => ({ value: u.codi, label: u.nom }))}
                        placeholder="Selecciona unitat..."
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={tarifa.preu}
                        onChange={(e) => actualitzarTarifaEspecial(index, 'preu', parseFloat(e.target.value))}
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
          <button className="btn-primary" onClick={onClose}>
            Acceptar
          </button>
        </div>
      </div>
    </div>
  );
}