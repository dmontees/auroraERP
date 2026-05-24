import React, { useMemo } from 'react';
import { storage } from '../../../utils/storageManager';
import type { AlbaraCompra } from '../../../types/albara';
import type { Proveidor } from '../../../types/proveidor';
import type { Parametres } from '../../../types/parametres';
import type { FacturaCompra, ObligacioFiscal } from '../../../types/facturaCompra';

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

const isNomina = (codi: string) => codi.startsWith('OF-');

export default function PagamentsProveidorsTab({ projecteCodi, proveidors, parametres }: Props) {
  const { pendents, vinculats, pagats, facturesVinculades, nominesVinculades } = useMemo(() => {
    const albarans = storage.getAlbaransCompra().filter(a => a.projecteCodi === projecteCodi);
    const todesFactures = storage.getFacturesCompra() as FacturaCompra[];
    const todesNomines = storage.getObligacionsFiscals().filter(
      (n: any) => n.subtipus === 'nomina-treballador'
    ) as ObligacioFiscal[];

    const isEffectivamentPagat = (a: AlbaraCompra): boolean => {
      if (a.estat === 'pagat') return true;
      if (a.estat === 'factura-vinculada' && a.facturaCodi) {
        if (isNomina(a.facturaCodi)) {
          const n = todesNomines.find(n => n.codi === a.facturaCodi);
          return !!n && Math.round((n.pendentPagament || 0) * 100) / 100 <= 0 && (n.totalPagat || 0) > 0;
        }
        const f = todesFactures.find(f => f.codi === a.facturaCodi);
        return !!f && Math.round((f.pendentPagament || 0) * 100) / 100 <= 0 && (f.totalPagat || 0) > 0;
      }
      return false;
    };

    const pendents = albarans.filter(a => a.estat === 'pendent-factura');
    const pagats = albarans.filter(a => isEffectivamentPagat(a));
    const vinculats = albarans.filter(a => a.estat === 'factura-vinculada' && !isEffectivamentPagat(a));

    const allLinkedCodis = new Set([
      ...vinculats.map(a => a.facturaCodi!),
      ...pagats.map(a => a.facturaCodi!),
    ].filter(Boolean));

    const facturasCodis = [...allLinkedCodis].filter(c => !isNomina(c));
    const nominasCodis = [...allLinkedCodis].filter(isNomina);

    const facturesVinculades = todesFactures.filter(f => facturasCodis.includes(f.codi));
    const nominesVinculades = todesNomines.filter(n => nominasCodis.includes(n.codi));

    return { pendents, vinculats, pagats, facturesVinculades, nominesVinculades };
  }, [projecteCodi]);

  const totalPendent =
    pendents.reduce((s, a) => s + albaraImport(a), 0) +
    vinculats.reduce((s, a) => {
      if (a.facturaCodi && isNomina(a.facturaCodi)) {
        const n = nominesVinculades.find(n => n.codi === a.facturaCodi);
        return s + (n?.pendentPagament || 0);
      }
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

  const renderNominaRow = (n: ObligacioFiscal, estat: 'vinculada' | 'pagada') => (
    <div key={n.codi} style={{
      ...rowStyle,
      gridTemplateColumns: '1fr 2fr 1fr 1fr',
      background: estat === 'pagada' ? '#f0fdf4' : '#eff6ff',
      marginBottom: 4,
    }}>
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>{n.codi}</span>
      <span>
        <span style={{ fontWeight: 600 }}>{n.treballadorNom || n.treballadorCodi || '—'}</span>
        <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>— Nòmina {n.periode}</span>
      </span>
      <span style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(n.totalGasto || 0)}</span>
      <span style={{ textAlign: 'right', fontWeight: 600, color: estat === 'pagada' ? '#10b981' : '#f59e0b' }}>
        {estat === 'pagada' ? 'Pagada' : `Pendent: ${fmt(n.pendentPagament || 0)}`}
      </span>
    </div>
  );

  // Deduplicate by document code, split by type
  const vinculatsCodis = vinculats.map(a => a.facturaCodi!).filter(Boolean);
  const pagatsCodis = pagats.map(a => a.facturaCodi!).filter(Boolean);

  const facturesVinculadesUniques = [...new Map(
    vinculatsCodis.filter(c => !isNomina(c)).map(codi => {
      const f = facturesVinculades.find(f => f.codi === codi);
      return [codi, f] as [string, FacturaCompra | undefined];
    }).filter(([, f]) => f)
  ).values()] as FacturaCompra[];

  const nominesVinculadesUniques = [...new Map(
    vinculatsCodis.filter(isNomina).map(codi => {
      const n = nominesVinculades.find(n => n.codi === codi);
      return [codi, n] as [string, ObligacioFiscal | undefined];
    }).filter(([, n]) => n)
  ).values()] as ObligacioFiscal[];

  const facturesPagadesUniques = [...new Map(
    pagatsCodis.filter(c => !isNomina(c)).map(codi => {
      const f = facturesVinculades.find(f => f.codi === codi);
      return [codi, f] as [string, FacturaCompra | undefined];
    }).filter(([, f]) => f)
  ).values()] as FacturaCompra[];

  const nominesPagadesUniques = [...new Map(
    pagatsCodis.filter(isNomina).map(codi => {
      const n = nominesVinculades.find(n => n.codi === codi);
      return [codi, n] as [string, ObligacioFiscal | undefined];
    }).filter(([, n]) => n)
  ).values()] as ObligacioFiscal[];

  const totalVinculadesCount = facturesVinculadesUniques.length + nominesVinculadesUniques.length;
  const totalPagadesCount = facturesPagadesUniques.length + nominesPagadesUniques.length;

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

          {/* Factures / Nòmines vinculades (pendent de pagar) */}
          {sectionTitle('Factura o Nòmina vinculada — pendent de pagar', totalVinculadesCount, '#3b82f6')}
          {totalVinculadesCount === 0 ? (
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem', paddingLeft: '1rem' }}>Cap factura pendent</p>
          ) : (
            <>
              {facturesVinculadesUniques.map(f => renderFacturaRow(f, 'vinculada'))}
              {nominesVinculadesUniques.map(n => renderNominaRow(n, 'vinculada'))}
            </>
          )}

          {/* Pagades */}
          {sectionTitle('Pagades', totalPagadesCount, '#10b981')}
          {totalPagadesCount === 0 ? (
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem', paddingLeft: '1rem' }}>Cap factura pagada</p>
          ) : (
            <>
              {facturesPagadesUniques.map(f => renderFacturaRow(f, 'pagada'))}
              {nominesPagadesUniques.map(n => renderNominaRow(n, 'pagada'))}
            </>
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
