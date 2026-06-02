import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import type { Periode } from '../../../utils/resultatCalculs';
import { estaEnPeriode, formatCurrency, getProjecteIngressos } from '../../../utils/resultatCalculs';
import type { Projecte } from '../../../types/projecte';
import type { FacturaVenta } from '../../../types/facturaVenda';
import type { Client } from '../../../types/client';
import type { Parametres } from '../../../types/parametres';
import type { Gasto, FacturaCompra } from '../../../types/facturaCompra';

interface ProjectesRendibilitatProps {
  periode: Periode;
  projectes: Projecte[];
  facturesVenda: FacturaVenta[];
  gastos: Gasto[];
  clients: Client[];
  parametres?: Parametres | null;
}

const CHART_COLORS = ['var(--color-info)','var(--color-success)','var(--color-warning)','var(--color-purple)','var(--color-error)','var(--color-cyan)','var(--color-pink)','var(--color-orange)','var(--color-teal)','#a78bfa'];

// All known estat values including legacy ones from before the state machine migration
const ESTAT_CONFIG: Record<string, { label: string; color: string }> = {
  esborrany:         { label: 'Esborrany',      color: 'var(--color-text-tertiary)' },
  planificat:        { label: 'Planificat',      color: 'var(--color-warning)' },
  rodatge:           { label: 'Rodatge',         color: 'var(--color-error)' },
  edicio:            { label: 'Edició',          color: 'var(--color-info)' },
  esperant_feedback: { label: 'Esp. Feedback',   color: 'var(--color-purple)' },
  revisio:           { label: 'Revisió',         color: 'var(--color-cyan)' },
  acabat:            { label: 'Acabat',          color: 'var(--color-success)' },
  facturat:          { label: 'Facturat',        color: 'var(--color-success-medium)' },
  // Legacy values from old state machine (pre-migration data)
  en_curs:           { label: 'En curs',         color: 'var(--color-info)' },
  post_produccio:    { label: 'Post-producció',  color: 'var(--color-purple)' },
  entregat:          { label: 'Entregat',        color: 'var(--color-success)' },
  planificado:       { label: 'Planificat',      color: 'var(--color-warning)' },
};

// ── SVG donut helpers ──────────────────────────────────────────────────────

function polarToCart(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function donutPath(cx: number, cy: number, ro: number, ri: number, a1: number, a2: number): string {
  if (a2 - a1 >= 359.9) {
    const [x1, y1] = polarToCart(cx, cy, ro, 0);
    const [x2, y2] = polarToCart(cx, cy, ro, 180);
    const [ix1, iy1] = polarToCart(cx, cy, ri, 0);
    const [ix2, iy2] = polarToCart(cx, cy, ri, 180);
    return `M${x1},${y1}A${ro},${ro},0,1,1,${x2},${y2}A${ro},${ro},0,1,1,${x1},${y1}M${ix1},${iy1}A${ri},${ri},0,1,0,${ix2},${iy2}A${ri},${ri},0,1,0,${ix1},${iy1}Z`;
  }
  const [sx, sy] = polarToCart(cx, cy, ro, a1);
  const [ex, ey] = polarToCart(cx, cy, ro, a2);
  const [isx, isy] = polarToCart(cx, cy, ri, a1);
  const [iex, iey] = polarToCart(cx, cy, ri, a2);
  const lg = a2 - a1 > 180 ? 1 : 0;
  return `M${sx},${sy}A${ro},${ro},0,${lg},1,${ex},${ey}L${iex},${iey}A${ri},${ri},0,${lg},0,${isx},${isy}Z`;
}

// ── Chart sub-components ───────────────────────────────────────────────────

type ChartItem = { label: string; count: number; color: string };

/** Donut with legend to the right — no wasted vertical space */
function DonutChart({ items, centerLabel, centerSub }: { items: ChartItem[]; centerLabel?: string; centerSub?: string }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return <EmptyChart />;
  const GAP = items.length > 1 ? 2 : 0;
  const cx = 75; const cy = 75; const ro = 68; const ri = 44;
  let angle = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <svg width="150" height="150" viewBox="0 0 150 150" style={{ flexShrink: 0, overflow: 'visible' }}>
        {items.map((item, i) => {
          const sweep = (item.count / total) * 360;
          const a1 = angle + GAP / 2;
          const a2 = angle + sweep - GAP / 2;
          angle += sweep;
          return <path key={i} d={donutPath(cx, cy, ro, ri, a1, a2)} fill={item.color} opacity="0.9" />;
        })}
        {centerLabel ? (
          <>
            <text x={cx} y={cy - 3} textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--color-text-primary)">{centerLabel}</text>
            {centerSub && <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9" fill="var(--color-text-tertiary)">{centerSub}</text>}
          </>
        ) : (
          <text x={cx} y={cy + 7} textAnchor="middle" fontSize="19" fontWeight="800" fill="var(--color-text-primary)">{total}</text>
        )}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.73rem' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
            <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {item.count} <span style={{ opacity: 0.6 }}>({((item.count / total) * 100).toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bar chart — fills available height evenly */
function HBarChart({ items }: { items: ChartItem[] }) {
  const max = Math.max(...items.map(i => i.count), 1);
  if (items.length === 0) return <EmptyChart />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '88px', fontSize: '0.72rem', color: 'var(--color-text-secondary)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {item.label}
          </div>
          <div style={{ flex: 1, background: 'var(--color-bg-tertiary)', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
            <div style={{
              width: `${(item.count / max) * 100}%`,
              height: '100%',
              background: item.color,
              borderRadius: '4px',
              minWidth: item.count > 0 ? '5px' : 0,
            }} />
          </div>
          <div style={{ width: '22px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'right', flexShrink: 0 }}>
            {item.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyChart() {
  return <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>Sense dades</div>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: '10px',
      padding: '1.1rem',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', marginBottom: '0.9rem' }}>
        {title}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ProjectesRendibilitat({
  periode,
  projectes,
  facturesVenda,
  gastos,
  clients,
  parametres,
}: ProjectesRendibilitatProps) {
  const [expandit, setExpandit] = useState<string | null>(null);

  // Name resolvers using parametres
  const getModalitNom = (codi: string) =>
    parametres?.modalitats?.find(m => m.codi === codi)?.nom || codi || '—';

  const getServeiNom = (codi: string) =>
    parametres?.tipusProduccio?.find(t => t.codi === codi)?.nom ||
    parametres?.serveis?.find(s => s.codi === codi)?.nom ||
    codi || '—';

  const projectesAmbDades = projectes
    .filter(p => {
      const dataRef = p.datesRodatge?.[0]?.data || p.dataInici;
      return dataRef && estaEnPeriode(dataRef, periode);
    })
    .map(p => {
      const recursosHumans = p.recursosHumans?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
      const materials = p.materials?.reduce((sum, m) => sum + (m.preuProveidor || 0) * (m.jornades ?? 1), 0) || 0;

      // FacturaCompra costs linked to this project, split equally among linked projects
      const facturesCompra = gastos
        .filter(g => g.tipus === 'factura-compra' && !(g as FacturaCompra).esDepesaGeneral)
        .filter(g => (g as FacturaCompra).projectes?.includes(p.codi))
        .reduce((s, g) => {
          const fc = g as FacturaCompra;
          const n = fc.projectes.length || 1;
          return s + ((fc.baseImposable || 0) / n);
        }, 0);

      const despeses = recursosHumans + materials + facturesCompra;

      const ingressos = getProjecteIngressos(p, facturesVenda);

      const benefici = ingressos - despeses;
      const marge = ingressos > 0 ? (benefici / ingressos * 100) : 0;
      return { ...p, ingressos, despeses, recursosHumans, materials, facturesCompra, benefici, marge };
    })
    .sort((a, b) => b.benefici - a.benefici);

  const toggleExpand = (codi: string) => setExpandit(expandit === codi ? null : codi);

  // ── Chart data ─────────────────────────────────────────────────────────
  const total = projectesAmbDades.length;

  const groupBy = (resolver: (p: typeof projectesAmbDades[0]) => string): { label: string; count: number }[] => {
    const map: Record<string, number> = {};
    projectesAmbDades.forEach(p => {
      const key = resolver(p) || '—';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  };

  // Group by modalitat preserving the codi to look up user-defined color
  const modalitats: ChartItem[] = (() => {
    const map: Record<string, { codi: string; label: string; count: number }> = {};
    projectesAmbDades.forEach(p => {
      const codi = p.modalitat || '—';
      if (!map[codi]) map[codi] = { codi, label: getModalitNom(codi), count: 0 };
      map[codi].count++;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .map((d, i) => ({
        label: d.label,
        count: d.count,
        color: parametres?.modalitats?.find(m => m.codi === d.codi)?.color
          || CHART_COLORS[i % CHART_COLORS.length],
      }));
  })();

  const serveis: ChartItem[] = groupBy(p => getServeiNom(p.servei))
    .map((d, i) => ({ ...d, color: CHART_COLORS[(i + 2) % CHART_COLORS.length] }));

  const directes = projectesAmbDades.filter(p => p.esDirect).length;
  const directeItems: ChartItem[] = [
    { label: 'Directes', count: directes, color: 'var(--color-success)' },
    { label: 'Indirectes', count: total - directes, color: 'var(--color-text-tertiary)' },
  ].filter(d => d.count > 0);
  const directePct = total > 0 ? Math.round((directes / total) * 100) : 0;

  const estats: ChartItem[] = groupBy(p => p.estat).map(d => ({
    label: ESTAT_CONFIG[d.label]?.label || d.label,
    count: d.count,
    color: ESTAT_CONFIG[d.label]?.color || 'var(--color-text-tertiary)',
  }));

  return (
    <div>
      {/* Explanation banner */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-success)',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <Info size={18} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Rendibilitat per projecte</strong>
          {' '}— Per a cada projecte, compara els <em>ingressos</em> (factura emesa o tasques pressupostades)
          amb els <em>costos interns</em> (recursos humans i materials). Fes clic en un projecte per veure el detall.
        </div>
      </div>

      {/* Distribution charts */}
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <ChartCard title="Per modalitat">
            <DonutChart items={modalitats} />
          </ChartCard>
          <ChartCard title="Per tipus de producció">
            <HBarChart items={serveis} />
          </ChartCard>
          <ChartCard title="Directe / Indirecte">
            <DonutChart items={directeItems} centerLabel={`${directePct}%`} centerSub="directes" />
          </ChartCard>
          <ChartCard title="Per estat">
            <HBarChart items={estats} />
          </ChartCard>
        </div>
      )}

      {/* KPI summary */}
      {(() => {
        const G_INDIGO = 'linear-gradient(135deg, #4338ca, #6366f1, #818cf8)';
        const G_BLUE   = 'linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)';
        const G_GREEN  = 'linear-gradient(135deg, #059669, #10b981, #34d399)';
        const G_RED    = 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)';
        const gSpan = (v: React.ReactNode, g: string) => (
          <span style={{ background: g, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{v}</span>
        );
        const kpis = [
          { label: 'Projectes Totals', value: String(projectesAmbDades.length), gradient: G_INDIGO },
          { label: 'Marge Mitjà', value: projectesAmbDades.length > 0 ? `${(projectesAmbDades.reduce((s, p) => s + p.marge, 0) / projectesAmbDades.length).toFixed(1)}%` : '0.0%', gradient: G_BLUE },
          { label: 'Més Rendible', value: projectesAmbDades.length > 0 ? formatCurrency(Math.max(...projectesAmbDades.map(p => p.benefici))) : '—', gradient: G_GREEN },
          { label: 'Menys Rendible', value: projectesAmbDades.length > 0 ? formatCurrency(Math.min(...projectesAmbDades.map(p => p.benefici))) : '—', gradient: G_RED },
        ];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {kpis.map(kpi => (
              <div key={kpi.label} className="stat-card">
                <div className="stat-card-stripe" style={{ background: kpi.gradient }} />
                <div className="stat-card-body">
                  <div className="stat-card-label">{kpi.label}</div>
                  <div className="stat-card-value">{gSpan(kpi.value, kpi.gradient)}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Projects table */}
      <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Projecte</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Client</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Estat</th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Ingressos</th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Despeses</th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Benefici</th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Marge</th>
            </tr>
          </thead>
          <tbody>
            {projectesAmbDades.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)' }}>
                  No hi ha projectes en aquest període
                </td>
              </tr>
            ) : (
              projectesAmbDades.map(p => {
                const client = clients.find(c => c.codi === p.client);
                const estaExpandit = expandit === p.codi;
                const estatCfg = ESTAT_CONFIG[p.estat];
                return (
                  <React.Fragment key={p.codi}>
                    <tr
                      style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', background: estaExpandit ? 'var(--color-bg-tertiary)' : 'transparent' }}
                      className="table-row-hover"
                      onClick={() => toggleExpand(p.codi)}
                    >
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {estaExpandit ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.titol}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{p.codi}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                        {client?.nomComercial || client?.nomFiscal || '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: `${estatCfg?.color || 'var(--color-text-tertiary)'}20`,
                          color: estatCfg?.color || 'var(--color-text-tertiary)',
                        }}>
                          {estatCfg?.label || p.estat}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.ingressos)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.despeses)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: p.benefici >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{formatCurrency(p.benefici)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: p.marge >= 20 ? 'var(--color-success)' : p.marge >= 10 ? 'var(--color-warning)' : 'var(--color-error)' }}>{p.marge.toFixed(1)}%</td>
                    </tr>
                    {estaExpandit && (
                      <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                        <td colSpan={7} style={{ padding: '1rem 2rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', fontSize: '0.9rem' }}>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Recursos Humans</div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(p.recursosHumans)}</div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Materials</div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(p.materials)}</div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Fact. compra vinculades</div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                {formatCurrency(p.facturesCompra)}
                                {p.facturesCompra > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginLeft: '0.25rem' }}>(part proporcional)</span>}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Dates</div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>{p.dataInici} → {p.dataEntrega}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
