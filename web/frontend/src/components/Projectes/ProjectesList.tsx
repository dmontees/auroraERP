import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronUp, ChevronDown } from 'lucide-react'
import { getProjectes } from '../../api/projectes'
import type { ProjecteResum, EstatProjecte, ProjectesFilters } from '../../types'
import { formatCurrency, formatDateFull, estatLabel, percentLabel } from '../../utils'

interface Props {
  onSelectProjecte: (codi: string) => void
}

const ESTATS: { value: string; label: string }[] = [
  { value: '',                   label: 'Tots els estats' },
  { value: 'esborrany',          label: 'Esborrany' },
  { value: 'planificat',         label: 'Planificat' },
  { value: 'rodatge',            label: 'Rodatge' },
  { value: 'edicio',             label: 'Edició' },
  { value: 'esperant_feedback',  label: 'Esp. feedback' },
  { value: 'revisio',            label: 'Revisió' },
  { value: 'acabat',             label: 'Acabat' },
  { value: 'facturat',           label: 'Facturat' },
]

const DEFAULT_FILTERS: ProjectesFilters = {
  estat: '', arxivat: 0, client: '', q: '',
  page: 1, order_by: 'data_entrega', order_dir: 'DESC',
}

export default function ProjectesList({ onSelectProjecte }: Props) {
  const [projectes, setProjectes] = useState<ProjecteResum[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, per_page: 20 })
  const [filters, setFilters]     = useState<ProjectesFilters>(DEFAULT_FILTERS)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  const load = useCallback((f: ProjectesFilters) => {
    setLoading(true)
    setError('')
    getProjectes(f)
      .then((res) => {
        setProjectes(res.data)
        setPagination(res.pagination)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(filters) }, [load, filters])

  // Cerca amb debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, q: search, page: 1 }))
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  function setEstat(estat: string) {
    setFilters((f) => ({ ...f, estat, page: 1 }))
  }

  function setArxivat(arxivat: number) {
    setFilters((f) => ({ ...f, arxivat, page: 1 }))
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
      : <ChevronUp   size={12} style={{ verticalAlign: 'middle' }} />
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

        {/* Filtres */}
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              type="search"
              placeholder="Cerca per títol o codi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filters.estat}
            onChange={(e) => setEstat(e.target.value)}
          >
            {ESTATS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filters.arxivat}
            onChange={(e) => setArxivat(Number(e.target.value))}
          >
            <option value={0}>Actius</option>
            <option value={1}>Arxivats</option>
          </select>
        </div>

        {/* Error */}
        {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Taula */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Projecte</th>
                <th>Client</th>
                <th>Estat</th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleSort('data_entrega')}
                >
                  Entrega <SortIcon col="data_entrega" />
                </th>
                <th
                  className="td-right"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleSort('ingres_sense_iva')}
                >
                  Ingressos <SortIcon col="ingres_sense_iva" />
                </th>
                <th
                  className="td-right"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleSort('benefici')}
                >
                  Benefici <SortIcon col="benefici" />
                </th>
                <th className="td-right">Marge</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : projectes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">Cap projecte trobat</td>
                </tr>
              ) : (
                projectes.map((p) => (
                  <tr key={p.codi} className="clickable" onClick={() => onSelectProjecte(p.codi)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.titol}</div>
                      <div className="td-mono">{p.codi}</div>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                      {p.client_nom ?? '—'}
                    </td>
                    <td>
                      <span className={`estat-badge estat-${p.estat}`}>
                        {estatLabel(p.estat as EstatProjecte)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {formatDateFull(p.data_entrega)}
                    </td>
                    <td className="td-right" style={{ fontWeight: 600 }}>
                      {formatCurrency(p.ingres_sense_iva)}
                    </td>
                    <td
                      className="td-right"
                      style={{
                        fontWeight: 600,
                        color: p.benefici >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                      }}
                    >
                      {formatCurrency(p.benefici)}
                    </td>
                    <td className="td-right" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {percentLabel(p.percent_benefici)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginació */}
        {pagination.pages > 1 && (
          <div className="pagination">
            <span>
              Pàgina {pagination.page} de {pagination.pages} · {pagination.total} projectes
            </span>
            <div className="pagination-btns">
              <button
                className="btn-page"
                disabled={pagination.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                ← Anterior
              </button>
              <button
                className="btn-page"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Següent →
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
