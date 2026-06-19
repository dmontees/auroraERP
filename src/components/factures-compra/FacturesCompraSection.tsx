import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import type { EstatGasto, FacturaCompra, ObligacioFiscal, TipusDocumentCompra } from '../../types/facturaCompra';
import { CATEGORIES_GASTO_GENERAL } from '../../types/facturaCompra';
import type { AlbaraCompra } from '../../types/albara';
import type { Parametres } from '../../types/parametres';
import { storage } from '../../utils/storageManager';
import SearchableSelect from '../common/SearchableSelect';
import TipusGastoModal from './TipusGastoModal';
import GastoGeneralModal from './GastoGeneralModal';
import FacturaCompraModal from './FacturaCompraModal';
import { useFacturesData } from './hooks/useFacturesData';
import { useFacturesMetrics } from './hooks/useFacturesMetrics';
import { exportarFacturesTrimestre, exportarFacturesAny } from './utils/facturesExport';
import { formatCurrency } from './utils/facturesCalculations';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

type Vista = 'factures' | 'albarans';

const TIPUS_DOCUMENT_LABELS: Record<TipusDocumentCompra, string> = {
  factura: 'Factura',
  factura_simplificada: 'Factura simpl.',
};

const getTipusDocument = (factura: FacturaCompra): TipusDocumentCompra =>
  (factura.tipusDocument as string) === 'ticket'
    ? 'factura_simplificada'
    : factura.tipusDocument ?? 'factura';

interface CompraDraftFromProject {
  projecteCodi: string;
  proveidor?: string;
  concepte: string;
  base: number;
  albaraCodis?: string[];
}

export default function FacturesCompraSection() {
  const { gastos, proveidors, projectes, saveGastos, deleteGasto } = useFacturesData();
  const metricas = useFacturesMetrics(gastos);
  const [obligacionsFiscals, setObligacionsFiscals] = useState<ObligacioFiscal[]>([]);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [vista, setVista] = useState<Vista>('factures');
  const [albarans, setAlbarans] = useState<AlbaraCompra[]>([]);

  useEffect(() => {
    setObligacionsFiscals(storage.getObligacionsFiscals());
    setParametres(storage.getParametres());
  }, []);

  // Reload albarans when vista is albarans OR when gastos changes (factura saved → syncAlbaransAfterSave runs)
  useEffect(() => {
    if (vista === 'albarans') {
      setAlbarans(storage.getAlbaransCompra());
    }
  }, [vista, gastos]);

  const handleDeleteGasto = (codi: string) => {
    const allAlbarans = storage.getAlbaransCompra();
    const hasLinked = allAlbarans.some(a => a.facturaCodi === codi);
    if (hasLinked) {
      const updated = allAlbarans.map(a =>
        a.facturaCodi === codi
          ? { ...a, estat: 'pendent-factura' as const, facturaCodi: undefined }
          : a
      );
      storage.setAlbaransCompra(updated);
    }
    deleteGasto(codi);
  };

  const [showTipusModal, setShowTipusModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tipusSeleccionat, setTipusSeleccionat] = useState<'factura-compra' | 'gasto-general' | null>(null);
  const [tipusDocumentInicial, setTipusDocumentInicial] = useState<TipusDocumentCompra>('factura');
  const [draftInicial, setDraftInicial] = useState<CompraDraftFromProject | null>(null);
  const [albaransInicials, setAlbaransInicials] = useState<string[]>([]);
  const [editingGasto, setEditingGasto] = useState<any | null>(null);

  const [filterTipus, setFilterTipus] = useState<'tots' | 'factura-compra' | 'gasto-general'>('tots');
  const [filterTipusDocument, setFilterTipusDocument] = useState<'tots' | TipusDocumentCompra>('tots');
  const [filterEstat, setFilterEstat] = useState<'tots' | EstatGasto>('tots');
  const [filterMes, setFilterMes] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('tots');
  const [filterProveidor, setFilterProveidor] = useState('');
  const [filterTipusProveidor, setFilterTipusProveidor] = useState<'tots' | 'Proveïdor' | 'Acreedor'>('tots');
  const [filterEstatAlbara, setFilterEstatAlbara] = useState<'tots' | AlbaraCompra['estat']>('tots');

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

  const albaraImport = (a: AlbaraCompra) =>
    a.tipusLinia === 'rrhh' ? (a.cost || 0) : (a.preuProveidor || 0);

  const albaraEstatInfo = (estat: AlbaraCompra['estat']) => {
    if (estat === 'pendent-factura') return { label: 'Pendent factura', color: 'var(--color-warning)' };
    if (estat === 'factura-vinculada') return { label: 'Factura vinculada', color: 'var(--color-info)' };
    return { label: 'Pagat', color: 'var(--color-success)' };
  };

  const albaransFiltrats = albarans.filter(a => {
    if (filterProveidor && a.proveidorCodi !== filterProveidor) return false;
    if (filterMes && !a.dataCreacio.startsWith(filterMes)) return false;
    if (filterEstatAlbara !== 'tots' && a.estat !== filterEstatAlbara) return false;
    if (filterTipusProveidor !== 'tots') {
      const prov = proveidors.find(p => p.codi === a.proveidorCodi);
      if (!prov || prov.tipus !== filterTipusProveidor) return false;
    }
    return true;
  });

  const gastosFiltrats = gastos
    .filter(gasto => {
      if (filterTipus !== 'tots' && gasto.tipus !== filterTipus) return false;
      if (filterTipusDocument !== 'tots') {
        if (gasto.tipus !== 'factura-compra') return false;
        if (getTipusDocument(gasto as FacturaCompra) !== filterTipusDocument) return false;
      }
      if (filterEstat !== 'tots' && gasto.estat !== filterEstat) return false;
      if (filterMes && !gasto.dataGasto.startsWith(filterMes)) return false;
      if (filterCategoria !== 'tots') {
        if (gasto.tipus !== 'gasto-general' || gasto.categoria !== filterCategoria) return false;
      }
      if (filterProveidor) {
        if (gasto.tipus !== 'factura-compra' || gasto.proveidor !== filterProveidor) return false;
      }
      if (filterTipusProveidor !== 'tots') {
        if (gasto.tipus !== 'factura-compra') return false;
        const prov = proveidors.find(p => p.codi === gasto.proveidor);
        if (!prov || prov.tipus !== filterTipusProveidor) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
      return new Date(b.dataGasto).getTime() - new Date(a.dataGasto).getTime();
    });

  const seleccionarTipus = (tipus: 'factura-compra' | 'gasto-general', tipusDocument: TipusDocumentCompra = 'factura') => {
    setTipusSeleccionat(tipus);
    setTipusDocumentInicial(tipusDocument);
    setShowTipusModal(false);
    setShowModal(true);
  };

  useEffect(() => {
    const rawDraft = localStorage.getItem('auroraRegistrarCompraDespesa');
    if (!rawDraft) return;
    localStorage.removeItem('auroraRegistrarCompraDespesa');
    try {
      const draft = JSON.parse(rawDraft) as CompraDraftFromProject;
      if (!draft?.projecteCodi || !draft?.concepte) return;
      setEditingGasto(null);
      setTipusSeleccionat(null);
      setTipusDocumentInicial('factura');
      setDraftInicial(draft);
      setAlbaransInicials(draft.albaraCodis || []);
      setShowModal(false);
      setShowTipusModal(true);
    } catch {
      // Ignore invalid draft payloads.
    }
  }, []);

  const getEstatIcon = (estat: EstatGasto) => {
    switch (estat) {
      case 'vencuda': return <AlertCircle size={18} color="var(--color-error-dark)" />;
      case 'pendent': return <Clock size={18} color="var(--color-warning)" />;
      case 'pagada-parcial': return <Clock size={18} color="var(--color-info)" />;
      case 'pagada': return <CheckCircle size={18} color="var(--color-success)" />;
    }
  };

  const getNextCode = (tipus: 'factura-compra' | 'gasto-general') => {
    const filtered = gastos.filter(g => g.tipus === tipus);
    const prefix = tipus === 'factura-compra' ? 'FAC' : 'DG';
    const defaultCode = `${prefix}-00001`;
    if (filtered.length === 0) return defaultCode;
    const maxNum = Math.max(...filtered.map(g => parseInt(g.codi.split('-')[1]) || 0));
    return `${prefix}-${String(maxNum + 1).padStart(5, '0')}`;
  };

  const vistaToggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    cursor: 'pointer',
    background: active ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
    color: active ? 'white' : 'var(--color-text-secondary)',
  });

  return (
    <div>
      {/* DASHBOARD DE MÉTRICAS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {(() => {
          const G_GREEN = 'linear-gradient(135deg, #059669, #10b981, #34d399)';
          const G_AMBER = 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)';
          const G_RED   = 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)';
          const gSpan = (v: React.ReactNode, g: string) => (
            <span style={{ background: g, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{v}</span>
          );
          return (<>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_AMBER }} />
              <div className="stat-card-body" style={{ padding: '1.5rem' }}>
                <div className="stat-card-label">💸 Pendent de Pagament</div>
                <div className="stat-card-value">{gSpan(formatCurrency(metricas.totalPendent), G_AMBER)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_RED }} />
              <div className="stat-card-body" style={{ padding: '1.5rem' }}>
                <div className="stat-card-label">🔴 Vençudes</div>
                <div className="stat-card-value">{gSpan(metricas.numVencudes, G_RED)}</div>
                <div className="stat-card-sub">{formatCurrency(metricas.importVencudes)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_GREEN }} />
              <div className="stat-card-body" style={{ padding: '1.5rem' }}>
                <div className="stat-card-label">✅ Pagat Aquest Mes</div>
                <div className="stat-card-value">{gSpan(formatCurrency(metricas.pagatMes), G_GREEN)}</div>
              </div>
            </div>
          </>);
        })()}

        <div style={{ background: 'var(--color-bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>📦 Exportar Documents (ZIP)</div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {(['trimestre', 'any'] as const).map(mode => (
              <button key={mode} onClick={() => setExportMode(mode)} style={{ flex: 1, padding: '0.3rem', fontSize: '0.78rem', fontWeight: 600, border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', background: exportMode === mode ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)', color: exportMode === mode ? 'white' : 'var(--color-text-secondary)' }}>
                {mode === 'trimestre' ? 'Trimestre' : 'Any'}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: exportMode === 'trimestre' ? '1fr 1fr' : '1fr', gap: '0.4rem' }}>
            <select value={exportAny} onChange={(e) => setExportAny(e.target.value)} className="form-input" style={{ fontSize: '0.85rem' }}>
              {exportYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {exportMode === 'trimestre' && (
              <select value={exportQ} onChange={(e) => setExportQ(e.target.value)} className="form-input" style={{ fontSize: '0.85rem' }}>
                <option value="Q1">T1 (Gen–Mar)</option>
                <option value="Q2">T2 (Abr–Jun)</option>
                <option value="Q3">T3 (Jul–Set)</option>
                <option value="Q4">T4 (Oct–Des)</option>
              </select>
            )}
          </div>
          <button className="btn-secondary" onClick={() => exportMode === 'trimestre' ? exportarFacturesTrimestre(exportAny, exportQ, gastos, proveidors, obligacionsFiscals) : exportarFacturesAny(exportAny, gastos, proveidors, obligacionsFiscals)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem', justifyContent: 'center' }}>
            <Download size={16} /> Descarregar ZIP
          </button>
        </div>
      </div>

      {/* VISTA TOGGLE + FILTROS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <button style={vistaToggleStyle(vista === 'factures')} onClick={() => setVista('factures')}>📄 Factures i Despeses</button>
        <button style={vistaToggleStyle(vista === 'albarans')} onClick={() => setVista('albarans')}>📦 Albarans de Compra</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {vista === 'factures' ? (
          <>
            <select value={filterTipus} onChange={(e) => setFilterTipus(e.target.value as any)} className="form-input" style={{ width: '175px', fontSize: '0.85rem' }}>
              <option value="tots">Tots els tipus</option>
              <option value="factura-compra">📄 Factures</option>
              <option value="gasto-general">💳 Despeses Generals</option>
            </select>
            <select value={filterTipusDocument} onChange={(e) => setFilterTipusDocument(e.target.value as any)} className="form-input" style={{ width: '185px', fontSize: '0.85rem' }}>
              <option value="tots">Tots documents</option>
              <option value="factura">Factura</option>
              <option value="factura_simplificada">Factura simpl.</option>
            </select>
            <select value={filterEstat} onChange={(e) => setFilterEstat(e.target.value as any)} className="form-input" style={{ width: '140px', fontSize: '0.85rem' }}>
              <option value="tots">Tots els estats</option>
              <option value="pendent">Pendent</option>
              <option value="pagada-parcial">Pagada Parcial</option>
              <option value="pagada">Pagada</option>
              <option value="vencuda">Vençuda</option>
            </select>
            <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)} className="form-input" style={{ width: '150px', fontSize: '0.85rem' }}>
              <option value="tots">Totes categories</option>
              {CATEGORIES_GASTO_GENERAL.map(cat => (
                <option key={cat.codi} value={cat.codi}>{cat.icon} {cat.nom}</option>
              ))}
            </select>
          </>
        ) : (
          <select value={filterEstatAlbara} onChange={(e) => setFilterEstatAlbara(e.target.value as any)} className="form-input" style={{ width: '180px', fontSize: '0.85rem' }}>
            <option value="tots">Tots els estats</option>
            <option value="pendent-factura">Pendent de factura</option>
            <option value="factura-vinculada">Factura vinculada</option>
            <option value="pagat">Pagat</option>
          </select>
        )}

        <select value={filterTipusProveidor} onChange={(e) => setFilterTipusProveidor(e.target.value as any)} className="form-input" style={{ width: '175px', fontSize: '0.85rem' }}>
          <option value="tots">Tots els proveïdors</option>
          <option value="Proveïdor">📦 Proveïdor</option>
          <option value="Acreedor">🏢 Acreedor</option>
        </select>

        <div style={{ width: '160px' }}>
          <SearchableSelect
            value={filterProveidor}
            onChange={(value) => setFilterProveidor(value || '')}
            options={[{ value: '', label: 'Tots proveïdors' }, ...proveidors.map(p => ({ value: p.codi, label: p.nomComercial }))]}
            placeholder="Proveïdor..."
          />
        </div>

        <input type="month" value={filterMes} onChange={(e) => setFilterMes(e.target.value)} className="form-input" placeholder="Mes..." style={{ width: '140px', fontSize: '0.85rem' }} />

        <div style={{ flex: 1 }} />

        {vista === 'factures' && (
          <button className="btn-primary" onClick={() => { setEditingGasto(null); setTipusDocumentInicial('factura'); setDraftInicial(null); setAlbaransInicials([]); setShowTipusModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Nova Factura / Despesa
          </button>
        )}
      </div>

      {/* TABLA */}
      <div className="placeholder-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              {vista === 'factures' ? (
                <>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Tipus</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Estat</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Codi</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Núm. Factura</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Proveïdor/Categoria</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Data</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Base Total</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Pendent</th>
                </>
              ) : (
                <>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Estat</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Codi</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Factura</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Proveïdor</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Projecte</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Tipus</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Data creació</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Import (est.)</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {vista === 'factures' ? (
              gastosFiltrats.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                    No hi ha factures o despeses. Fes clic a "Nova Factura / Despesa" per afegir-ne.
                  </td>
                </tr>
              ) : (
                gastosFiltrats.map((gasto) => {
                  let displayInfo = '-';
                  let tipusInfo = gasto.tipus === 'factura-compra' ? 'Factura' : 'Despesa';
                  if (gasto.tipus === 'factura-compra') {
                    const factura = gasto as FacturaCompra;
                    const proveidor = factura.proveidor ? proveidors.find(p => p.codi === factura.proveidor) : undefined;
                    tipusInfo = TIPUS_DOCUMENT_LABELS[getTipusDocument(factura)];
                    displayInfo = proveidor?.nomComercial || proveidor?.nomFiscal || factura.emissorNom || '-';
                  } else if (gasto.tipus === 'gasto-general') {
                    const categoria = CATEGORIES_GASTO_GENERAL.find(c => c.codi === gasto.categoria);
                    displayInfo = categoria ? `${categoria.icon} ${categoria.nom}` : '-';
                  }
                  return (
                    <tr key={gasto.codi} title={tipusInfo} style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }} className="table-row-hover" onClick={() => setEditingGasto(gasto)}>
                      <td style={{ padding: '0.75rem', fontSize: '0.82rem', fontWeight: 600 }}>{tipusInfo}</td>
                      <td style={{ padding: '0.75rem' }}>{getEstatIcon(gasto.estat)}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{gasto.codi}</td>
                      <td style={{ padding: '0.75rem' }}>{gasto.tipus === 'factura-compra' ? (gasto.numFacturaProveidor || '-') : '-'}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{displayInfo}</td>
                      <td style={{ padding: '0.75rem' }}>{gasto.dataGasto}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{formatCurrency(gasto.baseImposable)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(gasto.totalGasto)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: Math.round(gasto.pendentPagament * 100) / 100 > 0 ? 'var(--color-error-dark)' : 'var(--color-success)' }}>
                        {formatCurrency(Math.round(gasto.pendentPagament * 100) / 100)}
                      </td>
                    </tr>
                  );
                })
              )
            ) : (
              albaransFiltrats.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                    No hi ha albarans de compra registrats.
                  </td>
                </tr>
              ) : (
                albaransFiltrats.map(a => {
                  const prov = proveidors.find(p => p.codi === a.proveidorCodi);
                  const provNom = prov?.nomComercial || prov?.nomFiscal || a.proveidorCodi;
                  const importVal = albaraImport(a);
                  const ei = albaraEstatInfo(a.estat);
                  const serveiNom = parametres?.serveis.find(s => s.codi === a.serveiCodi)?.nom || a.serveiNom || a.serveiCodi || '';
                  const materialNom = parametres?.materials.find(m => m.codi === a.materialCodi)?.material || a.materialNom || a.materialCodi || '';
                  const tipusLabel = a.tipusLinia === 'rrhh'
                    ? `RRHH · ${serveiNom}`
                    : `Material · ${materialNom}`;
                  return (
                    <tr key={a.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: ei.color + '22', color: ei.color }}>
                          {ei.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600 }}>{a.codi}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.82rem', color: a.facturaCodi ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                        {a.facturaCodi || '—'}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>{provNom}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                        {projectes.find(p => p.codi === a.projecteCodi)?.titol || a.projecteCodi}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        <div>{tipusLabel}</div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{a.dataCreacio}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                        {formatCurrency(importVal)}
                      </td>
                    </tr>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </div>

      {/* MODALES */}
      {showTipusModal && (
        <TipusGastoModal
          onClose={() => { setShowTipusModal(false); setDraftInicial(null); setAlbaransInicials([]); }}
          onSelect={seleccionarTipus}
          compraOnly={!!draftInicial}
        />
      )}

      {((showModal && tipusSeleccionat === 'gasto-general') || (editingGasto?.tipus === 'gasto-general')) && (
        <GastoGeneralModal
          onClose={() => { setShowModal(false); setTipusSeleccionat(null); setTipusDocumentInicial('factura'); setDraftInicial(null); setAlbaransInicials([]); setEditingGasto(null); }}
          onSave={(gasto) => {
            const existeix = gastos.some(g => g.codi === gasto.codi);
            if (existeix) saveGastos(gastos.map(g => g.codi === gasto.codi ? gasto : g));
            else saveGastos([...gastos, gasto]);
          }}
          onDelete={handleDeleteGasto}
          nextCode={getNextCode('gasto-general')}
          editingGasto={editingGasto?.tipus === 'gasto-general' ? editingGasto : null}
        />
      )}

      {((showModal && tipusSeleccionat === 'factura-compra') || (editingGasto?.tipus === 'factura-compra')) && (
        <FacturaCompraModal
          onClose={() => { setShowModal(false); setTipusSeleccionat(null); setTipusDocumentInicial('factura'); setDraftInicial(null); setAlbaransInicials([]); setEditingGasto(null); }}
          onSave={(factura) => {
            const existeix = gastos.some(g => g.codi === factura.codi);
            if (existeix) saveGastos(gastos.map(g => g.codi === factura.codi ? factura : g));
            else saveGastos([...gastos, factura]);
          }}
          onDelete={handleDeleteGasto}
          nextCode={getNextCode('factura-compra')}
          proveidors={proveidors}
          projectes={projectes}
          initialTipusDocument={tipusDocumentInicial}
          initialAlbaraCodis={albaransInicials}
          initialDraft={draftInicial}
          editingFactura={editingGasto?.tipus === 'factura-compra' ? editingGasto : null}
        />
      )}
    </div>
  );
}
