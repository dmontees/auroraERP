import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Film, Users, Briefcase, FileText, Receipt, ShoppingCart, Scale, TrendingUp, Clock, Calendar as CalendarIcon, Settings } from 'lucide-react';
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

type Section =
  | 'dashboard' | 'projectes' | 'calendari' | 'parts-treball'
  | 'clients' | 'proveidors'
  | 'pressupostos' | 'factures-venda' | 'factures-compra' | 'gestio-fiscal' | 'resultats'
  | 'parametres';

interface NavItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const DEFAULT_SETTINGS: CompanySettings = {
  nombre: '', cif: '', direccion: '', telefono: '', email: '', logo: null,
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
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    console.log('🚀 Iniciando Aurora ERP v1.4.4...');
    try {
      storage.migrateFromLocalStorage();
      migrateFacturesVendaTipus();
      const storePath = storage.getStorePath();
      if (storePath) console.log(`📁 Datos guardados en: ${storePath}`);
      else console.log('ℹ️  Usando localStorage (modo desarrollo web)');
    } catch (error) {
      console.error('❌ Error durante la inicialización:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const savedSettings = storage.getSettings();
      if (savedSettings) setSettings(savedSettings);
      setClients(storage.getClients());
    } catch (error) {
      console.error('❌ Error cargando configuración:', error);
    }
  }, []);

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
    { id: 'dashboard',       label: 'Dashboard',         icon: <LayoutDashboard size={18} strokeWidth={1.8} />, description: 'Resum general de l\'activitat' },
    { id: 'projectes',       label: 'Projectes',         icon: <Film            size={18} strokeWidth={1.8} />, description: 'Gestió de produccions audiovisuals' },
    { id: 'calendari',       label: 'Calendari',         icon: <CalendarIcon    size={18} strokeWidth={1.8} />, description: 'Visualitza esdeveniments i dates importants' },
    { id: 'parts-treball',   label: 'Parts Treball',     icon: <Clock           size={18} strokeWidth={1.8} />, description: 'Registre d\'hores i tasques' },
    { id: 'clients',         label: 'Clients',           icon: <Users           size={18} strokeWidth={1.8} />, description: 'Base de dades de clients' },
    { id: 'proveidors',      label: 'RRHH · Proveïdors', icon: <Briefcase       size={18} strokeWidth={1.8} />, description: 'Recursos humans, proveïdors i acreedors' },
    { id: 'pressupostos',    label: 'Pressupostos',      icon: <FileText        size={18} strokeWidth={1.8} />, description: 'Crear i gestionar pressupostos' },
    { id: 'factures-venda',  label: 'Factures Venda',    icon: <Receipt         size={18} strokeWidth={1.8} />, description: 'Factures emeses a clients' },
    { id: 'factures-compra', label: 'Factures Compra',   icon: <ShoppingCart    size={18} strokeWidth={1.8} />, description: 'Factures rebudes de proveïdors' },
    { id: 'gestio-fiscal',   label: 'Gestió Fiscal',     icon: <Scale           size={18} strokeWidth={1.8} />, description: 'Obligacions fiscals: autònom, IRPF, IVA, nòmines' },
    { id: 'resultats',       label: 'Resultats',         icon: <TrendingUp      size={18} strokeWidth={1.8} />, description: 'Anàlisi financera i rendibilitat' },
    { id: 'parametres',      label: 'Paràmetres',        icon: <Settings        size={18} strokeWidth={1.8} />, description: 'Configuració de serveis, unitats i tarifes' },
  ];

  const navMap = Object.fromEntries(navItems.map(n => [n.id, n])) as Record<Section, NavItem>;
  const activeItem = navMap[activeSection];

  return (
    <div className="app-container">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside className="sidebar">

        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo-container">
            {settings.logo ? (
              <img src={settings.logo} alt={settings.nombre} className="custom-logo" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="logo-mark">A</div>
                <div>
                  <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {settings.nombre || 'Aurora'}
                  </div>
                  <div className="logo-subtitle" style={{ marginTop: 2 }}>ERP · v1.4</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navegació agrupada */}
        <nav className="nav-menu">
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

          {/* Paràmetres — al peu, fora dels grups */}
          <div className="nav-group" style={{ marginTop: 'auto' }}>
            <div className="nav-group-divider" />
            <button
              onClick={() => setActiveSection('parametres')}
              className={`nav-item ${activeSection === 'parametres' ? 'active' : ''}`}
              title={navMap.parametres.description}
            >
              <span className="nav-icon">{navMap.parametres.icon}</span>
              <span className="nav-label">Paràmetres</span>
            </button>
          </div>
        </nav>

        <CronometreWidget />

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Film size={18} strokeWidth={1.8} color="rgba(255,255,255,0.5)" />
          </div>
          <div className="footer-info">
            <p className="footer-text">Aurora ERP</p>
            <p className="footer-subtext">v1.4.4</p>
          </div>
          <button className="settings-button" onClick={() => setShowSettings(true)} title="Configuració">
            <Settings size={16} strokeWidth={1.8} />
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <main className="main-content">
        <header className="content-header">
          <div className="header-info">
            <h2 className="section-title">{activeItem?.label}</h2>
            <p className="section-description">{activeItem?.description}</p>
          </div>
        </header>

        <div className="content-body">
          {activeSection === 'dashboard'       && <Dashboard />}
          {activeSection === 'projectes'       && <ProjectesSection />}
          {activeSection === 'clients'         && <ClientsSection />}
          {activeSection === 'proveidors'      && <ProveidorsSection />}
          {activeSection === 'pressupostos'    && <PressupostosSection />}
          {activeSection === 'factures-venda'  && <FacturesVendaSection />}
          {activeSection === 'factures-compra' && <FacturesCompraSection />}
          {activeSection === 'gestio-fiscal'   && <GestioFiscalSection />}
          {activeSection === 'resultats'       && <ResultatsSection />}
          {activeSection === 'calendari'       && <CalendarSection />}
          {activeSection === 'parametres'      && <ParametresSection />}
          {activeSection === 'parts-treball'   && <PartsTreballSection clients={clients} />}
        </div>
      </main>

      {showSettings && (
        <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />
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
