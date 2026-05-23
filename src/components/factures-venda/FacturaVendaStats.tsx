import React, { useState } from 'react';
import { Download } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenda';
import type { Client } from '../../types/client';
import { exportarFacturesVendaTrimestre, exportarFacturesVendaAny } from './utils/facturaExport';

interface Props {
  factures: FacturaVenta[];
  clients: Client[];
}

export default function FacturaVendaStats({ factures, clients }: Props) {
  // ── Export state (local) ──────────────────────────────────────────────────
  const [exportMode, setExportMode] = useState<'trimestre' | 'any'>('trimestre');
  const [exportAny, setExportAny] = useState(() => String(new Date().getFullYear()));
  const [exportQ, setExportQ] = useState<string>(() => {
    const m = new Date().getMonth() + 1;
    if (m <= 3) return 'Q1';
    if (m <= 6) return 'Q2';
    if (m <= 9) return 'Q3';
    return 'Q4';
  });
  const exportYears = Array.from(
    { length: new Date().getFullYear() - 2020 + 2 },
    (_, i) => String(2020 + i)
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const facturesPendents = factures.filter(f =>
    ['enviada', 'pagada-parcial', 'vencuda'].includes(f.estat)
  );
  const totalPendent = facturesPendents.reduce((sum, f) => sum + f.pendentCobrar, 0);
  const numFacturesPendents = facturesPendents.length;

  const facturesVencudes = factures.filter(f => f.estat === 'vencuda');
  const totalVencudes = facturesVencudes.reduce((sum, f) => sum + f.pendentCobrar, 0);
  const numFacturesVencudes = facturesVencudes.length;

  const facturesEnviades = factures.filter(f =>
    f.estat === 'enviada' || f.estat === 'pagada-parcial'
  );
  const totalEnviades = facturesEnviades.reduce((sum, f) => sum + f.pendentCobrar, 0);
  const numFacturesEnviades = facturesEnviades.length;

  const avui = new Date();
  const primerDiaMes = new Date(avui.getFullYear(), avui.getMonth(), 1);
  const pagamentsAquestMes = factures.flatMap(f =>
    f.pagaments.filter(p => new Date(p.data) >= primerDiaMes)
  );
  const totalCobratAquestMes = pagamentsAquestMes.reduce((sum, p) => sum + p.import, 0);
  const numFacturesCobrades = new Set(
    factures
      .filter(f => f.pagaments.some(p => new Date(p.data) >= primerDiaMes))
      .map(f => f.codi)
  ).size;

  const fmt = (n: number) =>
    n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem',
    }}>
      {/* Pendent de Cobrar */}
      <div style={{ background: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '2px solid #f59e0b' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>💰 Pendent de Cobrar</div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>{fmt(totalPendent)}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>{numFacturesPendents} factures</div>
      </div>

      {/* Vençudes */}
      <div style={{ background: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '2px solid #dc2626' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>🔴 Vençudes</div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626' }}>{numFacturesVencudes}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>{fmt(totalVencudes)}</div>
      </div>

      {/* Enviades */}
      <div style={{ background: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '2px solid #3b82f6' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>📤 Enviades</div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6' }}>{numFacturesEnviades}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>{fmt(totalEnviades)}</div>
      </div>

      {/* Cobrat Aquest Mes */}
      <div style={{ background: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '2px solid #10b981' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>✅ Cobrat Aquest Mes</div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>{fmt(totalCobratAquestMes)}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>{numFacturesCobrades} factures</div>
      </div>

      {/* Exportar ZIP */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          📦 Exportar Factures (ZIP)
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {(['trimestre', 'any'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setExportMode(mode)}
              style={{
                flex: 1,
                padding: '0.3rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                background: exportMode === mode ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
                color: exportMode === mode ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              {mode === 'trimestre' ? 'Trimestre' : 'Any'}
            </button>
          ))}
        </div>

        {/* Year + Quarter inline */}
        <div style={{ display: 'grid', gridTemplateColumns: exportMode === 'trimestre' ? '1fr 1fr' : '1fr', gap: '0.4rem' }}>
          <select
            value={exportAny}
            onChange={(e) => setExportAny(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.85rem' }}
          >
            {exportYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {exportMode === 'trimestre' && (
            <select
              value={exportQ}
              onChange={(e) => setExportQ(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.85rem' }}
            >
              <option value="Q1">T1 (Gen–Mar)</option>
              <option value="Q2">T2 (Abr–Jun)</option>
              <option value="Q3">T3 (Jul–Set)</option>
              <option value="Q4">T4 (Oct–Des)</option>
            </select>
          )}
        </div>

        <button
          className="btn-secondary"
          onClick={() =>
            exportMode === 'trimestre'
              ? exportarFacturesVendaTrimestre(exportAny, exportQ, factures, clients)
              : exportarFacturesVendaAny(exportAny, factures, clients)
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            padding: '0.5rem',
            justifyContent: 'center',
          }}
        >
          <Download size={16} />
          Descarregar ZIP
        </button>
      </div>
    </div>
  );
}
