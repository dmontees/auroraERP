import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ClipboardList, FileText, FolderOpen, Package, User } from 'lucide-react'
import { getPressupost } from '../../api/pressupostos'
import type { EstatPressupost, PressupostDetall } from '../../types'
import { estatPressupostLabel, formatCurrency, formatDateFull, percentLabel } from '../../utils'

interface Props {
  codi: string
  onBack: () => void
  onOpenProjecte?: (codi: string) => void
}

export default function PressupostDetail({ codi, onBack, onOpenProjecte }: Props) {
  const [data, setData] = useState<PressupostDetall | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'info' | 'tasques' | 'costos' | 'notes'>('info')

  useEffect(() => {
    setLoading(true)
    setError('')
    getPressupost(codi)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [codi])

  if (loading) return <div className="spinner"><div className="loading-spinner" /></div>
  if (error) {
    return (
      <>
        <div className="page-header">
          <button className="page-header-back" onClick={onBack}><ArrowLeft size={16} /></button>
          <div><h1>Error</h1></div>
        </div>
        <div className="page-body"><div className="error-box">{error}</div></div>
      </>
    )
  }
  if (!data) return null

  const dades = data.dades as PressupostJson
  const tasques = dades.tasques ?? []
  const materials = dades.materials ?? []
  const recursosHumans = dades.recursosHumans ?? []
  const projecteCodi = data.projecte_vinculat || data.projecte_creat

  const tabs = [
    { id: 'info' as const, label: 'Informacio', icon: <ClipboardList size={14} /> },
    { id: 'tasques' as const, label: `Tasques (${tasques.length})`, icon: <FileText size={14} /> },
    { id: 'costos' as const, label: `Costos (${materials.length + recursosHumans.length})`, icon: <Package size={14} /> },
    { id: 'notes' as const, label: 'Notes', icon: <User size={14} /> },
  ]

  return (
    <>
      <div className="page-header">
        <button className="page-header-back" onClick={onBack}><ArrowLeft size={16} /></button>
        <div>
          <h1>{data.nom_projecte || data.codi}</h1>
          <p>{data.codi} - {data.client_nom ?? data.client_codi ?? 'Sense client'}</p>
        </div>
        <div className="page-header-actions">
          <span className={`estat-badge pressupost-${data.estat}`}>
            {estatPressupostLabel(data.estat as EstatPressupost)}
          </span>
        </div>
      </div>

      <div className="page-body">
        <div className="finance-summary">
          <div className="card">
            <div className="card-title">Base imposable</div>
            <div className="card-value">{formatCurrency(data.base_imposable)}</div>
            <div className="card-sub">Total: {formatCurrency(data.total_pressupost)}</div>
          </div>
          <div className="card">
            <div className="card-title">Costos previstos</div>
            <div className="card-value">{formatCurrency(data.gastos_totals)}</div>
            <div className="card-sub">Materials i equip</div>
          </div>
          <div className="card">
            <div className="card-title">Benefici previst</div>
            <div className={`card-value ${data.benefici >= 0 ? 'success' : 'error'}`}>
              {formatCurrency(data.benefici)}
            </div>
            <div className="card-sub">Marge: {percentLabel(data.percent_benefici)}</div>
          </div>
        </div>

        <div className="tabs-bar">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div>
            <div className="detail-grid">
              <DetailField label="Client" value={data.client_nom ?? data.client_codi ?? '-'} />
              <DetailField label="Modalitat" value={data.modalitat ?? '-'} />
              <DetailField label="Data" value={formatDateFull(data.data_pressupost)} />
              <DetailField label="Venciment" value={formatDateFull(data.data_venciment)} />
              <DetailField label="Acceptacio" value={formatDateFull(data.data_acceptacio)} />
              <DetailField label="IVA" value={`${data.iva_percent.toFixed(1)}% (${formatCurrency(data.iva_import)})`} />
              <DetailField label="IRPF" value={`${data.irpf_percent.toFixed(1)}% (${formatCurrency(data.irpf_import)})`} />
              <DetailField label="Jornades" value={String(dades.numJornades ?? '-')} />
            </div>

            {projecteCodi && (
              <div className="card linked-project-card">
                <div>
                  <div className="detail-label">Projecte vinculat</div>
                  <div className="detail-value">{projecteCodi}</div>
                </div>
                {onOpenProjecte && (
                  <button className="btn-page" onClick={() => onOpenProjecte(projecteCodi)}>
                    <FolderOpen size={14} />
                    Obrir projecte
                  </button>
                )}
              </div>
            )}

            {!!dades.detallsProjecte && (
              <div style={{ marginTop: '1rem' }}>
                <div className="detail-label" style={{ marginBottom: '0.35rem' }}>Detalls projecte</div>
                <div className="card text-block">{dades.detallsProjecte}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'tasques' && (
          <TableOrEmpty empty={tasques.length === 0} message="Cap tasca definida">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Categoria / Descripcio</th>
                  <th>Servei</th>
                  <th className="td-right">Quantitat</th>
                  <th className="td-right">Tarifa</th>
                  <th className="td-right">Import</th>
                </tr>
              </thead>
              <tbody>
                {tasques.map((t, i) => (
                  <tr key={t.id ?? i}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{t.categoria || '-'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>{t.descripcio || '-'}</div>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{t.servei || '-'}</td>
                    <td className="td-right">{t.quantitat} {t.unitat}</td>
                    <td className="td-right">{formatCurrency(t.tarifa)}</td>
                    <td className="td-right" style={{ fontWeight: 600 }}>{formatCurrency(t.importe)}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                  <td colSpan={4} style={{ fontWeight: 600, textAlign: 'right' }}>Base imposable</td>
                  <td className="td-right" style={{ fontWeight: 700 }}>{formatCurrency(data.base_imposable)}</td>
                </tr>
              </tbody>
            </table>
          </TableOrEmpty>
        )}

        {tab === 'costos' && (
          <div>
            <div className="section-heading"><Package size={16} /> Recursos humans</div>
            <TableOrEmpty empty={recursosHumans.length === 0} message="Cap recurs huma previst">
              <table className="resource-table">
                <thead>
                  <tr>
                    <th>Categoria / Servei</th>
                    <th>Proveidor</th>
                    <th className="td-right">Quantitat</th>
                    <th className="td-right">Tarifa</th>
                    <th className="td-right">Import</th>
                  </tr>
                </thead>
                <tbody>
                  {recursosHumans.map((r, i) => (
                    <tr key={r.id ?? i}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.categoria || '-'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>{r.servei || '-'}</div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{r.proveidor || '-'}</td>
                      <td className="td-right">{r.quantitat} {r.unitat}</td>
                      <td className="td-right">{formatCurrency(r.tarifa)}</td>
                      <td className="td-right" style={{ fontWeight: 600 }}>{formatCurrency(r.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableOrEmpty>

            <div className="section-heading" style={{ marginTop: '1.5rem' }}><Package size={16} /> Materials</div>
            <TableOrEmpty empty={materials.length === 0} message="Cap material previst">
              <table className="resource-table">
                <thead>
                  <tr>
                    <th>Grup / Material</th>
                    <th>Proveidor</th>
                    <th className="td-right">Jornades</th>
                    <th className="td-right">Cost prov.</th>
                    <th className="td-right">Preu venda</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, i) => (
                    <tr key={m.id ?? i}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{m.grup || '-'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>{m.material || '-'}</div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{m.proveidor || '-'}</td>
                      <td className="td-right">{m.jornades ?? 1}</td>
                      <td className="td-right">{formatCurrency(m.preuProveidor)}</td>
                      <td className="td-right">{formatCurrency(m.preuPlatea)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableOrEmpty>
          </div>
        )}

        {tab === 'notes' && (
          <div className="notes-grid">
            <NoteBlock label="Observacions client" value={dades.observacionsClient} />
            <NoteBlock label="Notes a peu" value={dades.notesAPeu} />
            <NoteBlock label="Notes a peu ES" value={dades.notesAPeuEs} />
            <NoteBlock label="Notes a peu EN" value={dades.notesAPeuEn} />
          </div>
        )}
      </div>
    </>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-field">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  )
}

function TableOrEmpty({ empty, message, children }: { empty: boolean; message: string; children: ReactNode }) {
  if (empty) return <div className="empty-state">{message}</div>
  return <div className="table-wrapper">{children}</div>
}

function NoteBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="detail-label" style={{ marginBottom: '0.35rem' }}>{label}</div>
      <div className="card text-block">{value || '-'}</div>
    </div>
  )
}

interface PressupostJson {
  tasques?: Tasca[]
  materials?: Material[]
  recursosHumans?: RecursHuma[]
  numJornades?: number
  detallsProjecte?: string
  observacionsClient?: string
  notesAPeu?: string
  notesAPeuEs?: string
  notesAPeuEn?: string
}

interface Tasca {
  id?: string
  categoria?: string
  servei?: string
  descripcio?: string
  quantitat: number
  unitat?: string
  tarifa: number
  importe: number
}

interface Material {
  id?: string
  grup?: string
  material?: string
  proveidor?: string
  preuProveidor: number
  preuPlatea: number
  jornades?: number
}

interface RecursHuma {
  id?: string
  proveidor?: string
  categoria?: string
  servei?: string
  quantitat: number
  unitat?: string
  tarifa: number
  importe: number
}
