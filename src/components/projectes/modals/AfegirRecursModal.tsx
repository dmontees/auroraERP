import { X } from 'lucide-react';
import type { RecursHumaProjecte, MaterialProjecte } from '../../../types/projecte';
import type { Parametres } from '../../../types/parametres';
import type { Proveidor } from '../../../types/proveidor';
import SearchableSelect from '../../common/SearchableSelect';

interface Props {
  tipusRecurs: 'huma' | 'material';
  setTipusRecurs: (tipus: 'huma' | 'material') => void;
  nouRecursForm: RecursHumaProjecte;
  setNouRecursForm: (form: RecursHumaProjecte) => void;
  nouMaterialForm: MaterialProjecte;
  setNouMaterialForm: (form: MaterialProjecte) => void;
  parametres: Parametres | null;
  proveidors: Proveidor[];
  onRecursServeiChange: (codi: string) => void;
  onRecursProveidorChange: (codi: string) => void;
  onRecursUnitatChange: (codi: string) => void;
  onMaterialChange: (codi: string) => void;
  onGuardarRecurs: () => void;
  onGuardarMaterial: () => void;
  onClose: () => void;
}

export default function AfegirRecursModal({
  tipusRecurs,
  setTipusRecurs,
  nouRecursForm,
  setNouRecursForm,
  nouMaterialForm,
  setNouMaterialForm,
  parametres,
  proveidors,
  onRecursServeiChange,
  onRecursProveidorChange,
  onRecursUnitatChange,
  onMaterialChange,
  onGuardarRecurs,
  onGuardarMaterial,
  onClose
}: Props) {
  return (
    <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Afegir {tipusRecurs === 'huma' ? 'Recurs Humà' : 'Material'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Switcher */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0 1.5rem',
          borderBottom: '1px solid var(--color-border)'
        }}>
          {(['huma', 'material'] as const).map((tipus) => (
            <button
              key={tipus}
              type="button"
              onClick={() => setTipusRecurs(tipus)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: tipusRecurs === tipus ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                color: tipusRecurs === tipus ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                fontWeight: tipusRecurs === tipus ? 600 : 400,
                cursor: 'pointer',
                marginBottom: '-1px'
              }}
            >
              {tipus === 'huma' ? 'Recurs Humà' : 'Material'}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {tipusRecurs === 'huma' ? (
            <>
              <div className="form-group">
                <label>Proveïdor</label>
                <SearchableSelect
                  value={nouRecursForm.proveidor}
                  onChange={onRecursProveidorChange}
                  options={[
                    { value: '', label: 'Cap proveïdor' },
                    ...proveidors.filter(p => p.tipus !== 'Treballador').map(p => ({ value: p.codi, label: p.nomComercial || p.nomFiscal })),
                    ...proveidors.filter(p => p.tipus === 'Treballador').map(p => ({ value: p.codi, label: `👷 ${p.nomComercial || p.nomFiscal}` }))
                  ]}
                  placeholder="Cap proveïdor"
                />
              </div>

              <div className="form-group">
                <label>Servei *</label>
                <SearchableSelect
                  value={nouRecursForm.servei}
                  onChange={onRecursServeiChange}
                  options={parametres?.serveis.map(s => ({ value: s.codi, label: s.nom })) || []}
                  placeholder="Selecciona servei..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Quantitat *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={nouRecursForm.quantitat}
                    onChange={(e) => {
                      const quantitat = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setNouRecursForm({ ...nouRecursForm, quantitat, cost: quantitat * nouRecursForm.preu });
                    }}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Unitat *</label>
                  <SearchableSelect
                    value={nouRecursForm.unitat}
                    onChange={onRecursUnitatChange}
                    options={parametres?.unitats.map(u => ({ value: u.codi, label: u.nom })) || []}
                    placeholder="Selecciona unitat..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Preu (€)</label>
                <input
                  type="number"
                  className="form-input"
                  value={nouRecursForm.preu}
                  onChange={(e) => {
                    const preu = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setNouRecursForm({ ...nouRecursForm, preu, cost: nouRecursForm.quantitat * preu });
                  }}
                  min="0"
                  step="0.01"
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                  {nouRecursForm.proveidor && nouRecursForm.servei && nouRecursForm.unitat
                    ? 'Tarifa del proveïdor carregada automàticament'
                    : 'Selecciona proveïdor, servei i unitat per carregar la tarifa'}
                </p>
              </div>

              <div style={{ padding: '1rem', background: 'var(--color-bg-tertiary)', borderRadius: '6px', marginTop: '1rem' }}>
                <strong>Cost total:</strong> {nouRecursForm.cost.toFixed(2)}€
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Proveïdor</label>
                <SearchableSelect
                  value={nouMaterialForm.proveidor}
                  onChange={(value) => setNouMaterialForm({ ...nouMaterialForm, proveidor: value })}
                  options={[
                    { value: '', label: 'Cap proveïdor' },
                    ...proveidors.map(p => ({ value: p.codi, label: p.nomComercial || p.nomFiscal }))
                  ]}
                  placeholder="Cap proveïdor"
                />
              </div>

              <div className="form-group">
                <label>Material *</label>
                <SearchableSelect
                  value={nouMaterialForm.material}
                  onChange={onMaterialChange}
                  options={parametres?.materials.filter(m => m.estat === 'actiu').map(m => ({
                    value: m.codi,
                    label: m.material
                  })) || []}
                  placeholder="Selecciona material..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Preu Proveïdor (€)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={nouMaterialForm.preuProveidor}
                    onChange={(e) => setNouMaterialForm({ ...nouMaterialForm, preuProveidor: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Preu Platea (€)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={nouMaterialForm.preuPlatea}
                    onChange={(e) => setNouMaterialForm({ ...nouMaterialForm, preuPlatea: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                Els preus es carreguen automàticament des dels paràmetres del material
              </p>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel·lar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={tipusRecurs === 'huma' ? onGuardarRecurs : onGuardarMaterial}
          >
            Afegir {tipusRecurs === 'huma' ? 'Recurs' : 'Material'}
          </button>
        </div>
      </div>
    </div>
  );
}
