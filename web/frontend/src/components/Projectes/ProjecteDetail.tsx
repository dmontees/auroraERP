import { useEffect, useState } from 'react'
import { ArrowLeft, User, Package, ClipboardList, History } from 'lucide-react'
import { getProjecte } from '../../api/projectes'
import type { ProjecteDetall, EstatProjecte } from '../../types'
import { formatCurrency, formatDateFull, estatLabel, percentLabel } from '../../utils'

interface Props {
  codi: string
  onBack: () => void
}

export default function ProjecteDetail({ codi, onBack }: Props) {
  const [data, setData]     = useState<ProjecteDetall | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [tab, setTab]       = useState<'info' | 'recursos' | 'tasques' | 'historial'>('info')

  useEffect(() => {
    setLoading(true)
    setError('')
    getProjecte(codi)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [codi])

  if (loading) return <div className="spinner"><div className="loading-spinner" /></div>
  if (error)   return (
    <>
      <div className="page-header">
        <button className="page-header-back" onClick={onBack}><ArrowLeft size={16} /></button>
        <div><h1>Error</h1></div>
      </div>
      <div className="page-body"><div className="error-box">{error}</div></div>
    </>
  )
  if (!data) return null

  // Dades TypeScript del desktop (dins de dades_json)
  const dades = data.dades as Record<string, unknown>
  const recursosHumans = (dades.recursosHumans as RH[] | undefined) ?? []
  const materials      = (dades.materials      as Mat[] | undefined) ?? []
  const tasques        = (dades.tasques        as Tasca[] | undefined) ?? []
  const historial      = (dades.historial      as Hist[] | undefined) ?? []

  const TABS = [
    { id: 'info'     as const, label: 'Informació',  icon: <ClipboardList size={14} /> },
    { id: 'recursos' as const, label: `Equip (${recursosHumans.length})`, icon: <User size={14} /> },
    { id: 'tasques'  as const, label: `Tasques (${tasques.length})`,       icon: <Package size={14} /> },
    { id: 'historial'as const, label: 'Historial',   icon: <History size={14} /> },
  ]

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <button className="page-header-back" onClick={onBack}><ArrowLeft size={16} /></button>
        <div>
          <h1>{data.titol}</h1>
          <p>
            {data.codi} · {data.client_nom ?? data.client_codi}
          </p>
        </div>
        <div className="page-header-actions">
          <span className={`estat-badge estat-${data.estat}`}>
            {estatLabel(data.estat as EstatProjecte)}
          </span>
        </div>
      </div>

      <div className="page-body">

        {/* Resum financer */}
        <div className="finance-summary">
          <div className="card">
            <div className="card-title">Ingressos (sense IVA)</div>
            <div className="card-value">{formatCurrency(data.ingres_sense_iva)}</div>
            <div className="card-sub">Amb IVA: {formatCurrency(data.ingres_amb_iva)}</div>
          </div>
          <div className="card">
            <div className="card-title">Despeses totals</div>
            <div className="card-value">{formatCurrency(data.gastos_totals)}</div>
            <div className="card-sub">
              Humans: {formatCurrency(data.gastos_humans)} · Materials: {formatCurrency(data.gastos_materials)}
            </div>
          </div>
          <div className="card">
            <div className="card-title">Benefici</div>
            <div className={`card-value ${data.benefici >= 0 ? 'success' : 'error'}`}>
              {formatCurrency(data.benefici)}
            </div>
            <div className="card-sub">Marge: {percentLabel(data.percent_benefici)}</div>
          </div>
        </div>

        {/* Pestanyes */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--color-info)' : '2px solid transparent',
                color: tab === t.id ? 'var(--color-info)' : 'var(--color-text-secondary)',
                fontWeight: tab === t.id ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 150ms',
                marginBottom: '-1px',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Informació */}
        {tab === 'info' && (
          <div>
            <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="detail-field">
                <div className="detail-label">Client</div>
                <div className="detail-value">{data.client_nom ?? data.client_codi}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Modalitat</div>
                <div className="detail-value">{String(dades.modalitat ?? '—')}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Servei</div>
                <div className="detail-value">{String(dades.servei ?? '—')}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Direct</div>
                <div className="detail-value">{dades.esDirect ? 'Sí' : 'No'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Data inici</div>
                <div className="detail-value">{formatDateFull(data.data_inici)}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Data entrega</div>
                <div className="detail-value">{formatDateFull(data.data_entrega)}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Facturat</div>
                <div className="detail-value">{data.facturat ? 'Sí' : 'No'}</div>
              </div>
              {data.dates_rodatge.length > 0 && (
                <div className="detail-field" style={{ gridColumn: 'span 2' }}>
                  <div className="detail-label">Dates de rodatge</div>
                  <div className="detail-value">
                    {data.dates_rodatge.map((d, i) => (
                      <span key={i} style={{ marginRight: '0.75rem' }}>
                        {formatDateFull(d.data)}{d.hora ? ` ${d.hora}` : ''}
                        {d.nota ? ` (${d.nota})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Instruccions */}
            {!!dades.instruccionsClient && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="detail-label" style={{ marginBottom: '0.35rem' }}>Instruccions client</div>
                <div className="card" style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {String(dades.instruccionsClient)}
                </div>
              </div>
            )}
            {!!dades.instruccionsProveidors && (
              <div>
                <div className="detail-label" style={{ marginBottom: '0.35rem' }}>Instruccions proveïdors</div>
                <div className="card" style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {String(dades.instruccionsProveidors)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Recursos Humans */}
        {tab === 'recursos' && (
          <div>
            {recursosHumans.length === 0 ? (
              <div className="empty-state">Cap recurs assignat</div>
            ) : (
              <div className="table-wrapper">
                <table className="resource-table">
                  <thead>
                    <tr>
                      <th>Categoria / Servei</th>
                      <th>Proveïdor</th>
                      <th className="td-right">Quantitat</th>
                      <th className="td-right">Preu unit.</th>
                      <th className="td-right">Cost total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recursosHumans.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{r.categoria ?? '—'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>{r.servei}</div>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                          {r.proveidor ?? '—'}
                        </td>
                        <td className="td-right">{r.quantitat} {r.unitat}</td>
                        <td className="td-right">{formatCurrency(r.preu)}</td>
                        <td className="td-right" style={{ fontWeight: 600 }}>{formatCurrency(r.cost)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                      <td colSpan={4} style={{ fontWeight: 600, textAlign: 'right' }}>Total despeses humans</td>
                      <td className="td-right" style={{ fontWeight: 700 }}>
                        {formatCurrency(data.gastos_humans)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Materials */}
            {materials.length > 0 && (
              <>
                <div className="section-heading" style={{ marginTop: '1.5rem' }}>
                  <Package size={16} />
                  Materials
                </div>
                <div className="table-wrapper">
                  <table className="resource-table">
                    <thead>
                      <tr>
                        <th>Grup / Material</th>
                        <th>Proveïdor</th>
                        <th className="td-right">Preu prov.</th>
                        <th className="td-right">Preu intern</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{m.grup ?? '—'}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>{m.material}</div>
                          </td>
                          <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                            {m.proveidor ?? '—'}
                          </td>
                          <td className="td-right">{formatCurrency(m.preuProveidor)}</td>
                          <td className="td-right">{formatCurrency(m.preuPlatea)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Tasques */}
        {tab === 'tasques' && (
          <div>
            {tasques.length === 0 ? (
              <div className="empty-state">Cap tasca definida</div>
            ) : (
              <div className="table-wrapper">
                <table className="resource-table">
                  <thead>
                    <tr>
                      <th>Categoria / Descripció</th>
                      <th>Servei</th>
                      <th className="td-right">Quantitat</th>
                      <th className="td-right">Tarifa</th>
                      <th className="td-right">Import</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasques.map((t, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{t.categoria ?? '—'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>{t.descripcio}</div>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{t.servei}</td>
                        <td className="td-right">{t.quantitat} {t.unitat}</td>
                        <td className="td-right">{formatCurrency(t.tarifa)}</td>
                        <td className="td-right" style={{ fontWeight: 600 }}>{formatCurrency(t.importe)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                      <td colSpan={4} style={{ fontWeight: 600, textAlign: 'right' }}>Total ingressos (sense IVA)</td>
                      <td className="td-right" style={{ fontWeight: 700 }}>
                        {formatCurrency(data.ingres_sense_iva)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Historial */}
        {tab === 'historial' && (
          <div>
            {historial.length === 0 ? (
              <div className="empty-state">Sense historial</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[...historial].reverse().map((h, i) => (
                  <div key={i} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', minWidth: 90 }}>
                      {formatDateFull(h.data)}
                    </div>
                    <div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: 'var(--color-text-secondary)',
                        marginRight: '0.5rem',
                      }}>
                        {h.tipus}
                      </span>
                      <span style={{ fontSize: '0.875rem' }}>{h.descripcio}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}

// Tipus locals per a les dades del desktop
interface RH { categoria?: string; servei?: string; unitat?: string; quantitat: number; preu: number; cost: number; proveidor?: string }
interface Mat { grup?: string; material?: string; proveidor?: string; preuProveidor: number; preuPlatea: number }
interface Tasca { categoria?: string; descripcio?: string; servei?: string; quantitat: number; unitat?: string; tarifa: number; importe: number }
interface Hist { data: string; tipus: string; descripcio: string }
