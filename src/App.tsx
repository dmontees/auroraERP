import React, { useState, useEffect } from 'react';
import auroraIcon from '../build/icon_A.png';
import { Film, LayoutDashboard, Users, Briefcase, FileText, Receipt, ShoppingCart, TrendingUp, Clock, Calendar as CalendarIcon, BadgePlus, Settings, Scale, Cloud, CloudOff, Sun, Moon } from 'lucide-react';
import { useWebSync } from './hooks/useWebSync';
import WebSyncModal from './components/common/WebSyncModal';
import Dashboard from './components/dashboard/Dashboard';
import ProjectesSection from './components/projectes/ProjectesSection';
import ParametresSection from './components/parametres/ParametresPage';
import PartsTreballSection from './components/parts-treball/PartsTreballSection';
import CronometreWidget from './components/parts-treball/CronometreWidget';
import CronometreModal from './components/parts-treball/CronometreModal';
import ClientsSection from './components/clients/ClientsSection';
import ProveidorsSection from './components/proveidors/ProveidorsSection';
import PressupostosSection from './components/pressupostos/PressupostosSection';
import FacturesCompraSection from './components/factures-compra/FacturesCompraSection';
import GestioFiscalSection from './components/gestio-fiscal/GestioFiscalSection';
import FacturesVendaSection from './components/factures-venda/FacturesVendaSection';
import CalendarSection from './components/calendar/CalendarSection';
import ResultatsSection from './components/resultats/ResultatsSection';
import UpdateNotification from './components/common/UpdateNotification';
import SettingsModal, { type CompanySettings } from './components/common/SettingsModal';
import type { Client } from './types/client';
import { migrateFacturesVendaTipus } from './utils/migrateFacturesVenda';
import { storage } from './utils/storageManager';
import './App.css';

type Section = 'dashboard' | 'clients' | 'proveidors' | 'projectes' | 'pressupostos' |
               'factures-venda' | 'factures-compra' | 'gestio-fiscal' | 'resultats' |
               'parts-treball' | 'calendari' | 'parametres';

interface NavItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const DEFAULT_SETTINGS: CompanySettings = {
  nombre: '',
  cif: '',
  direccion: '',
  telefono: '',
  email: '',
  logo: null
};

const NAV_GROUPS = [
  {
    label: 'Producció',
    items: ['dashboard', 'projectes', 'calendari', 'parts-treball'] as Section[],
  },
  {
    label: 'Relacions',
    items: ['clients', 'proveidors'] as Section[],
  },
  {
    label: 'Finances',
    items: ['pressupostos', 'factures-venda', 'factures-compra', 'gestio-fiscal', 'resultats'] as Section[],
  },
];

function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showCronometreModal, setShowCronometreModal] = useState(false);
  const [showWebSync, setShowWebSync] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('aurora-theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    root.setAttribute('data-theme', theme);
    localStorage.setItem('aurora-theme', theme);
    const t = setTimeout(() => root.classList.remove('theme-transitioning'), 300);
    return () => clearTimeout(t);
  }, [theme]);
  const webSync = useWebSync();
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [clients, setClients] = useState<Client[]>([]);

  // Ejecutar migraciones al inicio
  useEffect(() => {
    console.log('🚀 Iniciando Aurora ERP v3.0.0...');
    
    try {
      // 1. Migrar de localStorage a electron-store (solo una vez)
      storage.migrateFromLocalStorage();
      
      // 2. Migrar tipos de facturas (añadir campo 'tipus')
      migrateFacturesVendaTipus();

      // 3. Log de la ruta del store (solo en Electron)
      const storePath = storage.getStorePath();
      if (storePath) {
        console.log(`📁 Datos guardados en: ${storePath}`);
      } else {
        console.log('ℹ️  Usando localStorage (modo desarrollo web)');
      }
    } catch (error) {
      console.error('❌ Error durante la inicialización:', error);
    }
  }, []);

  // Cargar configuración y clientes
  useEffect(() => {
    try {
      // Cargar settings
      const savedSettings = storage.getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
      
      // Cargar clientes
      setClients(storage.getClients());
    } catch (error) {
      console.error('❌ Error cargando configuración:', error);
    }
  }, []);

  // Manejar navegación entre secciones
  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      const { section, codi } = e.detail;
      setActiveSection(section);
      
      let type = 'factura';
      if (section === 'pressupostos') type = 'pressupost';
      else if (section === 'projectes') type = 'projecte';
      else if (section === 'factures-venda') type = 'factura';
      
      storage.setNavigateTo({ type, codi });
    };

    window.addEventListener('navigate-to', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate-to', handleNavigate as EventListener);
  }, []);

  const saveSettings = (newSettings: CompanySettings) => {
    setSettings(newSettings);
    storage.setSettings(newSettings);
  };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} />, description: 'Resum general de l\'activitat' },
    { id: 'projectes', label: 'Projectes', icon: <Film size={17} />, description: 'Gestió de produccions audiovisuals' },
    { id: 'clients', label: 'Clients', icon: <Users size={17} />, description: 'Base de dades de clients' },
    { id: 'proveidors', label: 'RRHH i Proveïdors', icon: <Briefcase size={17} />, description: 'Recursos humans, proveïdors i acreedors' },
    { id: 'pressupostos', label: 'Pressupostos', icon: <FileText size={17} />, description: 'Crear i gestionar pressupostos' },
    { id: 'factures-venda', label: 'Factures Venda', icon: <Receipt size={17} />, description: 'Factures emeses a clients' },
    { id: 'factures-compra', label: 'Factures Compra', icon: <ShoppingCart size={17} />, description: 'Factures rebudes de proveïdors' },
    { id: 'gestio-fiscal', label: 'Gestió Fiscal', icon: <Scale size={17} />, description: 'Obligacions fiscals: autònom, IRPF, IVA, nòmines' },
    { id: 'resultats', label: 'Resultats', icon: <TrendingUp size={17} />, description: 'Anàlisi financera i rendibilitat' },
    { id: 'parts-treball', label: 'Parts Treball', icon: <Clock size={17} />, description: 'Registre d\'hores i tasques' },
    { id: 'calendari', label: 'Calendari', icon: <CalendarIcon size={17} />, description: 'Visualitza esdeveniments i dates importants' },
    { id: 'parametres', label: 'Paràmetres', icon: <BadgePlus size={17} />, description: 'Configuració de serveis, unitats i tarifes' }
  ];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            {settings.logo ? (
              <img src={settings.logo} alt={settings.nombre} className="custom-logo" />
            ) : (
              <>
                <Film size={32} className="logo-icon" />
                <div className="logo-text">
                  <h1>{settings.nombre || 'Aurora'}</h1>
                  <span className="logo-subtitle">ERP</span>
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="nav-menu">
          {(() => {
            const navMap = Object.fromEntries(navItems.map(n => [n.id, n])) as Record<Section, NavItem>;
            return (
              <>
                {NAV_GROUPS.map((group, gi) => (
                  <div key={group.label} className="nav-group">
                    {gi > 0 && <div className="nav-group-divider" />}
                    <span className="nav-group-label">{group.label}</span>
                    {group.items.map(id => {
                      const item = navMap[id];
                      return (
                        <button
                          key={id}
                          onClick={() => setActiveSection(id)}
                          className={`nav-item ${activeSection === id ? 'active' : ''}`}
                          title={item.description}
                        >
                          <span className="nav-icon">{item.icon}</span>
                          <span className="nav-label">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="nav-group" style={{ marginTop: 'auto' }}>
                  <div className="nav-group-divider" />
                  <button
                    onClick={() => setActiveSection('parametres')}
                    className={`nav-item ${activeSection === 'parametres' ? 'active' : ''}`}
                    title={navMap.parametres.description}
                  >
                    <span className="nav-icon">{navMap.parametres.icon}</span>
                    <span className="nav-label">{navMap.parametres.label}</span>
                  </button>
                </div>
              </>
            );
          })()}
        </nav>

        <CronometreWidget />

        <div className="sidebar-footer">
          {/* Logo amb resplandor */}
          <img
            src={auroraIcon}
            alt="Aurora ERP"
            style={{
              width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover',
              flexShrink: 0, display: 'block',
              filter: 'drop-shadow(0 0 6px rgba(79,70,229,0.55)) drop-shadow(0 0 14px rgba(14,165,233,0.3))',
            }}
          />

          {/* Versió */}
          <div className="footer-info" style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <p className="footer-text">v3.0.0</p>
            <p className="footer-subtext">Aurora ERP</p>
          </div>

          {/* Botons agrupats */}
          <div style={{ display: 'flex', gap: '0.05rem', flexShrink: 0 }}>
            <button
              className="settings-button"
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? 'Mode fosc' : 'Mode clar'}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <button
              className="settings-button"
              onClick={() => setShowWebSync(true)}
              title={webSync.status === 'error' ? `Error sync: ${webSync.error}` : 'Sincronització web'}
            >
              {webSync.status === 'syncing'
                ? <Cloud size={15} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-info)' }} />
                : webSync.status === 'success'
                ? <Cloud size={15} style={{ color: 'var(--color-success)' }} />
                : webSync.status === 'error'
                ? <CloudOff size={15} style={{ color: 'var(--color-error)' }} />
                : <Cloud size={15} />
              }
            </button>

            <button className="settings-button" onClick={() => setShowSettings(true)} title="Configuració">
              <Settings size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <div className="header-info">
            <h2 className="section-title">{navItems.find(item => item.id === activeSection)?.label}</h2>
            <p className="section-description">{navItems.find(item => item.id === activeSection)?.description}</p>
          </div>
        </header>

        <div className="content-body">
          {activeSection === 'dashboard' && <Dashboard />}
          {activeSection === 'projectes' && <ProjectesSection />}
          {activeSection === 'clients' && <ClientsSection />}
          {activeSection === 'proveidors' && <ProveidorsSection />}
          {activeSection === 'pressupostos' && <PressupostosSection />}
          {activeSection === 'factures-venda' && <FacturesVendaSection />}
          {activeSection === 'factures-compra' && <FacturesCompraSection />}
          {activeSection === 'gestio-fiscal' && <GestioFiscalSection />}
          {activeSection === 'resultats' && <ResultatsSection />}
          {activeSection === 'calendari' && <CalendarSection />}
          {activeSection === 'parametres' && <ParametresSection />}
          {activeSection === 'parts-treball' && <PartsTreballSection clients={clients} />}
        </div>
      </main>
 
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showWebSync && (
        <WebSyncModal
          status={webSync.status}
          lastSync={webSync.lastSync}
          error={webSync.error}
          onSync={webSync.sync}
          docStatus={webSync.docStatus}
          lastDocSync={webSync.lastDocSync}
          docStats={webSync.docStats}
          docError={webSync.docError}
          backupStatus={webSync.backupStatus}
          lastBackup={webSync.lastBackup}
          backupError={webSync.backupError}
          onBackup={webSync.backup}
          onClose={() => setShowWebSync(false)}
        />
      )}

      {showCronometreModal && (
        <CronometreModal
          onClose={() => setShowCronometreModal(false)}
          clients={clients}
          projectes={storage.getProjectes()}
          onCrearPart={(part) => {
            const parts = storage.getPartsTreball();
            const maxNum = parts.length === 0 ? 0 : Math.max(...parts.map((p: any) => parseInt(p.codi.split('-')[1])));
            const nouCodi = `PT-${String(maxNum + 1).padStart(5, '0')}`;
            storage.setPartsTreball([...parts, { ...part, codi: nouCodi }]);
            setShowCronometreModal(false);
          }}
        />
      )}

      <UpdateNotification />
    </div>
  );
}

export default App;