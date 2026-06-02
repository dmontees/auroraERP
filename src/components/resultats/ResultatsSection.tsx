import React, { useState, useEffect } from 'react';
import { storage } from '../../utils/storageManager';
import FiltresGlobals from './FiltresGlobals';
import { getUltimsXMesos } from '../../utils/resultatCalculs';
import type { Periode } from '../../utils/resultatCalculs';
import type { FacturaVenta } from '../../types/facturaVenta';
import type { Gasto, ObligacioFiscal } from '../../types/facturaCompra';
import type { Projecte } from '../../types/projecte';
import type { Client } from '../../types/client';
import type { Proveidor } from '../../types/proveidor';
import type { Parametres } from '../../types/parametres';
import type { PartTreball } from '../../types/partTreball';

import Activitat from './tabs/Activitat';
import ProjectesRendibilitat from './tabs/ProjectesRendibilitat';
import AnalisiClients from './tabs/AnalisiClients';
import DespesesProveidors from './tabs/DespesesProveidors';
import Tresoreria from './tabs/Tresoreria';
import FiscalTab from './tabs/FiscalTab';
import { ExportModal } from './ExportModal';
import type { ExportConfig } from './types';
import { Download } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportResultats';

type TabId = 'activitat' | 'projectes' | 'clients' | 'despeses' | 'tresoreria' | 'fiscal';

const TABS: { id: TabId; label: string }[] = [
  { id: 'activitat',   label: 'Activitat' },
  { id: 'projectes',  label: 'Projectes' },
  { id: 'clients',    label: 'Clients' },
  { id: 'despeses',   label: 'Despeses' },
  { id: 'tresoreria', label: 'Tresoreria' },
  { id: 'fiscal',     label: 'Fiscal 🧾' },
];

export default function ResultatsSection() {
  const [facturesVenda, setFacturesVenda] = useState<FacturaVenta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [obligacionsFiscals, setObligacionsFiscals] = useState<ObligacioFiscal[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [partsTraeball, setPartsTraeball] = useState<PartTreball[]>([]);

  const [periode, setPeriode] = useState<Periode>({
    dataInici: `${new Date().getFullYear()}-01-01`,
    dataFi: new Date().toISOString().split('T')[0],
  });
  const [periodePreset, setPeriodePreset] = useState('aquest-any');
  const [clientSeleccionat, setClientSeleccionat] = useState('');
  const [projecteSeleccionat, setProjecteSeleccionat] = useState('');
  const [compararAmb, setCompararAmb] = useState('periode-anterior');

  const [activeTab, setActiveTab] = useState<TabId>('activitat');
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    setFacturesVenda(storage.getFacturesVenda());
    setGastos(storage.getFacturesCompra());
    setObligacionsFiscals(storage.getObligacionsFiscals());
    setProjectes(storage.getProjectes());
    setClients(storage.getClients());
    setProveidors(storage.getProveidors());
    setParametres(storage.getParametres() as unknown as Parametres);
    setPartsTraeball(storage.getPartsTreball());
  }, []);

  const facturesFiltrades = clientSeleccionat
    ? facturesVenda.filter(f => f.client === clientSeleccionat)
    : facturesVenda;

  const projectesFiltrats = projecteSeleccionat
    ? projectes.filter(p => p.codi === projecteSeleccionat)
    : clientSeleccionat
    ? projectes.filter(p => p.client === clientSeleccionat)
    : projectes;

  const partsTreballFiltrades = partsTraeball.filter(p => {
    if (projecteSeleccionat) return p.projecte === projecteSeleccionat;
    if (clientSeleccionat) return projectesFiltrats.some(pr => pr.codi === p.projecte);
    return true;
  });

  const handleExport = (config: ExportConfig) => {
    switch (config.format) {
      case 'csv':
        exportToCSV(config, periode, facturesVenda, gastos, projectes, clients, proveidors, obligacionsFiscals);
        break;
      case 'excel':
        exportToExcel(config, periode, facturesVenda, gastos, projectes, clients, proveidors, obligacionsFiscals);
        break;
      case 'pdf-executiu':
      case 'pdf-complet':
        exportToPDF(config, periode, facturesVenda, gastos, projectes, clients, proveidors, obligacionsFiscals, parametres);
        break;
    }
  };

  return (
    <div>
      {/* Export button */}
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

      {/* Global filters */}
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

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--color-border)',
        marginBottom: '2rem',
        gap: '0.25rem',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
              fontSize: '0.875rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'activitat' && (
        <Activitat
          periode={periode}
          facturesVenda={facturesFiltrades}
          gastos={gastos}
          obligacionsFiscals={obligacionsFiscals}
          projectes={projectesFiltrats}
          partsTraeball={partsTreballFiltrades}
        />
      )}

      {activeTab === 'projectes' && (
        <ProjectesRendibilitat
          periode={periode}
          projectes={projectesFiltrats}
          facturesVenda={facturesFiltrades}
          gastos={gastos}
          clients={clients}
          parametres={parametres}
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

      {activeTab === 'tresoreria' && (
        <Tresoreria
          periode={periode}
          facturesVenda={facturesVenda}
          gastos={gastos}
          clients={clients}
        />
      )}

      {activeTab === 'fiscal' && (
        <FiscalTab
          facturesVenda={facturesVenda}
          gastos={gastos}
          obligacionsFiscals={obligacionsFiscals}
          any={new Date(periode.dataInici).getFullYear()}
        />
      )}

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
