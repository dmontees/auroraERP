import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Briefcase, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenda';
import type { Gasto, ObligacioFiscal, FacturaCompra } from '../../types/facturaCompra';
import type { Projecte } from '../../types/projecte';
import type { Pressupost } from '../../types/pressupost';
import type { Client } from '../../types/client';
import { storage } from '../../utils/storageManager';

const MESOS_CURTS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];

function fmtK(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) >= 10000) return `${(n / 1000).toFixed(0)}k€`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k€`;
  return `${n.toFixed(0)}€`;
}

function fmtEur(n: number): string {
  return n.toLocaleString('ca-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '€';
}

function fmtEur2(n: number): string {
  return n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
}

export default function Dashboard() {
  const [facturesVenda, setFacturesVenda] = useState<FacturaVenta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [pressupostos, setPressupostos] = useState<Pressupost[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setFacturesVenda(storage.getFacturesVenda());
    setGastos(storage.getFacturesCompra());
    setProjectes(storage.getProjectes());
    setPressupostos(storage.getPressupostos());
    setClients(storage.getClients());
  }, []);

  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1; // 1-12

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const pendentCobrar = facturesVenda
    .filter(f => ['enviada', 'pagada-parcial', 'vencuda'].includes(f.estat))
    .reduce((sum, f) => sum + f.pendentCobrar, 0);

  const pendentPagar = gastos
    .filter(g => g.pendentPagament > 0)
    .reduce((sum, g) => sum + g.pendentPagament, 0);

  const facturesVencudes = facturesVenda.filter(f => f.estat === 'vencuda');
  const totalVencudes = facturesVencudes.reduce((sum, f) => sum + f.pendentCobrar, 0);

  const ESTATS_ACTIUS = ['rodatge', 'edicio', 'esperant_feedback', 'revisio'];
  const projectesActius = projectes.filter(p => ESTATS_ACTIUS.includes(p.estat)).length;

  // ── GRÀFIC: benefici brut mensual de factures emeses + projectes importats ─
  // "Emeses" = qualsevol estat excepte esborrany
  // Projectes importats: mai tenen factura associada, s'usa el benefici del projecte
  const beneficiPerMes = Array.from({ length: 12 }, (_, i) => {
    const mes = String(i + 1).padStart(2, '0');
    const prefix = `${selectedYear}-${mes}`;

    const deFactures = facturesVenda
      .filter(f => !['borrador', 'cancelled'].includes(f.estat) && f.dataFactura?.startsWith(prefix))
      .reduce((sum, f) => sum + (f.baseImposable || 0), 0);

    const deImportats = projectes
      .filter(p => p.esImportat === true)
      .filter(p => {
        const data = p.facturaHistorica?.data || p.dataFinalitzacio || p.dataInici || '';
        return data.startsWith(prefix);
      })
      .reduce((sum, p) => {
        const ingressos = (p.tasques || []).reduce((s, t) => s + (t.importe || 0), 0);
        const despeses = (p.recursosHumans || []).reduce((s, r) => s + (r.cost || 0), 0)
          + (p.materials || []).reduce((s, m) => s + (m.preuProveidor || 0), 0);
        return sum + (ingressos - despeses);
      }, 0);

    return deFactures + deImportats;
  });

  const totalFacturatAny = beneficiPerMes.reduce((sum, b) => sum + b, 0);

  // ── OBLIGACIONS FISCALS de l'any (per periode) ───────────────────────────
  // Inclou: cuota-autonomo, irpf-trimestral, irpf-anual, regularitzacio-ss
  const obligaciosFiscalsAny = gastos
    .filter(g => g.tipus === 'obligacio-fiscal')
    .filter(g => {
      const ob = g as ObligacioFiscal;
      return (
        ob.periode?.substring(0, 4) === String(selectedYear) &&
        ['cuota-autonomo', 'irpf-trimestral', 'irpf-anual', 'regularitzacio-ss'].includes(ob.subtipus)
      );
    })
    .reduce((sum, g) => sum + (g.baseImposable || g.totalGasto || 0), 0);

  // ── DESPESES ESTRUCTURALS de l'any (factures acreedor no vinculades a projecte) ──
  const despesesEstructuralsAny = gastos
    .filter(g => {
      if (g.tipus !== 'factura-compra') return false;
      const fc = g as FacturaCompra;
      return fc.esDesepsaGeneral === true && g.dataGasto?.startsWith(String(selectedYear));
    })
    .reduce((sum, g) => sum + (g.baseImposable || 0), 0);

  // ── MEDIES ───────────────────────────────────────────────────────────────
  // Si any seleccionat = any en curs, dividir per mesos transcorreguts; si no, per 12
  const mesosBase = selectedYear < nowYear ? 12 : (selectedYear > nowYear ? 1 : Math.max(1, nowMonth - 1));

  const beneficiFiscal = totalFacturatAny - obligaciosFiscalsAny;
  const beneficiFiscalMitja = mesosBase > 0 ? beneficiFiscal / mesosBase : 0;

  const beneficiReal = beneficiFiscal - despesesEstructuralsAny;
  const beneficiRealMitja = mesosBase > 0 ? beneficiReal / mesosBase : 0;

  // ── TASQUES URGENTS ───────────────────────────────────────────────────────
  const tascasUrgents = {
    facturesVencudes: facturesVencudes.slice(0, 3),
    projectesPropers: projectes
      .filter(p => ESTATS_ACTIUS.includes(p.estat) && (p.datesEntrega?.[0]?.data || p.dataEntrega))
      .sort((a, b) => {
        const da = new Date(a.datesEntrega?.[0]?.data || a.dataEntrega || '').getTime();
        const db = new Date(b.datesEntrega?.[0]?.data || b.dataEntrega || '').getTime();
        return da - db;
      })
      .slice(0, 3),
  };

  // ── ACTIVITAT RECENT ──────────────────────────────────────────────────────
  const activitatRecent = [
    ...facturesVenda.slice(-5).map(f => ({
      text: `Factura ${f.codi} creada`,
      data: f.dataFactura,
      icon: <FileText size={16} />,
    })),
    ...projectes.slice(-5).map(p => ({
      text: `Projecte ${p.titol}`,
      data: p.dataInici,
      icon: <Briefcase size={16} />,
    })),
  ]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 6);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });

  const colorBenefici = (n: number) => (n >= 0 ? '#10b981' : '#ef4444');

  const kpiCard = (
    icon: React.ReactNode,
    iconBg: string,
    label: string,
    value: string,
    sub?: string,
    borderColor?: string
  ) => (
    <div style={{
      background: 'var(--color-bg-secondary)',
      padding: '0.9rem 1.1rem',
      borderRadius: '12px',
      border: `2px solid ${borderColor || 'var(--color-border)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <div style={{ background: iconBg, padding: '0.5rem', borderRadius: '7px', display: 'flex' }}>
          {icon}
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.45rem', fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      {/* ── DATA ─────────────────────────────────────────────────────────── */}
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        {new Date().toLocaleDateString('ca-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginBottom: '1.25rem',
      }}>
        {kpiCard(<TrendingUp size={20} color="#f59e0b" />, '#fef3c7', 'Pendent de Cobrar', fmtEur2(pendentCobrar), undefined, '#f59e0b')}
        {kpiCard(<TrendingDown size={20} color="#ef4444" />, '#fee2e2', 'Pendent de Pagar', fmtEur2(pendentPagar), undefined, '#ef4444')}
        {kpiCard(
          <AlertCircle size={20} color="#dc2626" />,
          '#fecaca',
          'Factures Vençudes',
          String(facturesVencudes.length),
          facturesVencudes.length > 0 ? fmtEur2(totalVencudes) : undefined,
          '#dc2626'
        )}
        {kpiCard(<Briefcase size={20} color="#10b981" />, '#d1fae5', 'Projectes Actius', String(projectesActius), undefined, '#10b981')}
      </div>

      {/* ── GRÀFIC + CARDS + TASQUES ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>

        {/* Gràfic barres */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Capçalera amb navegació d'any */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>Benefici brut de facturació per mes</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>
                Ingressos bruts (sense IVA) de les factures emeses — no cal que estiguin cobrades
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setSelectedYear(y => y - 1)}
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: '3rem', textAlign: 'center' }}>
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear(y => y + 1)}
                disabled={selectedYear >= nowYear}
                style={{ background: selectedYear >= nowYear ? 'var(--color-bg-primary)' : 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.3rem', cursor: selectedYear >= nowYear ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: selectedYear >= nowYear ? 0.4 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Chart fills remaining card space — minHeight 0 lets grid row height be set by cards column */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <GraficBarresBenefici data={beneficiPerMes} />
          </div>

          {/* Total any */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Benefici brut facturat {selectedYear}:{' '}
              <strong style={{ color: colorBenefici(totalFacturatAny), fontSize: '1rem' }}>
                {fmtEur2(totalFacturatAny)}
              </strong>
            </span>
          </div>
        </div>

        {/* Cards columna */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Card 1: Benefici net fiscal */}
          <div style={{
            background: 'var(--color-bg-secondary)',
            padding: '1rem 1.1rem',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>
              Benefici net fiscal · {selectedYear}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '0.6rem', lineHeight: 1.4 }}>
              Ingressos bruts de facturació <strong>després de descomptar</strong> el que has pagat a Hisenda i SS com a autònom
            </div>

            {selectedYear < nowYear && (
              <div style={{
                fontSize: '0.74rem',
                color: '#92400e',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '6px',
                padding: '0.35rem 0.55rem',
                marginBottom: '0.6rem',
                lineHeight: 1.4,
              }}>
                ⚠️ És possible que no s'hagin registrat totes les obligacions fiscals d'aquest període.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginBottom: '0.1rem' }}>Total facturat</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#10b981' }}>+{fmtEur2(totalFacturatAny)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginBottom: '0.1rem' }}>Obligacions fiscals</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#dc2626' }}>-{fmtEur2(obligaciosFiscalsAny)}</div>
              </div>
            </div>

            <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: '0.5rem' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: colorBenefici(beneficiFiscal) }}>
                {fmtEur2(beneficiFiscal)}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>
                Mitjana: <strong style={{ color: colorBenefici(beneficiFiscalMitja) }}>{fmtEur(beneficiFiscalMitja)}/mes</strong>
                {' '}· {mesosBase} {mesosBase === 1 ? 'mes' : 'mesos'}
              </div>
            </div>
          </div>

          {/* Card 2: Benefici net real (estructural) */}
          <div style={{
            background: 'var(--color-bg-secondary)',
            padding: '1rem 1.1rem',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>
              Benefici net real · {selectedYear}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '0.6rem', lineHeight: 1.4 }}>
              Benefici net fiscal <strong>tenint en compte</strong> les despeses fixes del negoci: factures de proveïdors/acreedors registrades com a despesa general
            </div>

            {selectedYear < nowYear && (
              <div style={{
                fontSize: '0.74rem',
                color: '#92400e',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '6px',
                padding: '0.35rem 0.55rem',
                marginBottom: '0.6rem',
                lineHeight: 1.4,
              }}>
                ⚠️ És possible que no s'hagin registrat totes les despeses fixes d'aquest període.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginBottom: '0.1rem' }}>Benefici net fiscal</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: colorBenefici(beneficiFiscal) }}>
                  {beneficiFiscal >= 0 ? '+' : ''}{fmtEur2(beneficiFiscal)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginBottom: '0.1rem' }}>Despeses estructurals</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#dc2626' }}>-{fmtEur2(despesesEstructuralsAny)}</div>
              </div>
            </div>

            <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: '0.5rem' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: colorBenefici(beneficiReal) }}>
                {fmtEur2(beneficiReal)}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>
                Mitjana: <strong style={{ color: colorBenefici(beneficiRealMitja) }}>{fmtEur(beneficiRealMitja)}/mes</strong>
                {' '}· {mesosBase} {mesosBase === 1 ? 'mes' : 'mesos'}
              </div>
            </div>
          </div>

        </div>

        {/* ── TASQUES URGENTS (3a columna del grid) ──────────────────────── */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1rem 1.1rem',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          overflowY: 'auto',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>⚡ Tasques Urgents</h3>

          {tascasUrgents.facturesVencudes.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.5rem' }}>
                Factures vençudes ({facturesVencudes.length})
              </div>
              {tascasUrgents.facturesVencudes.map(f => {
                const client = clients.find(c => c.codi === f.client);
                return (
                  <div key={f.codi} style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    borderLeft: '3px solid #dc2626',
                    marginBottom: '0.4rem',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: '0 4px 4px 0',
                  }}>
                    <div style={{ fontWeight: 600 }}>{f.codi}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                      {client?.nomComercial || client?.nomFiscal} · {fmtEur2(f.pendentCobrar)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tascasUrgents.projectesPropers.length > 0 && (
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem' }}>
                Projectes per entregar
              </div>
              {tascasUrgents.projectesPropers.map(p => (
                <div key={p.codi} style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  borderLeft: '3px solid #f59e0b',
                  marginBottom: '0.4rem',
                  background: 'var(--color-bg-tertiary)',
                  borderRadius: '0 4px 4px 0',
                }}>
                  <div style={{ fontWeight: 600 }}>{p.titol}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                    Entrega: {p.dataEntrega ? formatDate(p.dataEntrega) : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tascasUrgents.facturesVencudes.length === 0 && tascasUrgents.projectesPropers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
              <CheckCircle size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
              Tot al dia!
            </div>
          )}
        </div>

      </div>

      {/* ── ACTIVITAT RECENT (amplada completa) ──────────────────────────── */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>🕐 Activitat Recent</h3>

        {activitatRecent.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
            No hi ha activitat recent
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
            {activitatRecent.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                background: 'var(--color-bg-tertiary)',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}>
                <div style={{ background: 'var(--color-bg-secondary)', padding: '0.4rem', borderRadius: '6px', display: 'flex' }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, fontWeight: 500 }}>{item.text}</div>
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {item.data ? formatDate(item.data) : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── GRÀFIC DE BARRES ─────────────────────────────────────────────────────────
function GraficBarresBenefici({ data }: { data: number[] }) {
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

  const W = dims.width;
  const H = dims.height;
  const PL = 80;
  const PR = 8;
  const PT = 20;
  const PB = 22;

  const chartW = Math.max(W - PL - PR, 10);
  const chartH = Math.max(H - PT - PB, 10);
  const maxVal = Math.max(...data, 1);
  const barW = chartW / 12;
  const barGap = 14;
  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        {gridLevels.map((pct, i) => {
          const y = PT + chartH - pct * chartH;
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y}
                stroke="var(--color-border)" strokeWidth={pct === 0 ? 1.5 : 1}
                strokeDasharray={pct === 0 ? undefined : '4 3'}
              />
              <text x={PL - 5} y={y + 3.5} textAnchor="end" fontSize="9.5" fill="var(--color-text-tertiary)">
                {fmtEur(maxVal * pct)}
              </text>
            </g>
          );
        })}

        {data.map((val, i) => {
          const barH = Math.max(0, (val / maxVal) * chartH);
          const x = PL + i * barW + barGap / 2;
          const y = PT + chartH - barH;
          const bw = barW - barGap;
          const color = val > 0 ? '#3b82f6' : val < 0 ? '#ef4444' : '#d1d5db';

          return (
            <g key={i}>
              {barH > 0 && (
                <rect x={x} y={y} width={bw} height={barH} fill={color} rx="3" opacity="0.9" />
              )}
              {val > 0 && barH > 12 && (
                <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-text-secondary)">
                  {fmtEur(val)}
                </text>
              )}
              <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize="10" fill="var(--color-text-secondary)">
                {MESOS_CURTS[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
