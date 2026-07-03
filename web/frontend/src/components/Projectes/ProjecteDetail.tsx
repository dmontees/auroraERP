import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  History,
  Package,
  Receipt,
  User,
} from 'lucide-react'
import { getProjecte } from '../../api/projectes'
import type { EstatProjecte, ProjecteDetall, ProjecteLookups } from '../../types'
import { estatLabel, formatCurrency, formatDateFull, percentLabel } from '../../utils'

interface Props {
  codi: string
  onBack: () => void
}

type TabId = 'resum' | 'dades' | 'despeses' | 'tasques' | 'instruccions' | 'feedback' | 'historial' | 'pagaments'

export default function ProjecteDetail({ codi, onBack }: Props) {
  const [data, setData] = useState<ProjecteDetall | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabId>('resum')

  useEffect(() => {
    setLoading(true)
    setError('')
    getProjecte(codi)
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

  const dades = data.dades as ProjecteJson
  const recursosHumans = dades.recursosHumans ?? []
  const materials = dades.materials ?? []
  const tasques = dades.tasques ?? []
  const historial = dades.historial ?? []
  const documents = dades.documents ?? []
  const feedback = dades.feedback

  const tabs = [
    { id: 'resum' as const, label: 'Resum', icon: <ClipboardList size={14} /> },
    { id: 'dades' as const, label: 'Dades Generals', icon: <User size={14} /> },
    { id: 'despeses' as const, label: `Despeses (${recursosHumans.length + materials.length})`, icon: <Package size={14} /> },
    { id: 'tasques' as const, label: `Tasques (${tasques.length})`, icon: <FileText size={14} /> },
    { id: 'instruccions' as const, label: 'Instruccions', icon: <ClipboardList size={14} /> },
    { id: 'feedback' as const, label: 'Feedback', icon: <Receipt size={14} /> },
    { id: 'historial' as const, label: 'Historial', icon: <History size={14} /> },
    { id: 'pagaments' as const, label: 'Pagaments Proveidors', icon: <Receipt size={14} /> },
  ]

  return (
    <>
      <div className="page-header">
        <button className="page-header-back" onClick={onBack}><ArrowLeft size={16} /></button>
        <div>
          <h1>{data.titol}</h1>
          <p>{data.codi} - {data.client_nom ?? data.client_codi}</p>
        </div>
        <div className="page-header-actions">
          {data.pressupost_codi && <span className="linked-badge">Pressupost {data.pressupost_codi}</span>}
          {(data.factura_codi || dades.facturaAssociada) && <span className="linked-badge">Factura {data.factura_codi || dades.facturaAssociada}</span>}
          <span className={`estat-badge estat-${data.estat}`}>{estatLabel(data.estat as EstatProjecte)}</span>
        </div>
      </div>

      <div className="page-body">
        <div className="finance-summary">
          <div className="card">
            <div className="card-title">Ingressos sense IVA</div>
            <div className="card-value">{formatCurrency(data.ingres_sense_iva)}</div>
            <div className="card-sub">Amb IVA: {formatCurrency(data.ingres_amb_iva)}</div>
          </div>
          <div className="card">
            <div className="card-title">Despeses totals</div>
            <div className="card-value">{formatCurrency(data.gastos_totals)}</div>
            <div className="card-sub">Humans: {formatCurrency(data.gastos_humans)} - Materials: {formatCurrency(data.gastos_materials)}</div>
          </div>
          <div className="card">
            <div className="card-title">Benefici</div>
            <div className={`card-value ${data.benefici >= 0 ? 'success' : 'error'}`}>{formatCurrency(data.benefici)}</div>
            <div className="card-sub">Marge: {percentLabel(data.percent_benefici)}</div>
          </div>
        </div>

        <div className="tabs-bar">
          {tabs.map((t) => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'resum' && (
          <ResumTab data={data} dades={dades} documents={documents} />
        )}
        {tab === 'dades' && (
          <DadesTab data={data} dades={dades} />
        )}
        {tab === 'despeses' && (
          <DespesesTab recursosHumans={recursosHumans} materials={materials} totals={data} lookups={data.lookups} />
        )}
        {tab === 'tasques' && (
          <TasquesTab tasques={tasques} total={data.ingres_sense_iva} />
        )}
        {tab === 'instruccions' && (
          <div className="notes-grid">
            <NoteBlock label="Instruccions client" value={dades.instruccionsClient} />
            <NoteBlock label="Instruccions proveidors" value={dades.instruccionsProveidors} />
          </div>
        )}
        {tab === 'feedback' && (
          <FeedbackTab feedback={feedback} />
        )}
        {tab === 'historial' && (
          <HistorialTab historial={historial} documents={documents} />
        )}
        {tab === 'pagaments' && (
          <PagamentsTab recursosHumans={recursosHumans} materials={materials} lookups={data.lookups} />
        )}
      </div>
    </>
  )
}

function ResumTab({ data, dades, documents }: { data: ProjecteDetall; dades: ProjecteJson; documents: DocumentProjecte[] }) {
  return (
    <div className="project-detail-stack">
      {!!dades.imatgeReferencia && (
        <img className="project-reference-image" src={dades.imatgeReferencia} alt="" />
      )}
      <div className="detail-grid">
        <DetailField label="Client" value={data.client_nom ?? data.client_codi} />
        <DetailField label="Modalitat" value={data.modalitat || dades.modalitat || '-'} />
        <DetailField label="Servei" value={data.servei || dades.servei || '-'} />
        <DetailField label="Directe" value={data.es_direct || dades.esDirect ? 'Si' : 'No'} />
        <DetailField label="Data inici" value={formatDateFull(data.data_inici)} />
        <DetailField label="Data entrega" value={formatDateFull(data.data_entrega)} />
        <DetailField label="Facturat" value={data.facturat ? 'Si' : 'No'} />
        <DetailField label="Arxivat" value={data.arxivat ? 'Si' : 'No'} />
      </div>
      {!!dades.descripcio && <NoteBlock label="Descripcio" value={dades.descripcio} />}
      <DatesBlock title="Dates de rodatge" dates={data.dates_rodatge} />
      <DatesBlock title="Dates d'entrega" dates={data.dates_entrega} />
      <DocumentsBlock documents={documents} />
    </div>
  )
}

function DadesTab({ data, dades }: { data: ProjecteDetall; dades: ProjecteJson }) {
  return (
    <div className="detail-grid">
      <DetailField label="Codi" value={data.codi} />
      <DetailField label="Titol" value={data.titol} />
      <DetailField label="Client" value={data.client_nom ?? data.client_codi} />
      <DetailField label="Pressupost" value={data.pressupost_codi || dades.pressupost || '-'} />
      <DetailField label="Factura" value={data.factura_codi || dades.facturaAssociada || dades.factura || '-'} />
      <DetailField label="Estat" value={estatLabel(data.estat)} />
      <DetailField label="Modalitat" value={data.modalitat || dades.modalitat || '-'} />
      <DetailField label="Servei" value={data.servei || dades.servei || '-'} />
      <DetailField label="Data finalitzacio" value={formatDateFull(data.data_finalitzacio)} />
      <DetailField label="Importat" value={dades.esImportat ? 'Si' : 'No'} />
    </div>
  )
}

function DespesesTab({
  recursosHumans,
  materials,
  totals,
  lookups,
}: {
  recursosHumans: RH[]
  materials: Mat[]
  totals: ProjecteDetall
  lookups?: ProjecteLookups
}) {
  return (
    <div>
      <div className="section-heading"><User size={16} /> Recursos humans</div>
      <TableOrEmpty empty={recursosHumans.length === 0} message="Cap recurs huma assignat">
        <table className="resource-table">
          <thead><tr><th>Categoria / Servei</th><th>Proveidor</th><th className="td-right">Quantitat</th><th className="td-right">Preu unit.</th><th className="td-right">Cost</th></tr></thead>
          <tbody>
            {recursosHumans.map((r, i) => (
              <tr key={r.id ?? i}>
                <td><strong>{resolveLookup(lookups, 'categories', r.categoria)}</strong><div className="td-muted">{resolveLookup(lookups, 'serveis', r.servei)}</div></td>
                <td>{resolveLookup(lookups, 'proveidors', r.proveidor)}</td>
                <td className="td-right">{r.quantitat} {resolveLookup(lookups, 'unitats', r.unitat)}</td>
                <td className="td-right">{formatCurrency(r.preu)}</td>
                <td className="td-right"><strong>{formatCurrency(r.cost)}</strong></td>
              </tr>
            ))}
            <tr className="table-total"><td colSpan={4}>Total humans</td><td className="td-right">{formatCurrency(totals.gastos_humans)}</td></tr>
          </tbody>
        </table>
      </TableOrEmpty>

      <div className="section-heading" style={{ marginTop: '1.5rem' }}><Package size={16} /> Materials</div>
      <TableOrEmpty empty={materials.length === 0} message="Cap material assignat">
        <table className="resource-table">
          <thead><tr><th>Grup / Material</th><th>Proveidor</th><th className="td-right">Jornades</th><th className="td-right">Cost prov.</th><th className="td-right">Preu intern</th></tr></thead>
          <tbody>
            {materials.map((m, i) => (
              <tr key={m.id ?? i}>
                <td><strong>{resolveLookup(lookups, 'grups', m.grup)}</strong><div className="td-muted">{resolveLookup(lookups, 'materials', m.material)}</div></td>
                <td>{resolveLookup(lookups, 'proveidors', m.proveidor)}</td>
                <td className="td-right">{m.jornades ?? 1}</td>
                <td className="td-right">{formatCurrency(m.preuProveidor)}</td>
                <td className="td-right">{formatCurrency(m.preuPlatea)}</td>
              </tr>
            ))}
            <tr className="table-total"><td colSpan={4}>Total materials</td><td className="td-right">{formatCurrency(totals.gastos_materials)}</td></tr>
          </tbody>
        </table>
      </TableOrEmpty>
    </div>
  )
}

function TasquesTab({ tasques, total }: { tasques: Tasca[]; total: number }) {
  const grouped = useMemo(() => {
    return tasques.reduce<Record<string, Tasca[]>>((acc, tasca) => {
      const key = tasca.categoria || 'Sense categoria'
      acc[key] = [...(acc[key] ?? []), tasca]
      return acc
    }, {})
  }, [tasques])

  if (tasques.length === 0) return <div className="empty-state">Cap tasca definida</div>

  return (
    <div className="project-detail-stack">
      {Object.entries(grouped).map(([categoria, items]) => (
        <div key={categoria} className="table-wrapper">
          <table className="resource-table">
            <thead><tr><th colSpan={5}>{categoria}</th></tr></thead>
            <tbody>
              {items.map((t, i) => (
                <tr key={t.id ?? i}>
                  <td><strong>{t.descripcio || '-'}</strong><div className="td-muted">{t.servei || '-'}</div></td>
                  <td className="td-right">{t.quantitat} {t.unitat}</td>
                  <td className="td-right">{formatCurrency(t.tarifa)}</td>
                  <td className="td-right"><strong>{formatCurrency(t.importe)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="card table-total-card">Total ingressos sense IVA: <strong>{formatCurrency(total)}</strong></div>
    </div>
  )
}

function FeedbackTab({ feedback }: { feedback?: FeedbackProjecte }) {
  if (!feedback) return <div className="empty-state">Sense feedback registrat</div>
  return (
    <div className="detail-grid">
      <DetailField label="Data entrega" value={formatDateFull(feedback.dataEntrega)} />
      <DetailField label="Data feedback" value={formatDateFull(feedback.dataFeedback)} />
      <DetailField label="Data validacio" value={formatDateFull(feedback.dataValidacio)} />
      <DetailField label="Validat" value={feedback.validat ? 'Si' : 'No'} />
      <div className="detail-field wide"><NoteBlock label="Nota entrega" value={feedback.notaEntrega} /></div>
      <div className="detail-field wide"><NoteBlock label="Notes feedback" value={feedback.notesFeedback} /></div>
      <div className="detail-field wide"><NoteBlock label="Notes revisio" value={feedback.notesRevisio} /></div>
    </div>
  )
}

function HistorialTab({ historial, documents }: { historial: Hist[]; documents: DocumentProjecte[] }) {
  return (
    <div className="project-detail-stack">
      <DocumentsBlock documents={documents} />
      {historial.length === 0 ? (
        <div className="empty-state">Sense historial</div>
      ) : (
        <div className="timeline-list">
          {[...historial].reverse().map((h, i) => (
            <div key={h.id ?? i} className="timeline-item">
              <time>{formatDateFull(h.data)}</time>
              <div><strong>{h.tipus}</strong><span>{h.descripcio}</span>{h.detalls && <small>{h.detalls}</small>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PagamentsTab({ recursosHumans, materials, lookups }: { recursosHumans: RH[]; materials: Mat[]; lookups?: ProjecteLookups }) {
  const proveidors = [
    ...recursosHumans.filter((r) => r.proveidor).map((r) => ({
      tipus: 'Recurs huma',
      proveidor: resolveLookup(lookups, 'proveidors', r.proveidor),
      concepte: resolveLookup(lookups, 'serveis', r.servei),
      import: r.cost,
      tdCodi: r.tdCodi,
    })),
    ...materials.filter((m) => m.proveidor).map((m) => ({
      tipus: 'Material',
      proveidor: resolveLookup(lookups, 'proveidors', m.proveidor),
      concepte: resolveLookup(lookups, 'materials', m.material),
      import: m.preuProveidor * (m.jornades ?? 1),
      tdCodi: m.tdCodi,
    })),
  ]
  return (
    <TableOrEmpty empty={proveidors.length === 0} message="Sense despeses de proveidor vinculades">
      <table className="resource-table">
        <thead><tr><th>Tipus</th><th>Proveidor</th><th>Concepte</th><th>TD</th><th className="td-right">Import previst</th></tr></thead>
        <tbody>
          {proveidors.map((p, i) => (
            <tr key={`${p.tipus}-${i}`}><td>{p.tipus}</td><td>{p.proveidor}</td><td>{p.concepte || '-'}</td><td>{p.tdCodi || '-'}</td><td className="td-right">{formatCurrency(p.import)}</td></tr>
          ))}
        </tbody>
      </table>
    </TableOrEmpty>
  )
}

function DatesBlock({ title, dates }: { title: string; dates: Array<{ data: string; hora?: string; nota?: string; entregada?: boolean }> }) {
  if (dates.length === 0) return null
  return (
    <div>
      <div className="section-heading">{title}</div>
      <div className="date-chip-row">
        {dates.map((d, i) => (
          <span key={`${title}-${i}`} className="date-chip">
            {formatDateFull(d.data)}{d.hora ? ` ${d.hora}` : ''}{d.entregada ? ' - Entregada' : ''}{d.nota ? ` - ${d.nota}` : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function DocumentsBlock({ documents }: { documents: DocumentProjecte[] }) {
  if (documents.length === 0) return null
  return (
    <div>
      <div className="section-heading"><FileText size={16} /> Documents</div>
      <div className="documents-list">
        {documents.map((doc, i) => (
          <div key={doc.id ?? i} className="document-row">
            <strong>{doc.nom || doc.nomFitxer || 'Document'}</strong>
            <span>{doc.tipus || '-'} - {formatDateFull(doc.dataAfegit)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div className="detail-field"><div className="detail-label">{label}</div><div className="detail-value">{value}</div></div>
}

function NoteBlock({ label, value }: { label: string; value?: string }) {
  return <div><div className="detail-label" style={{ marginBottom: '0.35rem' }}>{label}</div><div className="card text-block">{value || '-'}</div></div>
}

function TableOrEmpty({ empty, message, children }: { empty: boolean; message: string; children: ReactNode }) {
  if (empty) return <div className="empty-state">{message}</div>
  return <div className="table-wrapper">{children}</div>
}

function resolveLookup(
  lookups: ProjecteLookups | undefined,
  group: keyof ProjecteLookups,
  code: string | undefined,
): string {
  if (!code) return '-'
  return lookups?.[group]?.[code] ?? code
}

interface ProjecteJson {
  descripcio?: string
  modalitat?: string
  servei?: string
  esDirect?: boolean
  pressupost?: string
  factura?: string
  facturaAssociada?: string
  facturaHistorica?: { numero: string; data: string }
  instruccionsClient?: string
  instruccionsProveidors?: string
  recursosHumans?: RH[]
  materials?: Mat[]
  tasques?: Tasca[]
  historial?: Hist[]
  feedback?: FeedbackProjecte
  documents?: DocumentProjecte[]
  avisFacturacio?: { actiu: boolean; descripcio: string }
  imatgeReferencia?: string
  esImportat?: boolean
}

interface RH { id?: string; tdCodi?: string; categoria?: string; servei?: string; unitat?: string; quantitat: number; preu: number; cost: number; proveidor?: string }
interface Mat { id?: string; tdCodi?: string; grup?: string; material?: string; proveidor?: string; preuProveidor: number; preuPlatea: number; jornades?: number }
interface Tasca { id?: string; categoria?: string; descripcio?: string; servei?: string; quantitat: number; unitat?: string; tarifa: number; importe: number }
interface Hist { id?: string; data: string; tipus: string; descripcio: string; detalls?: string }
interface DocumentProjecte { id?: string; tipus?: string; nom?: string; nomFitxer?: string; dataAfegit?: string }
interface FeedbackProjecte { dataEntrega?: string; notaEntrega?: string; dataFeedback?: string; notesFeedback?: string; notesRevisio?: string; dataValidacio?: string; validat: boolean }
