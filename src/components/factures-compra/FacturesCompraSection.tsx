import React, { useState } from 'react';
import { Download } from 'lucide-react';
import type { TipusGasto, EstatGasto } from '../../types/facturaCompra';
import { CATEGORIES_GASTO_GENERAL } from '../../types/facturaCompra';
import SearchableSelect from '../common/SearchableSelect';
import TipusGastoModal from './TipusGastoModal';
import GastoGeneralModal from './GastoGeneralModal';
import FacturaCompraModal from './FacturaCompraModal';
import { useFacturesData } from './hooks/useFacturesData';
import { useFacturesMetrics } from './hooks/useFacturesMetrics';
import { exportarFacturesMes } from './utils/facturesExport';
import { formatCurrency } from './utils/facturesCalculations';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function FacturesCompraSection() {
  const { gastos, proveidors, projectes, saveGastos, deleteGasto } = useFacturesData();
  const metricas = useFacturesMetrics(gastos);

  const [showTipusModal, setShowTipusModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tipusSeleccionat, setTipusSeleccionat] = useState<TipusGasto | null>(null);
  const [editingGasto, setEditingGasto] = useState<any | null>(null);
  
  const [filterTipus, setFilterTipus] = useState<'tots' | TipusGasto>('tots');
  const [filterEstat, setFilterEstat] = useState<'tots' | EstatGasto>('tots');
  const [filterMes, setFilterMes] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('tots');
  const [filterProveidor, setFilterProveidor] = useState('');
  const [mesExport, setMesExport] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const gastosFiltrats = gastos
    .filter(gasto => {
      if (filterTipus !== 'tots' && gasto.tipus !== filterTipus) return false;
      if (filterEstat !== 'tots' && gasto.estat !== filterEstat) return false;
      if (filterMes && !gasto.dataGasto.startsWith(filterMes)) return false;
      
      if (filterCategoria !== 'tots') {
        if (gasto.tipus !== 'gasto-general' || gasto.categoria !== filterCategoria) {
          return false;
        }
      }
      
      if (filterProveidor) {
        if (gasto.tipus !== 'factura-compra' || gasto.proveidor !== filterProveidor) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.dataGasto).getTime();
      const dateB = new Date(b.dataGasto).getTime();
      
      if (dateA !== dateB) return dateB - dateA;
      
      const numA = parseInt(a.codi.split('-')[1]);
      const numB = parseInt(b.codi.split('-')[1]);
      return numB - numA;
    });

  const seleccionarTipus = (tipus: TipusGasto) => {
    setTipusSeleccionat(tipus);
    setShowTipusModal(false);
    setShowModal(true);
  };

  const getEstatIcon = (estat: EstatGasto) => {
    switch (estat) {
      case 'vencuda': return <AlertCircle size={18} color="#dc2626" />;
      case 'pendent': return <Clock size={18} color="#f59e0b" />;
      case 'pagada-parcial': return <Clock size={18} color="#3b82f6" />;
      case 'pagada': return <CheckCircle size={18} color="#10b981" />;
    }
  };

  const getNextCode = (tipus: TipusGasto) => {
    const filtered = gastos.filter(g => g.tipus === tipus);
    if (filtered.length === 0) {
      return tipus === 'factura-compra' ? 'FAC-00001' : 'DG-00001';
    }
    const maxNum = Math.max(...filtered.map(g => parseInt(g.codi.split('-')[1])));
    const prefix = tipus === 'factura-compra' ? 'FAC' : 'DG';
    return `${prefix}-${String(maxNum + 1).padStart(5, '0')}`;
  };

  return (
    <div>
      {/* DASHBOARD DE MÉTRICAS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #f59e0b'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            💸 Pendent de Pagament
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
            {formatCurrency(metricas.totalPendent)}
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #dc2626'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            🔴 Vençudes
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626' }}>
            {metricas.numVencudes}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
            {formatCurrency(metricas.importVencudes)}
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #10b981'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            ✅ Pagat Aquest Mes
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>
            {formatCurrency(metricas.pagatMes)}
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            📦 Exportar Mes
          </div>
          <input
            type="month"
            value={mesExport}
            onChange={(e) => setMesExport(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.85rem' }}
          />
          <button
            className="btn-secondary"
            onClick={() => exportarFacturesMes(mesExport, gastos, proveidors)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.85rem',
              padding: '0.5rem'
            }}
          >
            <Download size={16} />
            ZIP
          </button>
        </div>
      </div>

      {/* FILTROS Y ACCIONES */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <select
          value={filterTipus}
          onChange={(e) => setFilterTipus(e.target.value as any)}
          className="form-input"
          style={{ width: '140px', fontSize: '0.85rem' }}
        >
          <option value="tots">Tots els tipus</option>
          <option value="factura-compra">📄 Factures</option>
          <option value="gasto-general">💳 Despeses Generals</option>
        </select>

        <select
          value={filterEstat}
          onChange={(e) => setFilterEstat(e.target.value as any)}
          className="form-input"
          style={{ width: '140px', fontSize: '0.85rem' }}
        >
          <option value="tots">Tots els estats</option>
          <option value="pendent">Pendent</option>
          <option value="pagada-parcial">Pagada Parcial</option>
          <option value="pagada">Pagada</option>
          <option value="vencuda">Vençuda</option>
        </select>

        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="form-input"
          style={{ width: '150px', fontSize: '0.85rem' }}
        >
          <option value="tots">Totes categories</option>
          {CATEGORIES_GASTO_GENERAL.map(cat => (
            <option key={cat.codi} value={cat.codi}>
              {cat.icon} {cat.nom}
            </option>
          ))}
        </select>

        <div style={{ width: '160px' }}>
          <SearchableSelect
            value={filterProveidor}
            onChange={(value) => setFilterProveidor(value || '')}
            options={[
              { value: '', label: 'Tots proveïdors' },
              ...proveidors.map(p => ({
                value: p.codi,
                label: p.nomComercial
              }))
            ]}
            placeholder="Proveïdor..."
          />
        </div>

        <input
          type="month"
          value={filterMes}
          onChange={(e) => setFilterMes(e.target.value)}
          className="form-input"
          placeholder="Mes..."
          style={{ width: '140px', fontSize: '0.85rem' }}
        />

        <div style={{ flex: 1 }} />

        <button
          className="btn-primary"
          onClick={() => {
            setEditingGasto(null);
            setShowTipusModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Nova Factura / Despesa
        </button>
      </div>

      {/* TABLA */}
      <div className="placeholder-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Tipus</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Estat</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Codi</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Núm. Factura</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Proveïdor/Categoria</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Data</th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total</th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Pendent</th>
            </tr>
          </thead>
          <tbody>
            {gastosFiltrats.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                  No hi ha factures o despeses. Fes clic a "Nova Factura / Despesa" per afegir-ne.
                </td>
              </tr>
            ) : (
              gastosFiltrats.map((gasto) => {
                let displayInfo = '-';
                
                if (gasto.tipus === 'factura-compra') {
                  const proveidor = proveidors.find(p => p.codi === gasto.proveidor);
                  displayInfo = proveidor?.nomComercial || '-';
                } else {
                  const categoria = CATEGORIES_GASTO_GENERAL.find(c => c.codi === gasto.categoria);
                  displayInfo = categoria ? `${categoria.icon} ${categoria.nom}` : '-';
                }
              
                return (
                  <tr
                    key={gasto.codi}
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                    className="table-row-hover"
                    onClick={() => setEditingGasto(gasto)}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      {gasto.tipus === 'factura-compra' ? '📄' : '💳'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {getEstatIcon(gasto.estat)}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                      {gasto.codi}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {gasto.tipus === 'factura-compra' ? (gasto.numFacturaProveidor || '-') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      {displayInfo}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {gasto.dataGasto}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(gasto.totalGasto)}
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      textAlign: 'right',
                      fontWeight: 600,
                      color: gasto.pendentPagament > 0 ? '#dc2626' : '#10b981'
                    }}>
                      {formatCurrency(gasto.pendentPagament)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODALES */}
      {showTipusModal && (
        <TipusGastoModal
          onClose={() => setShowTipusModal(false)}
          onSelect={seleccionarTipus}
        />
      )}

      {((showModal && tipusSeleccionat === 'gasto-general') || (editingGasto?.tipus === 'gasto-general')) && (
        <GastoGeneralModal
          onClose={() => {
            setShowModal(false);
            setTipusSeleccionat(null);
            setEditingGasto(null);
          }}
          onSave={(gasto) => {
            const existeix = gastos.some(g => g.codi === gasto.codi);
            if (existeix) {
              saveGastos(gastos.map(g => g.codi === gasto.codi ? gasto : g));
            } else {
              saveGastos([...gastos, gasto]);
            }
          }}
          onDelete={deleteGasto}
          nextCode={getNextCode('gasto-general')}
          editingGasto={editingGasto?.tipus === 'gasto-general' ? editingGasto : null}
        />
      )}

      {((showModal && tipusSeleccionat === 'factura-compra') || (editingGasto?.tipus === 'factura-compra')) && (
        <FacturaCompraModal
          onClose={() => {
            setShowModal(false);
            setTipusSeleccionat(null);
            setEditingGasto(null);
          }}
          onSave={(factura) => {
            const existeix = gastos.some(g => g.codi === factura.codi);
            if (existeix) {
              saveGastos(gastos.map(g => g.codi === factura.codi ? factura : g));
            } else {
              saveGastos([...gastos, factura]);
            }
          }}
          onDelete={deleteGasto}
          nextCode={getNextCode('factura-compra')}
          proveidors={proveidors}
          projectes={projectes}
          editingFactura={editingGasto?.tipus === 'factura-compra' ? editingGasto : null}
        />
      )}
    </div>
  );
}