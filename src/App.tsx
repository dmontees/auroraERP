import React, { useState, useEffect } from 'react';
import auroraIcon from '../build/icon.png';
import { Film, LayoutDashboard, Users, Briefcase, FileText, Receipt, ShoppingCart, TrendingUp, Clock, Calendar as CalendarIcon, Settings, Scale } from 'lucide-react';
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

function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showCronometreModal, setShowCronometreModal] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [clients, setClients] = useState<Client[]>([]);

  // Ejecutar migraciones al inicio
  useEffect(() => {
    console.log('🚀 Iniciando Aurora ERP v1.0.1...');
    
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
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, description: 'Resum general de l\'activitat' },
    { id: 'projectes', label: 'Projectes', icon: <Film size={20} />, description: 'Gestió de produccions audiovisuals' },
    { id: 'clients', label: 'Clients', icon: <Users size={20} />, description: 'Base de dades de clients' },
    { id: 'proveidors', label: 'RRHH i Proveïdors', icon: <Briefcase size={20} />, description: 'Recursos humans, proveïdors i acreedors' },
    { id: 'pressupostos', label: 'Pressupostos', icon: <FileText size={20} />, description: 'Crear i gestionar pressupostos' },
    { id: 'factures-venda', label: 'Factures Venda', icon: <Receipt size={20} />, description: 'Factures emeses a clients' },
    { id: 'factures-compra', label: 'Factures Compra', icon: <ShoppingCart size={20} />, description: 'Factures rebudes de proveïdors' },
    { id: 'gestio-fiscal', label: 'Gestió Fiscal', icon: <Scale size={20} />, description: 'Obligacions fiscals: autònom, IRPF, IVA, nòmines' },
    { id: 'resultats', label: 'Resultats', icon: <TrendingUp size={20} />, description: 'Anàlisi financera i rendibilitat' },
    { id: 'parts-treball', label: 'Parts Treball', icon: <Clock size={20} />, description: 'Registre d\'hores i tasques' },
    { id: 'calendari', label: 'Calendari', icon: <CalendarIcon size={20} />, description: 'Visualitza esdeveniments i dates importants' },
    { id: 'parametres', label: 'Paràmetres', icon: <Settings size={20} />, description: 'Configuració de serveis, unitats i tarifes' }
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
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              title={item.description}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <CronometreWidget />

        <div className="sidebar-footer">
          <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={auroraIcon}
              alt="Aurora ERP"
              style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }}
            />
          </div>

          <div className="footer-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p className="footer-text">v1.4.1</p>
            <p className="footer-subtext">Aurora ERP</p>
          </div>
          
          <button className="settings-button" onClick={() => setShowSettings(true)} title="Configuració">
            <Settings size={20} />
          </button>
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