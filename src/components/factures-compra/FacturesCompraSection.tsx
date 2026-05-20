import React, { useState, useEffect } from 'react';
import { Download, Plus, Receipt, CreditCard, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Gasto, FacturaCompra, GastoGeneral, EstatGasto, TipusGasto } from '../../types/facturaCompra';
import type { Proveidor } from '../../types/proveidor';
import TipusGastoModal from './TipusGastoModal';
import GastoGeneralModal from './GastoGeneralModal';
import FacturaCompraModal from './FacturaCompraModal';
import type { Projecte } from '../../types/projecte';
import { CATEGORIES_GASTO_GENERAL } from '../../types/facturaCompra';
import SearchableSelect from '../common/SearchableSelect';

export default function FacturesCompraSection() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [showTipusModal, setShowTipusModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tipusSeleccionat, setTipusSeleccionat] = useState<TipusGasto | null>(null);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  
  // Filtros
  const [filterTipus, setFilterTipus] = useState<'tots' | TipusGasto>('tots');
  const [filterEstat, setFilterEstat] = useState<'tots' | EstatGasto>('tots');
  const [filterMes, setFilterMes] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('tots');
  const [filterProveidor, setFilterProveidor] = useState('');
  const [mesExport, setMesExport] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Cargar datos
  useEffect(() => {
    const savedGastos = localStorage.getItem('plateaGastos');
    if (savedGastos) setGastos(JSON.parse(savedGastos));
    
    const savedProveidors = localStorage.getItem('plateaProveidors');
    if (savedProveidors) setProveidors(JSON.parse(savedProveidors));
    
    const savedProjectes = localStorage.getItem('plateaProjectes');
    if (savedProjectes) setProjectes(JSON.parse(savedProjectes));
  }, []);

  // Guardar gastos
  const saveGastos = (newGastos: Gasto[]) => {
    setGastos(newGastos);
    localStorage.setItem('plateaGastos', JSON.stringify(newGastos));
  };

  // Eliminar gasto
const deleteGasto = (codi: string) => {
  saveGastos(gastos.filter(g => g.codi !== codi));
};

  // Calcular métricas
  const calcularMetricas = () => {
    const avui = new Date();
    const mesActual = `${avui.getFullYear()}-${String(avui.getMonth() + 1).padStart(2, '0')}`;
    
    let totalPendent = 0;
    let numVencudes = 0;
    let importVencudes = 0;
    let pagatMes = 0;

    gastos.forEach(gasto => {
      // Total pendent
      if (gasto.pendentPagament > 0) {
        totalPendent += gasto.pendentPagament;
      }

      // Vencudes
      if (gasto.estat === 'vencuda') {
        numVencudes++;
        importVencudes += gasto.pendentPagament;
      }

      // Pagat aquest mes
      gasto.pagaments.forEach(pag => {
        if (pag.data.startsWith(mesActual)) {
          pagatMes += pag.import;
        }
      });
    });

    return { totalPendent, numVencudes, importVencudes, pagatMes };
  };

  const metricas = calcularMetricas();

  // Exportar ZIP
  const exportarFacturesMes = async () => {
    const gastosDelMes = gastos.filter(g => {
      const mesGasto = g.dataGasto.substring(0, 7);
      return mesGasto === mesExport && g.documentPDF;
    });

    if (gastosDelMes.length === 0) {
      alert('No hi ha factures amb PDF per aquest mes');
      return;
    }

    const zip = new JSZip();

    gastosDelMes.forEach(gasto => {
      let filename: string;
      if (gasto.tipus === 'factura-compra') {
        const proveidor = proveidors.find(p => p.codi === gasto.proveidor);
        numFacturaDisplay = gasto.numFacturaProveidor || '-';
        proveidorDisplay = proveidor?.nomComercial || '-';
      } else {
        filename = `${gasto.codi}_${gasto.concepte}.pdf`;
      }

      const base64Data = gasto.documentPDF!.split(',')[1];
      zip.file(filename, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const [any, mes] = mesExport.split('-');
    const mesNom = new Date(parseInt(any), parseInt(mes) - 1).toLocaleString('ca', { month: 'long', year: 'numeric' });
    saveAs(content, `Factures rebudes i despeses_${mesNom}.zip`);
  };

  // Filtrar gastos
  const gastosFiltrats = gastos
  .filter(gasto => {
    if (filterTipus !== 'tots' && gasto.tipus !== filterTipus) return false;
    if (filterEstat !== 'tots' && gasto.estat !== filterEstat) return false;
    if (filterMes && !gasto.dataGasto.startsWith(filterMes)) return false;
    
    // Filtro por categoría: solo mostrar gastos generales con esa categoría
    if (filterCategoria !== 'tots') {
      if (gasto.tipus !== 'gasto-general' || gasto.categoria !== filterCategoria) {
        return false;
      }
    }
    
    // Filtro por proveedor: solo mostrar facturas de compra con ese proveedor
    if (filterProveidor) {
      if (gasto.tipus !== 'factura-compra' || gasto.proveidor !== filterProveidor) {
        return false;
      }
    }
    
    return true;
  })

  .sort((a, b) => {
    // Primero por fecha (más recientes primero)
    const dateA = new Date(a.dataGasto).getTime();
    const dateB = new Date(b.dataGasto).getTime();
    
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    
    // Si misma fecha, ordenar por código
    const numA = parseInt(a.codi.split('-')[1]);
    const numB = parseInt(b.codi.split('-')[1]);
    return numB - numA;
  });

  // Seleccionar tipo
  const seleccionarTipus = (tipus: TipusGasto) => {
    setTipusSeleccionat(tipus);
    setShowTipusModal(false);
    setShowModal(true);
  };

// Formatear moneda
const formatCurrency = (value: number | undefined) => {
  return `${(value || 0).toFixed(2)}€`;
};

  // Obtener icono de estado
  const getEstatIcon = (estat: EstatGasto) => {
    switch (estat) {
      case 'vencuda': return <AlertCircle size={18} color="#dc2626" />;
      case 'pendent': return <Clock size={18} color="#f59e0b" />;
      case 'pagada-parcial': return <Clock size={18} color="#3b82f6" />;
      case 'pagada': return <CheckCircle size={18} color="#10b981" />;
    }
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
        {/* Total Pendent */}
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

        {/* Vençudes */}
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

        {/* Pagat Aquest Mes */}
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

        {/* Exportar ZIP */}
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
            onClick={exportarFacturesMes}
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
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Proveïdor/Acreedor</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Categoria</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Data</th>
    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total</th>
    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Pendent</th>
  </tr>
</thead>
          <tbody>
            {gastosFiltrats.length === 0 ? (
              <tr>
  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                  No hi ha factures o despeses. Fes clic a "Nova Factura / Despesa" per afegir-ne.
                </td>
              </tr>
            ) : (
              gastosFiltrats.map((gasto) => {
                // Preparar datos
                let numFacturaDisplay = '-';
                let categoriaDisplay = '-';
                let proveidorDisplay = '-';
              
                if (gasto.tipus === 'factura-compra') {
                  const proveidor = proveidors.find(p => p.codi === gasto.proveidor);
                  numFacturaDisplay = gasto.numFacturaProveidor || '-';
                  proveidorDisplay = proveidor?.nomComercial || '-';
                } else {
                  // Gasto general
                  const categoria = CATEGORIES_GASTO_GENERAL.find(c => c.codi === gasto.categoria);
                  categoriaDisplay = categoria ? `${categoria.icon} ${categoria.nom}` : '-';
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
                      {numFacturaDisplay}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {proveidorDisplay}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      {categoriaDisplay}
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

{/* MODAL TIPUS */}
{showTipusModal && (
  <TipusGastoModal
    onClose={() => setShowTipusModal(false)}
    onSelect={seleccionarTipus}
  />
)}

{/* MODAL GASTO GENERAL */}
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
    nextCode={
      gastos.filter(g => g.tipus === 'gasto-general').length === 0
        ? 'DG-00001'
        : `DG-${String(Math.max(...gastos.filter(g => g.tipus === 'gasto-general').map(g => parseInt(g.codi.split('-')[1]))) + 1).padStart(5, '0')}`
    }
    editingGasto={editingGasto?.tipus === 'gasto-general' ? editingGasto : null}
  />
)}

{/* MODAL FACTURA COMPRA */}
{((showModal && tipusSeleccionat === 'factura-compra') || (editingGasto?.tipus === 'factura-compra')) && (
  <FacturaCompraModal
    onClose={() => {
      setShowModal(false);
      setTipusSeleccionat(null);
      setEditingGasto(null);
    }}
    onSave={(factura) => {
      // Verificar si la factura ya existe (upsert)
      const existeix = gastos.some(g => g.codi === factura.codi);
      
      if (existeix) {
        saveGastos(gastos.map(g => g.codi === factura.codi ? factura : g));
      } else {
        saveGastos([...gastos, factura]);
      }
    }}
    onDelete={deleteGasto}
    nextCode={
      gastos.filter(g => g.tipus === 'factura-compra').length === 0
        ? 'FAC-00001'
        : `FAC-${String(Math.max(...gastos.filter(g => g.tipus === 'factura-compra').map(g => parseInt(g.codi.split('-')[1]))) + 1).padStart(5, '0')}`
    }
    proveidors={proveidors}
    projectes={projectes}
    editingFactura={editingGasto?.tipus === 'factura-compra' ? editingGasto : null}
  />
)}
</div>
  );
}