import React, { useMemo } from 'react';
import { storage } from '../../../utils/storageManager';
import type { AlbaraCompra } from '../../../types/albara';
import type { Proveidor } from '../../../types/proveidor';
import type { Parametres } from '../../../types/parametres';
import type { FacturaCompra } from '../../../types/facturaCompra';

interface Props {
  projecteCodi: string;
  proveidors: Proveidor[];
  parametres: Parametres | null;
}

function fmt(n: number) {
  return n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function provNom(codi: string, proveidors: Proveidor[]) {
  const p = proveidors.find(p => p.codi === codi);
  return p?.nomComercial || p?.nomFiscal || codi;
}

function albaraLabel(a: AlbaraCompra, parametres: Parametres | null) {
  if (a.tipusLinia === 'rrhh') {
    const serveiNom = a.serveiNom || parametres?.serveis.find(s => s.codi === a.serveiCodi)?.nom || a.serveiCodi || '';
    return serveiNom;
  }
  const materialNom = a.materialNom || parametres?.materials.find(m => m.codi === a.materialCodi)?.material || a.materialCodi || '';
  return materialNom;
}

function albaraImport(a: AlbaraCompra) {
  return a.tipusLinia === 'rrhh' ? (a.cost || 0) : (a.preuProveidor || 0);
}

export default function PagamentsProveidorsTab({ projecteCodi, proveidors, parametres }: Props) {
  const { pendents, vinculats, pagats, facturesVinculades } = useMemo(() => {
    const albarans = storage.getAlbaransCompra().filter(a => a.projecteCodi === projecteCodi);
    const todesFactures = storage.getFacturesCompra() as FacturaCompra[];

    // An albarà with a fully-paid linked invoice is treated as "pagat" regardless of its stored estat,
    // to handle cases where syncAlbaransAfterSave didn't run or had rounding issues.
    const isEffectivamentPagat = (a: AlbaraCompra): boolean => {
      if (a.estat === 'pagat') return true;
      if (a.estat === 'factura-vinculada' && a.facturaCodi) {
        const f = todesFactures.find(f => f.codi === a.facturaCodi);
        return !!f && Math.round((f.pendentPagament || 0) * 100) / 100 <= 0 && (f.totalPagat || 0) > 0;
      }
      return false;
    };

    const pendents = albarans.filter(a => a.estat === 'pendent-factura');
    const pagats = albarans.filter(a => isEffectivamentPagat(a));
    const vinculats = albarans.filter(a => a.estat === 'factura-vinculada' && !isEffectivamentPagat(a));

    const facturaCodis = new Set([
      ...vinculats.map(a => a.facturaCodi!),
      ...pagats.map(a => a.facturaCodi!),
    ].filter(Boolean));
    const facturesVinculades = todesFactures.filter(f => facturaCodis.has(f.codi));

    return { pendents, vinculats, pagats, facturesVinculades };
  }, [projecteCodi]);

  const totalPendent =
    pendents.reduce((s, a) => s + albaraImport(a), 0) +
    vinculats.reduce((s, a) => {
      const f = facturesVinculades.find(f => f.codi === a.facturaCodi);
      return s + (f?.pendentPagament || 0) / (f?.albaransVinculats?.length || 1);
    }, 0);

  const sectionTitle = (label: string, count: number, color: string) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      marginBottom: '0.75rem', marginTop: '1.5rem'
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.8rem', background: 'var(--color-bg-tertiary)', borderRadius: 4, padding: '0 6px', color: 'var(--color-text-secondary)' }}>
        {count}
      </span>
    </div>
  );

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1fr 1fr',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: 6,
    fontSize: '0.875rem',
    alignItems: 'center',
  };

  const renderAlbaraRow = (a: AlbaraCompra, bg: string) => (
    <div key={a.codi} style={{ ...rowStyle, background: bg, marginBottom: 4 }}>
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>{a.codi}</span>
      <span>
        <span style={{ fontWeight: 600 }}>{provNom(a.proveidorCodi, proveidors)}</span>
        <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>— {albaraLabel(a, parametres)}</span>
      </span>
      <span style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(albaraImport(a))}</span>
      <span style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>estimat</span>
    </div>
  );

  const renderFacturaRow = (f: FacturaCompra, estat: 'vinculada' | 'pagada') => {
    const prov = proveidors.find(p => p.codi === f.proveidor);
    const provNomText = prov?.nomComercial || prov?.nomFiscal || f.proveidor;
    return (
      <div key={f.codi} style={{
        ...rowStyle,
        gridTemplateColumns: '1fr 2fr 1fr 1fr',
        background: estat === 'pagada' ? '#f0fdf4' : '#eff6ff',
        marginBottom: 4,
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>{f.codi}</span>
        <span>
          <span style={{ fontWeight: 600 }}>{provNomText}</span>
          <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>— {f.numFacturaProveidor}</span>
        </span>
        <span style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(f.totalGasto || 0)}</span>
        <span style={{ textAlign: 'right', fontWeight: 600, color: estat === 'pagada' ? '#10b981' : '#f59e0b' }}>
          {estat === 'pagada' ? 'Pagada' : `Pendent: ${fmt(f.pendentPagament || 0)}`}
        </span>
      </div>
    );
  };

  // Unique invoices for factura-vinculada albarans
  const facturesVinculadesUniques = [...new Map(
    vinculats.map(a => a.facturaCodi!).filter(Boolean).map(codi => {
      const f = facturesVinculades.find(f => f.codi === codi);
      return [codi, f];
    }).filter(([, f]) => f)
  ).values()] as FacturaCompra[];

  // Unique invoices for pagat albarans
  const facturesPagadesUniques = [...new Map(
    pagats.map(a => a.facturaCodi!).filter(Boolean).map(codi => {
      const f = facturesVinculades.find(f => f.codi === codi);
      return [codi, f];
    }).filter(([, f]) => f)
  ).values()] as FacturaCompra[];

  const noData = pendents.length === 0 && vinculats.length === 0 && pagats.length === 0;

  return (
    <div>
      {noData ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Cap despesa de proveïdor registrada</p>
          <p style={{ fontSize: '0.875rem' }}>Afegeix proveïdors a la pestanya Despeses per veure aquí els albarans.</p>
        </div>
      ) : (
        <>
          {/* Pendents de factura */}
          {sectionTitle('Pendent de factura', pendents.length, '#f59e0b')}
          {pendents.length === 0 ? (
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem', paddingLeft: '1rem' }}>Cap albarà pendent</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: '0.5rem', padding: '0 0.75rem', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                <span>Albarà</span><span>Proveïdor — Servei/Material</span><span style={{ textAlign: 'right' }}>Import</span><span />
              </div>
              {pendents.map(a => renderAlbaraRow(a, '#fffbeb'))}
            </>
          )}

          {/* Factures vinculades (pendent de pagar) */}
          {sectionTitle('Factura o Nòmina vinculada — pendent de pagar', facturesVinculadesUniques.length, '#3b82f6')}
          {facturesVinculadesUniques.length === 0 ? (
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem', paddingLeft: '1rem' }}>Cap factura pendent</p>
          ) : (
            facturesVinculadesUniques.map(f => renderFacturaRow(f, 'vinculada'))
          )}

          {/* Pagades */}
          {sectionTitle('Pagades', facturesPagadesUniques.length, '#10b981')}
          {facturesPagadesUniques.length === 0 ? (
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem', paddingLeft: '1rem' }}>Cap factura pagada</p>
          ) : (
            facturesPagadesUniques.map(f => renderFacturaRow(f, 'pagada'))
          )}

          {/* Total pendent */}
          <div style={{
            marginTop: '2rem',
            padding: '1rem 1.5rem',
            background: totalPendent > 0 ? '#fef3c7' : '#f0fdf4',
            borderRadius: 8,
            border: `1px solid ${totalPendent > 0 ? '#fbbf24' : '#6ee7b7'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Total pendent de pagar (estimat)</span>
            <span style={{ fontWeight: 800, fontSize: '1.5rem', color: totalPendent > 0 ? '#92400e' : '#065f46' }}>
              {fmt(totalPendent)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
