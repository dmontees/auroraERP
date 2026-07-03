import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileCode } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenta';
import FacturaVendaStats from './FacturaVendaStats';
import FacturaVendaTable from './FacturaVendaTable';
import FacturaVendaDetailView from './FacturaVendaDetailView';
import RectificativaModal from './RectificativaModal';
import SearchableSelect from '../common/SearchableSelect';
import { registrarFacturaDesvinculada } from '../../utils/projecteHistorial';
import { useFacturesVenda } from './hooks/useFacturesVenda';
import { exportarFacturesExcel, exportarFacturesXML } from './utils/facturaExport';
import { generarFacturaRectificativa, validarCrearRectificativa } from './utils/facturaRectificativa';
import { storage } from '../../utils/storageManager';

export default function FacturesVendaSection() {
  const { factures, clients, projectes, parametres, saveFactures, deleteFactura } = useFacturesVenda();

  // undefined = list view, null = nova factura, FacturaVenta = editar
  const [selectedFactura, setSelectedFactura] = useState<FacturaVenta | null | undefined>(undefined);
  const [showRectificativaModal, setShowRectificativaModal] = useState(false);
  const [facturaPerRectificar, setFacturaPerRectificar] = useState<FacturaVenta | null>(null);

  const [filtreEstat, setFiltreEstat] = useState<'totes' | 'pendent' | 'cobrades'>('pendent');
  const [filterClient, setFilterClient] = useState('');
  const [filterMes, setFilterMes] = useState('');

  // Escuchar navegació des d'altres seccions
  useEffect(() => {
    if (factures.length === 0) return;
    const navigateTo = storage.getNavigateTo();
    if (navigateTo?.type === 'factura' && navigateTo.codi) {
      const f = factures.find(fv => fv.codi === navigateTo.codi);
      if (f) setTimeout(() => setSelectedFactura(f), 100);
      storage.deleteNavigateTo();
    }
  }, [factures]);

  const getNextCode = () => {
    if (factures.length === 0) return 'FAV-00235';
    const last = Math.max(...factures.map(f => parseInt(f.codi.split('-')[1])));
    return `FAV-${String(last + 1).padStart(5, '0')}`;
  };

  const permetEliminarFacturesEmeses =
    storage.getSettings()?.opcionsDesenvolupador?.actiu === true &&
    storage.getSettings()?.opcionsDesenvolupador?.permetEliminarFacturesEmeses === true;

  const handleSave = (factura: FacturaVenta) => {
    const existeix = factures.some(f => f.codi === factura.codi);
    if (existeix) saveFactures(factures.map(f => f.codi === factura.codi ? factura : f));
    else saveFactures([...factures, factura]);
  };

  const handleDelete = (codi: string): boolean | undefined => {
    const factura = factures.find(f => f.codi === codi);
    if (!factura) return false;
    const esEliminacioExcepcional = factura.estat !== 'borrador' && permetEliminarFacturesEmeses && !storage.getVerifactuConfig().enabled;
    if (factura.estat !== 'borrador' && !esEliminacioExcepcional) {
      const verifactu = storage.getVerifactuConfig();
      const msg = verifactu.enabled
        ? 'No es pot eliminar una factura emesa. Verifactu requereix crear una factura rectificativa per corregir-la.'
        : 'No es pot eliminar una factura que ja s\'ha enviat.';
      alert(msg);
      return false;
    }
    if (factura.pagaments.length > 0) { alert('No es pot eliminar una factura amb pagaments registrats.'); return false; }
    if (esEliminacioExcepcional) {
      if (!confirm(`Estas a punt d'eliminar una factura emesa (${factura.codi}). Aquesta accio es excepcional i no es pot desfer. Vols continuar?`)) return false;
      const typed = prompt(`Escriu ${factura.codi} per confirmar l'eliminacio definitiva.`);
      if (typed !== factura.codi) return false;
    }
    if (!esEliminacioExcepcional && !confirm('Estàs segur que vols eliminar aquesta factura?')) return;
    if (factura.projecte) {
      const p = projectes.find(pr => pr.codi === factura.projecte);
      if (p) {
        const updated = { ...registrarFacturaDesvinculada(p, factura.codi), estat: 'esperant_feedback' as const, facturaAssociada: undefined };
        storage.setProjectes(projectes.map(pr => pr.codi === p.codi ? updated : pr));
      }
    }
    deleteFactura(codi);
    return true;
  };

  const handleCrearRectificativa = (factura: FacturaVenta) => {
    const v = validarCrearRectificativa(factura, factures);
    if (!v.valid) { alert(v.error); return; }
    setFacturaPerRectificar(factura);
    setShowRectificativaModal(true);
  };

  const handleConfirmarRectificativa = (motivo: string) => {
    if (!facturaPerRectificar) return;
    const nouCodi = getNextCode();
    const rectificativa = generarFacturaRectificativa(facturaPerRectificar, nouCodi, motivo);
    saveFactures([...factures, rectificativa]);
    setShowRectificativaModal(false);
    setFacturaPerRectificar(null);
    setTimeout(() => setSelectedFactura(rectificativa), 100);
  };

  const facturesFiltrades = factures
    .filter(f => {
      if (filtreEstat === 'pendent' && !['borrador', 'enviada', 'pagada-parcial', 'vencuda'].includes(f.estat)) return false;
      if (filtreEstat === 'cobrades' && f.estat !== 'pagada') return false;
      if (filterClient && f.client !== filterClient) return false;
      if (filterMes && !f.dataFactura.startsWith(filterMes)) return false;
      return true;
    })
    .sort((a, b) => parseInt(b.codi.split('-')[1]) - parseInt(a.codi.split('-')[1]));

  // ── VISTA DE DETALL ──
  if (selectedFactura !== undefined) {
    return (
      <>
        <FacturaVendaDetailView
          factura={selectedFactura}
          nextCode={getNextCode()}
          clients={clients}
          projectes={projectes}
          plantilles={parametres?.plantilles || []}
          allFactures={factures}
          onBack={() => setSelectedFactura(undefined)}
          onSave={handleSave}
          onDelete={handleDelete}
          onCrearRectificativa={handleCrearRectificativa}
        />
        {showRectificativaModal && facturaPerRectificar && (
          <RectificativaModal
            factura={facturaPerRectificar}
            onClose={() => { setShowRectificativaModal(false); setFacturaPerRectificar(null); }}
            onCreate={handleConfirmarRectificativa}
          />
        )}
      </>
    );
  }

  // ── VISTA DE LLISTA ──
  return (
    <div>
      <FacturaVendaStats factures={factures} clients={clients} />

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', marginTop: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtreEstat} onChange={e => setFiltreEstat(e.target.value as any)} className="form-input" style={{ width: '140px', fontSize: '0.85rem' }}>
          <option value="totes">Tots els estats</option>
          <option value="pendent">Pendent cobro</option>
          <option value="cobrades">Cobrades</option>
        </select>

        <div style={{ width: '160px' }}>
          <SearchableSelect
            value={filterClient}
            onChange={v => setFilterClient(v || '')}
            options={[{ value: '', label: 'Tots els clients' }, ...clients.map(c => ({ value: c.codi, label: c.nomComercial || c.nomFiscal }))]}
            placeholder="Client..."
          />
        </div>

        <input type="month" value={filterMes} onChange={e => setFilterMes(e.target.value)} className="form-input" style={{ width: '140px', fontSize: '0.85rem' }} />

        <div style={{ flex: 1 }} />

        {facturesFiltrades.length > 0 && (
          <>
            <button className="btn-excel" onClick={() => exportarFacturesExcel(facturesFiltrades, clients)} title="Exportar factures filtrades a Excel">
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button className="btn-secondary" onClick={() => exportarFacturesXML(facturesFiltrades, clients, parametres?.dadesEmpresa)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }} title="Exportar factures filtrades a XML">
              <FileCode size={16} /> XML
            </button>
          </>
        )}

        <button className="btn-primary" onClick={() => setSelectedFactura(null)}>
          Nova Factura
        </button>
      </div>

      <FacturaVendaTable
        factures={facturesFiltrades}
        clients={clients}
        projectes={projectes}
        onEdit={f => setSelectedFactura(f)}
        onCrearRectificativa={handleCrearRectificativa}
      />

      {showRectificativaModal && facturaPerRectificar && (
        <RectificativaModal
          factura={facturaPerRectificar}
          onClose={() => { setShowRectificativaModal(false); setFacturaPerRectificar(null); }}
          onCreate={handleConfirmarRectificativa}
        />
      )}
    </div>
  );
}
