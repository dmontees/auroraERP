import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, AlertCircle, Clock,
  FolderOpen, Euro, Calendar, RefreshCw,
} from 'lucide-react'
import { getDashboard } from '../../api/dashboard'
import type { DashboardData, EstatProjecte } from '../../types'
import { formatCurrency, formatDate, formatDatetime, estatLabel } from '../../utils'

interface Props {
  onNavigateProjecte: (codi: string) => void
}

export default function Dashboard({ onNavigateProjecte }: Props) {
  const [data, setData]     = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="spinner"><div className="loading-spinner" /></div>
  if (error)   return <div className="page-body"><div className="error-box">{error}</div></div>
  if (!data)   return null

  const { projectes, factures_venda, factures_compra, agenda, darrers_projectes, ultima_sync } = data
  const { totals_globals: totals, any_actual } = projectes

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Resum de l'activitat</p>
        </div>
        <div className="page-header-actions">
          {ultima_sync && (
            <span className="sync-badge">
              <span className="dot" />
              Sync: {formatDatetime(ultima_sync.synced_at)}
            </span>
          )}
        </div>
      </div>

      <div className="page-body">

        {/* KPIs principals */}
        <div className="kpi-grid">
          <div className="card">
            <div className="card-title">
              <FolderOpen size={12} style={{ display: 'inline', marginRight: 4 }} />
              Projectes actius
            </div>
            <div className="card-value">{totals.total_actius}</div>
            <div className="card-sub">{any_actual.total} l'any {any_actual.any}</div>
          </div>

          <div className="card">
            <div className="card-title">
              <Euro size={12} style={{ display: 'inline', marginRight: 4 }} />
              Ingressos {any_actual.any}
            </div>
            <div className="card-value">{formatCurrency(any_actual.ingres)}</div>
            <div className="card-sub">Total: {formatCurrency(totals.ingres_total)}</div>
          </div>

          <div className="card">
            <div className="card-title">
              <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} />
              Benefici {any_actual.any}
            </div>
            <div className={`card-value ${any_actual.benefici >= 0 ? 'success' : 'error'}`}>
              {formatCurrency(any_actual.benefici)}
            </div>
            <div className="card-sub">
              Marge: {totals.marge_mitja.toFixed(1)}%
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
              Pendent de cobrar
            </div>
            <div className="card-value warning">
              {formatCurrency(factures_venda.pendent_cobrar.import)}
            </div>
            <div className={`card-sub ${factures_venda.vencudes.total > 0 ? 'error' : ''}`}>
              {factures_venda.vencudes.total > 0
                ? `${factures_venda.vencudes.total} factura/es vençudes`
                : `${factures_venda.pendent_cobrar.total_factures} factura/es pendents`}
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <TrendingDown size={12} style={{ display: 'inline', marginRight: 4 }} />
              Pendent de pagar
            </div>
            <div className="card-value error">
              {formatCurrency(factures_compra.pendent_pagar.import)}
            </div>
            <div className="card-sub">
              {factures_compra.pendent_pagar.total} factura/es de compra
            </div>
          </div>
        </div>

        {/* Estats de projectes */}
        <div className="section-heading">
          <FolderOpen size={16} />
          Projectes per estat
        </div>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {projectes.per_estat.map((e) => (
              <div key={e.estat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <StatBadge estat={e.estat as EstatProjecte} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{e.total}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
                  ({formatCurrency(e.ingres)})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Agenda + Darrers projectes */}
        <div className="two-col">

          {/* Agenda */}
          <div>
            <div className="section-heading">
              <Calendar size={16} />
              Propers 30 dies
            </div>

            {agenda.propers_rodatges.length === 0 && agenda.propers_entregues.length === 0 ? (
              <div className="card">
                <div className="empty-state">Cap rodatge ni entrega pròxims</div>
              </div>
            ) : (
              <div className="card">
                <div className="agenda-list">
                  {agenda.propers_rodatges.map((item, i) => (
                    <div key={`rod-${i}`} className="agenda-item">
                      <div className="agenda-date">
                        <div>{formatDate(item.data)}</div>
                        {item.hora && <div style={{ fontWeight: 400 }}>{item.hora}</div>}
                      </div>
                      <div className="agenda-info">
                        <div className="agenda-title">{item.projecte_titol}</div>
                        <div className="agenda-client">{item.client_nom ?? item.projecte_codi} · Rodatge</div>
                      </div>
                    </div>
                  ))}
                  {agenda.propers_entregues.map((item, i) => (
                    <div key={`ent-${i}`} className="agenda-item entrega">
                      <div className="agenda-date">
                        <div>{formatDate(item.data)}</div>
                      </div>
                      <div className="agenda-info">
                        <div className="agenda-title">{item.projecte_titol}</div>
                        <div className="agenda-client">{item.client_nom ?? item.projecte_codi} · Entrega</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Darrers projectes */}
          <div>
            <div className="section-heading">
              <Clock size={16} />
              Darrers projectes
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {darrers_projectes.length === 0 ? (
                <div className="empty-state">Cap projecte</div>
              ) : (
                <table>
                  <tbody>
                    {darrers_projectes.map((p) => (
                      <tr
                        key={p.codi}
                        className="clickable"
                        onClick={() => onNavigateProjecte(p.codi)}
                      >
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.titol}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                            {p.client_nom ?? '—'} · {p.codi}
                          </div>
                        </td>
                        <td className="td-right" style={{ paddingLeft: 0 }}>
                          <StatBadge estat={p.estat} />
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                            {formatCurrency(p.ingres_sense_iva)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Factures any actual */}
        <div className="section-heading" style={{ marginTop: '1.5rem' }}>
          <RefreshCw size={16} />
          Facturació {any_actual.any}
        </div>
        <div className="kpi-grid">
          <div className="card">
            <div className="card-title">Factures emeses</div>
            <div className="card-value">{factures_venda.any_actual.total}</div>
            <div className="card-sub">{formatCurrency(factures_venda.any_actual.import)} total</div>
          </div>
          <div className="card">
            <div className="card-title">Cobrat</div>
            <div className="card-value success">{formatCurrency(factures_venda.any_actual.pagat)}</div>
            <div className="card-sub">
              {formatCurrency(factures_venda.any_actual.import - factures_venda.any_actual.pagat)} pendent
            </div>
          </div>
          {factures_venda.vencudes.total > 0 && (
            <div className="card" style={{ borderColor: '#fca5a5' }}>
              <div className="card-title" style={{ color: 'var(--color-error)' }}>Factures vençudes</div>
              <div className="card-value error">{factures_venda.vencudes.total}</div>
              <div className="card-sub error">{formatCurrency(factures_venda.vencudes.import)}</div>
            </div>
          )}
        </div>

      </div>
    </>
  )
}

function StatBadge({ estat }: { estat: EstatProjecte }) {
  return (
    <span className={`estat-badge estat-${estat}`}>
      {estatLabel(estat)}
    </span>
  )
}
