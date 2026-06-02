import { Trash2 } from 'lucide-react';
import type { Projecte, TascaProjecte } from '../../../types/projecte';
import type { Parametres } from '../../../types/parametres';
import SearchableSelect from '../../common/SearchableSelect';

interface Props {
  formData: Projecte;
  parametres: Parametres | null;
  esBloquejat: boolean;
  tasquesAgrupades: Record<string, TascaProjecte[]>;
  onAfegirTasca: () => void;
  onActualitzarTasca: (id: string, field: keyof TascaProjecte, value: any) => void;
  onEliminarTasca: (id: string) => void;
  onMoureTasca: (index: number, direccio: 'amunt' | 'avall') => void;
  onMoureCategoría: (categoriaNom: string, direccio: 'amunt' | 'avall') => void;
}

export default function TasquesTab({
  formData,
  parametres,
  esBloquejat,
  tasquesAgrupades,
  onAfegirTasca,
  onActualitzarTasca,
  onEliminarTasca,
  onMoureTasca,
  onMoureCategoría
}: Props) {
  const totalFacturacio = formData.tasques.reduce((sum, t) => sum + t.importe, 0);
  const totalDespeses = formData.recursosHumans.reduce((sum, r) => sum + r.cost, 0) +
    formData.materials.reduce((sum, m) => sum + m.preuProveidor * (m.jornades ?? 1), 0);
  const benefici = totalFacturacio - totalDespeses;
  const percentBenefici = totalFacturacio > 0 ? (benefici / totalFacturacio) * 100 : 0;

  return (
    <div>
      {/* Cards resum */}
      {(() => {
        const G_RED    = 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)';
        const G_INDIGO = 'linear-gradient(135deg, #4338ca, #6366f1, #818cf8)';
        const G_GREEN  = 'linear-gradient(135deg, #059669, #10b981, #34d399)';
        const gB = benefici >= 0 ? G_GREEN : G_RED;
        const gP = percentBenefici >= 0 ? G_GREEN : G_RED;
        const gSpan = (v: React.ReactNode, g: string) => (
          <span style={{ background: g, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{v}</span>
        );
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_RED }} />
              <div className="stat-card-body">
                <div className="stat-card-label">Total Despeses</div>
                <div className="stat-card-value">{gSpan(`${totalDespeses.toFixed(2)}€`, G_RED)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_INDIGO }} />
              <div className="stat-card-body">
                <div className="stat-card-label">Total Facturació</div>
                <div className="stat-card-value">{gSpan(`${totalFacturacio.toFixed(2)}€`, G_INDIGO)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: gB }} />
              <div className="stat-card-body">
                <div className="stat-card-label">Benefici</div>
                <div className="stat-card-value">{gSpan(`${benefici.toFixed(2)}€`, gB)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: gP }} />
              <div className="stat-card-body">
                <div className="stat-card-label">% Benefici</div>
                <div className="stat-card-value">{gSpan(`${percentBenefici.toFixed(1)}%`, gP)}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Taula de tasques */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Tasques del Projecte
        </h3>
        <button
          type="button"
          className="btn-primary"
          onClick={onAfegirTasca}
          disabled={esBloquejat}
        >
          + Afegir Tasca
        </button>
      </div>

      {formData.tasques.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
          No hi ha tasques. Fes clic a "Afegir Tasca" o trasllada recursos/materials des de la pestanya Despeses.
        </p>
      ) : (
        <div>
          {Object.entries(tasquesAgrupades).map(([categoriaNom, tasques]) => (
            <div key={categoriaNom} style={{ marginBottom: '2rem' }}>
              {/* Header categoria */}
              <div style={{
                background: 'var(--color-accent-primary)',
                color: 'white',
                padding: '0.75rem 1rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                borderRadius: '4px 4px 0 0',
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{categoriaNom}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => onMoureCategoría(categoriaNom, 'amunt')}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                    title="Moure categoria amunt"
                  >▲</button>
                  <button
                    type="button"
                    onClick={() => onMoureCategoría(categoriaNom, 'avall')}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                    title="Moure categoria avall"
                  >▼</button>
                </div>
              </div>

              {/* Taula de tasques de la categoria */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '150px' }}>Servei</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '35%' }}>Descripció</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '80px' }}>Quantitat</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Unitat</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '110px' }}>Tarifa (€)</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Import (€)</th>
                    <th style={{ width: '100px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tasques.map((tasca) => (
                    <tr key={tasca.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem', width: '150px' }}>
                        <SearchableSelect
                          value={tasca.servei}
                          onChange={(value) => onActualitzarTasca(tasca.id, 'servei', value)}
                          disabled={esBloquejat}
                          options={parametres?.serveis.map(s => ({ value: s.codi, label: s.nom })) || []}
                          placeholder="Servei..."
                        />
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <textarea
                          className="form-input"
                          value={tasca.descripcio}
                          onChange={(e) => onActualitzarTasca(tasca.id, 'descripcio', e.target.value)}
                          disabled={esBloquejat}
                          rows={2}
                          style={{ fontSize: '0.85rem', resize: 'vertical' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem', width: '80px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={tasca.quantitat}
                          onChange={(e) => onActualitzarTasca(tasca.id, 'quantitat', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          disabled={esBloquejat}
                          min="0"
                          step="0.01"
                          style={{ textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem', width: '120px' }}>
                        <SearchableSelect
                          value={tasca.unitat}
                          onChange={(value) => onActualitzarTasca(tasca.id, 'unitat', value)}
                          disabled={esBloquejat}
                          options={parametres?.unitats.map(u => ({ value: u.codi, label: u.nom })) || []}
                          placeholder="Unitat..."
                        />
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', width: '110px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={tasca.tarifa}
                          onChange={(e) => onActualitzarTasca(tasca.id, 'tarifa', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          disabled={esBloquejat}
                          min="0"
                          step="0.01"
                          style={{ textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, width: '120px' }}>
                        {tasca.importe.toFixed(2)}€
                      </td>
                      <td style={{ padding: '0.75rem', width: '100px' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => onMoureTasca(tasques.indexOf(tasca), 'amunt')}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              borderRadius: '4px',
                              color: 'var(--color-text-secondary)',
                              cursor: 'pointer',
                              padding: '0.25rem',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >▲</button>
                          <button
                            type="button"
                            onClick={() => onMoureTasca(tasques.indexOf(tasca), 'avall')}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              borderRadius: '4px',
                              color: 'var(--color-text-secondary)',
                              cursor: 'pointer',
                              padding: '0.25rem',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >▼</button>
                          <button
                            type="button"
                            onClick={() => onEliminarTasca(tasca.id)}
                            disabled={esBloquejat}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-error)',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
