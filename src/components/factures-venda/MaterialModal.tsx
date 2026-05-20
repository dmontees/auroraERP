import React, { useState } from 'react';
import { X } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';
import type { Tasca } from '../../types/pressupost';

interface Props {
  onClose: () => void;
  onSave: (material: Tasca) => void;
  editingMaterial?: Tasca;
  materials?: Array<{ codi: string; material: string; grup: string; preuPlatea: number }>;
    grups?: Array<{ codi: string; nom: string }>;
}

export default function MaterialModal({
  onClose,
  onSave,
  editingMaterial,
  materials = [],
  grups = []
}: Props) {

  const [formData, setFormData] = useState({
    material: editingMaterial?.servei || '', // Código del material
    descripcio: editingMaterial?.descripcio || '',
    quantitat: editingMaterial?.quantitat || 1,
    preu: editingMaterial?.preu || 0
  });

  // Cambio de material
  const handleMaterialChange = (codiMaterial: string) => {
    const materialData = materials.find(m => m.codi === codiMaterial);
    
    // Buscar nombre del grupo
    const grupData = grups.find(g => g.codi === materialData?.grup);
    
    setFormData({
      material: codiMaterial,
      descripcio: grupData?.nom || materialData?.grup || '',
      quantitat: formData.quantitat,
      preu: materialData?.preuPlatea || 0  // ← USAR preuPlatea
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!formData.material) {
      alert('Selecciona un material');
      return;
    }
  
    // Obtener datos del material y grupo
    const materialData = materials.find(m => m.codi === formData.material);
    const materialNom = materialData?.material || formData.material;
    const grupNom = formData.descripcio; // Ya contiene el nombre del grupo
  
    const material: Tasca = {
      id: editingMaterial?.id || `mat-${Date.now()}-${Math.random()}`,
      servei: grupNom,        // SERVEI = NOMBRE DEL GRUPO
      descripcio: grupNom, // DESCRIPCIÓ = NOMBRE DEL GRUPO
      quantitat: formData.quantitat,
      unitat: '-',
      preu: formData.preu
    };
  
    onSave(material);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '600px' }}
      >
        <div className="modal-header">
          <h2>{editingMaterial ? 'Editar Material' : 'Afegir Material'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Material *</label>
              <SearchableSelect
  value={formData.material}
  onChange={handleMaterialChange}
  options={materials
    .filter(m => m.material) // Usar campo 'material'
    .map(m => ({ value: m.codi, label: m.material }))
  }
  placeholder="Selecciona un material..."
/>
            </div>

            <div className="form-group">
              <label>Grup / Descripció</label>
              <input
                type="text"
                className="form-input"
                value={formData.descripcio}
                onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                placeholder="Grup del material..."
              />
            </div>

            <div className="form-group">
              <label>Quantitat *</label>
              <input
                type="number"
                className="form-input"
                value={formData.quantitat}
                onChange={(e) => setFormData({ ...formData, quantitat: parseFloat(e.target.value) || 0 })}
                min="0"
                step="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Preu Unitari (€)</label>
              <input
                type="number"
                className="form-input"
                value={formData.preu}
                onChange={(e) => setFormData({ ...formData, preu: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>

            <div style={{
              padding: '1rem',
              background: 'var(--color-bg-tertiary)',
              borderRadius: '6px',
              marginTop: '1rem'
            }}>
              <strong>Import total:</strong> {(formData.quantitat * formData.preu).toFixed(2)}€
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel·lar
            </button>
            <button type="submit" className="btn-primary">
              {editingMaterial ? 'Desar Canvis' : 'Afegir Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}