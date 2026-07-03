import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { getPressupostos } from '../../api/pressupostos'
import type { EstatPressupost, PressupostResum, PressupostosFilters } from '../../types'
import { estatPressupostLabel, formatCurrency, formatDateFull, percentLabel } from '../../utils'

interface Props {
  onSelectPressupost: (codi: string) => void
}

const ESTATS: { value: string; label: string }[] = [
  { value: '', label: 'Tots els estats' },
  { value: 'esborrany', label: 'Esborrany' },
  { value: 'enviat', label: 'Enviat' },
  { value: 'acceptat', label: 'Acceptat' },
  { value: 'rebutjat', label: 'Rebutjat' },
]

const DEFAULT_FILTERS: PressupostosFilters = {
  estat: '',
  client: '',
  q: '',
  page: 1,
  order_by: 'data_pressupost',
  order_dir: 'DESC',
}

export default function PressupostosList({ onSelectPressupost }: Props) {
  const [pressupostos, setPressupostos] = useState<PressupostResum[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, per_page: 20 })
  const [filters, setFilters] = useState<PressupostosFilters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback((f: PressupostosFilters) => {
    setLoading(true)
    setError('')
    getPressupostos(f)
      .then((res) => {
        setPressupostos(res.data)
        setPagination(res.pagination)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(filters) }, [filters, load])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, q: search, page: 1 }))
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

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
          <h1>Pressupostos</h1>
          <p>{pagination.total} pressupost{pagination.total !== 1 ? 'os' : ''}</p>
        </div>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              type="search"
              placeholder="Cerca per projecte, client o codi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filters.estat}
            onChange={(e) => setFilters((f) => ({ ...f, estat: e.target.value, page: 1 }))}
          >
            {ESTATS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pressupost</th>
                <th>Client</th>
                <th>Estat</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('data_pressupost')}>
                  Data <SortIcon col="data_pressupost" />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('data_venciment')}>
                  Venciment <SortIcon col="data_venciment" />
                </th>
                <th className="td-right" style={{ cursor: 'pointer' }} onClick={() => toggleSort('total_pressupost')}>
                  Total <SortIcon col="total_pressupost" />
                </th>
                <th className="td-right" style={{ cursor: 'pointer' }} onClick={() => toggleSort('benefici')}>
                  Benefici <SortIcon col="benefici" />
                </th>
                <th className="td-right">Marge</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : pressupostos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">Cap pressupost trobat</td>
                </tr>
              ) : (
                pressupostos.map((p) => (
                  <tr key={p.codi} className="clickable" onClick={() => onSelectPressupost(p.codi)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.nom_projecte || 'Sense projecte'}</div>
                      <div className="td-mono">{p.codi}</div>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                      {p.client_nom ?? p.client_codi ?? '-'}
                    </td>
                    <td>
                      <span className={`estat-badge pressupost-${p.estat}`}>
                        {estatPressupostLabel(p.estat as EstatPressupost)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {formatDateFull(p.data_pressupost)}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {formatDateFull(p.data_venciment)}
                    </td>
                    <td className="td-right" style={{ fontWeight: 600 }}>
                      {formatCurrency(p.total_pressupost)}
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

        {pagination.pages > 1 && (
          <div className="pagination">
            <span>
              Pagina {pagination.page} de {pagination.pages} - {pagination.total} pressupostos
            </span>
            <div className="pagination-btns">
              <button
                className="btn-page"
                disabled={pagination.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Anterior
              </button>
              <button
                className="btn-page"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Seguent
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
