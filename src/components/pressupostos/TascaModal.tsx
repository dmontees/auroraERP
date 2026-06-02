import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { TascaPressupost } from '../../types/pressupost';
import { storage } from '../../utils/storageManager';
import SearchableSelect from '../common/SearchableSelect';

interface TascaModalProps {
  onClose: () => void;
  onSave: (tasca: Omit<TascaPressupost, 'id' | 'ordre'>) => void;
  editingTasca?: TascaPressupost | null;
  parametres: any;
}

export default function TascaModal({ 
  onClose, 
  onSave, 
  editingTasca,
  parametres 
}: TascaModalProps) {
  const [formData, setFormData] = useState({
    categoria: editingTasca?.categoria || '',
    servei: editingTasca?.servei || '',
    descripcio: editingTasca?.descripcio || '',
    quantitat: editingTasca?.quantitat || 1,
    unitat: editingTasca?.unitat || '',
    tarifa: editingTasca?.tarifa || 0,
    importe: editingTasca?.importe || 0
  });

  // Auto-calcular importe
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      importe: prev.quantitat * prev.tarifa
    }));
  }, [formData.quantitat, formData.tarifa]);

  // Auto-rellenar al seleccionar servicio
  useEffect(() => {
    if (formData.servei && parametres?.serveis) {
      const serveiData = parametres.serveis.find((s: any) => s.codi === formData.servei);
      if (serveiData) {
        setFormData(prev => ({
          ...prev,
          categoria: serveiData.categoria,
          descripcio: serveiData.descripcio
        }));
      }
    }
  }, [formData.servei, parametres]);

  const handleSave = () => {
    if (!formData.categoria || !formData.servei) {
      alert('Has de seleccionar categoria i servei');
      return;
    }

    onSave(formData);
  };

  const categoriesDisponibles = parametres?.categories || [];
  const serveisDisponibles = parametres?.serveis || [];
  const unitatsDisponibles = parametres?.unitats || [];

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* HEADER */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            {editingTasca ? 'Editar Tasca' : 'Nova Tasca'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              color: 'var(--color-text-tertiary)'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Categoria */}
            <div>
              <label className="form-label">
                Categoria <span style={{ color: 'var(--color-error-dark)' }}>*</span>
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                className="form-input"
              >
                <option value="">Selecciona categoria...</option>
                <option value="MATERIALS">Materials</option>
                {categoriesDisponibles.map((cat: any) => (
                  <option key={cat.codi} value={cat.codi}>
                    {cat.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Servei */}
            <div>
              <label className="form-label">
                Servei <span style={{ color: 'var(--color-error-dark)' }}>*</span>
              </label>
              <SearchableSelect
                value={formData.servei}
                onChange={(value) => setFormData(prev => ({ ...prev, servei: value }))}
                options={serveisDisponibles
                  .filter((s: any) => !formData.categoria || s.categoria === formData.categoria)
                  .map((s: any) => ({ value: s.codi, label: s.nom || s.descripcio }))}
                placeholder="Selecciona servei..."
              />
            </div>

            {/* Descripció */}
            <div>
              <label className="form-label">Descripció</label>
              <textarea
                value={formData.descripcio}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcio: e.target.value }))}
                placeholder="Descripció detallada de la tasca..."
                className="form-input"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Quantitat i Unitat */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Quantitat</label>
                <input
                  type="number"
                  value={formData.quantitat}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantitat: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Unitat</label>
                <SearchableSelect
                  value={formData.unitat}
                  onChange={(value) => setFormData(prev => ({ ...prev, unitat: value }))}
                  options={unitatsDisponibles.map((u: any) => ({ value: u.codi, label: u.nom }))}
                  placeholder="Selecciona unitat..."
                />
              </div>
            </div>

            {/* Tarifa i Import */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Tarifa (€)</label>
                <input
                  type="number"
                  value={formData.tarifa}
                  onChange={(e) => setFormData(prev => ({ ...prev, tarifa: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Import Total</label>
                <input
                  type="text"
                  value={`${formData.importe.toFixed(2)}€`}
                  disabled
                  className="form-input"
                  style={{ 
                    background: '#f3f4f6', 
                    fontWeight: 600,
                    fontSize: '1.1rem'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          background: '#f9fafb'
        }}>
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel·lar
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Save size={18} />
            {editingTasca ? 'Actualitzar' : 'Afegir'}
          </button>
        </div>
      </div>
    </div>
  );
}