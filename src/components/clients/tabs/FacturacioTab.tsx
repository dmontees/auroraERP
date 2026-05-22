import React from 'react';
import SearchableSelect from '../../common/SearchableSelect';
import type { Client } from '../../../types/client';

interface FacturacioTabProps {
  formData: Client;
  setFormData: (data: Client) => void;
  onOpenTarifes: () => void;
}

export default function FacturacioTab({ formData, setFormData, onOpenTarifes }: FacturacioTabProps) {
  return (
    <div>
      <div className="form-section">
        <h3>Dades fiscals</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Tipus d'IVA</label>
            <SearchableSelect
              value={formData.tipusIVA}
              onChange={(value) => setFormData({ ...formData, tipusIVA: value as 'Normal' | 'Exempt' | 'Reduit' | 'Superreduit' })}
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
            <label>% Retenció IRPF</label>
            <input
              type="number"
              className="form-input"
              value={formData.retencio}
              onChange={(e) => setFormData({ ...formData, retencio: parseFloat(e.target.value) })}
              min="0"
              max="100"
              step="0.01"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Tarifes especials</h3>
        <button
          type="button"
          className="btn-secondary"
          style={{ width: '100%' }}
          onClick={onOpenTarifes}
        >
          {formData.tarifesEspecials && formData.tarifesEspecials.length > 0
            ? `Preus especials (${formData.tarifesEspecials.length} tarifes)`
            : 'Configurar preus especials'}
        </button>
      </div>
    </div>
  );
}