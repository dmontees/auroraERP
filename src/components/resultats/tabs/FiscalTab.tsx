import React, { useMemo } from 'react';
import type { FacturaVenta } from '../../../types/facturaVenda';
import type { Gasto, ObligacioFiscal } from '../../../types/facturaCompra';

interface Props {
  facturesVenda: FacturaVenta[];
  gastos: Gasto[];
  any: number;
}

function fmt(n: number) {
  return n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function inYear(dateStr: string, year: number) {
  return dateStr?.startsWith(String(year));
}

export default function FiscalTab({ facturesVenda, gastos, any: selectedYear }: Props) {
  const calculs = useMemo(() => {
    // ---- FACTURES VENDA de l'any ----
    const fvAny = facturesVenda.filter(f => inYear(f.dataFactura || '', selectedYear));
    const ingresosbruts = fvAny.reduce((s, f) => s + (f.baseImposable || 0), 0);
    const ivaRepercutit = fvAny.reduce((s, f) => s + (f.ivaImport || 0), 0);

    // ---- GASTOS OPERATIUS de l'any (per dataGasto) ----
    const gastosOperatiusAny = gastos.filter(g =>
      (g.tipus === 'factura-compra' || g.tipus === 'gasto-general') && inYear(g.dataGasto, selectedYear)
    );
    const gastosOperatius = gastosOperatiusAny
      .reduce((s, g) => s + (g.baseImposable || 0), 0);
    const ivaSuportat = gastosOperatiusAny
      .filter(g => g.tipus === 'factura-compra')
      .reduce((s, g) => s + (g.ivaImport || 0), 0);

    const rendimentNet = ingresosbruts - gastosOperatius;

    // ---- OBLIGACIONS FISCALS — filtrades per periode (any de referència, no data de pagament) ----
    const obsAny = (gastos.filter(g => g.tipus === 'obligacio-fiscal') as ObligacioFiscal[])
      .filter(o => o.periode?.substring(0, 4) === String(selectedYear));

    const cuotaAutonomPagada = obsAny
      .filter(o => o.subtipus === 'cuota-autonomo')
      .reduce((s, o) => s + (o.baseImposable || 0), 0);

    const regularitzacioSS = obsAny
      .filter(o => o.subtipus === 'regularitzacio-ss')
      .reduce((s, o) => s + (o.baseImposable || 0), 0);

    const irpfPagat = obsAny
      .filter(o => o.subtipus === 'irpf-trimestral' || o.subtipus === 'irpf-anual')
      .reduce((s, o) => s + (o.baseImposable || 0), 0);

    const nominalesCostEmpresa = obsAny
      .filter(o => o.subtipus === 'nomina-treballador')
      .reduce((s, o) => s + (o.costTotalEmpresa || 0), 0);

    const totalObligacionsFiscals = cuotaAutonomPagada + regularitzacioSS + irpfPagat + nominalesCostEmpresa;
    const resultatFiscalNet = rendimentNet - totalObligacionsFiscals;

    // ---- IVA trimestral registrat gestor ----
    const ivaRegistratGestor = obsAny
      .filter(o => o.subtipus === 'iva-trimestral')
      .reduce((s, o) => s + (o.ivaRegistratGestor || 0), 0);
    const ivaNetCalculat = ivaRepercutit - ivaSuportat;
    const diferIva = ivaNetCalculat - ivaRegistratGestor;

    // ---- Nòmines detall ----
    const nomines = obsAny.filter(o => o.subtipus === 'nomina-treballador');
    const ssTotalPagada = nomines.reduce((s, o) => s + (o.ssEmpresa || 0) + (o.ssTreballador || 0), 0);
    const irpfRetingutNomines = nomines.reduce((s, o) => s + (o.irpfRetingut || 0), 0);
    const salariNetPagat = nomines.reduce((s, o) => s + (o.salariNet || 0), 0);

    return {
      ingresosbruts, ivaRepercutit, gastosOperatius, ivaSuportat,
      rendimentNet, cuotaAutonomPagada, regularitzacioSS, irpfPagat,
      nominalesCostEmpresa, totalObligacionsFiscals, resultatFiscalNet,
      ivaRegistratGestor, ivaNetCalculat, diferIva,
      ssTotalPagada, irpfRetingutNomines, salariNetPagat
    };
  }, [facturesVenda, gastos, selectedYear]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.9rem'
  };

  const h3Style: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--color-text-tertiary)',
    marginBottom: '1rem'
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Any fiscal: <strong style={{ color: 'var(--color-text-primary)', fontSize: '1rem' }}>{selectedYear}</strong>
        </div>
      </div>

      {/* COMPTE D'EXPLOTACIÓ */}
      <div style={cardStyle}>
        <h3 style={h3Style}>Compte d'Explotació</h3>
        <div style={rowStyle}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Ingressos bruts (base imposable sense IVA)</span>
          <span style={{ fontWeight: 600, color: '#10b981' }}>{fmt(calculs.ingresosbruts)}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Despeses operatives (factures + despeses generals)</span>
          <span style={{ fontWeight: 600, color: '#dc2626' }}>-{fmt(calculs.gastosOperatius)}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none', fontWeight: 700, fontSize: '1rem', marginTop: '0.25rem' }}>
          <span style={{ color: 'var(--color-text-primary)' }}>Rendiment net</span>
          <span style={{ color: calculs.rendimentNet >= 0 ? '#10b981' : '#dc2626' }}>
            {fmt(calculs.rendimentNet)}
          </span>
        </div>
      </div>

      {/* OBLIGACIONS FISCALS */}
      <div style={cardStyle}>
        <h3 style={h3Style}>Obligacions Fiscals Registrades</h3>
        <div style={rowStyle}>
          <span style={{ color: 'var(--color-text-secondary)' }}>👤 Quota autònom pagada (RETA)</span>
          <span style={{ color: '#dc2626' }}>{fmt(calculs.cuotaAutonomPagada)}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: 'var(--color-text-secondary)' }}>📊 Regularitzacions SS</span>
          <span style={{ color: '#dc2626' }}>{fmt(calculs.regularitzacioSS)}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: 'var(--color-text-secondary)' }}>📋 IRPF pagat (fraccionats + anual)</span>
          <span style={{ color: '#dc2626' }}>{fmt(calculs.irpfPagat)}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: 'var(--color-text-secondary)' }}>👷 Nòmines (cost empresa)</span>
          <span style={{ color: '#dc2626' }}>{fmt(calculs.nominalesCostEmpresa)}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none', fontWeight: 700, marginTop: '0.25rem' }}>
          <span style={{ color: 'var(--color-text-primary)' }}>Total obligacions fiscals</span>
          <span style={{ color: '#dc2626' }}>-{fmt(calculs.totalObligacionsFiscals)}</span>
        </div>
      </div>

      {/* RESULTAT FISCAL NET */}
      <div style={{
        ...cardStyle,
        borderColor: calculs.resultatFiscalNet >= 0 ? '#10b981' : '#dc2626',
        borderWidth: '2px',
        background: calculs.resultatFiscalNet >= 0 ? '#f0fdf4' : '#fef2f2'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
              RESULTAT FISCAL NET
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Rendiment net − Total obligacions fiscals
            </div>
          </div>
          <div style={{
            fontWeight: 800,
            fontSize: '2rem',
            color: calculs.resultatFiscalNet >= 0 ? '#10b981' : '#dc2626'
          }}>
            {fmt(calculs.resultatFiscalNet)}
          </div>
        </div>
      </div>

      {/* RESUM IVA */}
      <div style={cardStyle}>
        <h3 style={h3Style}>Resum IVA (informatiu per al gestor)</h3>
        <div style={rowStyle}>
          <span style={{ color: 'var(--color-text-secondary)' }}>IVA repercutit (calculat de factures venda)</span>
          <span style={{ color: '#10b981' }}>{fmt(calculs.ivaRepercutit)}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: 'var(--color-text-secondary)' }}>IVA suportat (calculat de factures compra)</span>
          <span style={{ color: '#dc2626' }}>-{fmt(calculs.ivaSuportat)}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: 'var(--color-text-secondary)' }}>IVA net a liquidar (calculat)</span>
          <span style={{ fontWeight: 600 }}>{fmt(calculs.ivaNetCalculat)}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: 'var(--color-text-secondary)' }}>💶 IVA registrat trimestral (gestor, Mod. 303)</span>
          <span style={{ fontWeight: 600, color: '#7c3aed' }}>{fmt(calculs.ivaRegistratGestor)}</span>
        </div>
        {Math.abs(calculs.diferIva) > 0.01 && (
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Diferència (calculat − registrat)</span>
            <span style={{ fontWeight: 600, color: '#f59e0b' }}>{fmt(calculs.diferIva)}</span>
          </div>
        )}
        {Math.abs(calculs.diferIva) <= 0.01 && calculs.ivaRegistratGestor > 0 && (
          <div style={{ ...rowStyle, borderBottom: 'none', color: '#10b981' }}>
            <span>Les xifres coincideixen amb el gestor</span>
            <span>✓</span>
          </div>
        )}
      </div>

      {/* RETENCIONS NÒMINES */}
      {(calculs.ssTotalPagada > 0 || calculs.irpfRetingutNomines > 0 || calculs.salariNetPagat > 0) && (
        <div style={cardStyle}>
          <h3 style={h3Style}>Retencions practicades (nòmines)</h3>
          <div style={rowStyle}>
            <span style={{ color: 'var(--color-text-secondary)' }}>SS total pagada (empresa + treballadors)</span>
            <span>{fmt(calculs.ssTotalPagada)}</span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: 'var(--color-text-secondary)' }}>IRPF retingut</span>
            <span>{fmt(calculs.irpfRetingutNomines)}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Import net pagat als treballadors</span>
            <span style={{ color: '#10b981' }}>{fmt(calculs.salariNetPagat)}</span>
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>
        Dades calculades automàticament a partir de les factures i obligacions fiscals registrades per a l'any {selectedYear}.
        Consulta sempre el teu gestor per a la declaració oficial.
      </p>
    </div>
  );
}
