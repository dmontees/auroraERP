import React from 'react';

interface ProjecteTabProps {
  hook: any;
}

export default function ProjecteTab({ hook }: ProjecteTabProps) {
  const { formData, setFormData, clientBlocked, pressupostBloquejat } = hook;

  return (
    <div>
      <div className="form-group">
        <label>Nom del projecte *</label>
        <input
          type="text"
          className="form-input"
          value={formData.nomProjecte}
          onChange={(e) => setFormData({ ...formData, nomProjecte: e.target.value })}
          disabled={clientBlocked || pressupostBloquejat}
          required
          placeholder="Ex: Cobertura esdeveniment corporatiu..."
        />
      </div>

      <div className="form-group">
        <label>Modalitat</label>
        <input
          type="text"
          className="form-input"
          value={formData.modalitat}
          onChange={(e) => setFormData({ ...formData, modalitat: e.target.value })}
          disabled={clientBlocked || pressupostBloquejat}
          placeholder="Ex: Streaming + Gravació..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Data del projecte</label>
          <input
            type="text"
            className="form-input"
            value={formData.dataProjecte}
            onChange={(e) => setFormData({ ...formData, dataProjecte: e.target.value })}
            disabled={clientBlocked || pressupostBloquejat}
            placeholder="Ex: 15-16 de maig de 2026..."
          />
        </div>
        <div className="form-group">
          <label>Nombre de jornades</label>
          <input
            type="number"
            className="form-input"
            value={formData.numJornades}
            onChange={(e) => setFormData({ ...formData, numJornades: parseInt(e.target.value) || 0 })}
            disabled={clientBlocked || pressupostBloquejat}
            min="0"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Detalls del projecte</label>
        <textarea
          className="form-input"
          value={formData.detallsProjecte}
          onChange={(e) => setFormData({ ...formData, detallsProjecte: e.target.value })}
          rows={8}
          style={{ resize: 'vertical' }}
          disabled={clientBlocked || pressupostBloquejat}
          placeholder="Descripció detallada del projecte i la cobertura..."
        />
      </div>
    </div>
  );
}