import { useState } from 'react';
import { X } from 'lucide-react';
import type { Plantilla, TipusPlantilla } from '../../types/parametres';

interface PlantillaModalProps {
  plantilla: Plantilla | null;
  onClose: () => void;
  onSave: (plantilla: Plantilla) => void;
  nextCode: string;
  tipusPlantilles: TipusPlantilla[];
}

function PlantillaModal({
  plantilla,
  onClose,
  onSave,
  nextCode,
  tipusPlantilles
}: PlantillaModalProps) {
  const [formData, setFormData] = useState<Plantilla>(
    plantilla || {
      codi: nextCode,
      tipusPlantilla: '',
      titol: '',
      text: '',
      perDefecte: false
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tipusPlantilla || !formData.titol || !formData.text) {
      alert('Has de completar els camps obligatoris');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2>{plantilla ? 'Editar Plantilla' : 'Nova Plantilla'}</h2>
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
              <label>Tipus de Plantilla *</label>
              <select
                className="form-input"
                value={formData.tipusPlantilla}
                onChange={(e) => setFormData({ ...formData, tipusPlantilla: e.target.value })}
                required
              >
                <option value="">Selecciona tipus...</option>
                {tipusPlantilles.map(t => (
                  <option key={t.codi} value={t.codi}>{t.nom}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Títol *</label>
              <input
                type="text"
                className="form-input"
                value={formData.titol}
                onChange={(e) => setFormData({ ...formData, titol: e.target.value })}
                placeholder="Títol descriptiu de la plantilla..."
                required
              />
            </div>

            <div className="form-group">
              <label>Text *</label>
              <textarea
                className="form-input"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                rows={8}
                placeholder="Escriu aquí el text de la plantilla..."
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.perDefecte}
                  onChange={(e) => setFormData({ ...formData, perDefecte: e.target.checked })}
                />
                Utilitzar per defecte
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                Si està marcada, aquesta plantilla s'afegirà automàticament quan es creï un nou pressupost.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel·lar
            </button>
            <button type="submit" className="btn-primary">
              {plantilla ? 'Actualitzar' : 'Crear'} Plantilla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PlantillaModal;