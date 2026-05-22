import React, { useState } from 'react';
import { X } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';
import type { Projecte } from '../../types/projecte';

interface CalendarEventModalProps {
  onClose: () => void;
  onSave: (esdeveniment: any) => void;
  projectes: Projecte[];
  editingEsdeveniment?: any | null;
}

export default function CalendarEventModal({ 
  onClose, 
  onSave, 
  projectes, 
  editingEsdeveniment 
}: CalendarEventModalProps) {
  
  const [formData, setFormData] = useState(
    editingEsdeveniment || {
      id: '',
      titol: '',
      descripcio: '',
      data: new Date().toISOString().split('T')[0],
      projecte: '',
      color: '#ec4899'
    }
  );

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

  const colors = [
    { color: '#ec4899', label: 'Rosa' },
    { color: '#8b5cf6', label: 'Lila' },
    { color: '#3b82f6', label: 'Blau' },
    { color: '#10b981', label: 'Verd' },
    { color: '#f59e0b', label: 'Taronja' },
    { color: '#ef4444', label: 'Vermell' },
    { color: '#6366f1', label: 'Índigo' },
    { color: '#06b6d4', label: 'Cian' }
  ];

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

          <div className="form-group">
            <label>Descripció</label>
            <textarea
              className="form-input"
              value={formData.descripcio}
              onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
              rows={4}
              placeholder="Detalls de l'esdeveniment..."
            />
          </div>

          <div className="form-group">
            <label>Data *</label>
            <input
              type="date"
              className="form-input"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              required
            />
          </div>

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

          <div className="form-group">
            <label>Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {colors.map(({ color, label }) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    background: color,
                    border: formData.color === color ? '3px solid var(--color-text-primary)' : '2px solid var(--color-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: 'white',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    transform: formData.color === color ? 'scale(1.1)' : 'scale(1)'
                  }}
                  title={label}
                >
                  {formData.color === color && '✓'}
                </button>
              ))}
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