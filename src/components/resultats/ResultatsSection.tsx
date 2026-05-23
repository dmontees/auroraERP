import React, { useState, useEffect } from 'react';
import { storage } from '../../utils/storageManager';
import FiltresGlobals from './FiltresGlobals';
import VisioGeneral from './tabs/VisioGeneral';
import { getUltimsXMesos } from '../../utils/resultatCalculs';
import type { Periode } from '../../utils/resultatCalculs';
import type { FacturaVenta } from '../../types/facturaVenda';
import type { Gasto } from '../../types/facturaCompra';
import type { Projecte } from '../../types/projecte';
import type { Client } from '../../types/client';
import AnalisiFinancera from './tabs/AnalisiFinancera';
import ProjectesRendibilitat from './tabs/ProjectesRendibilitat';
import AnalisiClients from './tabs/AnalisiClients';
import DespesesProveidors from './tabs/DespesesProveidors';
import type { Proveidor } from '../../types/proveidor';
import TemporalTendencies from './tabs/TemporalTendencies';
import FiscalTab from './tabs/FiscalTab';
import { ExportModal } from './ExportModal';
import type { ExportConfig } from './types';
import { Download } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportResultats';

export default function ResultatsSection() {
  // Estados de datos
  const [facturesVenda, setFacturesVenda] = useState<FacturaVenta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Estados de filtros
  const [periode, setPeriode] = useState<Periode>({
    dataInici: `${new Date().getFullYear()}-01-01`,
    dataFi: new Date().toISOString().split('T')[0]
  });  const [periodePreset, setPeriodePreset] = useState('aquest-any');
  const [clientSeleccionat, setClientSeleccionat] = useState('');
  const [projecteSeleccionat, setProjecteSeleccionat] = useState('');
  const [compararAmb, setCompararAmb] = useState('periode-anterior');

  // Estado de pestaña activa
  const [activeTab, setActiveTab] = useState<'visio' | 'financera' | 'projectes' | 'clients' | 'despeses' | 'temporal' | 'fiscal'>('visio');

    // Estado de proveedores
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);

  const [showExportModal, setShowExportModal] = useState(false);

  // Cargar datos
  useEffect(() => {
    const loadData = () => {
      setFacturesVenda(storage.getFacturesVenda());
      setGastos(storage.getFacturesCompra());
      setProjectes(storage.getProjectes());
      setClients(storage.getClients());
      setProveidors(storage.getProveidors());
    };
    loadData();
  }, []);

  // Filtrar datos por cliente y proyecto
  const facturesFiltrades = clientSeleccionat
    ? facturesVenda.filter(f => f.client === clientSeleccionat)
    : facturesVenda;

  const projectesFiltrats = projecteSeleccionat
    ? projectes.filter(p => p.codi === projecteSeleccionat)
    : clientSeleccionat
    ? projectes.filter(p => p.client === clientSeleccionat)
    : projectes;

    const handleExport = (config: ExportConfig) => {
      
      switch (config.format) {
        case 'csv':
          exportToCSV(config, periode, facturesVenda, gastos, projectes, clients, proveidors);
          break;
        case 'excel':
          exportToExcel(config, periode, facturesVenda, gastos, projectes, clients, proveidors);
          break;
        case 'pdf-executiu':
        case 'pdf-complet':
          exportToPDF(config, periode, facturesVenda, gastos, projectes);
          break;
      }
    };

  return (
    <div style={{ 
      padding: '0.5rem 2rem 2rem 2rem',
      maxWidth: '1600px', 
      margin: '0 auto' 
    }}>
      {/* Botó exportar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowExportModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Download size={18} />
          Descarregar Informe
        </button>
      </div>
  
     {/* Filtros globales */}
      <FiltresGlobals
        periode={periode}
        setPeriode={setPeriode}
        periodePreset={periodePreset}
        setPeriodePreset={setPeriodePreset}
        clientSeleccionat={clientSeleccionat}
        setClientSeleccionat={setClientSeleccionat}
        projecteSeleccionat={projecteSeleccionat}
        setProjecteSeleccionat={setProjecteSeleccionat}
        compararAmb={compararAmb}
        setCompararAmb={setCompararAmb}
        clients={clients}
        projectes={projectes}
      />

      {/* Pestañas */}
<div style={{
  display: 'flex',
  borderBottom: '2px solid var(--color-border)',
  marginBottom: '2rem',
  gap: '0.25rem',
}}>
  {[
    { id: 'visio', label: 'General' },
    { id: 'financera', label: 'Financera' },
    { id: 'projectes', label: 'Projectes' },
    { id: 'clients', label: 'Clients' },
    { id: 'despeses', label: 'Despeses' },
    { id: 'temporal', label: 'Tendències' },
    { id: 'fiscal', label: 'Fiscal 🧾' }
  ].map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id as any)}
      style={{
        padding: '0.5rem 1rem',
        background: 'transparent',
        border: 'none',
        borderBottom: activeTab === tab.id ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
        color: activeTab === tab.id ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
        fontWeight: activeTab === tab.id ? 600 : 400,
        cursor: 'pointer',
        marginBottom: '-2px',
        whiteSpace: 'nowrap',
        fontSize: '0.875rem'
      }}
    >
      {tab.label}
    </button>
  ))}
</div>

      {/* Contenido de pestañas */}
      {activeTab === 'visio' && (
        <VisioGeneral
          periode={periode}
          compararAmb={compararAmb}
          facturesVenda={facturesFiltrades}
          gastos={gastos}
          projectes={projectesFiltrats}
        />
      )}

      {activeTab === 'financera' && (
        <AnalisiFinancera
          periode={periode}
          facturesVenda={facturesFiltrades}
          gastos={gastos}
          projectes={projectes}
        />
      )}

      {activeTab === 'projectes' && (
        <ProjectesRendibilitat
          periode={periode}
          projectes={projectesFiltrats}
          facturesVenda={facturesFiltrades}
          clients={clients}
        />
      )}

      {activeTab === 'clients' && (
        <AnalisiClients
          periode={periode}
          clients={clients}
          projectes={projectesFiltrats}
          facturesVenda={facturesFiltrades}
        />
      )}

      {activeTab === 'despeses' && (
        <DespesesProveidors
          periode={periode}
          gastos={gastos}
          proveidors={proveidors}
          projectes={projectes}
        />
      )}

      {activeTab === 'temporal' && (
        <TemporalTendencies
          periode={periode}
          facturesVenda={facturesFiltrades}
          gastos={gastos}
          projectes={projectesFiltrats}
        />
      )}

      {activeTab === 'fiscal' && (
        <FiscalTab
          facturesVenda={facturesVenda}
          gastos={gastos}
          any={new Date(periode.dataInici).getFullYear()}
        />
      )}

      {!['visio', 'financera', 'projectes', 'clients', 'despeses', 'temporal', 'fiscal'].includes(activeTab) && (
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '3rem',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          textAlign: 'center',
          color: 'var(--color-text-tertiary)'
        }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Secció en desenvolupament
          </p>
          <p>Aquesta pestanya s'implementarà en la següent fase</p>
        </div>
        )}

      {/* Modal de exportación */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}
    </div>
  );
}