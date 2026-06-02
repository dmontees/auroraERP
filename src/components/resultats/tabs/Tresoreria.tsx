import React, { useState } from 'react';
import { Info, AlertCircle, Clock } from 'lucide-react';
import type { Periode } from '../../../utils/resultatCalculs';
import { estaEnPeriode, formatCurrency } from '../../../utils/resultatCalculs';
import type { FacturaVenta } from '../../../types/facturaVenta';
import type { Gasto } from '../../../types/facturaCompra';
import type { Client } from '../../../types/client';

interface Props {
  periode: Periode;
  facturesVenda: FacturaVenta[];
  gastos: Gasto[];
  clients: Client[];
}

const today = new Date().toISOString().split('T')[0];

export default function Tresoreria({ periode, facturesVenda, gastos, clients }: Props) {
  const [filtreFactures, setFiltreFactures] = useState<'totes' | 'pendents' | 'vencudes'>('totes');

  // ── Invoices in period ────────────────────────────────────────────────────
  const facturesPeriode = facturesVenda.filter(f => estaEnPeriode(f.dataFactura, periode));

  const totalFacturat = facturesPeriode.reduce((sum, f) => sum + f.totalFactura, 0);
  const totalCobrat = facturesPeriode
    .filter(f => f.estat === 'pagada')
    .reduce((sum, f) => sum + f.totalFactura, 0);
  const totalParcialment = facturesPeriode
    .filter(f => f.estat === 'pagada-parcial')
    .reduce((sum, f) => sum + f.totalPagat, 0);
  const totalCobratEfectiu = totalCobrat + totalParcialment;

  const pendentCobrar = facturesPeriode.reduce((sum, f) => sum + (f.pendentCobrar || 0), 0);

  const facturesVencudes = facturesPeriode.filter(f => f.estat === 'vencuda');
  const totalVençut = facturesVencudes.reduce((sum, f) => sum + (f.pendentCobrar || 0), 0);

  // ── Expenses pending payment ──────────────────────────────────────────────
  const pendentPagar = gastos.reduce((sum, g) => sum + (g.pendentPagament || 0), 0);

  // ── Collection ratio ──────────────────────────────────────────────────────
  const ratioCobrament = totalFacturat > 0 ? (totalCobratEfectiu / totalFacturat) * 100 : 0;

  // ── Filtered invoice list ─────────────────────────────────────────────────
  const facturesFiltrades = facturesPeriode
    .filter(f => {
      if (filtreFactures === 'pendents') return f.estat === 'enviada' || f.estat === 'pagada-parcial';
      if (filtreFactures === 'vencudes') return f.estat === 'vencuda';
      return true;
    })
    .filter(f => f.pendentCobrar > 0 || filtreFactures === 'totes')
    .sort((a, b) => a.dataFactura.localeCompare(b.dataFactura));

  // ── All pending (any period) for alert section ────────────────────────────
  const totesPendentsImportants = facturesVenda.filter(
    f => (f.estat === 'vencuda' || f.estat === 'enviada' || f.estat === 'pagada-parcial') && f.pendentCobrar > 0
  );

  return (
    <div>
      {/* Explanation banner */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid #3b82f6',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <Info size={18} style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Tresoreria (base caixa)</strong>
          {' '}— Mostra els diners que <em>realment has cobrat</em> i el que tens pendent de cobrar.
          A diferència d'Activitat, aquí el que compta és quan entren els diners al compte.
          Útil per gestionar la liquiditat i saber quines factures cal reclamar.
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <SummaryCard
          label="Total facturat"
          value={formatCurrency(totalFacturat)}
          sub={`${facturesPeriode.length} factures en el període`}
          gradient="linear-gradient(135deg, #7c3aed, #6366f1, #3b82f6)"
          tip="Suma de totes les factures creades en el període, independentment de si s'han cobrat."
        />
        <SummaryCard
          label="Cobrat efectivament"
          value={formatCurrency(totalCobratEfectiu)}
          sub={`${ratioCobrament.toFixed(0)}% del total facturat`}
          gradient="linear-gradient(135deg, #059669, #10b981, #34d399)"
          tip="Diners que ja has rebut: factures pagades completament + pagaments parcials rebuts."
        />
        <SummaryCard
          label="Pendent de cobrar"
          value={formatCurrency(pendentCobrar)}
          sub={totalVençut > 0 ? `${formatCurrency(totalVençut)} vençut!` : 'Sense venciments'}
          gradient={totalVençut > 0
            ? 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)'
            : 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)'}
          tip="Import que els clients encara no t'han pagat. Inclou factures enviades, parcials i vençudes."
        />
        <SummaryCard
          label="Pendent de pagar"
          value={formatCurrency(pendentPagar)}
          sub="Proveïdors i despeses"
          gradient={pendentPagar > 0
            ? 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)'
            : 'linear-gradient(135deg, #059669, #10b981, #34d399)'}
          tip="Import que encara deus a proveïdors i en despeses generals. Calcula si tens liquiditat suficient."
        />
      </div>

      {/* Health bar */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ràtio de cobrament</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginLeft: '0.5rem' }}>
              (cobrat / facturat en el període)
            </span>
          </div>
          <span style={{
            fontWeight: 700,
            fontSize: '1.1rem',
            background: 'linear-gradient(90deg, #a855f7, #6366f1, #3b82f6, #0ea5e9, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {ratioCobrament.toFixed(1)}%
          </span>
        </div>
        <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, ratioCobrament)}%`,
            background: 'linear-gradient(90deg, #a855f7, #6366f1, #3b82f6, #0ea5e9, #06b6d4)',
            borderRadius: '8px',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
          {ratioCobrament >= 80
            ? 'Excel·lent — la majoria de factures estan cobrades.'
            : ratioCobrament >= 50
            ? 'Acceptable — però hi ha import significatiu pendent.'
            : 'Atenció — menys de la meitat del que has facturat ha estat cobrat.'}
        </div>
      </div>

      {/* Alert: overdue invoices (any period) */}
      {facturesVencudes.length > 0 && (
        <div style={{
          background: 'var(--color-error-bg)',
          border: '1px solid var(--color-error-border)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}>
          <AlertCircle size={20} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--color-error)', marginBottom: '0.25rem' }}>
              {facturesVencudes.length} {facturesVencudes.length === 1 ? 'factura vençuda' : 'factures vençudes'} — {formatCurrency(totalVençut)} sense cobrar
            </div>
            <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>
              Factures vençudes en el període seleccionat. Considera enviar un recordatori als clients afectats.
            </div>
          </div>
        </div>
      )}

      {/* Invoice table */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Factures del període</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: '0.25rem 0 0' }}>
              Totes les factures emeses en el rang de dates seleccionat.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['totes', 'pendents', 'vencudes'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltreFactures(f)}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '20px',
                  border: '1px solid var(--color-border)',
                  background: filtreFactures === f ? 'var(--color-accent-primary)' : 'transparent',
                  color: filtreFactures === f ? 'white' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: filtreFactures === f ? 600 : 400,
                }}
              >
                {f === 'totes' ? 'Totes' : f === 'pendents' ? 'Pendents' : 'Vençudes'}
              </button>
            ))}
          </div>
        </div>

        {facturesFiltrades.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            {filtreFactures === 'vencudes'
              ? 'Cap factura vençuda en aquest període.'
              : filtreFactures === 'pendents'
              ? 'Cap factura pendent en aquest període.'
              : 'Cap factura en aquest període.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '2px solid var(--color-border)' }}>
                {['Factura', 'Client', 'Data', 'Venciment', 'Total', 'Cobrat', 'Pendent', 'Estat'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '0.65rem 0.875rem',
                      textAlign: i >= 4 ? 'right' : 'left',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturesFiltrades.map(f => {
                const client = clients.find(c => c.codi === f.client);
                const estaVençuda = f.estat === 'vencuda';
                const diasVençut = estaVençuda && f.dataVenciment
                  ? Math.floor((new Date(today).getTime() - new Date(f.dataVenciment).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <tr
                    key={f.codi}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: estaVençuda ? 'var(--color-error-bg)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.875rem', fontWeight: 600, fontSize: '0.85rem' }}>
                      {f.codi}
                    </td>
                    <td style={{ padding: '0.65rem 0.875rem', fontSize: '0.85rem' }}>
                      {client?.nomComercial || client?.nomFiscal || f.client}
                    </td>
                    <td style={{ padding: '0.65rem 0.875rem', fontSize: '0.85rem' }}>
                      {f.dataFactura}
                    </td>
                    <td style={{
                      padding: '0.65rem 0.875rem',
                      fontSize: '0.85rem',
                      color: estaVençuda ? 'var(--color-error)' : 'inherit',
                      fontWeight: estaVençuda ? 600 : 400,
                    }}>
                      {f.dataVenciment || '—'}
                      {estaVençuda && diasVençut > 0 && (
                        <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--color-error)' }}>
                          fa {diasVençut}d
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.875rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>
                      {formatCurrency(f.totalFactura)}
                    </td>
                    <td style={{ padding: '0.65rem 0.875rem', textAlign: 'right', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.85rem' }}>
                      {formatCurrency(f.totalPagat || 0)}
                    </td>
                    <td style={{
                      padding: '0.65rem 0.875rem',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: (f.pendentCobrar || 0) > 0 ? (estaVençuda ? 'var(--color-error)' : 'var(--color-warning)') : 'var(--color-success)',
                    }}>
                      {formatCurrency(f.pendentCobrar || 0)}
                    </td>
                    <td style={{ padding: '0.65rem 0.875rem', textAlign: 'right' }}>
                      <EstatBadge estat={f.estat} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Global pending (outside period filter) */}
      {totesPendentsImportants.length > 0 && (
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginTop: '1.5rem',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <Clock size={16} style={{ color: 'var(--color-warning)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Pendent de cobrar (total, tots els períodes)
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: '0 0 1rem' }}>
            Factures amb import pendent, incloses les que estan fora del filtre de dates.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--color-bg-tertiary)',
            borderRadius: '8px',
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>Total pendent</div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-warning)' }}>
                {formatCurrency(totesPendentsImportants.reduce((s, f) => s + (f.pendentCobrar || 0), 0))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>Factures vençudes</div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-error)' }}>
                {formatCurrency(totesPendentsImportants.filter(f => f.estat === 'vencuda').reduce((s, f) => s + (f.pendentCobrar || 0), 0))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>Factures pendents</div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {totesPendentsImportants.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label, value, sub, gradient, tip,
}: {
  label: string; value: string; sub: string; gradient: string; tip: string;
}) {
  return (
    <div className="stat-card" title={tip}>
      <div className="stat-card-stripe" style={{ background: gradient }} />
      <div className="stat-card-body">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">
          <span style={{
            background: gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>{value}</span>
        </div>
        <div className="stat-card-sub">{sub}</div>
      </div>
    </div>
  );
}

function EstatBadge({ estat }: { estat: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    borrador:         { bg: 'var(--color-border)', text: '#374151', label: 'Esborrany' },
    enviada:          { bg: 'var(--color-info-bg)', text: 'var(--color-info-dark)', label: 'Enviada' },
    'pagada-parcial': { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-dark)', label: 'Parcial' },
    pagada:           { bg: 'var(--color-success-bg)', text: 'var(--color-success-dark)', label: 'Pagada' },
    vencuda:          { bg: 'var(--color-error-bg)', text: 'var(--color-error-darker)', label: 'Vençuda' },
    cancelled:        { bg: '#f3f4f6', text: 'var(--color-text-secondary)', label: 'Cancel·lada' },
  };
  const c = colors[estat] || { bg: 'var(--color-border)', text: '#374151', label: estat };
  return (
    <span style={{
      padding: '0.2rem 0.6rem',
      borderRadius: '12px',
      fontSize: '0.72rem',
      fontWeight: 600,
      background: c.bg,
      color: c.text,
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}
