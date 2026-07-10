import React from 'react';
import { ExternalLink, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import type { FacturaVenta } from '../../../types/facturaVenta';
import { ESTAT_FACTURA_COLORS } from '../../../types/facturaVenta';
import type { Client } from '../../../types/client';
import type { Projecte } from '../../../types/projecte';
import { storage } from '../../../utils/storageManager';
import { esFacturaFinal, getTipusComercialFactura } from '../../../utils/facturaBestretes';

interface Props {
  formData: FacturaVenta;
  clients: Client[];
  projectes: Projecte[];
  parametres: any;
  totals: {
    baseTasques?: number;
    baseImposable: number;
    ivaImport: number;
    irpfImport: number;
    totalFactura: number;
    pendentCobrar: number;
    bestretesAplicadesBase?: number;
  };
}

const G_GREEN  = 'linear-gradient(135deg, #059669, #10b981, #34d399)';
const G_RED    = 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)';
const G_INDIGO = 'linear-gradient(135deg, #4338ca, #6366f1, #818cf8)';
const G_AMBER  = 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)';

function fmt(n: number) {
  return n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function gSpan(v: React.ReactNode, g: string) {
  return <span style={{ background: g, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{v}</span>;
}

function resolveCategoriaNom(codi: string, parametres: any): string {
  if (codi === 'MATERIALS') return 'Materials';
  const cat = parametres?.categories?.find((c: any) => c.codi === codi);
  return cat?.nom || codi;
}

export default function ResumFacturaTab({ formData, clients, projectes, parametres, totals }: Props) {
  const client = clients.find(c => c.codi === formData.client);
  const projecte = projectes.find(p => p.codi === formData.projecte);
  const estatInfo = ESTAT_FACTURA_COLORS[formData.estat];
  const totalCobrat = formData.totalPagat;
  const pendent = totals.pendentCobrar;
  const avisActiu = formData.avisFacturacio?.actiu;
  const tipusComercial = getTipusComercialFactura(formData);

  const noClient  = !formData.client;
  const noTasques = formData.tasques.reduce((s, c) => s + c.tasques.length, 0) === 0;

  const navigateToProjecte = () => {
    if (!formData.projecte) return;
    storage.setNavigateTo({ type: 'projecte', codi: formData.projecte });
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: { section: 'projectes', codi: formData.projecte } }));
  };

  const formatData = (d?: string) =>
    d ? new Date(d).toLocaleDateString('ca-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

      {/* Alertes de configuració pendents */}
      {(noClient || noTasques) && (
        <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: '10px', padding: '0.85rem 1.1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-warning-dark)', marginBottom: '0.3rem' }}>⚠️ Factura incompleta</div>
          {noClient  && <div style={{ fontSize: '0.82rem', color: 'var(--color-warning-dark)' }}>· Falta seleccionar el client (pestanya 1. Dades)</div>}
          {noTasques && <div style={{ fontSize: '0.82rem', color: 'var(--color-warning-dark)' }}>· Falta afegir almenys una tasca (pestanya 2. Tasques)</div>}
        </div>
      )}

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.15rem 1.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '0.2rem' }}>
              {formData.codi}
              {tipusComercial === 'bestreta' && (
                <span style={{ marginLeft: '0.6rem', padding: '0.1rem 0.45rem', background: 'var(--color-warning)', color: 'white', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>BESTRETA</span>
              )}
              {tipusComercial === 'final' && (
                <span style={{ marginLeft: '0.6rem', padding: '0.1rem 0.45rem', background: 'var(--color-success)', color: 'white', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>FINAL</span>
              )}
              {formData.tipus === 'rectificativa' && (
                <span style={{ marginLeft: '0.6rem', padding: '0.1rem 0.45rem', background: 'var(--color-error-dark)', color: 'white', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>NOTA DE CRÈDIT</span>
              )}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {client ? (client.nomComercial || client.nomFiscal) : <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontWeight: 400, fontSize: '1.1rem' }}>Sense client</span>}
            </div>
            {projecte && (
              <button type="button" onClick={navigateToProjecte}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--color-info-bg)', color: 'var(--color-info-dark)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
              >
                <ExternalLink size={12} />{projecte.codi} — {projecte.titol}
              </button>
            )}
          </div>
          <span style={{ padding: '0.45rem 1.1rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 700, background: estatInfo.bg, color: estatInfo.text, flexShrink: 0 }}>
            {estatInfo.icon} {estatInfo.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
          {[
            { label: 'Data factura', value: formatData(formData.dataFactura) },
            { label: 'Venciment', value: formatData(formData.dataVenciment) },
            formData.dataEnviada ? { label: 'Enviada', value: formatData(formData.dataEnviada) } : null,
            formData.facturaRectificada ? { label: 'Rectifica', value: formData.facturaRectificada } : null,
          ].filter(Boolean).map((item: any) => (
            <div key={item.label}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '0.15rem' }}>{item.label}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <div className="stat-card">
          <div className="stat-card-stripe" style={{ background: G_INDIGO }} />
          <div className="stat-card-body">
            <div className="stat-card-label">Total Factura</div>
            <div className="stat-card-value">{gSpan(fmt(totals.totalFactura), G_INDIGO)}</div>
            <div className="stat-card-sub">Base: {fmt(totals.baseImposable)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-stripe" style={{ background: pendent > 0.01 ? G_RED : G_GREEN }} />
          <div className="stat-card-body">
            <div className="stat-card-label">Pendent de Cobrar</div>
            <div className="stat-card-value">{gSpan(fmt(pendent), pendent > 0.01 ? G_RED : G_GREEN)}</div>
            {pendent <= 0.01 && <div className="stat-card-sub">Cobrada al 100%</div>}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-stripe" style={{ background: totalCobrat > 0 ? G_GREEN : G_AMBER }} />
          <div className="stat-card-body">
            <div className="stat-card-label">Total Cobrat</div>
            <div className="stat-card-value">{gSpan(fmt(totalCobrat), totalCobrat > 0 ? G_GREEN : G_AMBER)}</div>
            <div className="stat-card-sub">{formData.pagaments.length} pagament{formData.pagaments.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* Avís actiu — descripció en una línia */}
      {avisActiu && (
        <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-light)', borderRadius: '8px', padding: '0.65rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>⚠️</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-warning-dark)' }}>
            <strong>Avís de facturació actiu</strong>
            {formData.avisFacturacio?.descripcio ? `: ${formData.avisFacturacio.descripcio}` : ''}
          </span>
        </div>
      )}

      {/* ── FILA PRINCIPAL: 30% Fiscal+Activitat | 70% Tasques ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '30fr 70fr', gap: '0.75rem', alignItems: 'start' }}>

        {/* Col esquerra: Desglossament + Activitat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Desglossament fiscal */}
          <div className="placeholder-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
              Desglossament fiscal
            </div>
            {[
              ...(esFacturaFinal(formData) ? [
                { label: 'Base projecte', value: fmt(totals.baseTasques || totals.baseImposable), color: 'var(--color-text-primary)', bold: false },
                { label: 'Bestretes aplicades', value: `-${fmt(totals.bestretesAplicadesBase || 0)}`, color: 'var(--color-warning-dark)', bold: false },
              ] : []),
              { label: 'Base imposable', value: fmt(totals.baseImposable), color: 'var(--color-text-primary)', bold: false },
              { label: `IVA (${formData.ivaPercent}%)`, value: `+${fmt(totals.ivaImport)}`, color: 'var(--color-text-secondary)', bold: false },
              ...(formData.irpfPercent > 0 ? [{ label: `IRPF (${formData.irpfPercent}%)`, value: `-${fmt(totals.irpfImport)}`, color: 'var(--color-error)', bold: false }] : []),
              { label: 'TOTAL', value: fmt(totals.totalFactura), color: 'var(--color-text-primary)', bold: true },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderTop: i === arr.length - 1 ? '2px solid var(--color-border)' : '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                <span style={{ fontSize: row.bold ? '1rem' : '0.82rem', fontWeight: row.bold ? 800 : 600, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Observacions del client */}
          {formData.observacions && (
            <div className="placeholder-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.6rem' }}>
                📝 Observacions del client
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {formData.observacions}
              </p>
            </div>
          )}
        </div>

        {/* Col dreta: Tasques per categoria (cada cat = columna pròpia) */}
        <div className="placeholder-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <FileText size={11} /> Tasques per categoria
          </div>
          {formData.tasques.length === 0 ? (
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>Sense tasques</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(formData.tasques.length, 4)}, 1fr)`,
              gap: '0.75rem',
            }}>
              {formData.tasques.map(cat => {
                const subtotal = cat.tasques.reduce((s, t) => s + t.quantitat * t.preu, 0);
                const nomCat = resolveCategoriaNom(cat.categoria, parametres);
                return (
                  <div key={cat.categoria} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Capçalera de categoria */}
                    <div style={{
                      background: 'var(--color-accent-primary)',
                      color: 'white',
                      padding: '0.4rem 0.65rem',
                      borderRadius: '6px 6px 0 0',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}>
                      {nomCat}
                    </div>

                    {/* Tasques de la categoria */}
                    <div style={{ border: '1px solid var(--color-border)', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden', flex: 1 }}>
                      {cat.tasques.map((tasca, ti) => (
                        <div key={ti} style={{
                          padding: '0.5rem 0.65rem',
                          borderBottom: ti < cat.tasques.length - 1 ? '1px solid var(--color-border)' : 'none',
                          background: ti % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary)',
                        }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.2rem', lineHeight: 1.3 }}>
                            {tasca.descripcio || tasca.servei || '—'}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--color-text-tertiary)' }}>
                            {tasca.quantitat} {tasca.unitat} × {fmt(tasca.preu)}
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.15rem' }}>
                            {fmt(tasca.quantitat * tasca.preu)}
                          </div>
                        </div>
                      ))}

                      {/* Subtotal de la categoria */}
                      <div style={{ padding: '0.5rem 0.65rem', background: 'var(--color-bg-elevated, var(--color-bg-tertiary))', borderTop: '2px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Subtotal</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{fmt(subtotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ACTIVITAT RECENT (fila completa) ── */}
      {formData.accions.length > 0 && (
        <div className="placeholder-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Clock size={11} /> Activitat recent
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0' }}>
            {[...formData.accions].reverse().slice(0, 6).map((accio, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.6rem', padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                {accio.automatic
                  ? <CheckCircle size={13} style={{ color: 'var(--color-accent-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                  : <AlertCircle size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, marginTop: '0.15rem' }} />
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem' }}>{accio.descripcio}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>
                    {new Date(accio.data).toLocaleString('ca-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
