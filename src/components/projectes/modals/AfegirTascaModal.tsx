import { X } from 'lucide-react';
import type { TascaProjecte } from '../../../types/projecte';
import type { Parametres } from '../../../types/parametres';
import SearchableSelect from '../../common/SearchableSelect';

interface Props {
  novaTascaForm: TascaProjecte;
  setNovaTascaForm: (form: TascaProjecte) => void;
  parametres: Parametres | null;
  esBloquejat: boolean;
  onServeiChange: (codi: string) => void;
  onUnitatChange: (codi: string) => void;
  onGuardar: () => void;
  onClose: () => void;
}

export default function AfegirTascaModal({
  novaTascaForm,
  setNovaTascaForm,
  parametres,
  esBloquejat,
  onServeiChange,
  onUnitatChange,
  onGuardar,
  onClose
}: Props) {
  return (
    <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Afegir Tasca</h2>
          <button className="modal-close" onClick={onClose} disabled={esBloquejat}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Servei *</label>
            <SearchableSelect
              value={novaTascaForm.servei}
              onChange={onServeiChange}
              disabled={esBloquejat}
              options={parametres?.serveis.map(s => ({ value: s.codi, label: s.nom })) || []}
              placeholder="Selecciona servei..."
            />
          </div>

          <div className="form-group">
            <label>Descripció</label>
            <textarea
              className="form-input"
              value={novaTascaForm.descripcio}
              onChange={(e) => setNovaTascaForm({ ...novaTascaForm, descripcio: e.target.value })}
              disabled={esBloquejat}
              rows={3}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Quantitat *</label>
              <input
                type="number"
                className="form-input"
                value={novaTascaForm.quantitat}
                onChange={(e) => setNovaTascaForm({ ...novaTascaForm, quantitat: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                disabled={esBloquejat}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Unitat *</label>
              <SearchableSelect
                value={novaTascaForm.unitat}
                onChange={onUnitatChange}
                disabled={esBloquejat}
                options={parametres?.unitats.map(u => ({ value: u.codi, label: u.nom })) || []}
                placeholder="Selecciona unitat..."
              />
            </div>
          </div>

          <div className="form-group">
            <label>Tarifa (€)</label>
            <input
              type="number"
              className="form-input"
              value={novaTascaForm.tarifa}
              onChange={(e) => setNovaTascaForm({ ...novaTascaForm, tarifa: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              disabled={esBloquejat}
              min="0"
              step="0.01"
            />
          </div>

          <div style={{ padding: '1rem', background: 'var(--color-bg-tertiary)', borderRadius: '6px', marginTop: '1rem' }}>
            <strong>Import total:</strong> {(novaTascaForm.quantitat * novaTascaForm.tarifa).toFixed(2)}€
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel·lar
          </button>
          <button type="button" className="btn-primary" onClick={onGuardar}>
            Afegir Tasca
          </button>
        </div>
      </div>
    </div>
  );
}
