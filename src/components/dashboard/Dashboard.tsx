import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Briefcase, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenda';
import type { Gasto, ObligacioFiscal, FacturaCompra } from '../../types/facturaCompra';
import type { Projecte } from '../../types/projecte';
import type { Pressupost } from '../../types/pressupost';
import type { Client } from '../../types/client';
import { storage } from '../../utils/storageManager';
import { getDataEfectivaGasto } from '../../utils/resultatCalculs';

const MESOS_CURTS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
const ESTATS_FACTURA_NO_COMPUTABLES = ['borrador', 'cancelled'];
const SUBTIPUS_FISCAL_DASHBOARD = ['cuota-autonomo', 'irpf-trimestral', 'irpf-anual', 'regularitzacio-ss'];

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
  const [obligacionsFiscals, setObligacionsFiscals] = useState<ObligacioFiscal[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [pressupostos, setPressupostos] = useState<Pressupost[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setFacturesVenda(storage.getFacturesVenda());
    setGastos(storage.getFacturesCompra());
    setObligacionsFiscals(storage.getObligacionsFiscals());
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

  const pendentPagar = [
    ...gastos.filter(g => g.pendentPagament > 0),
    ...obligacionsFiscals.filter(o => (o.pendentPagament || 0) > 0)
  ].reduce((sum, g) => sum + (g.pendentPagament || 0), 0);

  const facturesVencudes = facturesVenda.filter(f => f.estat === 'vencuda');
  const totalVencudes = facturesVencudes.reduce((sum, f) => sum + f.pendentCobrar, 0);

  const ESTATS_ACTIUS = ['rodatge', 'edicio', 'esperant_feedback', 'revisio'];
  const ESTATS_URGENTS = ['rodatge', 'edicio'];
  const projectesActius = projectes.filter(p => ESTATS_ACTIUS.includes(p.estat)).length;

  const getNextEntregaPendent = (p: typeof projectes[0]): string => {
    if (p.datesEntrega && p.datesEntrega.length > 0) {
      const pendents = p.datesEntrega
        .filter(d => d.data && !d.entregada)
        .sort((a, b) => a.data!.localeCompare(b.data!));
      return pendents[0]?.data || '';
    }
    return p.dataEntrega || '';
  };

  // ── GRÀFIC: benefici mensual de projectes facturats ──────────────────────
  // Suma el benefici que es mostra al projecte i l'imputa al mes de la factura.
  const beneficiPerMes = Array.from({ length: 12 }, (_, i) => {
    const mes = String(i + 1).padStart(2, '0');
    const prefix = `${selectedYear}-${mes}`;

    return projectes
      .filter(p => p.estat === 'facturat' || !!p.facturaAssociada || !!p.facturaHistorica)
      .reduce((sum, p) => {
        const factura = facturesVenda.find(f =>
          !ESTATS_FACTURA_NO_COMPUTABLES.includes(f.estat) &&
          (f.codi === p.facturaAssociada || f.projecte === p.codi)
        );
        const dataFactura = factura?.dataFactura || p.facturaHistorica?.data || '';
        if (!dataFactura.startsWith(prefix)) return sum;
        return sum + beneficiMostratProjecte(p);
      }, 0);
  });

  const totalBeneficiFacturacioAny = beneficiPerMes.reduce((sum, benefici) => sum + benefici, 0);

  // ── OBLIGACIONS FISCALS de l'any (per periode) ───────────────────────────
  // Inclou: cuota-autonomo, irpf-trimestral, irpf-anual, regularitzacio-ss
  const obligaciosFiscalsAny = obligacionsFiscals
    .filter(o =>
      o.periode?.substring(0, 4) === String(selectedYear) &&
      SUBTIPUS_FISCAL_DASHBOARD.includes(o.subtipus)
    )
    .reduce((sum, o) => sum + (o.baseImposable || o.totalGasto || 0), 0);

  // ── DESPESES ESTRUCTURALS de l'any (factures acreedor no vinculades a projecte) ──
  const despesesEstructuralsAny = gastos
    .filter(g => {
      if (g.tipus !== 'factura-compra') return false;
      const fc = g as FacturaCompra;
      return fc.esDepesaGeneral === true && getDataEfectivaGasto(g).startsWith(String(selectedYear));
    })
    .reduce((sum, g) => sum + (g.baseImposable || 0), 0);

  // ── MEDIES ───────────────────────────────────────────────────────────────
  // Si any seleccionat = any en curs, dividir per mesos transcorreguts; si no, per 12
  const mesosBase = selectedYear < nowYear ? 12 : (selectedYear > nowYear ? 1 : Math.max(1, nowMonth - 1));

  const beneficiFiscal = totalBeneficiFacturacioAny - obligaciosFiscalsAny;
  const beneficiFiscalMitja = mesosBase > 0 ? beneficiFiscal / mesosBase : 0;

  const beneficiReal = beneficiFiscal - despesesEstructuralsAny;
  const beneficiRealMitja = mesosBase > 0 ? beneficiReal / mesosBase : 0;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });

  // ── TASQUES URGENTS ───────────────────────────────────────────────────────
  const avuiTs = new Date();
  avuiTs.setHours(0, 0, 0, 0);

  type TascaUrgent = { id: string; titol: string; subtitol: string; data: string; tipus: 'factura' | 'rodatge' | 'entrega' };

  const tascasUrgents: TascaUrgent[] = [
    // Factures vençudes
    ...facturesVencudes.map(f => {
      const client = clients.find(c => c.codi === f.client);
      return {
        id: f.codi,
        titol: f.codi,
        subtitol: `${client?.nomComercial || client?.nomFiscal || '—'} · ${fmtEur2(f.pendentCobrar)}`,
        data: f.dataVenciment,
        tipus: 'factura' as const,
      };
    }),
    // Propers rodatges
    ...projectes
      .filter(p => p.estat !== 'acabat' && p.estat !== 'facturat' && !p.arxivat)
      .flatMap(p => {
        if (p.datesRodatge && p.datesRodatge.length > 0) {
          return p.datesRodatge
            .filter(d => d.data && new Date(d.data) >= avuiTs)
            .map(d => ({ id: `rod-${p.codi}-${d.id}`, titol: p.titol, subtitol: `Rodatge · ${formatDate(d.data!)}`, data: d.data!, tipus: 'rodatge' as const }));
        }
        if (p.dataInici && new Date(p.dataInici) >= avuiTs) {
          return [{ id: `rod-${p.codi}`, titol: p.titol, subtitol: `Rodatge · ${formatDate(p.dataInici)}`, data: p.dataInici, tipus: 'rodatge' as const }];
        }
        return [];
      }),
    // Projectes per entregar
    ...projectes
      .filter(p => {
        if (!ESTATS_URGENTS.includes(p.estat)) return false;
        if (p.datesEntrega && p.datesEntrega.length > 0) return p.datesEntrega.some(d => d.data && !d.entregada);
        return !!p.dataEntrega;
      })
      .map(p => {
        const data = getNextEntregaPendent(p);
        return { id: `ent-${p.codi}`, titol: p.titol, subtitol: `Entrega · ${data ? formatDate(data) : '—'}`, data, tipus: 'entrega' as const };
      }),
  ]
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 5);

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

  const colorBenefici = (n: number) => (n >= 0 ? 'var(--color-success)' : 'var(--color-error)');

  const G_GREEN  = 'linear-gradient(135deg, #059669, #10b981, #34d399)';
  const G_AMBER  = 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)';
  const G_RED    = 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)';

  const kpiCard = (
    icon: React.ReactNode,
    gradient: string,
    label: string,
    value: string,
    sub?: string,
  ) => (
    <div
      className="stat-card"
    >
      <div className="stat-card-stripe" style={{ background: gradient }} />
      <div className="stat-card-body" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'var(--color-bg-tertiary)', padding: '0.75rem', borderRadius: '8px', display: 'flex' }}>
            {icon}
          </div>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
        </div>
        <div className="stat-card-value" style={{ fontSize: '2rem', marginBottom: sub ? '0.25rem' : 0 }}>
          <span style={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{value}</span>
        </div>
        {sub && <div className="stat-card-sub">{sub}</div>}
      </div>
    </div>
  );

  return (
    <div>
      {/* ── DATA ─────────────────────────────────────────────────────────── */}
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        {new Date().toLocaleDateString('ca-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {kpiCard(<TrendingUp size={20} color="var(--color-warning)" />, G_AMBER, 'Pendent de Cobrar', fmtEur2(pendentCobrar))}
        {kpiCard(<TrendingDown size={20} color="var(--color-error)" />, G_RED, 'Pendent de Pagar', fmtEur2(pendentPagar))}
        {kpiCard(<AlertCircle size={20} color="var(--color-error-dark)" />, G_RED, 'Factures Vençudes', String(facturesVencudes.length), facturesVencudes.length > 0 ? fmtEur2(totalVencudes) : undefined)}
        {kpiCard(<Briefcase size={20} color="var(--color-success)" />, G_GREEN, 'Projectes Actius', String(projectesActius))}
      </div>

      {/* ── GRÀFIC + CARDS + TASQUES ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '480px', gap: '1rem', marginBottom: '1.25rem' }}>

        {/* Gràfic barres */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Capçalera amb navegació d'any */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>Benefici de facturació per mes</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>
                Suma del benefici dels projectes facturats en cada mes
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
              Benefici de facturació {selectedYear}:{' '}
              <strong style={{ color: colorBenefici(totalBeneficiFacturacioAny), fontSize: '1rem' }}>
                {fmtEur2(totalBeneficiFacturacioAny)}
              </strong>
            </span>
          </div>
        </div>

        {/* Cards columna */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Card 1: Benefici net fiscal */}
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1rem 1.1rem', flex: 1, overflow: 'visible' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>
              Benefici net fiscal · {selectedYear}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '0.6rem', lineHeight: 1.4 }}>
              Ingressos bruts de beneficis de projectes facturats <strong>després de descomptar</strong> el que has pagat a Hisenda i SS com a autònom
            </div>

            {selectedYear < nowYear && (
              <div style={{
                fontSize: '0.74rem',
                color: 'var(--color-warning-dark)',
                background: 'var(--color-warning-bg)',
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
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginBottom: '0.1rem' }}>Total beneficis</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-success)' }}>+{fmtEur2(totalBeneficiFacturacioAny)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginBottom: '0.1rem' }}>Obligacions fiscals</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-error-dark)' }}>-{fmtEur2(obligaciosFiscalsAny)}</div>
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
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1rem 1.1rem', flex: 1, overflow: 'visible' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>
              Benefici net real · {selectedYear}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '0.6rem', lineHeight: 1.4 }}>
              Benefici net fiscal <strong>tenint en compte</strong> les despeses fixes del negoci: factures de proveïdors/acreedors registrades com a despesa general
            </div>

            {selectedYear < nowYear && (
              <div style={{
                fontSize: '0.74rem',
                color: 'var(--color-warning-dark)',
                background: 'var(--color-warning-bg)',
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
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-error-dark)' }}>-{fmtEur2(despesesEstructuralsAny)}</div>
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
        <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1rem 1.1rem', overflow: 'visible' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>🗓️ Properes Tasques</h3>

          {tascasUrgents.map(t => {
            const gradient =
              t.tipus === 'factura' ? 'linear-gradient(180deg, #dc2626, #ef4444)' :
              t.tipus === 'rodatge' ? 'linear-gradient(180deg, #0d5c2e, #14793c, #1aad57)' :
              'linear-gradient(180deg, #c70000, #f5090a, #ff4444)';
            const icon = t.tipus === 'factura' ? '🧾' : t.tipus === 'rodatge' ? '🎬' : '📦';
            return (
              <div key={t.id} style={{
                display: 'flex',
                marginBottom: '0.5rem',
                borderRadius: '4px',
                overflow: 'hidden',
                background: 'var(--color-bg-tertiary)',
              }}>
                <div style={{ width: 3, flexShrink: 0, background: gradient }} />
                <div style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600 }}>{icon} {t.titol}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{t.subtitol}</div>
                </div>
              </div>
            );
          })}

          {tascasUrgents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
              <CheckCircle size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
              Tot al dia!
            </div>
          )}
        </div>

      </div>

      {/* ── ACTIVITAT RECENT (amplada completa) ──────────────────────────── */}
      <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1.5rem' }}>
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
  const rawMax = Math.max(...data, 0);
  const rawMin = Math.min(...data, 0);
  const maxVal = rawMax === 0 && rawMin === 0 ? 1 : rawMax;
  const minVal = rawMax === 0 && rawMin === 0 ? 0 : rawMin;
  const range = Math.max(maxVal - minVal, 1);
  const valueToY = (value: number) => PT + chartH - ((value - minVal) / range) * chartH;
  const zeroY = valueToY(0);
  const barW = chartW / 12;
  const barGap = 14;
  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        {gridLevels.map((pct, i) => {
          const y = PT + chartH - pct * chartH;
          const labelValue = minVal + range * pct;
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y}
                stroke="var(--color-border)" strokeWidth={Math.abs(labelValue) < 0.01 ? 1.5 : 1}
                strokeDasharray={Math.abs(labelValue) < 0.01 ? undefined : '4 3'}
              />
              <text x={PL - 5} y={y + 3.5} textAnchor="end" fontSize="9.5" fill="var(--color-text-tertiary)">
                {fmtEur(labelValue)}
              </text>
            </g>
          );
        })}

        {minVal < 0 && maxVal > 0 && (
          <line x1={PL} y1={zeroY} x2={W - PR} y2={zeroY}
            stroke="var(--color-border-strong)" strokeWidth="1.5"
          />
        )}

        {data.map((val, i) => {
          const yValue = valueToY(val);
          const barH = Math.abs(zeroY - yValue);
          const x = PL + i * barW + barGap / 2;
          const y = Math.min(yValue, zeroY);
          const bw = barW - barGap;
          const color = val > 0 ? 'var(--color-info)' : val < 0 ? 'var(--color-error)' : 'var(--color-border-strong)';

          return (
            <g key={i}>
              {barH > 0.5 && (
                <rect x={x} y={y} width={bw} height={barH} fill={color} rx="3" opacity="0.9" />
              )}
              {val !== 0 && barH > 12 && (
                <text
                  x={x + bw / 2}
                  y={val > 0 ? y - 4 : y + barH + 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="var(--color-text-secondary)"
                >
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
