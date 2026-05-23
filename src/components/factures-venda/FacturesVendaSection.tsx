import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileCode } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenta';
import FacturaVendaStats from './FacturaVendaStats';
import FacturaVendaTable from './FacturaVendaTable';
import FacturaVendaModal from './FacturaVendaModal';
import RectificativaModal from './RectificativaModal';
import SearchableSelect from '../common/SearchableSelect';
import { registrarFacturaDesvinculada } from '../../utils/projecteHistorial';
import { useFacturesVenda } from './hooks/useFacturesVenda';
import { exportarFacturesExcel, exportarFacturesXML } from './utils/facturaExport';
import { generarFacturaRectificativa, validarCrearRectificativa } from './utils/facturaRectificativa';
import { storage } from '../../utils/storageManager';

export default function FacturesVendaSection() {
  const { factures, clients, projectes, parametres, saveFactures, deleteFactura } = useFacturesVenda();
  
  const [showModal, setShowModal] = useState(false);
  const [editingFactura, setEditingFactura] = useState<FacturaVenta | null>(null);
  const [showRectificativaModal, setShowRectificativaModal] = useState(false);
  const [facturaPerRectificar, setFacturaPerRectificar] = useState<FacturaVenta | null>(null);
  
  const [filtreEstat, setFiltreEstat] = useState<'totes' | 'pendent' | 'cobrades'>('pendent');
  const [filterClient, setFilterClient] = useState('');
  const [filterMes, setFilterMes] = useState('');

  // Escuchar navegación desde otras secciones
  useEffect(() => {
    if (factures.length === 0) return;
    
    const navigateTo = storage.getNavigateTo();
    if (navigateTo) {
      if (navigateTo.type === 'factura' && navigateTo.codi) {
        const factura = factures.find(f => f.codi === navigateTo.codi);
        if (factura) {
          setTimeout(() => {
            setEditingFactura(factura);
            setShowModal(true);
          }, 100);
        }
      }
      storage.deleteNavigateTo();
    }
  }, [factures]);

  // Eliminar factura con validación
  const handleDeleteFactura = (codi: string) => {
    const factura = factures.find(f => f.codi === codi);
    if (!factura) return;

    if (factura.estat !== 'borrador') {
      alert('No es pot eliminar una factura que ja s\'ha enviat.');
      return;
    }

    if (factura.pagaments.length > 0) {
      alert('No es pot eliminar una factura amb pagaments registrats.');
      return;
    }

    if (!confirm('Estàs segur que vols eliminar aquesta factura?')) {
      return;
    }

    // Si tiene proyecto asociado, desbloquear el proyecto
    if (factura.projecte) {
      const projecte = projectes.find(p => p.codi === factura.projecte);
      if (projecte) {
        const projecteAmbHistorial = registrarFacturaDesvinculada(
          projecte,
          factura.codi
        );
        
        const updatedProjecte = {
          ...projecteAmbHistorial,
          estat: 'esperant_feedback' as const,
          facturaAssociada: undefined
        };
        
        const updatedProjectes = projectes.map(p => 
          p.codi === projecte.codi ? updatedProjecte : p
        );
        storage.setProjectes(updatedProjectes);
      }
    }

    deleteFactura(codi);
  };

  // Crear factura rectificativa
  const handleCrearRectificativa = (factura: FacturaVenta) => {
    const validation = validarCrearRectificativa(factura, factures);
    
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setFacturaPerRectificar(factura);
    setShowRectificativaModal(true);
  };

  // Confirmar creación de rectificativa
  const handleConfirmarRectificativa = (motivo: string) => {
    if (!facturaPerRectificar) return;

    const nouCodi = getNextCode();
    const facturaRectificativa = generarFacturaRectificativa(
      facturaPerRectificar,
      nouCodi,
      motivo
    );

    // Guardar nueva factura rectificativa
    saveFactures([...factures, facturaRectificativa]);

    // Cerrar modal y abrir la nueva factura
    setShowRectificativaModal(false);
    setFacturaPerRectificar(null);
    
    // Abrir modal de edición de la rectificativa
    setTimeout(() => {
      setEditingFactura(facturaRectificativa);
      setShowModal(true);
    }, 100);
  };

  // Filtrar factures
  const facturesFiltrades = factures
    .filter(factura => {
      if (filtreEstat === 'pendent') {
        if (!['borrador', 'enviada', 'pagada-parcial', 'vencuda'].includes(factura.estat)) {
          return false;
        }
      }
      if (filtreEstat === 'cobrades') {
        if (factura.estat !== 'pagada') {
          return false;
        }
      }
      
      if (filterClient && factura.client !== filterClient) {
        return false;
      }
      
      if (filterMes && !factura.dataFactura.startsWith(filterMes)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      const numA = parseInt(a.codi.split('-')[1]);
      const numB = parseInt(b.codi.split('-')[1]);
      return numB - numA;
    });

  // Generar próximo código
  const getNextCode = () => {
    if (factures.length === 0) return 'FAV-00235';
    const lastCode = Math.max(...factures.map(f => parseInt(f.codi.split('-')[1])));
    return `FAV-${String(lastCode + 1).padStart(5, '0')}`;
  };

  return (
    <div>
      {/* Stats Cards */}
      <FacturaVendaStats factures={factures} clients={clients} />

      {/* FILTROS Y ACCIONES */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        marginTop: '2rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <select
          value={filtreEstat}
          onChange={(e) => setFiltreEstat(e.target.value as any)}
          className="form-input"
          style={{ width: '140px', fontSize: '0.85rem' }}
        >
          <option value="totes">Tots els estats</option>
          <option value="pendent">Pendent cobro</option>
          <option value="cobrades">Cobrades</option>
        </select>

        <div style={{ width: '160px' }}>
          <SearchableSelect
            value={filterClient}
            onChange={(value) => setFilterClient(value || '')}
            options={[
              { value: '', label: 'Tots els clients' },
              ...clients.map(c => ({
                value: c.codi,
                label: c.nomComercial || c.nomFiscal
              }))
            ]}
            placeholder="Client..."
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

        {/* Botones de export */}
        {facturesFiltrades.length > 0 && (
          <>
            <button
              className="btn-secondary"
              onClick={() => exportarFacturesExcel(facturesFiltrades, clients)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}
              title="Exportar factures filtrades a Excel"
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>

            <button
              className="btn-secondary"
              onClick={() => exportarFacturesXML(facturesFiltrades, clients, parametres?.dadesEmpresa)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}
              title="Exportar factures filtrades a XML"
            >
              <FileCode size={16} />
              XML
            </button>
          </>
        )}

        <button 
          className="btn-primary"
          onClick={() => {
            setEditingFactura(null);
            setShowModal(true);
          }}
        >
          Nova Factura
        </button>
      </div>

      {/* Tabla */}
      <FacturaVendaTable 
        factures={facturesFiltrades}
        clients={clients}
        projectes={projectes}
        onEdit={(factura) => {
          setEditingFactura(factura);
          setShowModal(true);
        }}
        onCrearRectificativa={handleCrearRectificativa}
      />

      {/* Modal */}
      {showModal && (
        <FacturaVendaModal
          onClose={() => {
            setShowModal(false);
            setEditingFactura(null);
          }}
          onSave={(factura) => {
            const existeix = factures.some(f => f.codi === factura.codi);
            if (existeix) {
              saveFactures(factures.map(f => f.codi === factura.codi ? factura : f));
            } else {
              saveFactures([...factures, factura]);
            }
          }}
          onDelete={handleDeleteFactura}
          nextCode={getNextCode()}
          clients={clients}
          projectes={projectes}
          plantilles={parametres?.plantilles || []}
          editingFactura={editingFactura}
          allFactures={factures}
        />
      )}

      {/* Modal Rectificativa */}
      {showRectificativaModal && facturaPerRectificar && (
        <RectificativaModal
          factura={facturaPerRectificar}
          onClose={() => {
            setShowRectificativaModal(false);
            setFacturaPerRectificar(null);
          }}
          onCreate={handleConfirmarRectificativa}
        />
      )}
    </div>
  );
}