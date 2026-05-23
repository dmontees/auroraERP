import React, { useState } from 'react';
import { X } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';
import type { Projecte } from '../../types/projecte';

interface CalendarEventModalProps {
  onClose: () => void;
  onSave: (esdeveniment: any) => void;
  projectes: Projecte[];
  editingEsdeveniment?: any | null;
  categoriesCalendari?: { id: string; nom: string; color: string }[];
}

export default function CalendarEventModal({
  onClose,
  onSave,
  projectes,
  editingEsdeveniment,
  categoriesCalendari = []
}: CalendarEventModalProps) {

  const [formData, setFormData] = useState(
    editingEsdeveniment
      ? {
          horaInici: '',
          horaFi: '',
          ubicacio: '',
          enllac: '',
          categoriaId: '',
          ...editingEsdeveniment
        }
      : {
          id: '',
          titol: '',
          descripcio: '',
          data: new Date().toISOString().split('T')[0],
          dataFi: '',
          horaInici: '',
          horaFi: '',
          ubicacio: '',
          enllac: '',
          projecte: '',
          color: '#ec4899',
          categoriaId: ''
        }
  );

  // When a category is selected, auto-set color
  const handleCategoriaChange = (categoriaId: string) => {
    const cat = categoriesCalendari.find(c => c.id === categoriaId);
    if (cat) {
      setFormData({ ...formData, categoriaId, color: cat.color });
    } else {
      setFormData({ ...formData, categoriaId: '' });
    }
  };

  const selectedCategoriaHasColor = !!formData.categoriaId && categoriesCalendari.some(c => c.id === formData.categoriaId);

  const handleSubmit = () => {
    if (!formData.titol || !formData.data) {
      alert('El títol i la data són obligatoris');
      return;
    }

    const esdevenimentAGuardar = editingEsdeveniment
      ? formData
      : { ...formData, id: Date.now().toString() };

    onSave(esdevenimentAGuardar);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>📌 {editingEsdeveniment ? 'Editar' : 'Nou'} Esdeveniment</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* Títol */}
          <div className="form-group">
            <label>Títol *</label>
            <input
              type="text"
              className="form-input"
              value={formData.titol}
              onChange={(e) => setFormData({ ...formData, titol: e.target.value })}
              placeholder="Ex: Reunió amb client, Deadline presentació..."
              required
            />
          </div>

          {/* Descripció */}
          <div className="form-group">
            <label>Descripció</label>
            <textarea
              className="form-input"
              value={formData.descripcio}
              onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
              rows={3}
              placeholder="Detalls de l'esdeveniment..."
            />
          </div>

          {/* Data */}
          <div className="form-group">
            <label>Data *</label>
            <div style={{ display: 'grid', gridTemplateColumns: formData.dataFi !== undefined && formData.dataFi !== '' ? '1fr 1fr' : '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
                  {formData.dataFi !== '' ? 'Inici' : 'Data'}
                </div>
                <input
                  type="date"
                  className="form-input"
                  value={formData.data}
                  onChange={(e) => {
                    const nova = e.target.value;
                    setFormData({
                      ...formData,
                      data: nova,
                      dataFi: formData.dataFi && formData.dataFi < nova ? nova : formData.dataFi
                    });
                  }}
                  required
                />
              </div>
              {formData.dataFi !== '' ? (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>Fi</div>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dataFi}
                    min={formData.data}
                    onChange={(e) => setFormData({ ...formData, dataFi: e.target.value })}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}
                  onClick={() => setFormData({ ...formData, dataFi: formData.data })}
                >
                  + Rang de dates
                </button>
              )}
            </div>
            {formData.dataFi !== '' && (
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: '0.75rem', cursor: 'pointer', marginTop: '0.25rem', padding: 0 }}
                onClick={() => setFormData({ ...formData, dataFi: '' })}
              >
                ✕ Eliminar rang (event d'un sol dia)
              </button>
            )}
          </div>

          {/* Hora Inici / Hora Fi */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Hora inici</label>
              <input
                type="time"
                className="form-input"
                value={formData.horaInici}
                onChange={(e) => setFormData({ ...formData, horaInici: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Hora fi</label>
              <input
                type="time"
                className="form-input"
                value={formData.horaFi}
                onChange={(e) => setFormData({ ...formData, horaFi: e.target.value })}
              />
            </div>
          </div>

          {/* Ubicació */}
          <div className="form-group">
            <label>Ubicació</label>
            <input
              type="text"
              className="form-input"
              value={formData.ubicacio}
              onChange={(e) => setFormData({ ...formData, ubicacio: e.target.value })}
              placeholder="Adreça o nom del lloc..."
            />
          </div>

          {/* Enllaç */}
          <div className="form-group">
            <label>Enllaç (URL)</label>
            <input
              type="url"
              className="form-input"
              value={formData.enllac}
              onChange={(e) => setFormData({ ...formData, enllac: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Vincular a projecte */}
          <div className="form-group">
            <label>Vincular a projecte (opcional)</label>
            <SearchableSelect
              value={formData.projecte}
              onChange={(value) => setFormData({ ...formData, projecte: value || '' })}
              options={[
                { value: '', label: 'Cap projecte' },
                ...projectes.map(p => ({
                  value: p.codi,
                  label: `${p.titol} (${p.codi})`
                }))
              ]}
              placeholder="Selecciona projecte..."
            />
            <small style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
              Si selecciones un projecte, l'esdeveniment es registrarà al seu historial
            </small>
          </div>

          {/* Categoria */}
          {categoriesCalendari.length > 0 && (
            <div className="form-group">
              <label>Categoria (opcional)</label>
              <select
                className="form-input"
                value={formData.categoriaId}
                onChange={(e) => handleCategoriaChange(e.target.value)}
              >
                <option value="">Sense categoria (color manual)</option>
                {categoriesCalendari.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nom || '(sense nom)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Color */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Color
              {selectedCategoriaHasColor && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                  (definit per la categoria)
                </span>
              )}
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              opacity: selectedCategoriaHasColor ? 0.4 : 1,
              pointerEvents: selectedCategoriaHasColor ? 'none' : 'auto'
            }}>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                style={{ width: '48px', height: '48px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
                title="Selecciona color"
              />
              <span style={{
                padding: '0.4rem 1rem',
                background: formData.color,
                color: 'white',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600
              }}>
                {formData.titol || 'Previsualització'}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel·lar
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit}>
            {editingEsdeveniment ? 'Guardar Canvis' : 'Crear Esdeveniment'}
          </button>
        </div>
      </div>
    </div>
  );
}
