import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Material, GrupMaterial } from '../../types/parametres';
import type { Proveidor } from '../../types/proveidor';
import SearchableSelect from '../common/SearchableSelect';
import { storage } from '../../utils/storageManager';

interface MaterialModalProps {
  material: Material | null;
  onClose: () => void;
  onSave: (material: Material) => void;
  onDelete?: (codi: string) => void;
  onMarcarNoUtilitzat?: (codi: string) => void;
  onReactivar?: (codi: string) => void;
  nextCode: string;
  grups: GrupMaterial[];
  proveidors: Proveidor[];
  materialEnUs?: boolean;
}

function MaterialModal({
  material,
  onClose,
  onSave,
  onDelete,
  onMarcarNoUtilitzat,
  onReactivar,
  nextCode,
  grups,
  proveidors,
  materialEnUs = false
}: MaterialModalProps) {

  const [formData, setFormData] = useState<Material>(
    material || {
      codi: nextCode,
      material: '',
      grup: '',
      proveidor: '',
      enllacAlquiler: '',
      preuProveidor: 0,
      preuPlatea: 0,
      estat: 'actiu'
    }
  );
  
  const esNoUtilitzat = formData.estat === 'no_utilitzat';
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.material || !formData.grup) {
      alert('Has de completar els camps obligatoris');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>{material ? 'Editar Material' : 'Nou Material'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
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
              <label>Nom del Material *</label>
              <input
                type="text"
                className="form-input"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="Canon EOS R5, Panasonic S1H..."
                required
              />
            </div>

            <div className="form-group">
              <label>Grup *</label>
              <SearchableSelect
                value={formData.grup}
                onChange={(value) => setFormData({ ...formData, grup: value })}
                options={grups.map(g => ({ value: g.codi, label: g.nom }))}
                placeholder="Selecciona un grup..."
                required={true}
                disabled={esNoUtilitzat}
              />
            </div>

            <div className="form-group">
              <label>Proveïdor (opcional)</label>
              <SearchableSelect
                value={formData.proveidor}
                onChange={(value) => setFormData({ ...formData, proveidor: value })}
                options={proveidors.map(p => ({ 
                  value: p.codi, 
                  label: p.nomComercial || p.nomFiscal 
                }))}
                placeholder="Cap proveïdor"
                disabled={esNoUtilitzat}
              />
            </div>

            <div className="form-group">
              <label>Enllaç alquiler (opcional)</label>
              <input
                type="url"
                className="form-input"
                value={formData.enllacAlquiler}
                onChange={(e) => setFormData({ ...formData, enllacAlquiler: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Preu Proveïdor (€)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.preuProveidor}
                  onChange={(e) => setFormData({ ...formData, preuProveidor: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Preu Platea (€) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.preuPlatea}
                  onChange={(e) => setFormData({ ...formData, preuPlatea: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {material && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-bg-tertiary)', borderRadius: '6px' }}>
                <strong>Estat:</strong> {formData.estat === 'actiu' ? '✅ Actiu' : '🚫 No utilitzat'}
                {formData.estat === 'actiu' && onMarcarNoUtilitzat && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      onMarcarNoUtilitzat(formData.codi);
                      onClose();
                    }}
                    style={{ marginLeft: '1rem', fontSize: '0.85rem' }}
                  >
                    Marcar com no utilitzat
                  </button>
                )}
                {formData.estat === 'no_utilitzat' && onReactivar && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      onReactivar(formData.codi);
                      onClose();
                    }}
                    style={{ marginLeft: '1rem', fontSize: '0.85rem' }}
                  >
                    Reactivar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            {material && onDelete && !materialEnUs && (
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => {
                  onDelete(formData.codi);
                  onClose();
                }}
                style={{ 
                  marginRight: 'auto',
                  borderColor: 'var(--color-error-dark)',
                  color: 'var(--color-error-dark)'
                }}
              >
                Eliminar
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel·lar
            </button>
            <button type="submit" className="btn-primary">
              {material ? 'Actualitzar' : 'Crear'} Material
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MaterialModal;