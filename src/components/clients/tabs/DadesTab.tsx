import React from 'react';
import SearchableSelect from '../../common/SearchableSelect';
import type { Client } from '../../../types/client';

interface DadesTabProps {
  formData: Client;
  setFormData: (data: Client) => void;
}

export default function DadesTab({ formData, setFormData }: DadesTabProps) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Codi</label>
          <input
            type="text"
            className="form-input"
            value={formData.codi}
            disabled
            style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed' }}
          />
        </div>
        <div className="form-group">
          <label>Data d'alta</label>
          <input
            type="date"
            className="form-input"
            value={formData.dataAlta}
            onChange={(e) => setFormData({ ...formData, dataAlta: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Nom fiscal *</label>
          <input
            type="text"
            className="form-input"
            value={formData.nomFiscal}
            onChange={(e) => setFormData({ ...formData, nomFiscal: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Nom comercial</label>
          <input
            type="text"
            className="form-input"
            value={formData.nomComercial}
            onChange={(e) => setFormData({ ...formData, nomComercial: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>NIF</label>
          <input
            type="text"
            className="form-input"
            value={formData.nif}
            onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>País</label>
          <SearchableSelect
            value={formData.pais}
            onChange={(value) => setFormData({ ...formData, pais: value as Client['pais'] })}
            options={[
              { value: 'Espanya', label: 'Espanya' },
              { value: 'UE-VIES', label: 'UE-VIES' },
              { value: 'Estranger-exportació', label: 'Estranger-exportació' },
              { value: 'Altres', label: 'Altres' }
            ]}
            placeholder="Selecciona país..."
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Telèfon</label>
          <input
            type="tel"
            className="form-input"
            value={formData.telefon}
            onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Correu electrònic</label>
          <input
            type="email"
            className="form-input"
            value={formData.correuElectronic}
            onChange={(e) => setFormData({ ...formData, correuElectronic: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Domicili</label>
        <textarea
          className="form-input"
          value={formData.domicili}
          onChange={(e) => setFormData({ ...formData, domicili: e.target.value })}
          rows={3}
          style={{ resize: 'vertical' }}
          placeholder="Adreça completa del client"
        />
      </div>

      <div className="form-group">
        <label>Web</label>
        <input
          type="url"
          className="form-input"
          value={formData.web}
          onChange={(e) => setFormData({ ...formData, web: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Notes internes</label>
        <textarea
          className="form-input"
          value={formData.notesInternes}
          onChange={(e) => setFormData({ ...formData, notesInternes: e.target.value })}
          rows={4}
          style={{ resize: 'vertical' }}
          placeholder="Notes internes sobre el client"
        />
      </div>
    </div>
  );
}