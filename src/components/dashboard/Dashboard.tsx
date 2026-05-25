import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Briefcase, FileText, ChevronLeft, ChevronRight, ArrowUpRight, Clock } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenda';
import type { Gasto, ObligacioFiscal, FacturaCompra } from '../../types/facturaCompra';
import type { Projecte } from '../../types/projecte';
import type { Pressupost } from '../../types/pressupost';
import type { Client } from '../../types/client';
import { storage } from '../../utils/storageManager';

const MESOS_CURTS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const LABEL: React.CSSProperties = { ...MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 };

function fmtK(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) >= 10000) return `${(n / 1000).toFixed(0)}k`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n.toFixed(0)}`;
}
function fmtEur(n: number): string {
  return n.toLocaleString('ca-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}
function fmtEur2(n: number): string {
  return n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
}

const colorPos = (n: number) => n >= 0 ? '#2d7a4f' : '#b83232';

// ─── Estat chips ─────────────────────────────────────────────────────────────
const ESTAT_MAP: Record<string, { label: string; bg: string; color: string }> = {
  esborrany:        { label: 'Esborrany',     bg: '#f3f0ec', color: '#6b5f57' },
  planificat:       { label: 'Planificat',    bg: '#e8f0fc', color: '#2d5fb8' },
  en_curs:          { label: 'En curs',       bg: '#fbe8e2', color: '#c84a2a' },
  post_produccio:   { label: 'Postproducció', bg: '#1c1917', color: '#f0ebe7' },
  entregat:         { label: 'Entregat',      bg: '#e5eed8', color: '#2d7a4f' },
  facturat:         { label: 'Facturat',      bg: '#fef6e0', color: '#a07010' },
  rodatge:          { label: 'Rodatge',       bg: '#fbe8e2', color: '#c84a2a' },
  edicio:           { label: 'Edició',        bg: '#e8f0fc', color: '#2d5fb8' },
  esperant_feedback:{ label: 'Feedback',      bg: '#fef6e0', color: '#a07010' },
  revisio:          { label: 'Revisió',       bg: '#fef6e0', color: '#a07010' },
  acabat:           { label: 'Acabat',        bg: '#e5eed8', color: '#2d7a4f' },
};
function EstatChip({ estat }: { estat: string }) {
  const s = ESTAT_MAP[estat] || ESTAT_MAP.esborrany;
  return (
    <span style={{
      ...MONO, fontSize: 10, letterSpacing: '0.08em', fontWeight: 700,
      padding: '3px 9px', borderRadius: 999,
      background: s.bg, color: s.color,
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {s.label.toUpperCase()}
    </span>
  );
}

export default function Dashboard() {
  const [facturesVenda, setFacturesVenda]         = useState<FacturaVenta[]>([]);
  const [gastos, setGastos]                       = useState<Gasto[]>([]);
  const [obligacionsFiscals, setObligacionsFiscals] = useState<ObligacioFiscal[]>([]);
  const [projectes, setProjectes]                 = useState<Projecte[]>([]);
  const [pressupostos, setPressupostos]           = useState<Pressupost[]>([]);
  const [clients, setClients]                     = useState<Client[]>([]);
  const [selectedYear, setSelectedYear]           = useState(new Date().getFullYear());

  useEffect(() => {
    setFacturesVenda(storage.getFacturesVenda());
    setGastos(storage.getFacturesCompra());
    setObligacionsFiscals(storage.getObligacionsFiscals());
    setProjectes(storage.getProjectes());
    setPressupostos(storage.getPressupostos());
    setClients(storage.getClients());
  }, []);

  const nowYear  = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const pendentCobrar = facturesVenda
    .filter(f => ['enviada', 'pagada-parcial', 'vencuda'].includes(f.estat))
    .reduce((s, f) => s + f.pendentCobrar, 0);

  const pendentPagar = [
    ...gastos.filter(g => g.pendentPagament > 0),
    ...obligacionsFiscals.filter(o => (o.pendentPagament || 0) > 0),
  ].reduce((s, g) => s + (g.pendentPagament || 0), 0);

  const facturesVencudes = facturesVenda.filter(f => f.estat === 'vencuda');
  const totalVencudes    = facturesVencudes.reduce((s, f) => s + f.pendentCobrar, 0);

  const ACTIUS  = ['rodatge', 'edicio', 'esperant_feedback', 'revisio'];
  const URGENTS = ['rodatge', 'edicio'];
  const projectesActius = projectes.filter(p => ACTIUS.includes(p.estat));

  // ── Gràfic mensual ────────────────────────────────────────────────────────
  const beneficiPerMes = Array.from({ length: 12 }, (_, i) => {
    const mes    = String(i + 1).padStart(2, '0');
    const prefix = `${selectedYear}-${mes}`;
    const deFactures = facturesVenda
      .filter(f => !['borrador', 'cancelled'].includes(f.estat) && f.dataFactura?.startsWith(prefix))
      .reduce((s, f) => s + (f.baseImposable || 0), 0);
    const deImportats = projectes
      .filter(p => p.esImportat)
      .filter(p => (p.facturaHistorica?.data || p.dataFinalitzacio || p.dataInici || '').startsWith(prefix))
      .reduce((s, p) => {
        const ing = (p.tasques || []).reduce((a, t) => a + (t.importe || 0), 0);
        const dep = (p.recursosHumans || []).reduce((a, r) => a + (r.cost || 0), 0)
          + (p.materials || []).reduce((a, m) => a + (m.preuProveidor || 0), 0);
        return s + (ing - dep);
      }, 0);
    return deFactures + deImportats;
  });
  const totalFacturatAny = beneficiPerMes.reduce((s, b) => s + b, 0);

  const obligaciosFiscalsAny = obligacionsFiscals
    .filter(o => o.periode?.substring(0, 4) === String(selectedYear) &&
      ['cuota-autonomo', 'irpf-trimestral', 'irpf-anual', 'regularitzacio-ss'].includes(o.subtipus))
    .reduce((s, o) => s + (o.baseImposable || o.totalGasto || 0), 0);

  const despesesEstructuralsAny = gastos
    .filter(g => g.tipus === 'factura-compra' && (g as FacturaCompra).esDesepsaGeneral && g.dataGasto?.startsWith(String(selectedYear)))
    .reduce((s, g) => s + (g.baseImposable || 0), 0);

  const mesosBase       = selectedYear < nowYear ? 12 : (selectedYear > nowYear ? 1 : Math.max(1, nowMonth - 1));
  const beneficiFiscal  = totalFacturatAny - obligaciosFiscalsAny;
  const beneficiReal    = beneficiFiscal - despesesEstructuralsAny;
  const beneficiFiscalMitja = mesosBase > 0 ? beneficiFiscal / mesosBase : 0;
  const beneficiRealMitja   = mesosBase > 0 ? beneficiReal / mesosBase : 0;

  // ── Tasques urgents ───────────────────────────────────────────────────────
  const avui = new Date(); avui.setHours(0,0,0,0);
  type TascaU = { id: string; titol: string; sub: string; data: string; tipus: 'factura' | 'rodatge' | 'entrega' };

  const getNextEntrega = (p: Projecte) => {
    if (p.datesEntrega?.length) {
      const pend = p.datesEntrega.filter(d => d.data && !d.entregada).sort((a,b) => a.data!.localeCompare(b.data!));
      return pend[0]?.data || '';
    }
    return p.dataEntrega || '';
  };

  const tascasUrgents: TascaU[] = [
    ...facturesVencudes.map(f => {
      const cl = clients.find(c => c.codi === f.client);
      return { id: f.codi, titol: f.codi, sub: `${cl?.nomComercial || cl?.nomFiscal || '—'} · ${fmtEur2(f.pendentCobrar)}`, data: f.dataVenciment, tipus: 'factura' as const };
    }),
    ...projectes.filter(p => p.estat !== 'acabat' && p.estat !== 'facturat' && !p.arxivat).flatMap(p => {
      if (p.datesRodatge?.length) return p.datesRodatge.filter(d => d.data && new Date(d.data) >= avui)
        .map(d => ({ id: `r-${p.codi}-${d.id}`, titol: p.titol, sub: `Rodatge · ${fmtDate(d.data!)}`, data: d.data!, tipus: 'rodatge' as const }));
      if (p.dataInici && new Date(p.dataInici) >= avui)
        return [{ id: `r-${p.codi}`, titol: p.titol, sub: `Rodatge · ${fmtDate(p.dataInici)}`, data: p.dataInici, tipus: 'rodatge' as const }];
      return [];
    }),
    ...projectes.filter(p => URGENTS.includes(p.estat) && (p.datesEntrega?.some(d => d.data && !d.entregada) || !!p.dataEntrega))
      .map(p => { const d = getNextEntrega(p); return { id: `e-${p.codi}`, titol: p.titol, sub: `Entrega · ${d ? fmtDate(d) : '—'}`, data: d, tipus: 'entrega' as const }; }),
  ].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 5);

  // ── Activitat recent ──────────────────────────────────────────────────────
  const activitat = [
    ...facturesVenda.slice(-5).map(f => ({ text: `Factura ${f.codi}`, data: f.dataFactura, icon: 'factura' })),
    ...projectes.slice(-5).map(p => ({ text: p.titol, data: p.dataInici, icon: 'projecte' })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 6);

  // ── Greeting ──────────────────────────────────────────────────────────────
  const h = new Date().getHours();
  const greeting = h < 13 ? 'Bon dia' : h < 20 ? 'Bona tarda' : 'Bona nit';
  const dateStr  = new Date().toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const tascaAccent = (t: TascaU['tipus']) => t === 'factura' ? '#b83232' : t === 'rodatge' ? '#c84a2a' : '#c08a1e';
  const tascaLabel  = (t: TascaU['tipus']) => t === 'factura' ? 'VENÇUDA' : t === 'rodatge' ? 'RODATGE' : 'ENTREGA';

  /* ── RENDER ────────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── CAPÇALERA ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ ...LABEL, color: 'var(--color-accent-primary)', marginBottom: 6 }}>{dateStr}</p>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1, color: 'var(--color-text-primary)', margin: 0 }}>
            {greeting}.
            <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 12 }}>
              {projectesActius.length > 0
                ? `${projectesActius.length} projecte${projectesActius.length > 1 ? 's' : ''} actiu${projectesActius.length > 1 ? 's' : ''}.`
                : 'Cap projecte actiu avui.'}
            </span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            ...MONO, fontSize: 10, letterSpacing: '0.12em',
            padding: '6px 14px', borderRadius: 999,
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)', background: '#fff',
          }}>
            {selectedYear}
          </span>
        </div>
      </div>

      {/* ── KPI STRIP ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        background: '#fff', border: '1px solid var(--color-border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {[
          {
            label: 'Pendent de cobrar',
            value: fmtEur(pendentCobrar),
            sub: `${facturesVenda.filter(f => ['enviada','pagada-parcial','vencuda'].includes(f.estat)).length} factures`,
            color: '#c08a1e',
            icon: <TrendingUp size={16} strokeWidth={2} />,
          },
          {
            label: 'Pendent de pagar',
            value: fmtEur(pendentPagar),
            sub: 'proveïdors + fiscal',
            color: '#c84a2a',
            icon: <TrendingDown size={16} strokeWidth={2} />,
          },
          {
            label: 'Factures vençudes',
            value: String(facturesVencudes.length),
            sub: facturesVencudes.length > 0 ? fmtEur2(totalVencudes) : 'Sense vençudes',
            color: facturesVencudes.length > 0 ? '#b83232' : '#2d7a4f',
            icon: <AlertCircle size={16} strokeWidth={2} />,
          },
          {
            label: 'Projectes actius',
            value: String(projectesActius.length),
            sub: `de ${projectes.filter(p => !p.arxivat).length} totals`,
            color: '#2d7a4f',
            icon: <Briefcase size={16} strokeWidth={2} />,
          },
        ].map((k, i) => (
          <div key={i} style={{
            padding: '22px 24px',
            borderRight: i < 3 ? '1px solid var(--color-border)' : 'none',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...LABEL, color: 'var(--color-text-tertiary)' }}>{k.label}</span>
              <span style={{ color: k.color, opacity: 0.7 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.035em', color: k.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── GRID PRINCIPAL ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

        {/* Columna esquerra: gràfic + beneficis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Gràfic barres */}
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: '20px 24px', display: 'flex', flexDirection: 'column', minHeight: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p style={{ ...LABEL, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Benefici brut facturat</p>
                <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtEur(totalFacturatAny)}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginLeft: 8 }}>{selectedYear}</span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => setSelectedYear(y => y - 1)}
                  style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', color: 'var(--color-text-secondary)' }}>
                  <ChevronLeft size={15} />
                </button>
                <button onClick={() => setSelectedYear(y => y + 1)} disabled={selectedYear >= nowYear}
                  style={{ background: selectedYear >= nowYear ? 'var(--color-bg-primary)' : 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '5px 8px', cursor: selectedYear >= nowYear ? 'not-allowed' : 'pointer', display: 'flex', color: 'var(--color-text-secondary)', opacity: selectedYear >= nowYear ? 0.4 : 1 }}>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 200 }}>
              <GraficBarres data={beneficiPerMes} />
            </div>
          </div>

          {/* Dos cards de benefici — grid horitzontal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Net fiscal */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: '20px 24px' }}>
              <p style={{ ...LABEL, color: 'var(--color-text-tertiary)', marginBottom: 14 }}>Net fiscal · {selectedYear}</p>
              {selectedYear < nowYear && (
                <div style={{ fontSize: 11, color: '#a07010', background: '#fef6e0', border: '1px solid #f5d86a', borderRadius: 7, padding: '5px 9px', marginBottom: 12, lineHeight: 1.4 }}>
                  Pot faltar obligacions d'aquest any
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                <span>Facturat</span>
                <span style={{ fontWeight: 600, color: '#2d7a4f', fontVariantNumeric: 'tabular-nums' }}>+{fmtEur(totalFacturatAny)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                <span>Obligacions fiscals</span>
                <span style={{ fontWeight: 600, color: '#b83232', fontVariantNumeric: 'tabular-nums' }}>-{fmtEur(obligaciosFiscalsAny)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: colorPos(beneficiFiscal), fontVariantNumeric: 'tabular-nums' }}>
                  {fmtEur(beneficiFiscal)}
                </div>
                <p style={{ ...MONO, fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                  {fmtEur(beneficiFiscalMitja)}/mes · {mesosBase} {mesosBase === 1 ? 'mes' : 'mesos'}
                </p>
              </div>
            </div>

            {/* Net real */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: '20px 24px' }}>
              <p style={{ ...LABEL, color: 'var(--color-text-tertiary)', marginBottom: 14 }}>Net real · {selectedYear}</p>
              {selectedYear < nowYear && (
                <div style={{ fontSize: 11, color: '#a07010', background: '#fef6e0', border: '1px solid #f5d86a', borderRadius: 7, padding: '5px 9px', marginBottom: 12, lineHeight: 1.4 }}>
                  Pot faltar despeses d'aquest any
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                <span>Net fiscal</span>
                <span style={{ fontWeight: 600, color: colorPos(beneficiFiscal), fontVariantNumeric: 'tabular-nums' }}>
                  {beneficiFiscal >= 0 ? '+' : ''}{fmtEur(beneficiFiscal)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                <span>Despeses estructurals</span>
                <span style={{ fontWeight: 600, color: '#b83232', fontVariantNumeric: 'tabular-nums' }}>-{fmtEur(despesesEstructuralsAny)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: colorPos(beneficiReal), fontVariantNumeric: 'tabular-nums' }}>
                  {fmtEur(beneficiReal)}
                </div>
                <p style={{ ...MONO, fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                  {fmtEur(beneficiRealMitja)}/mes · {mesosBase} {mesosBase === 1 ? 'mes' : 'mesos'}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Columna dreta: tasques + projectes actius + activitat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tasques urgents */}
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...LABEL, color: 'var(--color-text-tertiary)' }}>Tasques urgents</span>
              {tascasUrgents.length > 0 && (
                <span style={{ ...MONO, fontSize: 10, fontWeight: 700, background: '#fbe8e2', color: '#c84a2a', padding: '2px 7px', borderRadius: 999 }}>
                  {tascasUrgents.length}
                </span>
              )}
            </div>
            <div style={{ padding: '8px 12px' }}>
              {tascasUrgents.length === 0 ? (
                <div style={{ padding: '20px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--color-text-tertiary)' }}>
                  <CheckCircle size={22} strokeWidth={1.5} />
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>Tot al dia!</span>
                </div>
              ) : tascasUrgents.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '9px 8px', borderRadius: 8,
                  borderLeft: `3px solid ${tascaAccent(t.tipus)}`,
                  marginBottom: 4, background: 'var(--color-bg-primary)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', color: tascaAccent(t.tipus), marginBottom: 2 }}>{tascaLabel(t.tipus)}</p>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titol}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projectes actius */}
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...LABEL, color: 'var(--color-text-tertiary)' }}>Projectes actius</span>
            </div>
            <div>
              {projectesActius.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 12.5 }}>
                  Cap projecte actiu
                </div>
              ) : projectesActius.slice(0, 5).map((p, i) => {
                const cl = clients.find(c => c.codi === p.client);
                return (
                  <div key={p.codi} style={{
                    padding: '10px 20px',
                    borderBottom: i < Math.min(projectesActius.length, 5) - 1 ? '1px solid var(--color-border)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ ...MONO, fontSize: 9.5, color: 'var(--color-text-tertiary)' }}>{p.codi}</p>
                        <EstatChip estat={p.estat} />
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.titol}
                      </p>
                      {cl && <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>{cl.nomComercial || cl.nomFiscal}</p>}
                    </div>
                    <ArrowUpRight size={14} strokeWidth={2} color="var(--color-text-tertiary)" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activitat recent */}
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ ...LABEL, color: 'var(--color-text-tertiary)' }}>Activitat recent</span>
            </div>
            <div>
              {activitat.map((item, i) => (
                <div key={i} style={{
                  padding: '9px 20px',
                  borderBottom: i < activitat.length - 1 ? '1px solid var(--color-border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon === 'factura'
                      ? <FileText size={13} strokeWidth={2} color="var(--color-text-secondary)" />
                      : <Briefcase size={13} strokeWidth={2} color="var(--color-text-secondary)" />}
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
                  <span style={{ ...MONO, fontSize: 10, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                    {item.data ? fmtDate(item.data) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

/* ── GRÀFIC DE BARRES ──────────────────────────────────────────────────────── */
function GraficBarres({ data }: { data: number[] }) {
  const ref  = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 560, h: 200 });

  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => { const { clientWidth: w, clientHeight: h } = el; if (w > 0 && h > 0) setDims({ w, h }); };
    const ro = new ResizeObserver(measure); ro.observe(el); measure();
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = dims;
  const PL = 60, PR = 8, PT = 8, PB = 22;
  const cW = Math.max(W - PL - PR, 10);
  const cH = Math.max(H - PT - PB, 10);
  const max = Math.max(...data, 1);
  const bW  = cW / 12;
  const gap = 10;

  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = PT + cH - pct * cH;
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="var(--color-border)" strokeWidth={pct === 0 ? 1.5 : 0.8} strokeDasharray={pct === 0 ? undefined : '3 3'} />
              <text x={PL - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="var(--color-text-tertiary)" fontFamily="'JetBrains Mono',monospace">
                {fmtK(max * pct)}
              </text>
            </g>
          );
        })}
        {data.map((val, i) => {
          const bH    = Math.max(0, (val / max) * cH);
          const x     = PL + i * bW + gap / 2;
          const y     = PT + cH - bH;
          const bw    = bW - gap;
          const color = val > 0 ? '#c84a2a' : val < 0 ? '#b83232' : '#e2d9d0';
          return (
            <g key={i}>
              {bH > 0 && <rect x={x} y={y} width={bw} height={bH} fill={color} rx="4" opacity="0.9" />}
              <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize="9" fill="var(--color-text-tertiary)" fontFamily="'JetBrains Mono',monospace">
                {MESOS_CURTS[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
