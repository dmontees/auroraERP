import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Search,
} from 'lucide-react'
import { getProjectes } from '../../api/projectes'
import type { EstatProjecte, ProjecteResum, ProjectesFilters } from '../../types'
import { estatLabel, formatCurrency, formatDateFull, percentLabel } from '../../utils'

interface Props {
  onSelectProjecte: (codi: string) => void
}

const ESTATS: { value: string; label: string }[] = [
  { value: '', label: 'Tots els estats' },
  { value: 'esborrany', label: 'Esborrany' },
  { value: 'planificat', label: 'Planificat' },
  { value: 'rodatge', label: 'Rodatge' },
  { value: 'edicio', label: 'Edicio' },
  { value: 'esperant_feedback', label: 'Esperant feedback' },
  { value: 'revisio', label: 'Revisio' },
  { value: 'acabat', label: 'Acabat' },
  { value: 'facturat', label: 'Facturat' },
]

const KANBAN_ESTATS: EstatProjecte[] = [
  'planificat',
  'rodatge',
  'edicio',
  'esperant_feedback',
  'revisio',
  'acabat',
  'facturat',
]

const DEFAULT_FILTERS: ProjectesFilters = {
  estat: '',
  arxivat: 0,
  client: '',
  modalitat: '',
  servei: '',
  direct: 0,
  desde: '',
  fins: '',
  q: '',
  page: 1,
  order_by: 'data_entrega',
  order_dir: 'DESC',
}

export default function ProjectesList({ onSelectProjecte }: Props) {
  const [projectes, setProjectes] = useState<ProjecteResum[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, per_page: 20 })
  const [filters, setFilters] = useState<ProjectesFilters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'taula' | 'kanban'>('taula')

  const load = useCallback((f: ProjectesFilters) => {
    setLoading(true)
    setError('')
    getProjectes({ ...f, page: view === 'kanban' ? 1 : f.page, per_page: view === 'kanban' ? 100 : 20 })
      .then((res) => {
        setProjectes(res.data)
        setPagination(res.pagination)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [view])

  useEffect(() => { load(filters) }, [filters, load])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, q: search, page: 1 }))
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const metrics = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const activeStates: EstatProjecte[] = ['planificat', 'rodatge', 'edicio', 'esperant_feedback', 'revisio']
    const actius = projectes.filter((p) => activeStates.includes(p.estat) && !p.arxivat).length
    const endarrerits = projectes.filter((p) => {
      if (p.arxivat || p.estat === 'acabat' || p.estat === 'facturat') return false
      if (!p.data_entrega) return false
      return new Date(p.data_entrega) < today
    }).length
    const rodatges = projectes
      .filter((p) => p.data_inici && new Date(p.data_inici) >= today && !p.arxivat)
      .sort((a, b) => String(a.data_inici).localeCompare(String(b.data_inici)))
      .slice(0, 3)
    const entregues = projectes
      .filter((p) => p.data_entrega && new Date(p.data_entrega) >= today && !p.arxivat)
      .sort((a, b) => String(a.data_entrega).localeCompare(String(b.data_entrega)))
      .slice(0, 3)
    return { actius, endarrerits, rodatges, entregues }
  }, [projectes])

  const modalitats = useMemo(() => sortedUnique(projectes.map((p) => p.modalitat)), [projectes])
  const serveis = useMemo(() => sortedUnique(projectes.map((p) => p.servei)), [projectes])

  function setFilter<K extends keyof ProjectesFilters>(key: K, value: ProjectesFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }))
  }

  function toggleSort(col: string) {
    setFilters((f) => ({
      ...f,
      order_by: col,
      order_dir: f.order_by === col && f.order_dir === 'DESC' ? 'ASC' : 'DESC',
      page: 1,
    }))
  }

  function SortIcon({ col }: { col: string }) {
    if (filters.order_by !== col) return null
    return filters.order_dir === 'DESC'
      ? <ChevronDown size={12} style={{ verticalAlign: 'middle' }} />
      : <ChevronUp size={12} style={{ verticalAlign: 'middle' }} />
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Projectes</h1>
          <p>{pagination.total} projecte{pagination.total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="page-body">
        <div className="projectes-metrics">
          <MetricCard label="Projectes actius" value={String(metrics.actius)} tone="info" />
          <MetricCard label="Endarrerits" value={String(metrics.endarrerits)} tone={metrics.endarrerits > 0 ? 'error' : 'success'} />
          <AgendaMetric label="Propers rodatges" items={metrics.rodatges} field="data_inici" />
          <AgendaMetric label="Properes entregues" items={metrics.entregues} field="data_entrega" />
        </div>

        <div className="filters-panel">
          <div className="filters-row">
            <div className="search-input-wrap">
              <Search size={15} className="search-icon" />
              <input
                className="search-input"
                type="search"
                placeholder="Cerca per codi, client o titol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="segmented-control">
              <button className={view === 'taula' ? 'active' : ''} onClick={() => setView('taula')}>
                <List size={16} /> Taula
              </button>
              <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>
                <LayoutGrid size={16} /> Kanban
              </button>
            </div>
            <button className="btn-page" type="button" disabled title="Exportacio disponible a l'app d'escriptori">
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>

          <div className="filters-row compact">
            <select className="filter-select" value={filters.estat} onChange={(e) => setFilter('estat', e.target.value)}>
              {ESTATS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="filter-select" value={filters.modalitat} onChange={(e) => setFilter('modalitat', e.target.value)}>
              <option value="">Totes les modalitats</option>
              {modalitats.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="filter-select" value={filters.servei} onChange={(e) => setFilter('servei', e.target.value)}>
              <option value="">Tots els serveis</option>
              {serveis.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="filter-select" value={filters.arxivat} onChange={(e) => setFilter('arxivat', Number(e.target.value))}>
              <option value={0}>Actius</option>
              <option value={1}>Arxivats</option>
            </select>
            <label className="toggle-filter">
              <input
                type="checkbox"
                checked={filters.direct === 1}
                onChange={(e) => setFilter('direct', e.target.checked ? 1 : 0)}
              />
              Directes
            </label>
            <input className="filter-select date-filter" type="date" value={filters.desde} onChange={(e) => setFilter('desde', e.target.value)} />
            <input className="filter-select date-filter" type="date" value={filters.fins} onChange={(e) => setFilter('fins', e.target.value)} />
          </div>
        </div>

        {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

        {view === 'taula' ? (
          <ProjectesTable
            projectes={projectes}
            loading={loading}
            onSelectProjecte={onSelectProjecte}
            onSort={toggleSort}
            SortIcon={SortIcon}
          />
        ) : (
          <ProjectesKanban projectes={projectes} loading={loading} onSelectProjecte={onSelectProjecte} />
        )}

        {view === 'taula' && pagination.pages > 1 && (
          <div className="pagination">
            <span>Pagina {pagination.page} de {pagination.pages} - {pagination.total} projectes</span>
            <div className="pagination-btns">
              <button className="btn-page" disabled={pagination.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
                Anterior
              </button>
              <button className="btn-page" disabled={pagination.page >= pagination.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
                Seguent
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function ProjectesTable({
  projectes,
  loading,
  onSelectProjecte,
  onSort,
  SortIcon,
}: {
  projectes: ProjecteResum[]
  loading: boolean
  onSelectProjecte: (codi: string) => void
  onSort: (col: string) => void
  SortIcon: (props: { col: string }) => JSX.Element | null
}) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('titol')}>Projecte <SortIcon col="titol" /></th>
            <th>Client</th>
            <th>Estat</th>
            <th>Modalitat</th>
            <th>Servei</th>
            <th>Directe</th>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('data_entrega')}>Entrega <SortIcon col="data_entrega" /></th>
            <th className="td-right">Despeses</th>
            <th className="td-right" style={{ cursor: 'pointer' }} onClick={() => onSort('ingres_sense_iva')}>Ingressos <SortIcon col="ingres_sense_iva" /></th>
            <th className="td-right" style={{ cursor: 'pointer' }} onClick={() => onSort('benefici')}>Benefici <SortIcon col="benefici" /></th>
            <th className="td-right">Marge</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={11} style={{ textAlign: 'center', padding: '2rem' }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
          ) : projectes.length === 0 ? (
            <tr><td colSpan={11} className="empty-state">Cap projecte trobat</td></tr>
          ) : (
            projectes.map((p) => (
              <tr key={p.codi} className="clickable" onClick={() => onSelectProjecte(p.codi)}>
                <td><div style={{ fontWeight: 600 }}>{p.titol}</div><div className="td-mono">{p.codi}</div></td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{p.client_nom ?? '-'}</td>
                <td><span className={`estat-badge estat-${p.estat}`}>{estatLabel(p.estat as EstatProjecte)}</span></td>
                <td>{p.modalitat || '-'}</td>
                <td>{p.servei || '-'}</td>
                <td>{p.es_direct ? 'Si' : 'No'}</td>
                <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{formatDateFull(p.data_entrega)}</td>
                <td className="td-right">{formatCurrency(p.gastos_totals)}</td>
                <td className="td-right" style={{ fontWeight: 600 }}>{formatCurrency(p.ingres_sense_iva)}</td>
                <td className="td-right" style={{ fontWeight: 600, color: p.benefici >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{formatCurrency(p.benefici)}</td>
                <td className="td-right" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{percentLabel(p.percent_benefici)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function ProjectesKanban({ projectes, loading, onSelectProjecte }: { projectes: ProjecteResum[]; loading: boolean; onSelectProjecte: (codi: string) => void }) {
  if (loading) return <div className="spinner"><div className="loading-spinner" /></div>
  return (
    <div className="kanban-board">
      {KANBAN_ESTATS.map((estat) => {
        const items = projectes.filter((p) => p.estat === estat)
        return (
          <section key={estat} className="kanban-column">
            <div className="kanban-column-header">
              <span className={`estat-dot estat-${estat}`} />
              <strong>{estatLabel(estat)}</strong>
              <span>{items.length}</span>
            </div>
            <div className="kanban-items">
              {items.length === 0 ? (
                <div className="kanban-empty">Sense projectes</div>
              ) : items.map((p) => (
                <button key={p.codi} className="kanban-card" onClick={() => onSelectProjecte(p.codi)}>
                  <span className="td-mono">{p.codi}</span>
                  <strong>{p.titol}</strong>
                  <span>{p.client_nom ?? '-'}</span>
                  <small>{formatDateFull(p.data_entrega)} · {formatCurrency(p.benefici)}</small>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'info' | 'success' | 'error' }) {
  return (
    <div className={`card metric-card metric-${tone}`}>
      <div className="card-title">{label}</div>
      <div className="card-value">{value}</div>
    </div>
  )
}

function AgendaMetric({ label, items, field }: { label: string; items: ProjecteResum[]; field: 'data_inici' | 'data_entrega' }) {
  return (
    <div className="card metric-list-card">
      <div className="card-title">{label}</div>
      {items.length === 0 ? (
        <div className="card-sub">Cap registre proper</div>
      ) : (
        items.map((p) => (
          <div key={`${label}-${p.codi}`} className="metric-list-item">
            <strong>{formatDateFull(p[field])}</strong>
            <span>{p.titol}</span>
          </div>
        ))
      )}
    </div>
  )
}

function sortedUnique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b))
}
