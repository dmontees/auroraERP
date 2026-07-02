import React, { useRef, useLayoutEffect, useState } from 'react';
import { Info } from 'lucide-react';
import type { Periode } from '../../../utils/resultatCalculs';
import {
  estaEnPeriode,
  agruparPerMes,
  formatCurrency,
  getDataEfectivaGasto,
} from '../../../utils/resultatCalculs';
import type { FacturaVenta } from '../../../types/facturaVenda';
import type { Gasto, FacturaCompra, ObligacioFiscal } from '../../../types/facturaCompra';
import type { Projecte } from '../../../types/projecte';
import type { PartTreball } from '../../../types/partTreball';

interface Props {
  periode: Periode;
  facturesVenda: FacturaVenta[];
  gastos: Gasto[];
  obligacionsFiscals: ObligacioFiscal[];
  projectes: Projecte[];
  partsTraeball: PartTreball[];
}

const MESOS_CA = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];

function fmtK(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) >= 10000) return `${(n / 1000).toFixed(0)}k€`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k€`;
  return `${n.toFixed(0)}€`;
}

function yearsInPeriode(periode: Periode): Set<string> {
  const set = new Set<string>();
  const start = parseInt(periode.dataInici.substring(0, 4));
  const end = parseInt(periode.dataFi.substring(0, 4));
  for (let y = start; y <= end; y++) set.add(String(y));
  return set;
}

function projecteCostIntern(p: Projecte): number {
  return (p.recursosHumans || []).reduce((s, r) => s + (r.cost || 0), 0)
    + (p.materials || []).reduce((s, m) => s + (m.preuProveidor || 0), 0);
}

function projecteIngressos(p: Projecte): number {
  return (p.tasques || []).reduce((s, t) => s + (t.importe || 0), 0);
}

function beneficiMostratProjecte(p: Projecte): number {
  return projecteIngressos(p) - projecteCostIntern(p);
}

function calcMesosBase(periode: Periode): number {
  const today = new Date();
  const todayMesKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const cursor = new Date(
    new Date(periode.dataInici).getFullYear(),
    new Date(periode.dataInici).getMonth(),
    1
  );
  const end = new Date(periode.dataFi);
  let count = 0;
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    if (key < todayMesKey) count++;
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return Math.max(1, count);
}

export default function Activitat({
  periode,
  facturesVenda,
  gastos,
  obligacionsFiscals,
  projectes,
  partsTraeball,
}: Props) {

  // ── GROSS BENEFITS ────────────────────────────────────────────────────────
  const beneficisPerMes = agruparPerMes([], 'dataFactura', 'valor', periode);
  const projectesFacturatsEnPeriode = projectes.filter(p => {
    if (!(p.estat === 'facturat' || p.facturaAssociada || p.facturaHistorica)) return false;
    const factura = facturesVenda.find(f =>
      !['borrador', 'cancelled'].includes(f.estat) &&
      (f.codi === p.facturaAssociada || f.projecte === p.codi)
    );
    const dataFactura = factura?.dataFactura || p.facturaHistorica?.data || '';
    return !!dataFactura && estaEnPeriode(dataFactura, periode);
  });
  projectesFacturatsEnPeriode.forEach(p => {
    const factura = facturesVenda.find(f =>
      !['borrador', 'cancelled'].includes(f.estat) &&
      (f.codi === p.facturaAssociada || f.projecte === p.codi)
    );
    const dataFactura = factura?.dataFactura || p.facturaHistorica?.data || '';
    const mesKey = dataFactura.substring(0, 7);
    const existing = beneficisPerMes.find(m => m.mes === mesKey);
    if (existing) existing.valor += beneficiMostratProjecte(p);
  });
  const beneficisBruts = beneficisPerMes.reduce((s, m) => s + m.valor, 0);

  // ── FISCAL OBLIGATIONS ────────────────────────────────────────────────────
  const years = yearsInPeriode(periode);
  const SUBTIPUS_FISCAL = ['cuota-autonomo', 'irpf-trimestral', 'irpf-anual', 'regularitzacio-ss'];

  const obligacionsEnPeriode = obligacionsFiscals.filter(
    o => SUBTIPUS_FISCAL.includes(o.subtipus) && years.has(o.periode?.substring(0, 4) ?? '')
  );
  const totalObligacions = obligacionsEnPeriode.reduce(
    (s, o) => s + (o.baseImposable || o.totalGasto || 0), 0
  );

  const bySubtipus = (sub: string) =>
    obligacionsEnPeriode
      .filter(o => o.subtipus === sub)
      .reduce((s, o) => s + (o.baseImposable || o.totalGasto || 0), 0);

  const cuotaAutonoms = bySubtipus('cuota-autonomo');
  const irpfTrimestral = bySubtipus('irpf-trimestral');
  const irpfAnual = bySubtipus('irpf-anual');
  const regularitzacioSS = bySubtipus('regularitzacio-ss');

  // ── STRUCTURAL EXPENSES ───────────────────────────────────────────────────
  const gastosEstructurals = gastos.filter(g => {
    if (g.tipus !== 'factura-compra') return false;
    return (g as FacturaCompra).esDepesaGeneral === true && estaEnPeriode(getDataEfectivaGasto(g), periode);
  });
  const despesesEstructurals = gastosEstructurals.reduce(
    (s, g) => s + ((g as FacturaCompra).baseImposable || 0), 0
  );

  // ── RESULTS ───────────────────────────────────────────────────────────────
  const beneficiFiscal = beneficisBruts - totalObligacions;
  const beneficiReal = beneficiFiscal - despesesEstructurals;

  const mesosBase = calcMesosBase(periode);
  const beneficiRealMitjaMensual = beneficiReal / mesosBase;
  const margeNet = beneficisBruts > 0 ? (beneficiReal / beneficisBruts) * 100 : 0;

  const estructuralsPerMes = agruparPerMes(
    gastos
      .filter(g => g.tipus === 'factura-compra' && (g as FacturaCompra).esDepesaGeneral === true)
      .map(g => ({ ...g, dataGasto: getDataEfectivaGasto(g) })),
    'dataGasto',
    'baseImposable',
    periode
  );

  const obligacionsPerMes = agruparPerMes(
    obligacionsFiscals.filter(o => SUBTIPUS_FISCAL.includes(o.subtipus)),
    'dataGasto',
    'totalGasto',
    periode
  );

  // ── HOURS PER MONTH ───────────────────────────────────────────────────────
  const houresPerMesMinuts = agruparPerMes(partsTraeball, 'data', 'temps', periode);
  const houresPerMes = houresPerMesMinuts.map(m => ({ mes: m.mes, valor: m.valor / 60 }));
  const totalHoresMinuts = partsTraeball
    .filter(p => p.data >= periode.dataInici && p.data <= periode.dataFi)
    .reduce((s, p) => s + (p.temps || 0), 0);

  const hasDades = beneficisPerMes.some(m => m.valor !== 0);
  const hasHores = houresPerMes.some(m => m.valor > 0);
  const totalEstructuralsTaula = estructuralsPerMes.reduce((s, m) => s + m.valor, 0);
  const totalObligacionsTaula = obligacionsPerMes.reduce((s, m) => s + m.valor, 0);

  return (
    <div>
      {/* Explanation banner */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-accent-primary)',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <Info size={18} style={{ color: 'var(--color-accent-primary)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Activitat i resultat net</strong>
          {' '}— Beneficis de projectes facturats menys obligacions fiscals (quota d'autònom, IRPF trimestral i anual,
          regularització SS) i despeses estructurals (factures generals no vinculades a projectes).
          L'IRPF s'atribueix a l'any de l'exercici. El promig mensual es calcula sobre els mesos completats.
        </div>
      </div>

      {/* ── P&L CARD ────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{
          fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '1.25rem',
        }}>
          Compte de resultats simplificat
        </div>

        {/* 3 input boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>

          {(() => {
            const G_GREEN = 'linear-gradient(135deg, #059669, #10b981, #34d399)';
            const G_AMBER = 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)';
            const G_RED   = 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)';
            const gSpan = (v: React.ReactNode, g: string) => (
              <span style={{ background: g, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{v}</span>
            );
            return (<>
              {/* Beneficis */}
              <div className="stat-card">
                <div className="stat-card-stripe" style={{ background: G_GREEN }} />
                <div className="stat-card-body">
                  <div className="stat-card-label">+ Beneficis bruts</div>
                  <div className="stat-card-value" style={{ marginBottom: '0.5rem' }}>{gSpan(formatCurrency(beneficisBruts), G_GREEN)}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}>
                    <div>Projectes facturats ({projectesFacturatsEnPeriode.length})</div>
                    <div>Suma dels beneficis mostrats a Projectes</div>
                  </div>
                </div>
              </div>

              {/* Obligacions */}
              <div className="stat-card">
                <div className="stat-card-stripe" style={{ background: G_AMBER }} />
                <div className="stat-card-body">
                  <div className="stat-card-label">− Obligacions fiscals</div>
                  <div className="stat-card-value" style={{ marginBottom: '0.5rem' }}>{gSpan(`-${formatCurrency(totalObligacions)}`, G_AMBER)}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}>
                    {cuotaAutonoms > 0 && <div>Autònom (RETA): {formatCurrency(cuotaAutonoms)}</div>}
                    {irpfTrimestral > 0 && <div>IRPF trim.: {formatCurrency(irpfTrimestral)}</div>}
                    {irpfAnual > 0 && <div>IRPF anual: {formatCurrency(irpfAnual)}</div>}
                    {regularitzacioSS > 0 && <div>SS anual: {formatCurrency(regularitzacioSS)}</div>}
                    {totalObligacions === 0 && <div>Cap obligació registrada</div>}
                    <div style={{ marginTop: '0.2rem', opacity: 0.7 }}>Per any d'exercici · Anys: {[...years].join(', ')}</div>
                  </div>
                </div>
              </div>

              {/* Estructurals */}
              <div className="stat-card">
                <div className="stat-card-stripe" style={{ background: G_RED }} />
                <div className="stat-card-body">
                  <div className="stat-card-label">− Despeses estructurals</div>
                  <div className="stat-card-value" style={{ marginBottom: '0.5rem' }}>{gSpan(`-${formatCurrency(despesesEstructurals)}`, G_RED)}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}>
                    {gastosEstructurals.length > 0 ? (
                      <div>{gastosEstructurals.length} factura{gastosEstructurals.length > 1 ? 'es' : ''} general{gastosEstructurals.length > 1 ? 's' : ''}</div>
                    ) : (
                      <div>Cap factura general en el període</div>
                    )}
                    <div style={{ marginTop: '0.2rem', opacity: 0.7 }}>esDepesaGeneral · base imposable</div>
                  </div>
                </div>
              </div>
            </>);
          })()}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, borderTop: '1px dashed var(--color-border)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>resultat</span>
          <div style={{ flex: 1, borderTop: '1px dashed var(--color-border)' }} />
        </div>

        {/* Result box */}
        <div style={{
          background: beneficiReal >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
          border: `2px solid ${beneficiReal >= 0 ? 'var(--color-success)' : 'var(--color-error)'}`,
          borderRadius: '10px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>
              = Resultat net · equivalent a un sou
            </div>
            <div style={{ fontSize: '2.6rem', fontWeight: 800, color: beneficiReal >= 0 ? 'var(--color-success)' : 'var(--color-error)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {formatCurrency(beneficiReal)}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginBottom: '0.3rem' }}>
              Promig mensual ({mesosBase} {mesosBase === 1 ? 'mes complet' : 'mesos completats'})
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: beneficiReal >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              {formatCurrency(beneficiRealMitjaMensual)} / mes
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
              Marge net: <strong style={{ color: margeNet >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{margeNet.toFixed(1)}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly bar charts */}
      {(hasDades || hasHores) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: hasHores ? '2fr 1fr' : '1fr',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          {hasDades && (
            <div style={{
              background: 'var(--color-bg-secondary)',
              padding: '1.25rem 1.5rem',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Beneficis bruts per mes
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
                Suma del benefici dels projectes facturats en cada mes
              </div>
              <div style={{ height: 220 }}>
                <GraficBarresActivitat data={beneficisPerMes} />
              </div>
            </div>
          )}
          {hasHores && (
            <div style={{
              background: 'var(--color-bg-secondary)',
              padding: '1.25rem 1.5rem',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Hores registrades per mes
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
                {Math.floor(totalHoresMinuts / 60)}h {totalHoresMinuts % 60}min en {partsTraeball.filter(p => p.data >= periode.dataInici && p.data <= periode.dataFi).length} parts
              </div>
              <div style={{ height: 220, minHeight: 220 }}>
                <GraficBarresHores data={houresPerMes} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly table */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Desglossament mensual</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', margin: '0.2rem 0 0' }}>
            Obligacions fiscals i estructurals per data de pagament. El total del resum pot diferir si hi ha IRPF anual atribuït a anys anteriors.
          </p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '2px solid var(--color-border)' }}>
              {['Mes', 'Beneficis', 'Oblig. fiscals', 'Desp. estructurals', 'Resultat net'].map((h, i) => (
                <th key={h} style={{
                  padding: '0.65rem 1rem',
                  textAlign: i === 0 ? 'left' : 'right',
                  fontSize: '0.78rem', fontWeight: 600,
                  textTransform: 'uppercase', color: 'var(--color-text-secondary)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {beneficisPerMes.map((mesData) => {
              const fiscal = obligacionsPerMes.find(m => m.mes === mesData.mes)?.valor || 0;
              const estructural = estructuralsPerMes.find(m => m.mes === mesData.mes)?.valor || 0;
              const net = mesData.valor - fiscal - estructural;
              const esActiu = mesData.valor !== 0 || fiscal > 0 || estructural > 0;
              return (
                <tr key={mesData.mes} style={{ borderBottom: '1px solid var(--color-border)', opacity: esActiu ? 1 : 0.4 }}>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 500 }}>
                    {new Date(mesData.mes + '-01').toLocaleDateString('ca', { month: 'long', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.875rem' }}>
                    {formatCurrency(mesData.valor)}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: 'var(--color-warning)', fontSize: '0.875rem' }}>
                    {fiscal > 0 ? `-${formatCurrency(fiscal)}` : '—'}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: 'var(--color-error)', fontSize: '0.875rem' }}>
                    {estructural > 0 ? `-${formatCurrency(estructural)}` : '—'}
                  </td>
                  <td style={{
                    padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.875rem',
                    color: net >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                  }}>
                    {formatCurrency(net)}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>TOTAL (per data pagament)</td>
              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                {formatCurrency(beneficisBruts)}
              </td>
              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--color-warning)', fontWeight: 600 }}>
                -{formatCurrency(totalObligacionsTaula)}
              </td>
              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--color-error)', fontWeight: 600 }}>
                -{formatCurrency(totalEstructuralsTaula)}
              </td>
              <td style={{
                padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700,
                color: (beneficisBruts - totalObligacionsTaula - totalEstructuralsTaula) >= 0 ? 'var(--color-success)' : 'var(--color-error)',
              }}>
                {formatCurrency(beneficisBruts - totalObligacionsTaula - totalEstructuralsTaula)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Hours bar chart ───────────────────────────────────────────────────────

function fmtH(h: number): string {
  if (h === 0) return '0h';
  if (h >= 100) return `${Math.round(h)}h`;
  if (h >= 10) return `${h.toFixed(0)}h`;
  return `${h.toFixed(1)}h`;
}

function GraficBarresHores({ data }: { data: { mes: string; valor: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 300, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setDims({ width: w, height: h });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  if (data.length === 0) return null;

  const W = dims.width;
  const H = dims.height;
  const PL = 48;
  const PR = 8;
  const PT = 20;
  const PB = 22;
  const chartW = Math.max(W - PL - PR, 10);
  const chartH = Math.max(H - PT - PB, 10);
  const maxVal = Math.max(...data.map(d => d.valor), 1);
  const n = data.length;
  const barW = chartW / n;
  const barGap = Math.max(4, Math.min(12, barW * 0.25));
  const gridLevels = [0, 0.5, 1];
  const multiYear = data.length > 12;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {H > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
          {gridLevels.map((pct, i) => {
            const y = PT + chartH - pct * chartH;
            return (
              <g key={i}>
                <line
                  x1={PL} y1={y} x2={W - PR} y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={pct === 0 ? 1.5 : 1}
                  strokeDasharray={pct === 0 ? undefined : '4 3'}
                />
                <text x={PL - 5} y={y + 3.5} textAnchor="end" fontSize="9" fill="var(--color-text-tertiary)">
                  {fmtH(maxVal * pct)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const barH = Math.max(0, (d.valor / maxVal) * chartH);
            const x = PL + i * barW + barGap / 2;
            const y = PT + chartH - barH;
            const bw = barW - barGap;
            const mesDate = new Date(d.mes + '-01');
            const label = multiYear
              ? `${MESOS_CA[mesDate.getMonth()]}${String(mesDate.getFullYear()).slice(2)}`
              : MESOS_CA[mesDate.getMonth()];
            return (
              <g key={i}>
                {barH > 0 && (
                  <rect x={x} y={y} width={bw} height={barH} fill="var(--color-purple)" rx="3" opacity="0.85" />
                )}
                {d.valor > 0 && barH > 14 && (
                  <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--color-text-secondary)">
                    {fmtH(d.valor)}
                  </text>
                )}
                <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize="10" fill="var(--color-text-secondary)">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ── Benefits bar chart (same architecture as Dashboard's GraficBarresBenefici) ──

function GraficBarresActivitat({ data }: { data: { mes: string; valor: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 560, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setDims({ width: w, height: h });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  if (data.length === 0) return null;

  const W = dims.width;
  const H = dims.height;
  const PL = 72;
  const PR = 8;
  const PT = 20;
  const PB = 22;
  const chartW = Math.max(W - PL - PR, 10);
  const chartH = Math.max(H - PT - PB, 10);
  const values = data.map(d => d.valor);
  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  const maxVal = rawMax === 0 && rawMin === 0 ? 1 : rawMax;
  const minVal = rawMax === 0 && rawMin === 0 ? 0 : rawMin;
  const range = Math.max(maxVal - minVal, 1);
  const valueToY = (value: number) => PT + chartH - ((value - minVal) / range) * chartH;
  const zeroY = valueToY(0);
  const n = data.length;
  const barW = chartW / n;
  const barGap = Math.max(4, Math.min(14, barW * 0.25));
  const gridLevels = [0, 0.25, 0.5, 0.75, 1];
  const multiYear = data.length > 12;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {H > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
          {gridLevels.map((pct, i) => {
            const y = PT + chartH - pct * chartH;
            const labelValue = minVal + range * pct;
            return (
              <g key={i}>
                <line
                  x1={PL} y1={y} x2={W - PR} y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={Math.abs(labelValue) < 0.01 ? 1.5 : 1}
                  strokeDasharray={Math.abs(labelValue) < 0.01 ? undefined : '4 3'}
                />
                <text x={PL - 5} y={y + 3.5} textAnchor="end" fontSize="9.5" fill="var(--color-text-tertiary)">
                  {fmtK(labelValue)}
                </text>
              </g>
            );
          })}

          {minVal < 0 && maxVal > 0 && (
            <line
              x1={PL} y1={zeroY} x2={W - PR} y2={zeroY}
              stroke="var(--color-border-strong)"
              strokeWidth="1.5"
            />
          )}

          {data.map((d, i) => {
            const yValue = valueToY(d.valor);
            const barH = Math.abs(zeroY - yValue);
            const x = PL + i * barW + barGap / 2;
            const y = Math.min(yValue, zeroY);
            const bw = barW - barGap;
            const color = d.valor > 0 ? 'var(--color-info)' : d.valor < 0 ? 'var(--color-error)' : 'var(--color-border-strong)';
            const mesDate = new Date(d.mes + '-01');
            const label = multiYear
              ? `${MESOS_CA[mesDate.getMonth()]} ${String(mesDate.getFullYear()).slice(2)}`
              : MESOS_CA[mesDate.getMonth()];

            return (
              <g key={i}>
                {barH > 0.5 && (
                  <rect x={x} y={y} width={bw} height={barH} fill={color} rx="3" opacity="0.9" />
                )}
                {d.valor !== 0 && barH > 14 && (
                  <text
                    x={x + bw / 2}
                    y={d.valor > 0 ? y - 4 : y + barH + 12}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="var(--color-text-secondary)"
                  >
                    {fmtK(d.valor)}
                  </text>
                )}
                <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize="10" fill="var(--color-text-secondary)">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
